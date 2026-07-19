/**
 * @file QuickStat.tsx
 * @description Compact labeled statistic used in the desktop header bar.
 * @author Sathish Kumar
 */

/**
 * Renders an icon + label + value pair for the desktop top-bar stats row.
 */
export function QuickStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div
          className="font-display text-lg leading-none"
          style={accent ? { color: "var(--color-primary)" } : undefined}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
