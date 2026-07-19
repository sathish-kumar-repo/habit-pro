/**
 * @file MiniStat.tsx
 * @description Small stacked label/value stat used in the mobile Today view sidebar.
 * @author Sathish Kumar
 */

/**
 * A compact label + value stat block. Use `highlight` to accent the value in
 * the primary brand color.
 */
export function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-0.5 font-display text-xl leading-none"
        style={highlight ? { color: "var(--color-primary)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
