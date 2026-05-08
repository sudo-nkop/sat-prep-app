#!/usr/bin/env bash
# install.sh — Install Command Centre on Nobara/Fedora (Linux) or macOS
set -euo pipefail

OS="$(uname -s)"   # Linux | Darwin
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Command Centre Installer ==="
echo "Platform: $OS"

# ────────────────────────────────────────────────────────────────────────────
# macOS
# ────────────────────────────────────────────────────────────────────────────
if [[ "$OS" == "Darwin" ]]; then
    INSTALL_DIR="$HOME/Library/Application Support/CommandCentre"
    echo ""
    echo "Checking dependencies…"

    # Ensure pip / pywebview
    if ! python3 -c "import webview" 2>/dev/null; then
        echo "Installing pywebview…"
        pip3 install --quiet pywebview
    else
        echo "  pywebview: OK"
    fi

    echo ""
    echo "Installing app to $INSTALL_DIR …"
    mkdir -p "$INSTALL_DIR"
    cp "$SCRIPT_DIR/command-centre.html" "$INSTALL_DIR/"
    cp "$SCRIPT_DIR/command-centre.py"  "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/command-centre.py"

    # Create a double-clickable .command launcher on the Desktop
    LAUNCHER="$HOME/Desktop/Command Centre.command"
    cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
python3 "$INSTALL_DIR/command-centre.py"
EOF
    chmod +x "$LAUNCHER"

    # Create a shell alias in common profiles
    for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
        if [[ -f "$rc" ]] && ! grep -q 'command-centre' "$rc" 2>/dev/null; then
            echo "" >> "$rc"
            echo "# Command Centre" >> "$rc"
            echo "alias command-centre='python3 \"$INSTALL_DIR/command-centre.py\"'" >> "$rc"
        fi
    done

    echo ""
    echo "=== Done! ==="
    echo ""
    echo "  Double-click 'Command Centre.command' on your Desktop"
    echo "  Or open a new terminal and run: command-centre"
    echo ""

# ────────────────────────────────────────────────────────────────────────────
# Linux (Fedora / Nobara / Debian / Ubuntu)
# ────────────────────────────────────────────────────────────────────────────
elif [[ "$OS" == "Linux" ]]; then
    INSTALL_DIR="$HOME/.local/share/command-centre"
    DESKTOP_DIR="$HOME/.local/share/applications"
    BIN_DIR="$HOME/.local/bin"

    echo ""
    echo "Checking dependencies…"

    # Detect package manager
    if command -v dnf &>/dev/null; then
        PKG_MGR="dnf"
    elif command -v apt &>/dev/null; then
        PKG_MGR="apt"
    else
        PKG_MGR=""
    fi

    # Try pywebview first (preferred)
    if ! python3 -c "import webview" 2>/dev/null; then
        echo "Installing pywebview…"
        pip3 install --quiet pywebview || python3 -m pip install --quiet --user pywebview || true
    else
        echo "  pywebview: OK"
    fi

    # Ensure GTK + WebKit2GTK as fallback (Fedora/Nobara)
    if [[ "$PKG_MGR" == "dnf" ]]; then
        need=()
        python3 -c "import gi" 2>/dev/null || need+=(python3-gobject)
        if ! python3 -c "
import gi
for v in ('4.1','4.0'):
    try:
        gi.require_version('WebKit2',v)
        from gi.repository import WebKit2
        raise SystemExit(0)
    except: pass
raise SystemExit(1)" 2>/dev/null; then
            if dnf info webkit2gtk4.1 &>/dev/null 2>&1; then need+=(webkit2gtk4.1)
            else need+=(webkit2gtk4.0); fi
        fi
        if [[ ${#need[@]} -gt 0 ]]; then
            echo "Installing system packages: ${need[*]}"
            sudo dnf install -y "${need[@]}"
        fi
    elif [[ "$PKG_MGR" == "apt" ]]; then
        need=()
        python3 -c "import gi" 2>/dev/null || need+=(python3-gi)
        dpkg -l gir1.2-webkit2-4.1 &>/dev/null 2>&1 || \
        dpkg -l gir1.2-webkit2-4.0 &>/dev/null 2>&1 || \
            need+=(gir1.2-webkit2-4.0)
        if [[ ${#need[@]} -gt 0 ]]; then
            echo "Installing system packages: ${need[*]}"
            sudo apt install -y "${need[@]}"
        fi
    fi

    echo ""
    echo "Installing app to $INSTALL_DIR …"
    mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR" "$BIN_DIR"
    cp "$SCRIPT_DIR/command-centre.html" "$INSTALL_DIR/"
    cp "$SCRIPT_DIR/command-centre.py"  "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/command-centre.py"

    # Shell wrapper
    cat > "$BIN_DIR/command-centre" <<EOF
#!/usr/bin/env bash
exec python3 "$INSTALL_DIR/command-centre.py" "\$@"
EOF
    chmod +x "$BIN_DIR/command-centre"

    # .desktop entry
    sed "s|Exec=.*|Exec=$INSTALL_DIR/command-centre.py|" \
        "$SCRIPT_DIR/command-centre.desktop" \
        > "$DESKTOP_DIR/command-centre.desktop"
    chmod 644 "$DESKTOP_DIR/command-centre.desktop"
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

    echo ""
    echo "=== Done! ==="
    echo ""
    echo "  Run from terminal:  command-centre"
    echo "  Or search 'Command Centre' in your app menu."
    echo ""

else
    echo "Unsupported OS: $OS"
    echo "On Windows: pip install pywebview, then run command-centre.py directly."
    exit 1
fi

# Offer to launch now
read -rp "Launch Command Centre now? [y/N] " ans
if [[ "${ans,,}" == "y" ]]; then
    nohup python3 "${INSTALL_DIR}/command-centre.py" &>/dev/null &
fi
