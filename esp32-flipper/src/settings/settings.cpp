#include "settings.h"
#include <LittleFS.h>
#include <ArduinoJson.h>

void Settings::load() {
    if (!LittleFS.exists(PATH)) return;
    File f = LittleFS.open(PATH, "r");
    if (!f) return;

    JsonDocument doc;
    if (deserializeJson(doc, f)) { f.close(); return; }
    f.close();

    _s.screenBrightness = doc["brightness"]    | _s.screenBrightness;
    _s.soundEnabled     = doc["sound"]         | _s.soundEnabled;
    _s.pomodoroWork     = doc["pomo_work"]      | _s.pomodoroWork;
    _s.pomodoroShort    = doc["pomo_short"]     | _s.pomodoroShort;
    _s.pomodoroLong     = doc["pomo_long"]      | _s.pomodoroLong;
    _s.pomodoroRounds   = doc["pomo_rounds"]    | _s.pomodoroRounds;
    _s.wifiAutoStart    = doc["wifi_auto"]      | _s.wifiAutoStart;
    strlcpy(_s.wifiSSID, doc["wifi_ssid"] | _s.wifiSSID, sizeof(_s.wifiSSID));
    strlcpy(_s.wifiPass, doc["wifi_pass"] | _s.wifiPass, sizeof(_s.wifiPass));
}

void Settings::save() {
    File f = LittleFS.open(PATH, "w");
    if (!f) return;

    JsonDocument doc;
    doc["brightness"] = _s.screenBrightness;
    doc["sound"]      = _s.soundEnabled;
    doc["pomo_work"]  = _s.pomodoroWork;
    doc["pomo_short"] = _s.pomodoroShort;
    doc["pomo_long"]  = _s.pomodoroLong;
    doc["pomo_rounds"]= _s.pomodoroRounds;
    doc["wifi_auto"]  = _s.wifiAutoStart;
    doc["wifi_ssid"]  = _s.wifiSSID;
    doc["wifi_pass"]  = _s.wifiPass;

    serializeJson(doc, f);
    f.close();
}
