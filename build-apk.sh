#!/usr/bin/env bash
# Build the Android APK from this folder.
# Requires: Node 18+, npm, Java 17+, Android SDK (with build-tools, platform-tools).
# On Fedora/Nobara:  sudo dnf install nodejs npm java-17-openjdk
# Android SDK: install Android Studio (https://developer.android.com/studio) once,
#              then accept licenses with `sdkmanager --licenses`.
#
# Usage:  bash build-apk.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCAFFOLD="$HERE/capacitor-scaffold"
PROJECT="$HERE/.cap-project"   # generated workspace, gitignored

# 1. Tooling check
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need node
need npm
need java
[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ] || {
  echo "ANDROID_HOME / ANDROID_SDK_ROOT not set."
  echo "Install Android Studio, then add to ~/.bashrc:"
  echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
  echo "  export PATH=\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin"
  exit 1
}

# 2. Initialize a Capacitor workspace if missing
if [ ! -d "$PROJECT" ]; then
  mkdir -p "$PROJECT"
  cp "$SCAFFOLD/package.json" "$PROJECT/package.json"
  cp "$SCAFFOLD/capacitor.config.json" "$PROJECT/capacitor.config.json"
  cd "$PROJECT"
  npm install
  npx cap add android
else
  cd "$PROJECT"
fi

# 3. Sync the latest www/ into the Android project
npx cap sync android

# 4. Build a debug APK
cd "$PROJECT/android"
./gradlew assembleDebug

APK="$PROJECT/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  cp "$APK" "$HERE/sat-practice-debug.apk"
  echo
  echo "✓ APK built: $HERE/sat-practice-debug.apk"
  echo "  Transfer it to your Android phone, enable 'Install unknown apps' for your file manager,"
  echo "  and tap the file to install."
else
  echo "Build did not produce an APK. Check Gradle output above."
  exit 1
fi
