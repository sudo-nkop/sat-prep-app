#pragma once
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

// ─────────────────────────────────────────────────────────────────────────────
//  DisplayManager
//
//  All screen-rendering lives here.  Each draw* method:
//    1. clearDisplay()
//    2. draws to the internal buffer
//    3. calls display()
//
//  The exception is drawAlertFlash() which only toggles hardware inversion
//  (no buffer write needed, very fast).
// ─────────────────────────────────────────────────────────────────────────────
class DisplayManager {
public:
    bool begin();

    // ── Screens ────────────────────────────────────────────────────────────
    void drawSplash();

    void drawClock(const struct tm* ti, bool hasTime);

    void drawTimer(const struct tm* ti, bool hasTime,
                   const char* sessionLabel,
                   int remaining, int total,
                   int pomoCount, int sessionsBeforeLong,
                   bool paused);

    // Toggle hardware invert for the flash effect (no buffer write).
    void drawAlertFlash(bool inverted);

    void drawPrompt(const char* completedLabel, int completedSec,
                    const char* nextLabel,
                    int cursor);          // 0 = Continue, 1 = Skip break

    void drawMenu(const char* const items[], int count,
                  int cursor, const char* title);

    void drawSettings(int workMin, int shortMin, int longMin, int sessions,
                      int cursor, bool editing);

    void drawSetTime(int hh, int mm, int cursor);   // cursor 0=HH 1=MM

    // ── Public Adafruit object (used in main for invertDisplay restore) ────
    Adafruit_SSD1306 oled{128, 32, &Wire, -1};

private:
    // Helpers
    void drawTopBar(const struct tm* ti, bool hasTime,
                    int pomoCount, int sessionsBeforeLong);
    void drawProgressBar(int remaining, int total, int y);
    void printCentered(const char* str, int y, uint8_t size = 1);
    void formatMMSS(char* buf, int seconds);       // "MM:SS"
    void formatHHMMSS(char* buf, const struct tm* ti); // "HH:MM:SS"
};
