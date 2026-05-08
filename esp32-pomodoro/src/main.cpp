// ─────────────────────────────────────────────────────────────────────────────
//  ESP32 Pomodoro Timer
//  Hardware:  ESP32 devkit  |  SSD1306 0.96" OLED (I2C)  |  5-pin joystick
// ─────────────────────────────────────────────────────────────────────────────
#include <Arduino.h>
#include <Wire.h>
#include <time.h>

#include "config.h"
#include "joystick.h"
#include "pomodoro.h"
#include "display.h"

// ─────────────────────────────────────────────────────────────────────────────
//  Application state machine
// ─────────────────────────────────────────────────────────────────────────────
enum class AppState {
    CLOCK,           // idle: show current time
    TIMER_RUN,       // pomodoro / break running
    TIMER_PAUSE,     // timer paused
    ALERT,           // full-screen flash at session end
    PROMPT,          // "Continue?" dialog after flash
    MENU,            // main menu
    SETTINGS,        // settings editor
    SET_TIME         // manual time entry
};

// ─────────────────────────────────────────────────────────────────────────────
//  Global objects
// ─────────────────────────────────────────────────────────────────────────────
static Joystick       joy;
static PomodoroTimer  pomo;
static DisplayManager disp;

static AppState appState   = AppState::CLOCK;
static bool     needRedraw = true;

// ─── Time tracking ────────────────────────────────────────────────────────
static bool         hasNTP          = false;
// Manual fallback: we store a base epoch + the millis() at which it was set
static time_t       manualEpoch     = 0;
static unsigned long manualEpochAt  = 0;

bool getCurrentTime(struct tm* out) {
    if (hasNTP) {
        return getLocalTime(out);
    }
    if (manualEpochAt > 0) {
        time_t now = manualEpoch + (millis() - manualEpochAt) / 1000UL;
        localtime_r(&now, out);
        return true;
    }
    return false;
}

// ─── Settings ────────────────────────────────────────────────────────────
struct Settings {
    int workMin   = DEF_WORK_MIN;
    int shortMin  = DEF_SHORT_MIN;
    int longMin   = DEF_LONG_MIN;
    int sessions  = DEF_SESSIONS;
} cfg;

void applySettings() {
    pomo.setDurations(cfg.workMin, cfg.shortMin, cfg.longMin, cfg.sessions);
}

// ─── Menu ────────────────────────────────────────────────────────────────
static const char* MENU_ITEMS[] = {
    "Start Pomodoro",
    "Settings",
    "Reset Count",
    "Set Time"
};
static const int MENU_COUNT = 4;
static int menuCursor = 0;

// ─── Settings screen ─────────────────────────────────────────────────────
static int  settingsCursor  = 0;
static bool settingsEditing = false;

// ─── Prompt screen ───────────────────────────────────────────────────────
static int promptCursor = 0;   // 0=Continue, 1=Skip Break
// Stored at the moment the session ends (for display in the prompt)
static const char* alertedLabel = "";
static int         alertedSec   = 0;

// ─── Set Time screen ─────────────────────────────────────────────────────
static int setTimeHH     = 12;
static int setTimeMM     =  0;
static int setTimeCursor =  0;   // 0=HH, 1=MM

// ─── Alert flash ─────────────────────────────────────────────────────────
static unsigned long alertStart   = 0;
static bool          lastInverted = false;

// ─────────────────────────────────────────────────────────────────────────────
//  State transition helper  – flushes joystick + forces redraw
// ─────────────────────────────────────────────────────────────────────────────
void goTo(AppState next) {
    appState   = next;
    needRedraw = true;
    joy.flush();
}

// ─────────────────────────────────────────────────────────────────────────────
//  State handlers
// ─────────────────────────────────────────────────────────────────────────────

// ─── CLOCK ───────────────────────────────────────────────────────────────────
void handleClock(JoyInput in) {
    if (needRedraw) {
        struct tm ti;
        bool ok = getCurrentTime(&ti);
        disp.drawClock(ok ? &ti : nullptr, ok);
        needRedraw = false;
    }

    // Refresh every second for the ticking clock
    static unsigned long lastSec = 0;
    if (millis() - lastSec >= 1000) {
        lastSec    = millis();
        needRedraw = true;
    }

    if (in == JoyInput::PRESS) {
        menuCursor = 0;
        goTo(AppState::MENU);
    }
}

// ─── TIMER (running) ─────────────────────────────────────────────────────────
void handleTimerRun(JoyInput in) {
    if (needRedraw) {
        struct tm ti;
        bool ok = getCurrentTime(&ti);
        disp.drawTimer(ok ? &ti : nullptr, ok,
                       pomo.sessionLabel(),
                       pomo.getRemaining(), pomo.getTotal(),
                       pomo.getPomoCount(), pomo.getSessionsBeforeLong(),
                       false);
        needRedraw = false;
    }

    static unsigned long lastSec = 0;
    if (millis() - lastSec >= 1000) {
        lastSec    = millis();
        needRedraw = true;
    }

    if (in == JoyInput::PRESS) {
        pomo.pause();
        goTo(AppState::TIMER_PAUSE);
    } else if (in == JoyInput::LONG_PRESS) {
        pomo.stop();
        menuCursor = 0;
        goTo(AppState::MENU);
    } else if (in == JoyInput::DOUBLE_PRESS) {
        alertedLabel = pomo.sessionLabel();
        alertedSec   = pomo.getTotal();
        pomo.forceComplete();
        alertStart   = millis();
        lastInverted = false;
        goTo(AppState::ALERT);
    }
}

// ─── TIMER (paused) ──────────────────────────────────────────────────────────
void handleTimerPause(JoyInput in) {
    if (needRedraw) {
        struct tm ti;
        bool ok = getCurrentTime(&ti);
        disp.drawTimer(ok ? &ti : nullptr, ok,
                       pomo.sessionLabel(),
                       pomo.getRemaining(), pomo.getTotal(),
                       pomo.getPomoCount(), pomo.getSessionsBeforeLong(),
                       true);
        needRedraw = false;
    }

    if (in == JoyInput::PRESS) {
        pomo.resume();
        goTo(AppState::TIMER_RUN);
    } else if (in == JoyInput::LONG_PRESS) {
        pomo.stop();
        menuCursor = 0;
        goTo(AppState::MENU);
    } else if (in == JoyInput::DOUBLE_PRESS) {
        alertedLabel = pomo.sessionLabel();
        alertedSec   = pomo.getTotal();
        pomo.forceComplete();
        alertStart   = millis();
        lastInverted = false;
        goTo(AppState::ALERT);
    }
}

// ─── ALERT (full-screen flash) ───────────────────────────────────────────────
void handleAlert() {
    unsigned long elapsed = millis() - alertStart;

    if (elapsed >= FLASH_TOTAL_MS) {
        // Restore display to normal before leaving this state
        disp.drawAlertFlash(false);
        promptCursor = 0;
        goTo(AppState::PROMPT);
        return;
    }

    bool inverted = ((elapsed / FLASH_PERIOD_MS) % 2) == 0;
    if (inverted != lastInverted) {
        disp.drawAlertFlash(inverted);
        lastInverted = inverted;
    }
}

// ─── PROMPT ("Continue?") ────────────────────────────────────────────────────
void handlePrompt(JoyInput in) {
    if (needRedraw) {
        disp.drawPrompt(alertedLabel, alertedSec,
                        pomo.nextSessionLabel(), promptCursor);
        needRedraw = false;
    }

    if (in == JoyInput::UP || in == JoyInput::DOWN) {
        promptCursor = 1 - promptCursor;   // toggle between 0 and 1
        needRedraw   = true;
    } else if (in == JoyInput::PRESS) {
        bool skipBreak = (promptCursor == 1);
        pomo.nextSession(skipBreak);
        goTo(AppState::TIMER_RUN);
    } else if (in == JoyInput::LONG_PRESS) {
        // Abandon → back to main menu
        menuCursor = 0;
        goTo(AppState::MENU);
    }
}

// ─── MENU ────────────────────────────────────────────────────────────────────
void handleMenu(JoyInput in) {
    if (needRedraw) {
        disp.drawMenu(MENU_ITEMS, MENU_COUNT, menuCursor, "MENU");
        needRedraw = false;
    }

    switch (in) {
        case JoyInput::UP:
            menuCursor = (menuCursor - 1 + MENU_COUNT) % MENU_COUNT;
            needRedraw = true;
            break;
        case JoyInput::DOWN:
            menuCursor = (menuCursor + 1) % MENU_COUNT;
            needRedraw = true;
            break;
        case JoyInput::PRESS:
            switch (menuCursor) {
                case 0:   // Start Pomodoro
                    applySettings();
                    pomo.startWork();
                    goTo(AppState::TIMER_RUN);
                    break;
                case 1:   // Settings
                    settingsCursor  = 0;
                    settingsEditing = false;
                    goTo(AppState::SETTINGS);
                    break;
                case 2:   // Reset Count
                    pomo.resetCount();
                    goTo(AppState::CLOCK);
                    break;
                case 3:   // Set Time
                    {
                        struct tm ti;
                        bool ok = getCurrentTime(&ti);
                        setTimeHH     = ok ? ti.tm_hour : 12;
                        setTimeMM     = ok ? ti.tm_min  :  0;
                        setTimeCursor = 0;
                        goTo(AppState::SET_TIME);
                    }
                    break;
            }
            break;
        case JoyInput::LONG_PRESS:
            // If a timer is active, return to it; otherwise go to clock.
            if (pomo.isStarted() && pomo.isRunning()) {
                goTo(AppState::TIMER_RUN);
            } else if (pomo.isStarted() && !pomo.isRunning() &&
                       pomo.getRemaining() > 0) {
                goTo(AppState::TIMER_PAUSE);
            } else {
                goTo(AppState::CLOCK);
            }
            break;
        default:
            break;
    }
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
void handleSettings(JoyInput in) {
    if (needRedraw) {
        disp.drawSettings(cfg.workMin, cfg.shortMin, cfg.longMin, cfg.sessions,
                          settingsCursor, settingsEditing);
        needRedraw = false;
    }

    if (!settingsEditing) {
        // Navigate rows
        if (in == JoyInput::UP) {
            settingsCursor = (settingsCursor - 1 + 4) % 4;
            needRedraw = true;
        } else if (in == JoyInput::DOWN) {
            settingsCursor = (settingsCursor + 1) % 4;
            needRedraw = true;
        } else if (in == JoyInput::PRESS) {
            settingsEditing = true;
            needRedraw = true;
        } else if (in == JoyInput::LONG_PRESS) {
            applySettings();
            goTo(AppState::MENU);
        }
    } else {
        // Editing a value with left/right
        int* targets[4] = {
            &cfg.workMin, &cfg.shortMin, &cfg.longMin, &cfg.sessions
        };
        int minVals[4] = { 1, 1, 1, 1 };
        int maxVals[4] = { 60, 60, 60, 10 };

        int* val = targets[settingsCursor];
        int  mn  = minVals[settingsCursor];
        int  mx  = maxVals[settingsCursor];

        if (in == JoyInput::RIGHT || in == JoyInput::UP) {
            if (*val < mx) { (*val)++; needRedraw = true; }
        } else if (in == JoyInput::LEFT || in == JoyInput::DOWN) {
            if (*val > mn) { (*val)--; needRedraw = true; }
        } else if (in == JoyInput::PRESS || in == JoyInput::LONG_PRESS) {
            settingsEditing = false;
            needRedraw = true;
        }
    }
}

// ─── SET TIME ────────────────────────────────────────────────────────────────
void handleSetTime(JoyInput in) {
    if (needRedraw) {
        disp.drawSetTime(setTimeHH, setTimeMM, setTimeCursor);
        needRedraw = false;
    }

    switch (in) {
        case JoyInput::UP:
            if (setTimeCursor == 0) {
                setTimeHH = (setTimeHH + 1) % 24;
            } else {
                setTimeMM = (setTimeMM + 1) % 60;
            }
            needRedraw = true;
            break;
        case JoyInput::DOWN:
            if (setTimeCursor == 0) {
                setTimeHH = (setTimeHH - 1 + 24) % 24;
            } else {
                setTimeMM = (setTimeMM - 1 + 60) % 60;
            }
            needRedraw = true;
            break;
        case JoyInput::RIGHT:
            setTimeCursor = 1;
            needRedraw = true;
            break;
        case JoyInput::LEFT:
            setTimeCursor = 0;
            needRedraw = true;
            break;
        case JoyInput::PRESS:
            {
                // Build epoch from today's date + user-entered HH:MM
                struct tm now;
                bool hasDate = getCurrentTime(&now);
                struct tm t = {};
                if (hasDate) {
                    t.tm_year = now.tm_year;
                    t.tm_mon  = now.tm_mon;
                    t.tm_mday = now.tm_mday;
                } else {
                    // 2024-01-01 as a safe fallback date
                    t.tm_year = 124;
                    t.tm_mon  = 0;
                    t.tm_mday = 1;
                }
                t.tm_hour  = setTimeHH;
                t.tm_min   = setTimeMM;
                t.tm_sec   = 0;
                t.tm_isdst = -1;
                manualEpoch   = mktime(&t);
                manualEpochAt = millis();
                hasNTP = false;  // switch to manual tracking
                goTo(AppState::CLOCK);
            }
            break;
        case JoyInput::LONG_PRESS:
            goTo(AppState::MENU);
            break;
        default:
            break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  setup()
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println("\n=== ESP32 Pomodoro Timer ===");

    Wire.begin(OLED_SDA, OLED_SCL);

    if (!disp.begin()) {
        Serial.println("OLED init failed – check wiring");
        while (true) delay(1000);
    }

    joy.begin();

    disp.drawSplash();
    delay(1500);

    applySettings();
    goTo(AppState::CLOCK);
}

// ─────────────────────────────────────────────────────────────────────────────
//  loop()
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
    joy.update();
    JoyInput in = joy.getInput();

    // ── Pomodoro tick (only when running) ──────────────────────────────────
    if (appState == AppState::TIMER_RUN) {
        if (pomo.update()) {
            // Session just finished
            alertedLabel = pomo.sessionLabel();
            alertedSec   = pomo.getTotal();
            alertStart   = millis();
            lastInverted = false;
            // Draw the last timer frame before flashing
            {
                struct tm ti;
                bool ok = getCurrentTime(&ti);
                disp.drawTimer(ok ? &ti : nullptr, ok,
                               pomo.sessionLabel(), 0, pomo.getTotal(),
                               pomo.getPomoCount(), pomo.getSessionsBeforeLong(),
                               false);
            }
            goTo(AppState::ALERT);
            return;
        }
    }

    // ── Dispatch ───────────────────────────────────────────────────────────
    switch (appState) {
        case AppState::CLOCK:       handleClock(in);       break;
        case AppState::TIMER_RUN:   handleTimerRun(in);    break;
        case AppState::TIMER_PAUSE: handleTimerPause(in);  break;
        case AppState::ALERT:       handleAlert();         break;
        case AppState::PROMPT:      handlePrompt(in);      break;
        case AppState::MENU:        handleMenu(in);        break;
        case AppState::SETTINGS:    handleSettings(in);    break;
        case AppState::SET_TIME:    handleSetTime(in);     break;
    }
}
