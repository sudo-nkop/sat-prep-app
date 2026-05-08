#pragma once
#include <Adafruit_SSD1306.h>
#include "../config.h"

// Thin wrapper so modes never call Adafruit directly.
// Access the raw display via display() for custom drawing.
class DisplayManager {
public:
    bool begin();
    Adafruit_SSD1306& display() { return _oled; }

    void clear();
    void show();

    // Convenience helpers
    void drawTitle(const char* title);
    void drawMenuItem(uint8_t idx, const char* label, bool selected);
    void drawStatusBar(const char* left, const char* right);

private:
    Adafruit_SSD1306 _oled{SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET};
};
