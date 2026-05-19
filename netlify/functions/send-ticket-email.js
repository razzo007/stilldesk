const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textForEvent(eventType, ticket) {
  if (eventType === "assigned") {
    return {
      subject: `[StillDesk] Assigned: ${ticket.id} ${ticket.title}`,
      preheader: `You were assigned ${ticket.id}.`,
      heading: "A bug was assigned to you.",
      body: `${ticket.title} is now on your desk.`,
    };
  }

  if (eventType === "comment") {
    return {
      subject: `[StillDesk] Mentioned: ${ticket.id} ${ticket.title}`,
      preheader: `You were mentioned on ${ticket.id}.`,
      heading: "You were mentioned on a bug.",
      body: `${ticket.title} needs your eyes.`,
    };
  }

  if (eventType === "blocked") {
    return {
      subject: `[StillDesk] Blocked: ${ticket.id} ${ticket.title}`,
      preheader: `${ticket.id} is blocked.`,
      heading: "A bug is blocked.",
      body: `${ticket.title} is waiting on a dependency or decision.`,
    };
  }

  return {
    subject: `[StillDesk] Resolved: ${ticket.id} ${ticket.title}`,
    preheader: `${ticket.id} was marked ${ticket.status}.`,
    heading: "A bug was resolved.",
    body: `${ticket.title} was marked ${ticket.status}.`,
  };
}

async function verifySupabaseUser(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return true;
  if (!token) return false;

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  return response.ok;
}

async function verifyTicketAccess(token, ticketId) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !ticketId) return true;
  if (!token) return false;

  const response = await fetch(
    `${url}/rest/v1/issue_tickets?id=eq.${encodeURIComponent(ticketId)}&select=id&limit=1`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) return false;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length === 1;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.STILLDESK_APP_URL || process.env.URL || "";

  if (!resendKey || !from) {
    return json(200, { skipped: true, reason: "Resend is not configured." });
  }

  const token = event.headers.authorization?.replace(/^Bearer\s+/i, "");
  const verified = await verifySupabaseUser(token);

  if (!verified) {
    return json(401, { error: "Unauthorized" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const { eventType, recipients = [], ticket = {}, actor } = payload;
  const to = Array.from(new Set(recipients.filter(Boolean)));

  if (!["assigned", "resolved", "comment", "blocked"].includes(eventType)) {
    return json(400, { error: "Unknown notification event." });
  }

  if (!to.length) {
    return json(200, { skipped: true, reason: "No recipients." });
  }

  const canAccessTicket = await verifyTicketAccess(token, ticket.id);
  if (!canAccessTicket) {
    return json(403, { error: "Ticket access denied" });
  }

  const copy = textForEvent(eventType, ticket);
  const ticketUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/` : "";

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#242424;background:#fafaf8;padding:28px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e6e3;border-radius:14px;padding:24px;">
        <p style="margin:0 0 10px;color:#74716d;font-size:13px;">${escapeHtml(copy.preheader)}</p>
        <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;">${escapeHtml(copy.heading)}</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.65;">${escapeHtml(copy.body)}</p>
        <div style="border-top:1px solid #e8e6e3;padding-top:16px;margin-top:16px;">
          <p style="margin:0 0 6px;font-size:13px;color:#74716d;">${escapeHtml(ticket.id)} · ${escapeHtml(ticket.status)} · ${escapeHtml(ticket.priority)}</p>
          <p style="margin:0;font-size:16px;font-weight:600;">${escapeHtml(ticket.title)}</p>
          ${ticket.description ? `<p style="margin:12px 0 0;color:#74716d;line-height:1.6;">${escapeHtml(ticket.description)}</p>` : ""}
        </div>
        <p style="margin:18px 0 0;color:#74716d;font-size:13px;">Changed by ${escapeHtml(actor?.name || "StillDesk")}.</p>
        ${ticketUrl ? `<p style="margin:18px 0 0;"><a href="${ticketUrl}" style="color:#7c5cff;text-decoration:none;">Open StillDesk</a></p>` : ""}
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "User-Agent": "StillDesk/1.0",
    },
    body: JSON.stringify({
      from,
      to,
      subject: copy.subject,
      html,
      text: `${copy.heading}\n\n${copy.body}\n\n${ticket.id} ${ticket.title}\nStatus: ${ticket.status}\nPriority: ${ticket.priority}`,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return json(response.status, { error: data.message || "Resend failed.", details: data });
  }

  return json(200, { ok: true, id: data.id });
};
