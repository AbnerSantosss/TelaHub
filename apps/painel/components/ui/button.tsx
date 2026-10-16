import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { moverReflexo } from "@/lib/spotlight"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Botão primário do site: marca sólida, texto branco (5,4:1), sombra
        // com deslocamento. Sem gradiente e sem halo.
        default: "bg-primary text-primary-foreground shadow-btn hover:bg-marca-hover",
        outline:
          "border-borda-2 bg-papel text-tinta hover:border-borda-3 hover:bg-papel-2 hover:text-tinta aria-expanded:bg-papel-2 aria-expanded:text-tinta",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--color-secondary),var(--color-foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-tinta-2 hover:bg-papel-3 hover:text-tinta aria-expanded:bg-papel-3 aria-expanded:text-tinta",
        destructive:
          "bg-danger-fundo text-danger hover:border-danger focus-visible:border-danger focus-visible:ring-danger/20",
        link: "text-marca underline-offset-4 hover:underline",
        // Nome mantido por compatibilidade: era o gradiente do tema escuro e
        // agora é o mesmo botão primário da `default`.
        brand: "bg-primary text-primary-foreground shadow-btn hover:bg-marca-hover",
        // Efeitos adaptados do 21st.dev (Glow Button / Shimmer Button). O
        // visual mora em index.css (.btn-fx-*) porque usa pseudo-elementos,
        // @media (pointer: fine) e prefers-reduced-motion. glow = primário do
        // site com reflexo; shimmer = secundário em papel com faixa de luz.
        glow: "btn-fx-glow",
        shimmer: "btn-fx-shimmer",
      },
      size: {
        // default e lg ganham altura mínima de 44px abaixo de md (alvo de
        // toque no celular). É min-h, e não h, para não brigar com o `h-*` que
        // a tela passa por className: tailwind-merge manteria o md:h-* da base.
        default:
          "h-8 gap-1.5 px-2.5 max-md:min-h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 max-md:min-h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "default",
    size = "default",
    asChild = false,
    onPointerMove,
    ...props
  }: ButtonProps,
  ref
) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      onPointerMove={
        variant === "glow"
          ? (event: React.PointerEvent<HTMLButtonElement>) => {
              moverReflexo(event)
              onPointerMove?.(event)
            }
          : onPointerMove
      }
      {...props}
    />
  )
})

export { Button, buttonVariants }
