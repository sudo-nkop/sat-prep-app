#pragma once

// ─────────────────────────────────────────────
//  OLED — SSD1306, 128×32, I2C
// ─────────────────────────────────────────────
#define SCREEN_W    128
#define SCREEN_H     32
#define OLED_ADDR   0x3C
#define OLED_SDA     22
#define OLED_SCL     21
#define OLED_RESET   -1

// ─────────────────────────────────────────────
//  Joystick
// ─────────────────────────────────────────────
#define JOY_VRX      34   // input-only GPIO, analog X axis
#define JOY_VRY      35   // input-only GPIO, analog Y axis
#define JOY_SW       32   // button, active LOW with INPUT_PULLUP

// ESP32 ADC is 12-bit (0–4095), centre ≈ 2048
#define JOY_CENTER        2048
#define JOY_DEADZONE       700   // ± around centre counts as neutral

// Button timing
#define JOY_DEBOUNCE_MS     30
#define JOY_LONG_PRESS_MS  800

// Directional auto-repeat
#define JOY_FIRST_REPEAT_MS  400
#define JOY_REPEAT_MS        150

// ─────────────────────────────────────────────
//  Pomodoro defaults
// ─────────────────────────────────────────────
#define DEF_WORK_MIN    25
#define DEF_SHORT_MIN    5
#define DEF_LONG_MIN    15
#define DEF_SESSIONS     4   // pomodoros before a long break

// ─────────────────────────────────────────────
//  End-of-session alert
// ─────────────────────────────────────────────
#define FLASH_PERIOD_MS   250   // 2 Hz (250 ms per half-cycle)
#define FLASH_TOTAL_MS   3000   // flash for 3 seconds total

// ─────────────────────────────────────────────
//  Double-press detection
// ─────────────────────────────────────────────
#define DOUBLE_PRESS_MS  300   // max ms between two presses to count as double
