#include <Arduino.h>
#include <LittleFS.h>

#include "config.h"
#include "core/display.h"
#include "core/input.h"
#include "core/wifi_server.h"
#include "settings/settings.h"
#include "modes/mode_base.h"
#include "modes/pomodoro/pomodoro.h"
#include "modes/script_runner/script_runner.h"
#include "modes/experimental/experimental.h"
#include "modes/settings_mode.h"

// ── Singletons ────────────────────────────────────────────────────────────
static DisplayManager display;
static InputManager   input;
static WifiServer     wifi;
static Settings       settings;

static PomodoroMode    modePomodoro;
static ScriptRunnerMode modeScript(wifi);
static ExperimentalMode modeExp(wifi);
static SettingsMode    modeSettings;

// ── Main menu ─────────────────────────────────────────────────────────────
static const char* MENU_LABELS[] = { "Pomodoro", "Script Runner", "Experimental", "Settings" };
static ModeBase*   MODES[]       = { &modePomodoro, &modeScript, &modeExp, &modeSettings };
static constexpr uint8_t MODE_COUNT = 4;

static uint8_t   menuSel    = 0;
static ModeBase* activeMode = nullptr;

static void drawMainMenu() {
    display.clear();
    display.drawTitle("ESP32 Flipper");
    for (uint8_t i = 0; i < MODE_COUNT; i++)
        display.drawMenuItem(i, MENU_LABELS[i], i == menuSel);
    display.drawStatusBar("", "OK=Select");
    display.show();
}

static void enterMode(uint8_t idx) {
    activeMode = MODES[idx];
    activeMode->enter(display, settings);
}

// ── Setup ─────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);

    if (!LittleFS.begin(true))
        Serial.println("[WARN] LittleFS mount failed");

    settings.load();

    if (!display.begin())
        Serial.println("[WARN] OLED not found — check wiring");

    input.begin();

    if (settings.get().wifiAutoStart) {
        wifi.begin(
            [](const String& s) { modeScript.receiveScript(s); },
            [](const String& c) { modeExp.receiveCode(c); }
        );
    }

    drawMainMenu();
}

// ── Loop ──────────────────────────────────────────────────────────────────
void loop() {
    NavEvent ev = input.read();

    if (activeMode == nullptr) {
        // Main menu navigation
        if (ev == NavEvent::UP)      { menuSel = (menuSel + MODE_COUNT - 1) % MODE_COUNT; drawMainMenu(); }
        if (ev == NavEvent::DOWN)    { menuSel = (menuSel + 1) % MODE_COUNT; drawMainMenu(); }
        if (ev == NavEvent::CONFIRM) enterMode(menuSel);
    } else {
        bool still = activeMode->update(display, ev, settings);
        if (!still) {
            activeMode->exit();
            activeMode = nullptr;
            drawMainMenu();
        }
    }

    delay(10);
}
