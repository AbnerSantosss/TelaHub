# REFATORAÇÃO TELAHUB 3.0 — PROMPT (cards uniformes + modal corrigido)

Modernize o frontend do TelaHub mantendo **100% da lógica e funcionalidade**. Mude APENAS a camada visual (CSS, JSX markup, estrutura de componentes).

## REGRAS ABSOLUTAS

1. Não altere hooks, fetch, SSE, rotas, contratos de API, nomes exportados.
2. Não remova funcionalidades. Os 23 widgets, ações, modais e fluxos permanecem.
3. Divida arquivos monolíticos (Editor.tsx 231KB e Player.tsx em subcomponentes).
4. Use `React.memo`, `useMemo`, `useCallback` e code-split por rota (Editor/Scheduler/Player lazy).
5. Mantenha dark mode. Visual **profissional e sóbrio** (acentos sutis, não neon carregado).
6. Valide build após cada fase.

---

## DIREÇÃO VISUAL (referência aprovada)

- Dark premium **sóbrio**: fundo `#0a0d16`, superfícies com leve translucidez, bordas hairline.
- Botão primário ("Nova Tela") com gradiente azul + glow discreto. Demais botões **sóbrios** (fundo escuro, borda sutil), NÃO coloridos demais.
- Nav superior: pills com ícone colorido + texto, borda sutil, hover glow leve.
- Cards de tela: **todos do mesmo tamanho**. O que muda é só o conteúdo. O preview da tela é uma "moldura de TV" centralizada — 16:9 (larga) ou 9:16 (estreita e menor).

---

## FASE 1 — SETUP

```bash
npm install motion
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu badge input tabs tooltip switch select scroll-area separator skeleton sonner
```

Paleta dark TelaHub: primary `#2563EB`, accent `#38bdf8`, success `#34d399`, danger `#f87171`, bg `#0a0d16`, text `#e8edf5`.

---

## FASE 2 — CSS BASE (index.css)

```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0d16;
  --color-surface: rgba(255,255,255,0.025);
  --color-surface-2: rgba(255,255,255,0.045);
  --color-border: rgba(255,255,255,0.07);
  --color-border-hover: rgba(56,189,248,0.35);
  --color-text: #e8edf5;
  --color-text-muted: #7b8794;
  --color-accent: #38bdf8;
  --color-accent-2: #2563eb;
  --radius-sm: 0.625rem;
  --radius: 0.875rem;
  --radius-lg: 1.125rem;
  --radius-xl: 1.25rem;
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
}

* { box-sizing: border-box; }
body { background: var(--color-bg); color: var(--color-text); -webkit-font-smoothing: antialiased; }

.container { max-width: 1320px; margin: 0 auto; padding: 0 16px; }
@media (min-width: 640px)  { .container { padding: 0 24px; } }
@media (min-width: 1024px) { .container { padding: 0 32px; } }

@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.animate-pulse-dot { animation: pulse-dot 2s infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## FASE 3 — CARDS DE TELA (mesmo tamanho, preview de TV)

**Princípio:** todos os cards têm o MESMO tamanho. O preview tem **altura fixa**; dentro dele desenhamos uma moldura de TV. 16:9 = moldura larga; 9:16 = moldura estreita e menor, centralizada.

```css
/* GRID — colunas iguais, cards de mesma altura */
.displays-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 24px;
  align-items: stretch;   /* garante mesma altura por linha */
}
@media (max-width: 639px)  { .displays-grid { grid-template-columns: 1fr; gap: 14px; } }
@media (min-width: 640px) and (max-width: 1023px) { .displays-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1440px) { .displays-grid { grid-template-columns: repeat(3, 1fr); } }

/* CARD — flex column, ocupa 100% da altura da célula */
.display-card {
  display: flex; flex-direction: column; height: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: transform 0.3s var(--ease-spring), border-color 0.3s, box-shadow 0.3s;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.display-card:hover {
  transform: translateY(-5px);
  border-color: var(--color-border-hover);
  box-shadow: 0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(56,189,248,0.12);
}

/* PREVIEW — ALTURA FIXA igual para todos */
.display-preview {
  position: relative;
  height: 190px;                       /* fixo = todos iguais */
  background:
    radial-gradient(circle at 50% 45%, rgba(56,189,248,0.06), transparent 70%),
    rgba(0,0,0,0.22);
  border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center;
}

/* MOLDURA DE TV dentro do preview */
.tv-frame {
  height: 64%;
  aspect-ratio: 16 / 9;                 /* horizontal = largo */
  border: 2px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  background: rgba(0,0,0,0.25);
  display: grid; place-items: center;
  transition: border-color 0.3s, transform 0.3s var(--ease-spring);
}
.tv-frame.vertical {
  height: 78%;
  aspect-ratio: 9 / 16;                 /* vertical = estreito e menor */
}
.display-card:hover .tv-frame { border-color: rgba(56,189,248,0.30); transform: scale(1.04); }
.tv-frame svg { color: rgba(255,255,255,0.18); }
.display-card:hover .tv-frame svg { color: rgba(56,189,248,0.35); }

/* BADGE STATUS */
.status-badge {
  position: absolute; top: 12px; left: 12px;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
  padding: 5px 11px; border-radius: 999px; z-index: 10;
}
.status-badge.online  { background: rgba(52,211,153,0.12); color: #34d399; border: 1px solid rgba(52,211,153,0.3); }
.status-badge.offline { background: rgba(123,135,148,0.12); color: #8b96a3; border: 1px solid rgba(123,135,148,0.25); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-badge.online .status-dot { box-shadow: 0 0 8px currentColor; }

/* MENU (⋮) */
.menu-button {
  position: absolute; top: 11px; right: 11px;
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(0,0,0,0.35); border: 1px solid var(--color-border);
  color: var(--color-text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; z-index: 20;
}
.menu-button:hover { color: var(--color-text); border-color: var(--color-border-hover); }

/* BODY — flex:1 empurra rodapé pra baixo, alinhando todos os cards */
.display-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.display-title { font-size: 18px; font-weight: 700; margin: 0; line-height: 1.2; }
.display-code { font-family: monospace; font-size: 11px; letter-spacing: 0.5px; color: var(--color-text-muted); text-transform: uppercase; }

/* botões */
.btn-open {                       /* "Abrir Designer" — sóbrio, não chamativo */
  width: 100%; padding: 12px; border-radius: var(--radius);
  background: var(--color-surface-2); border: 1px solid var(--color-border);
  color: var(--color-text); font-weight: 600; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.25s var(--ease-spring); margin-top: auto;   /* gruda no fundo */
}
.btn-open:hover { background: var(--color-surface-3, rgba(255,255,255,0.06)); border-color: var(--color-border-hover); }

.display-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.btn-sub {
  padding: 9px; border-radius: var(--radius-sm);
  background: transparent; border: 1px solid var(--color-border);
  color: var(--color-text-muted); font-size: 12px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.2s;
}
.btn-sub:hover { color: var(--color-text); border-color: var(--color-border-hover); }
```

**Markup do card** (use ícone `Monitor` para 16:9 e `Smartphone` para 9:16):

```tsx
<div className="display-card">
  <div className="display-preview">
    <div className={`status-badge ${isOnline ? "online" : "offline"}`}>
      <span className={`status-dot ${isOnline ? "animate-pulse-dot" : ""}`} />
      {isOnline ? "ONLINE" : "OFFLINE"}
    </div>
    <DropdownMenu>{/* ⋮ com Renomear, Capa, Config, Excluir */}</DropdownMenu>
    <div className={`tv-frame ${isVertical ? "vertical" : ""}`}>
      {isVertical ? <Smartphone size={32} /> : <Monitor size={40} />}
    </div>
  </div>
  <div className="display-body">
    <h3 className="display-title">{display.name}</h3>
    <span className="display-code">ID: {display.code}</span>
    <button className="btn-open" onClick={onEdit}><Pencil size={15}/> Abrir Designer</button>
    <div className="display-actions">
      <button className="btn-sub" onClick={onCopy}><Copy size={14}/> Copiar URL</button>
      <button className="btn-sub" onClick={onView}><ExternalLink size={14}/> Visualizar</button>
    </div>
  </div>
</div>
```

---

## FASE 4 — MODAL DE CONFIGURAÇÕES (CORRIGIR BUG)

**Causa do bug:** o modal está "deslocado/quebrado" porque há `position:fixed` + `transform:translate(-50%,-50%)` CUSTOM sobrepondo o posicionamento que o Radix/shadcn Dialog **já aplica**. Isso gera dupla transformação → modal fora do centro / cortado.

**Correção — escolha UMA abordagem e não misture:**

### ✅ Abordagem A (recomendada): usar o Dialog do shadcn e NÃO sobrescrever posição
No `<DialogContent>`, estilize apenas **aparência** (cores, borda, raio, largura, scroll). NÃO adicione `position`, `top`, `left` nem `transform` — o Radix centraliza sozinho.

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className="
      w-[95vw] max-w-[560px] max-h-[90vh] overflow-y-auto
      bg-[#0e121c] border border-white/10 rounded-2xl p-0
      shadow-[0_24px_56px_rgba(0,0,0,0.55)]
    "
  >
    <div className="flex items-center justify-between p-5 border-b border-white/10">
      <h2 className="text-lg font-bold">Configurações</h2>
      <DialogClose className="text-text-muted hover:text-text rounded-lg p-1"><X size={18}/></DialogClose>
    </div>
    <div className="p-5 flex flex-col gap-4">{/* conteúdo */}</div>
    <div className="flex justify-end gap-2 p-4 border-t border-white/10">
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
      <Button onClick={onSave}>Salvar</Button>
    </div>
  </DialogContent>
</Dialog>
```

Garanta que o overlay do shadcn use `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`.

### Abordagem B (só se NÃO usar Radix): modal manual
Aí sim use `position:fixed; inset:0` num overlay flex centralizado (sem transform no filho):

```css
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
}
.modal {
  width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto;
  background: #0e121c; border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-xl); box-shadow: 0 24px 56px rgba(0,0,0,0.55);
}
@media (max-width: 639px) { .modal { max-width: none; } }
```

**Regra de ouro do modal:** centralizar via FLEX no overlay (não via transform no conteúdo). Sempre `max-height: 90vh` + `overflow-y: auto`. Largura `w-[95vw] max-w-[560px]` para responsividade.

---

## FASE 5 — MOTION

```ts
export const staggerGrid = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
export const cardItem = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16,1,0.3,1] } } };
```
- Grid: container `variants={staggerGrid}`, cada card `variants={cardItem}`.
- Cards: `whileHover={{ y: -5 }}`.
- Rotas: `<AnimatePresence mode="wait">`.

---

## FASE 6 — DECOMPOSIÇÃO

- **Dashboard.tsx** → `TopBar`, `StatsRow`, `ModuleNav`, `DisplayCard`, `DisplayGrid`, `modals/*`. Migrar modais p/ Dialog, toasts p/ sonner. Preservar polling/ações/permissões.
- **Editor.tsx** → `WidgetLibrary`, `Canvas`, `PropertiesPanel`, `SceneTabs`, `LayersModal`, `Toolbar`. Lazy-load dos 23 widgets. `React.memo` no canvas. Preservar drag/transições/fundos/save.
- **Scheduler.tsx** → reusar SceneEditor. Preservar injeção/horários/"Todas as Telas".
- **Player.tsx** → **NÃO tocar** em SSE/polling/heartbeat/transições. Só refinar tela de pareamento + lazy widgets. Testar muito.

---

## FASE 7 — PERFORMANCE

Route code-split (Editor/Scheduler/Player lazy + Suspense). 23 widgets em `React.lazy`. Memoize listas. Lazy images. Rodar `npx vite-bundle-visualizer` e reportar JS inicial antes/depois.

---

## ✅ ACEITE

✓ Todos os fluxos funcionam (login, dashboard, editor, scheduler, player)
✓ **Cards de tela TODOS do mesmo tamanho**; muda só o conteúdo
✓ Preview com altura fixa; moldura 16:9 larga e 9:16 estreita/menor centralizada
✓ Botão "Abrir Designer" sóbrio; "Nova Tela" com gradiente
✓ **Modal de configurações centralizado e responsivo (bug corrigido)**
✓ Grid responsivo: mobile 1col, tablet 2col, desktop 3col
✓ Dark profissional, hover fluido, status online pulsante
✓ Build verde, sem overflow horizontal, `prefers-reduced-motion` ok

---

**Execute fase por fase. Valide o build a cada uma. Commit por fase.**
