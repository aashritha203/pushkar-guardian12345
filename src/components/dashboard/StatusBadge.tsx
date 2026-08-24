import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<Status, string> = {
  safe:     "bg-[var(--safe)]/15 text-[var(--safe)] ring-1 ring-[var(--safe)]/40",
  moderate: "bg-[var(--moderate)]/15 text-[var(--moderate)] ring-1 ring-[var(--moderate)]/40",
  critical: "bg-[var(--critical)]/15 text-[var(--critical)] ring-1 ring-[var(--critical)]/40",
};
const labels: Record<Status, string> = { safe: "Safe", moderate: "Moderate", critical: "Critical" };

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide", styles[status], className)}>
      <span className="size-1.5 rounded-full bg-current animate-pulse" />
      {labels[status]}
    </span>
  );
}
