import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/design-system/mj-design-system-db98fa/lib/utils";

/**
 * Botões com relevo: brilho interno, halo colorido, "sobe" no hover, afunda no clique
 * e (nas variantes cheias) uma faixa de luz que cruza o botão. `.btn-sheen` vive em src/index.css.
 * Qualquer `bg-*` passado em className continua mandando na cor — o brilho se adapta a ela.
 */
const buttonVariants = cva(
  [
    "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium select-none",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:translate-y-0 active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200",
    "hover:[&_svg:not(.animate-spin)]:scale-110",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "btn-sheen bg-primary text-primary-foreground shadow-[var(--shadow-btn)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-btn-hover)]",
        destructive:
          "btn-sheen bg-destructive text-destructive-foreground shadow-[var(--shadow-btn-danger)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-btn-danger-hover)]",
        success:
          "btn-sheen bg-success text-white shadow-[var(--shadow-btn-success)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-btn-success-hover)]",
        gradient:
          "btn-sheen bg-gradient-brand text-white shadow-[var(--shadow-btn)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-btn-hover)]",
        outline:
          "border border-input bg-card/80 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent hover:text-accent-foreground hover:shadow-card",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-px hover:bg-secondary/70 hover:shadow-card",
        soft: "bg-primary/10 text-primary hover:-translate-y-px hover:bg-primary/15",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Mostra um indicador de carregamento e desabilita o botão. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={asChild ? disabled : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
