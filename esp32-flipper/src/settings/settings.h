#pragma once
#include <Arduino.h>

struct GlobalSettings {
    uint8_t  screenBrightness = 100;  // 0-255
    bool     soundEnabled     = true;
    uint8_t  pomodoroWork     = 25;   // minutes
    uint8_t  pomodoroShort    = 5;
    uint8_t  pomodoroLong     = 15;
    uint8_t  pomodoroRounds   = 4;
    bool     wifiAutoStart    = false;
    char     wifiSSID[32]     = "ESP32-Flipper";
    char     wifiPass[64]     = "flipper123";
};

class Settings {
public:
    void load();   // from LittleFS NVS
    void save();

    GlobalSettings& get() { return _s; }

private:
    GlobalSettings _s;
    static constexpr const char* PATH = "/settings.json";
};
