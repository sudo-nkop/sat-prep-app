#include "display.h"
#include <Wire.h>

bool DisplayManager::begin() {
    Wire.begin(SDA_PIN, SCL_PIN);
    if (!_oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) return false;
    _oled.setTextColor(SSD1306_WHITE);
    _oled.clearDisplay();
    _oled.display();
    return true;
}

void DisplayManager::clear()  { _oled.clearDisplay(); }
void DisplayManager::show()   { _oled.display(); }

void DisplayManager::drawTitle(const char* title) {
    _oled.setTextSize(1);
    _oled.setCursor(0, 0);
    _oled.println(title);
    _oled.drawLine(0, 10, SCREEN_WIDTH, 10, SSD1306_WHITE);
}

void DisplayManager::drawMenuItem(uint8_t idx, const char* label, bool selected) {
    uint8_t y = 14 + idx * 12;
    if (selected) {
        _oled.fillRect(0, y - 1, SCREEN_WIDTH, 11, SSD1306_WHITE);
        _oled.setTextColor(SSD1306_BLACK);
    } else {
        _oled.setTextColor(SSD1306_WHITE);
    }
    _oled.setTextSize(1);
    _oled.setCursor(4, y);
    _oled.print(label);
    _oled.setTextColor(SSD1306_WHITE);
}

void DisplayManager::drawStatusBar(const char* left, const char* right) {
    _oled.setTextSize(1);
    _oled.setCursor(0, SCREEN_HEIGHT - 8);
    _oled.print(left);
    // right-align
    int16_t x1, y1; uint16_t w, h;
    _oled.getTextBounds(right, 0, 0, &x1, &y1, &w, &h);
    _oled.setCursor(SCREEN_WIDTH - w, SCREEN_HEIGHT - 8);
    _oled.print(right);
}
