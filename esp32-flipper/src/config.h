#pragma once

// ── Display (SSD1306 I2C) ─────────────────────────────────────────────────
#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT   64
#define OLED_RESET      -1
#define OLED_ADDRESS    0x3C
#define SDA_PIN         21
#define SCL_PIN         22

// ── Input: joystick (analog) + confirm/back buttons ──────────────────────
// Change to simple D-pad buttons by adjusting InputManager in core/input.h
#define JOY_X_PIN       34   // analog
#define JOY_Y_PIN       35   // analog
#define JOY_BTN_PIN     32   // joystick click (confirm)
#define BTN_BACK_PIN    33   // back / cancel

#define JOY_DEAD_ZONE   500  // ±500 around 2048 center
#define JOY_REPEAT_MS   200  // ms between repeated nav events when held

// ── WiFi (phone interface) ────────────────────────────────────────────────
#define WIFI_AP_SSID    "ESP32-Flipper"
#define WIFI_AP_PASS    "flipper123"   // min 8 chars; change before flashing
#define WEB_PORT        80

// ── Pomodoro defaults ─────────────────────────────────────────────────────
#define POMO_WORK_MIN   25
#define POMO_SHORT_MIN  5
#define POMO_LONG_MIN   15
#define POMO_ROUNDS     4    // rounds before long break

// ── Modes ─────────────────────────────────────────────────────────────────
enum class AppMode : uint8_t {
    MENU        = 0,
    POMODORO    = 1,
    SCRIPT_RUN  = 2,
    EXPERIMENTAL = 3,
    SETTINGS    = 4
};
