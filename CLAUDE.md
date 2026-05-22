# SAT Prep App — Agent Notes

## Deployment
The app is deployed via **GitHub Pages** from the `main` branch, serving the `www/` directory.
Changes only go live after a PR is merged into `main` — pushing to a feature branch does NOT update the live site.

## Project Structure
- `www/` — all front-end files (served as-is, no build step)
- `www/index.html` — HTML structure and all screens
- `www/app.js` — all application logic (vanilla JS, single file)
- `www/styles.css` — all styling (CSS variables for theming)
- `www/data/questions.json` — question bank

## Tech Stack
- Vanilla HTML/CSS/JavaScript — no framework, no bundler
- CSS custom properties for theming (light/dark + custom accent color)
- Progressive Web App (PWA) with service worker (`www/sw.js`)
- `localStorage` for persisting settings, stats, and history
