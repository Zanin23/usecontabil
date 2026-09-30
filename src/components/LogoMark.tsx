import { cn } from "@/design-system/mj-design-system-db98fa";

/**
 * Marca do Use Contábil: "U" branco sobre pastilha em degradê índigo→violeta (mesma do menu lateral).
 * O tamanho vem das classes do chamador (h-* w-*). `glow` é mantido só por compatibilidade de API.
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
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow ring-1 ring-white/25",
        className,
      )}
      aria-hidden
    >
      <span className="font-display text-[1.05em] font-semibold leading-none">U</span>
    </span>
  );
}
