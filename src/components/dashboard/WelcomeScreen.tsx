import { Button } from "../ui/Button";

interface WelcomeScreenProps {
  assignedCount: number;
  fixingCount: number;
  onDashboard: () => void;
  onAssigned: () => void;
  onFixing: () => void;
}

export function WelcomeScreen({
  assignedCount,
  fixingCount,
  onAssigned,
  onDashboard,
  onFixing,
}: WelcomeScreenProps) {
  return (
    <section className="relative grid h-full place-items-center overflow-hidden bg-desk-bg p-6">
      <img
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        src="/assets/stilldesk-cover.jpg"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(18,20,17,0.18),rgba(18,20,17,0.78)_72%)]" />
      <div className="glass-panel relative max-w-2xl rounded-[1.7rem] px-8 py-9 text-center">
        <p className="text-sm font-medium text-desk-muted">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold text-desk-text">Choose what needs your eyes.</h1>
        <p className="mt-3 text-sm leading-6 text-desk-muted">
          Open the truth board, your assigned bugs, or the fixes currently moving.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Button onClick={onDashboard}>Dashboard</Button>
          <Button onClick={onAssigned}>Assigned to me · {assignedCount}</Button>
          <Button onClick={onFixing}>Being fixed · {fixingCount}</Button>
        </div>
      </div>
    </section>
  );
}
