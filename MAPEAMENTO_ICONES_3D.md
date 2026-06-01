# 📐 Mapeamento de Ícones 3D para TelaHub

Este documento serve como guia detalhado de mapeamento para que você baixe os ícones 3D premium diretamente do site [3dicons.co](https://3dicons.co/) e substitua os arquivos gerados.

---

## 🎨 Recomendações de Estilo (3dicons.co)

Para garantir uma interface premium e coesa (que converse com o nosso Cinza Mineral `#2D3139` e o tom violeta `#7C3AED` do TelaHub), siga estas diretrizes ao baixar:

1. **Ângulo (Perspective):** Escolha **ISO (Isometric)** para todos os ícones. Isso garante a mesma perspectiva de profundidade em toda a barra de widgets.
2. **Estilo (Color Style):** 
   - **Recomendado:** **Dynamic / Color** (com cores vibrantes e detalhes que contrastam perfeitamente no fundo escuro).
   - **Alternativa Minimalista:** **Clay** (se preferir um estilo monocromático texturizado mais sóbrio).
3. **Formato:** Sempre baixe em **PNG** com **Fundo Transparente**.
4. **Resolução:** Recomenda-se baixar no tamanho médio/alto (ex: `250x250px` ou `500x500px`). A interface do TelaHub renderiza esses ícones nativamente em `40px` a `48px` com a propriedade `object-contain`, mantendo a nitidez perfeita sem pesar no carregamento.

---

## 📂 Onde Salvar os Arquivos
Todos os arquivos baixados devem ser salvos diretamente na pasta pública do frontend:
```bash
c:\Users\binho\Downloads\Projetos de IA\Display - Vendas\TelaHub\frontend\public\icons3d\
```
*Basta renomear o arquivo baixado para o nome correspondente listado abaixo e substituir o arquivo existente.*

---

## 📋 Tabela de Mapeamento (23 Widgets)

| # | Nome do Widget | Arquivo a Substituir (Salvar como) | 🔍 Termo de Busca Sugerido no 3dicons.co | Alternativas de Ícone Comuns no Site |
|---|---|---|---|---|
| **1** | **Imagem** | `image.png` | `camera` ou `image` | Picture, Gallery |
| **2** | **Vídeo** | `video.png` | `film` ou `clapperboard` | Video camera, Play |
| **3** | **Texto** | `text.png` | `notepad` ou `document` | Chat, Chat bubble, Letter-A |
| **4** | **GIF** | `gif.png` | `gift` ou `star` | Play icon, Fire |
| **5** | **Web (iFrame)** | `web.png` | `globe` ou `web` | Earth, Browser |
| **6** | **Relógio** | `clock.png` | `clock` ou `time` | Watch |
| **7** | **Clima** | `weather.png` | `cloud` ou `sun` | Cloud-Sun, Rain |
| **8** | **Completo (Info)** | `full-info.png` | `dashboard` ou `layout` | Graph, Analytics |
| **9** | **RSS** | `rss.png` | `signal` ou `wifi` | Antenna, Broadcast |
| **10**| **Agenda** | `calendar.png` | `calendar` | Schedule, Date |
| **11**| **Notas** | `notes.png` | `sticky-note` ou `notebook` | Pen, Writing-pad |
| **12**| **Tarefas (Todo)** | `todo.png` | `checklist` ou `clipboard` | Task, List |
| **13**| **Contador** | `countdown.png` | `timer` ou `hourglass` | Stop-watch, Sand-clock |
| **14**| **Deveres (Chores)** | `chores.png` | `home` ou `bucket` | Clean, Broom |
| **15**| **Meal Plan** | `meal-plan.png` | `food` ou `utensils` | Burger, Pizza, Fork-and-Knife |
| **16**| **Bolsa (Market)** | `market.png` | `chart` ou `coin` | Graph-up, Trend, Dollar |
| **17**| **Snapshot** | `snapshot.png` | `camera` ou `screenshot` | Eye, Target |
| **18**| **G Docs** | `google-docs.png` | `document` ou `folder` | Doc, Page |
| **19**| **Office Docs** | `office-docs.png` | `book` ou `presentation` | Notebook, Folder-open |
| **20**| **Power BI** | `power-bi.png` | `analytics` ou `graph` | Pie-chart, Stats |
| **21**| **Airtable** | `airtable.png` | `database` ou `grid` | Table, Server |
| **22**| **PDF** | `pdf.png` | `document` ou `file` | PDF book, Sheet |
| **23**| **HTML (Embed)** | `html.png` | `code` ou `developer` | Brackets, Programming |

---

## 🛠️ Como Validar no Navegador
Uma vez que você substituir os arquivos na pasta `frontend/public/icons3d/`, o **Vite (HMR - Hot Module Replacement)** atualizará a interface instantaneamente!

1. Abra o TelaHub no navegador (`http://localhost:3000`).
2. Vá para a **Biblioteca de Widgets** (tanto na barra lateral esquerda quanto no SceneEditor).
3. Verifique se os ícones carregam com fundo transparente e se mantêm o alinhamento centralizado.
