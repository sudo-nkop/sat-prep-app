# SAT Practice — cross-platform app

A self-contained SAT prep app. Same code runs:
- **In a laptop browser** — full PWA, no installs needed.
- **On Android** — install as a PWA (instant, no APK build), OR build a real `.apk` with the bundled script.

## Folder layout

```
sat-prep-app/
├── www/                   # the entire app (HTML/CSS/JS + questions)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── manifest.json
│   ├── sw.js              # service worker (offline support)
│   ├── vendor/katex/      # KaTeX (math typesetting, vendored for offline)
│   ├── icons/             # 192 + 512 px PNG icons
│   └── data/
│       ├── questions.json # ← add more questions here (LaTeX in $...$)
│       └── README.md      # schema + how to add
├── capacitor-scaffold/    # Capacitor config used by the APK build
├── study-materials/       # standalone markdown cheatsheets + practice sets
├── build-apk.sh           # builds android/app/build/outputs/.../app-debug.apk
├── run-laptop.sh          # starts a local server + opens the browser
└── README.md
```

`study-materials/` is a separate set of plain markdown notes (cheatsheets,
practice problems, answer keys) you can read independently of the app.
The app's question bank lives in `www/data/questions.json`.

## Run on the laptop (zero setup)

```bash
bash run-laptop.sh
```

This starts `python3 -m http.server` on port 8765 and opens the app in your default browser.

You can also just double-click `www/index.html` — but the service worker / install prompt only work over `http://` (not `file://`), so the script is recommended.

## Install on Android (the easy way — no APK build)

1. Run `bash run-laptop.sh` on your laptop, or host the `www/` folder on any web server / GitHub Pages / Netlify / Vercel.
2. On your Android phone, open the URL in **Chrome**.
3. Chrome will offer to install the app. Tap **Install**, or open the menu → **Install app**.
4. The app appears on your home screen, runs full-screen, and works offline once installed.

This is the recommended route — same UX as a native app, no APK signing, no Android SDK required.

## Build a real `.apk` (for sideloading or sharing)

This needs Node 18+, Java 17+, and the Android SDK installed locally. On Fedora/Nobara:

```bash
sudo dnf install nodejs npm java-17-openjdk
# Then install Android Studio once: https://developer.android.com/studio
# After install, run Android Studio → SDK Manager → install Android SDK Platform-Tools, Android API 34, Build-Tools.
# Set in ~/.bashrc:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
```

Then:

```bash
bash build-apk.sh
```

The script:
1. Initializes a Capacitor workspace under `.cap-project/` (first run only).
2. Syncs `www/` into the Android project.
3. Runs `./gradlew assembleDebug`.
4. Copies the result to `sat-practice-debug.apk` in this folder.

Transfer that APK to your phone (USB, Google Drive, etc.), enable "Install unknown apps" for your file manager, and tap the file.

### Hosted alternative (no SDK)
If you don't want to install Android Studio, host the `www/` folder somewhere public (GitHub Pages works) and use [PWABuilder](https://www.pwabuilder.com/) — paste your URL, click "Package for Stores → Android", download a signed APK. No local setup needed.

## Adding more practice problems

Open `www/data/questions.json` and append to the `questions` array. Schema in `www/data/README.md`.

The app reloads from the JSON on every launch — no rebuild needed for the laptop version. For the APK, run `bash build-apk.sh` again to bake the new questions into the package (or have the app fetch a remote URL — see below).

### Pulling from a remote question repo

To make the app fetch from a remote URL (e.g. a GitHub raw file) instead of the bundled JSON:

1. Open `www/app.js`.
2. Find `await fetch('data/questions.json'…)` (in `loadQuestions()`).
3. Replace the URL with your remote raw URL, e.g. `https://raw.githubusercontent.com/<you>/<repo>/main/questions.json`.
4. Reload — the app will pull questions live.

The service worker caches the response so the app still works offline after the first load.

## Notes

- **Practice reminders** use the browser's Notification API. Open Settings → Enable browser notifications. On Android (after PWA install) these appear as system notifications.
- **Streak counter** updates whenever you submit a practice answer for the day.
- **All data is local** — nothing is sent anywhere. Reset under Settings → Reset all data.

## What's tested

- Two sections (Math, Reading & Writing).
- Three timed test modes: full R&W (32 min), full Math (35 min), Mixed mini-test (20 min).
- Practice mode: filter by section, topic, difficulty, count.
- Cheatsheets: math formulas, grammar, reading, test day.
- History of past sessions.

The starter `questions.json` ships with ~50 SAT-style questions covering algebra, advanced math, problem solving, geometry/trig, grammar, reading comprehension, transitions, and rhetorical synthesis. Drop more in to grow the bank.
