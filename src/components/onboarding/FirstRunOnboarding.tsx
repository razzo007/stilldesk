import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { onboardingPresets } from "../../lib/onboarding";
import type { Department, Profile, WorkRole } from "../../types/user";
import { Button } from "../ui/Button";

interface FirstRunOnboardingProps {
  profile: Profile;
  onComplete: (input: {
    department: Department;
    preferred_filters: string[];
    preferred_view: "welcome" | "tickets" | "board" | "dashboard";
    work_role: WorkRole;
  }) => Promise<void>;
}

export function FirstRunOnboarding({ onComplete, profile }: FirstRunOnboardingProps) {
  const [selectedRole, setSelectedRole] = useState<WorkRole>("product_manager");
  const selectedPreset = useMemo(
    () => onboardingPresets.find((p) => p.role === selectedRole) ?? onboardingPresets[0],
    [selectedRole],
  );
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    await onComplete({
      work_role: selectedPreset.role,
      department: selectedPreset.department,
      preferred_filters: selectedPreset.filters,
      preferred_view: selectedPreset.landing,
    });
    setSaving(false);
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-y-auto bg-desk-bg px-4 py-8">
      <section className="w-full max-w-lg">
        <div className="rounded-[1.7rem] border border-desk-border bg-desk-bg p-6 shadow-xl md:p-9">
          <img
            alt="StillDesk"
            className="h-14 w-40 rounded-xl border border-desk-border/70 object-cover object-center opacity-90"
            src="/assets/stilldesk-logo.jpg"
          />
          <p className="mt-6 text-sm font-medium text-desk-muted">
            Welcome, {profile.name.split(" ")[0]}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-desk-text">
            What kind of work do you do?
          </h1>
          <p className="mt-2 text-sm leading-6 text-desk-muted">
            Pick the closest match — StillDesk will set your filters and starting view. Change anything later.
          </p>

          <div className="mt-6 grid gap-2">
            {onboardingPresets.map((preset) => {
              const active = selectedPreset.role === preset.role;
              return (
                <button
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-desk-accent/60 bg-desk-accentSoft/50 shadow-[inset_3px_0_0_var(--desk-accent)]"
                      : "border-desk-border/70 bg-desk-soft/50 hover:bg-desk-soft"
                  }`}
                  key={preset.role}
                  onClick={() => setSelectedRole(preset.role)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-desk-text">{preset.label}</span>
                    {active ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-desk-accent" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-desk-muted">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-desk-border/60 pt-5">
            <p className="text-xs text-desk-muted">
              Starting on{" "}
              <span className="font-medium text-desk-text">
                {selectedPreset.landing === "dashboard"
                  ? "Dashboard"
                  : selectedPreset.landing === "board"
                    ? "Board"
                    : "Ticket list"}
              </span>
            </p>
            <Button
              icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              isLoading={saving}
              onClick={finish}
              variant="primary"
            >
              Enter StillDesk
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
