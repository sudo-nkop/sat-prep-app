#!/usr/bin/env python3
"""
Command Centre — cross-platform desktop launcher.

macOS  → pywebview  (WKWebView, ships with macOS)
Linux  → pywebview  (WebKitGTK) if installed, otherwise GTK directly
Windows→ pywebview  (EdgeWebView2 / IE fallback)

Install pywebview:
  macOS/Linux/Windows:  pip install pywebview
  Fedora/Nobara extra:  sudo dnf install python3-gobject webkit2gtk4.1
"""

import sys
import os
import platform
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH  = os.path.join(SCRIPT_DIR, 'command-centre.html')
PLATFORM   = platform.system()   # 'Darwin', 'Linux', 'Windows'


def open_in_browser(url: str) -> None:
    """Open a URL in the system default browser, cross-platform."""
    if PLATFORM == 'Darwin':
        subprocess.Popen(['open', url])
    elif PLATFORM == 'Linux':
        subprocess.Popen(['xdg-open', url])
    else:
        os.startfile(url)   # Windows


# ── pywebview launcher (macOS, Linux, Windows) ───────────────────────────────

def launch_pywebview() -> None:
    import webview  # type: ignore

    class BrowserApi:
        """Exposed to JS as window.pywebview.api — used to open external links."""
        def open_url(self, url: str) -> None:
            open_in_browser(url)

    window = webview.create_window(
        title   = 'Command Centre',
        url     = f'file://{HTML_PATH}',
        js_api  = BrowserApi(),
        width   = 1280,
        height  = 820,
        min_size= (800, 600),
    )

    def on_loaded() -> None:
        # Intercept every external <a> click and hand it to the system browser.
        # Runs once per page load; the guard prevents double-installation on
        # any future in-app navigation.
        window.evaluate_js("""
            (function() {
                if (window._ccLinkInterceptInstalled) return;
                window._ccLinkInterceptInstalled = true;
                document.addEventListener('click', function(e) {
                    var a = e.target.closest('a[href]');
                    if (!a) return;
                    var href = a.getAttribute('href') || '';
                    if (href.startsWith('file://') ||
                        href.startsWith('about:')  ||
                        href.startsWith('javascript:')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.pywebview && window.pywebview.api) {
                        window.pywebview.api.open_url(a.href);
                    }
                }, true);
            })();
        """)

    window.events.loaded += on_loaded

    # On macOS pywebview uses the Cocoa event loop; on Linux it uses GTK.
    # debug=False keeps the inspector hidden in production.
    webview.start(debug=False)


# ── GTK fallback (Linux only) ─────────────────────────────────────────────────

def launch_gtk() -> None:
    """Direct GTK + WebKit2GTK launch — no pywebview dependency."""
    import gi
    gi.require_version('Gtk', '3.0')
    from gi.repository import Gtk  # type: ignore

    # WebKit2GTK: try the newer 4.1 API first (Fedora 38+, Nobara), then 4.0
    WebKit2 = None
    for ver in ('4.1', '4.0'):
        try:
            gi.require_version('WebKit2', ver)
            from gi.repository import WebKit2 as _wk  # type: ignore
            WebKit2 = _wk
            break
        except (ValueError, ImportError):
            continue

    if WebKit2 is None:
        raise ImportError('WebKit2GTK not found')

    win = Gtk.Window(title='Command Centre')
    win.set_default_size(1280, 820)
    win.set_position(Gtk.WindowPosition.CENTER)
    try:
        win.set_icon_name('office-calendar')
    except Exception:
        pass
    win.connect('destroy', Gtk.main_quit)

    webview = WebKit2.WebView()
    settings = webview.get_settings()
    settings.set_enable_javascript(True)
    settings.set_javascript_can_open_windows_automatically(False)

    # Enable localStorage inside file:// URIs
    for prop in ('allow-file-access-from-file-urls', 'allow-universal-access-from-file-urls'):
        try:
            settings.set_property(prop, True)
        except Exception:
            pass

    def on_decide_policy(wv, decision, dtype):
        if dtype == WebKit2.PolicyDecisionType.NAVIGATION_ACTION:
            uri = decision.get_navigation_action().get_request().get_uri() or ''
            if not uri.startswith('file://') and not uri.startswith('about:'):
                subprocess.Popen(['xdg-open', uri])
                decision.ignore()
                return True
        return False

    webview.connect('decide-policy', on_decide_policy)

    scrolled = Gtk.ScrolledWindow()
    scrolled.set_hexpand(True)
    scrolled.set_vexpand(True)
    scrolled.add(webview)
    win.add(scrolled)

    webview.load_uri(f'file://{HTML_PATH}')
    win.show_all()
    Gtk.main()


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    if not os.path.isfile(HTML_PATH):
        print(f'ERROR: app file not found: {HTML_PATH}')
        sys.exit(1)

    # 1. Try pywebview — works on macOS, Linux, and Windows
    try:
        import webview  # noqa: F401
        launch_pywebview()
        return
    except ImportError:
        pass

    # 2. On Linux, fall back to GTK + WebKit2GTK directly
    if PLATFORM == 'Linux':
        try:
            launch_gtk()
            return
        except Exception as exc:
            print(f'GTK launch failed: {exc}')

    # 3. Nothing worked — print helpful install instructions
    print()
    print('Command Centre needs a WebKit-based renderer. Install one of:')
    print()
    if PLATFORM == 'Darwin':
        print('  pip install pywebview        # macOS (uses system WebKit)')
    elif PLATFORM == 'Linux':
        print('  pip install pywebview        # needs WebKitGTK, then run again')
        print('  sudo dnf install python3-gobject webkit2gtk4.1   # Fedora / Nobara')
        print('  sudo apt install python3-gi gir1.2-webkit2-4.0  # Ubuntu / Debian')
    else:
        print('  pip install pywebview        # Windows (uses EdgeWebView2)')
    print()
    sys.exit(1)


if __name__ == '__main__':
    main()
