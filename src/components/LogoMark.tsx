/**
 * Solid black speech waveform brand mark.
 * Size is driven by Tailwind classes from the caller (h-* w-*).
 * `glow` prop kept for API compatibility but no longer rendered.
 */
export default function LogoMark({
  className = "h-8 w-8",
  glow: _glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center text-foreground ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      >
        <line x1="3" y1="11" x2="3" y2="13" />
        <line x1="8" y1="8" x2="8" y2="16" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="16" y1="8" x2="16" y2="16" />
        <line x1="21" y1="11" x2="21" y2="13" />
      </svg>
    </span>
  );
}
