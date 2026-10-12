import type React from "react"

/**
 * Atualiza as variáveis do efeito `.fx-spotlight` (index.css) com a posição do
 * ponteiro relativa ao elemento. Escreve direto no `style` do elemento — sem
 * estado React, então mover o mouse não re-renderiza o card.
 *
 * Só reage a mouse/caneta: no toque não existe "hover" e o brilho ficaria
 * preso onde o dedo encostou.
 */
export function moverSpotlight(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`)
  el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`)
}

/** Mesmo princípio, para o reflexo do botão `glow` (variáveis --mx/--my). */
export function moverReflexo(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty("--mx", `${event.clientX - rect.left}px`)
  el.style.setProperty("--my", `${event.clientY - rect.top}px`)
}
