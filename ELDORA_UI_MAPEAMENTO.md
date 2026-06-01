# 📐 Mapeamento e Integração da Eldora UI no TelaHub

Este documento detalha o mapeamento, o processo de setup e a implementação dos componentes premium da biblioteca **Eldora UI** integrados ao TelaHub.

---

## 📥 Passo 1: Comandos de Instalação de Dependências
Para suportar os novos componentes interativos e as animações fluidas a 60fps, instale as seguintes dependências no diretório `frontend`:

```bash
# Executado com sucesso no diretório frontend/
npm install clsx tailwind-merge
```

---

## 🔧 Passo 2: Utilitário `cn`
Criado em `frontend/libs/utils.ts` para combinar condicionalmente classes do Tailwind e resolver conflitos de estilos com segurança:

```typescript
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 🎨 Passo 3: Configurações do Tailwind CSS v4 (`index.css`)
O TelaHub utiliza **Tailwind CSS v4 (CSS-First)**. As configurações de animações, keyframes e variáveis personalizadas foram injetadas diretamente na diretiva `@theme` do arquivo `frontend/index.css`:

```css
@theme {
  --font-sans: 'Geist', 'Outfit', 'Inter', sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
  
  /* Eldora UI custom animations & keyframes */
  --animate-gradient-x: gradient-x 6s ease infinite;
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite;

  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(0.98); }
    50% { opacity: 0.55; transform: translate(-50%, -50%) scale(1.02); }
  }
}
```

---

## 🧩 Passo 4: Mapeamento de Novos Componentes Criados

### 1. `SmartCanvasBackground.tsx`
* **Local:** `frontend/components/SmartCanvasBackground.tsx`
* **Função:** Wrapper decorativo para o React Grid Layout. Renderiza o efeito animado **"Photon Beam"** (feixes de luz neon pulsantes criados com animações SVG infinitas no Framer Motion) com opacidade controlável para assegurar a legibilidade dos cartões de widgets em Smart TVs corporativas.
* **Propriedades (Props):**
  * `children` (ReactNode): Canvas ou grid de widgets.
  * `opacity` (number): Padrão `0.20` para balancear contraste.
  * `className` (string): Estilos adicionais.

---

### 2. `RealtimeBroadcastBanner.tsx`
* **Local:** `frontend/components/RealtimeBroadcastBanner.tsx`
* **Função:** Banner/Modal reativo de alerta de alta urgência (comunicados de RH, avisos gerais ou emergências). O texto de entrada do alerta utiliza a animação **"Word Pull Up Text"** com staggers e spring da Eldora UI para um efeito de leitura extremamente premium e dinâmico.
* **Propriedades (Props):**
  * `isOpen` (boolean): Controla exibição.
  * `title` (string): Título com efeito Word Pull Up.
  * `message` (string): Texto de corpo com efeito Word Pull Up.
  * `type` (`emergency` | `rh` | `alert` | `general`): Define o tom e o esquema visual do aviso.
  * `onClose` (function): Callback de confirmação/fechamento.

---

### 3. `TelemetryWidget.tsx`
* **Local:** `frontend/components/TelemetryWidget.tsx`
* **Função:** Painel corporativo B2B de logs ou tarefas alimentado via SSE (Server-Sent Events). Utiliza o componente **"Animated List"** integrado ao Framer Motion Layout para que novas atualizações e tarefas empurrem suavemente as antigas para baixo com animações de mola (*spring*). No cabeçalho, renderiza o **"Animated Badge"** que pulsa em Verde Esmeralda quando o status do display for `online`.
* **Propriedades (Props):**
  * `status` (`online` | `offline`): Status de pareamento da TV.
  * `items` (TelemetryItem[]): Lista de atividades em tempo real.
  * `title` (string): Título do widget.
