import { ArrowRight, CheckCircle2, CircleDot, LayoutDashboard, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { onboardingPresets, sampleFlowEvents } from "../../lib/onboarding";
import type { Department, Profile, WorkRole } from "../../types/user";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

interface FirstRunOnboardingProps {
  profile: Profile;
  onComplete: (input: {
    department: Department;
    preferred_filters: string[];
    preferred_view: "welcome" | "tickets" | "board" | "dashboard";
    work_role: WorkRole;
  }) => Promise<void>;
}

const departmentOptions: { value: Department; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "sales_marketing", label: "Sales / Marketing" },
  { value: "support", label: "Support / QA" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

export function FirstRunOnboarding({ onComplete, profile }: FirstRunOnboardingProps) {
  const [selectedRole, setSelectedRole] = useState<WorkRole>("product_manager");
  const selectedPreset = useMemo(
    () => onboardingPresets.find((preset) => preset.role === selectedRole) ?? onboardingPresets[0],
    [selectedRole],
  );
  const [department, setDepartment] = useState<Department>(selectedPreset.department);
  const [saving, setSaving] = useState(false);

  function chooseRole(role: WorkRole) {
    const preset = onboardingPresets.find((item) => item.role === role) ?? onboardingPresets[0];
    setSelectedRole(role);
    setDepartment(preset.department);
  }

  async function finish() {
    setSaving(true);
    await onComplete({
      work_role: selectedPreset.role,
      department,
      preferred_filters: selectedPreset.filters,
      preferred_view: selectedPreset.landing,
    });
    setSaving(false);
  }

  return (
    <main className="relative isolate grid min-h-dvh overflow-y-auto bg-desk-bg px-4 py-8">
      <img
        alt=""
        className="pointer-events-none fixed inset-0 -z-20 h-dvh w-screen object-cover object-center opacity-45"
        src="/assets/stilldesk-cover.jpg"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(90deg,rgba(18,20,17,0.72),rgba(18,20,17,0.88))]" />

      <section className="mx-auto grid w-full max-w-6xl content-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[1.7rem] p-6 md:p-8">
          <img
            alt="StillDesk"
            className="h-16 w-44 rounded-2xl border border-desk-border/70 object-cover object-center opacity-90"
            src="/assets/stilldesk-logo.jpg"
          />
          <p className="mt-7 text-sm font-medium text-desk-muted">Welcome, {profile.name.split(" ")[0]}</p>
          <h1 className="mt-2 max-w-lg text-3xl font-semibold leading-tight text-desk-text">
            Set up your desk in one quiet step.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-desk-muted">
            Pick the work you usually do. StillDesk will choose useful filters and land you where your bugs make the most sense.
          </p>

          <div className="mt-7 grid gap-3">
            {onboardingPresets.map((preset) => {
              const active = selectedPreset.role === preset.role;

              return (
                <button
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-desk-accent/60 bg-desk-surface/75 shadow-[inset_3px_0_0_var(--desk-accent)]"
                      : "border-desk-border/75 bg-desk-surface/30 hover:bg-desk-surface/60"
                  }`}
                  key={preset.role}
                  onClick={() => chooseRole(preset.role)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-desk-text">{preset.label}</span>
                    {active ? <CheckCircle2 className="h-4 w-4 text-desk-accent" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-desk-muted">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid content-start gap-5">
          <section className="glass-panel rounded-[1.7rem] p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem] sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-desk-muted/70">Your starting view</p>
                <h2 className="mt-2 text-xl font-semibold text-desk-text">
                  {selectedPreset.landing === "dashboard"
                    ? "Dashboard first"
                    : selectedPreset.landing === "board"
                      ? "Board first"
                      : selectedPreset.landing === "tickets"
                        ? "Ticket list first"
                        : "Welcome screen first"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-desk-muted">
                  You can change filters later from the sidebar. This just gives the first day a useful shape.
                </p>
              </div>
              <Select
                label="Department"
                name="department"
                onChange={(event) => setDepartment(event.target.value as Department)}
                options={departmentOptions}
                value={department}
              />
            </div>

            <div className="mt-6 grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-desk-muted/70">Pinned filters</p>
              <div className="flex flex-wrap gap-2">
                {selectedPreset.filters.slice(0, 9).map((filter) => (
                  <span
                    className="rounded-full border border-desk-border/70 bg-desk-surface/55 px-2.5 py-1 text-xs text-desk-muted"
                    key={filter}
                  >
                    {filter.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-desk-muted">
                {selectedPreset.landing === "dashboard" ? (
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Demo tickets stay visible so the first run has life.</span>
              </div>
              <Button
                icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                isLoading={saving}
                onClick={finish}
                variant="primary"
              >
                Enter StillDesk
              </Button>
            </div>
          </section>

          <section className="glass-panel rounded-[1.7rem] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-desk-muted/70">Sample flow</p>
            <div className="mt-5 grid gap-4">
              {sampleFlowEvents.map((event, index) => (
                <div className="grid grid-cols-[2rem_1fr] gap-3" key={event.label}>
                  <div className="grid place-items-center">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-desk-border bg-desk-surface text-xs font-semibold text-desk-text">
                      {index + 1}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-desk-border/75 bg-desk-surface/35 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-desk-text">
                      <CircleDot className="h-3.5 w-3.5 text-desk-accent" aria-hidden="true" />
                      {event.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-desk-muted">{event.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
