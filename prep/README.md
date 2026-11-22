# Interview Field Manual

Live at **https://shiva-preetham.github.io/prep/**. It's a static site with no build step. Every page is a Markdown file in `content/`, so you edit Markdown and GitHub Pages redeploys in about a minute.

## Editing from a phone or laptop

1. Open any sheet and tap **Edit this sheet on GitHub** at the bottom. You can also browse `prep/content/` on GitHub.
2. Tap the pencil, make your change, and commit to `main`.
3. Wait about a minute, then refresh the site. The service worker fetches from the network first, so you get the new content when you're online.

## Layout

```text
prep/
  index.html              app shell
  assets/app.js           router, Markdown rendering, quizzes, search, progress
  assets/widgets.js       interactive simulators
  assets/app.css          theme (light + dark)
  vendor/                 marked, highlight.js, mermaid (vendored, no CDN)
  content/manifest.json   list of sheets, groups, and the pattern matrix
  content/**/*.md         the sheets
```

## Adding a new sheet

1. Create `content/systems/my-system.md`.
2. Add an entry to `pages` in `content/manifest.json`:

```json
{ "id": "my-system", "sheet": "S-21", "group": "systems", "title": "My System",
  "file": "systems/my-system.md", "kind": ["HLD", "LLD"], "level": 2,
  "tracker": "HLD 13", "tags": ["caching", "message queue"], "blurb": "One line on what it covers." }
```

`tags` that match names in `patterns` fill the pattern matrix. `level` is 1–3, the difficulty dots.

## Markdown conventions

| You write | You get |
|---|---|
| `<!-- tab: HLD -->` | Starts a new tab. Everything up to the next marker belongs to this tab. |
| `### Q: question` followed by text | A collapsible interview answer |
| `> [!TIP]`, `> [!TRAP]`, `> [!NOTE]`, `> [!SAY]` on the first line of a quote | Callout boxes |
| ` ```mermaid ` block | A diagram (flowchart, sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram, mindmap). Tap to zoom. An optional first line `%% caption: text` adds a caption. |
| ` ```quiz ` block | An MCQ set, with scores saved on the device |
| ` ```widget name ` block | An interactive simulator: `estimator`, `hashring`, `tokenbucket`, `lru`, `scheduler`, `pagereplace`, `subnet` |

Quiz format:

```text
Q: Question text?
- wrong option
* correct option
- wrong option
> Explanation shown after answering.
```

Leave a blank line between questions. Every `quiz` block also feeds the mixed MCQ drill automatically.

### Mermaid gotchas

- Don't use `;` inside sequence diagram messages.
- Write class bodies across several lines, not `class A { +x +y }` on one line.
- Use `<br/>` for line breaks inside node labels and wrap labels containing `()` or `:` in quotes.

## After changing code in `assets/`

Bump `?v=1` in `index.html` and `CACHE` in `sw.js` so phones pick up the new version.

## Local preview

```bash
cd shiva-preetham.github.io && python3 -m http.server 8000
# open http://localhost:8000/prep/
```

Progress (studied sheets and quiz scores) is stored in your browser's localStorage, per device.
