# shiva-preetham.github.io

Personal portfolio of **Shiva Preetham Chelimila**, AI/ML engineer and B.Tech CSE student at JIIT Noida.

**Live:** https://shiva-preetham.github.io

A single static page (HTML, CSS, a little vanilla JS), no build step, hosted free on GitHub Pages.
A Formula 1 theme throughout: a start-lights loading screen that times the real page load
(purple, green or yellow like F1 sectors), a live-timing tower, Max Verstappen's number 3 RB22,
a starting grid of projects with onboard screenshots, a Team Radio feed of the latest pushes
(live from the GitHub API), a 2026 season calendar of hackathons, and a circuit map with a
steering-wheel display (scroll speed, gear, DRS).

## Edit

| What | Where |
|---|---|
| Text, projects, links | `index.html` |
| Colours, fonts, layout | `styles.css` (tokens at the top) |
| Loader, timing tower, circuit map + HUD, Team Radio feed, copy email, menu | `main.js` |
| Car photo, project screenshots | `assets/img/rb22-verstappen.webp`, `assets/img/onboard/` |
| Résumé (no phone number) | `assets/Shiva_Preetham_Chelimila_Resume.pdf` |

Preview locally: `python -m http.server 8000`, then open http://localhost:8000.
Push to `main` and GitHub Pages redeploys within a minute or two.
After changing `styles.css` or `main.js`, bump the `?v=` tag on their links in `index.html` so browsers fetch the new file.

## Credits

RB22 photo: [Liauzh](https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Red_Bull_-_Max_Verstappen_-_FP1.jpg), CC BY 4.0, via Wikimedia Commons (colour-graded).
