/**
 * @file Skeleton.tsx
 * @description Animated shimmer placeholder used in loading states throughout the app.
 * @author Sathish Kumar
 */

/**
 * A single skeleton shimmer block. Pass a `className` to control dimensions and shape.
 *
 * @example
 * <Sk className="h-4 w-32" />
 * <Sk className="size-10 rounded-full" />
 */
export function Sk({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ""}`}
      style={{ background: "oklch(1 0 0 / 0.06)", ...style }}
    />
  );
}
