#include "experimental.h"
#include <Wire.h>

constexpr const char* ExperimentalMode::MENU_ITEMS[];

void ExperimentalMode::enter(DisplayManager& disp, Settings& settings) {
    _sub     = SubMode::MENU;
    _menuSel = 0;
    _drawMenu(disp);
    disp.show();
}

void ExperimentalMode::exit() {
    _sub = SubMode::MENU;
}

bool ExperimentalMode::update(DisplayManager& disp, NavEvent ev, Settings& settings) {
    switch (_sub) {

    case SubMode::MENU:
        if (ev == NavEvent::BACK)    return false;
        if (ev == NavEvent::UP)      _menuSel = (_menuSel + MENU_COUNT - 1) % MENU_COUNT;
        if (ev == NavEvent::DOWN)    _menuSel = (_menuSel + 1) % MENU_COUNT;
        if (ev == NavEvent::CONFIRM) {
            if      (_menuSel == 0) _sub = SubMode::OTA_WAIT;
            else if (_menuSel == 1) _sub = SubMode::GPIO_TEST;
            else if (_menuSel == 2) { _runI2CScan(); _sub = SubMode::I2C_SCAN; }
        }
        _drawMenu(disp);
        break;

    case SubMode::OTA_WAIT:
        if (ev == NavEvent::BACK) { _sub = SubMode::MENU; _drawMenu(disp); break; }
        _drawOTA(disp);
        break;

    case SubMode::GPIO_TEST:
        if (ev == NavEvent::BACK)  { _sub = SubMode::MENU; _drawMenu(disp); break; }
        if (ev == NavEvent::UP)    _gpioPin = min(_gpioPin + 1, 39);
        if (ev == NavEvent::DOWN)  _gpioPin = max((int)_gpioPin - 1, 0);
        if (ev == NavEvent::CONFIRM) {
            _gpioState = !_gpioState;
            pinMode(_gpioPin, OUTPUT);
            digitalWrite(_gpioPin, _gpioState ? HIGH : LOW);
        }
        _drawGPIO(disp);
        break;

    case SubMode::I2C_SCAN:
        if (ev == NavEvent::BACK)    { _sub = SubMode::MENU; _drawMenu(disp); break; }
        if (ev == NavEvent::CONFIRM) { _runI2CScan(); }
        _drawI2C(disp);
        break;
    }

    disp.show();
    return true;
}

void ExperimentalMode::receiveCode(const String& code) {
    _uploadedCode = code;
    // Store to LittleFS for manual use; actual OTA compile requires external toolchain.
    // Here we write it to serial so the user can see what arrived.
    Serial.println("[OTA] Received code snippet:");
    Serial.println(code);
}

void ExperimentalMode::_drawMenu(DisplayManager& disp) {
    disp.clear();
    disp.drawTitle("Experimental");
    for (uint8_t i = 0; i < MENU_COUNT; i++)
        disp.drawMenuItem(i, MENU_ITEMS[i], i == _menuSel);
}

void ExperimentalMode::_drawOTA(DisplayManager& disp) {
    disp.clear();
    disp.drawTitle("OTA Upload");
    auto& d = disp.display();
    d.setTextSize(1);
    d.setCursor(0, 14);
    d.print("Connect to WiFi:");
    d.setCursor(0, 24);
    d.print(WIFI_AP_SSID);
    d.setCursor(0, 36);
    d.print("Open http://192.168.4.1");
    d.setCursor(0, 48);
    if (_uploadedCode.length() > 0)
        d.print("Code received!");
    else
        d.print("Waiting...");
    disp.drawStatusBar("BACK", "");
}

void ExperimentalMode::_drawGPIO(DisplayManager& disp) {
    disp.clear();
    disp.drawTitle("GPIO Tester");
    auto& d = disp.display();
    d.setTextSize(1);
    d.setCursor(0, 14);
    d.print("Pin: ");
    d.print(_gpioPin);
    d.setCursor(0, 26);
    d.print("State: ");
    d.print(_gpioState ? "HIGH" : "LOW");
    disp.drawStatusBar("UP/DN=Pin", "OK=Toggle");
}

void ExperimentalMode::_runI2CScan() {
    _i2cResult = "";
    uint8_t found = 0;
    for (uint8_t addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            char buf[8];
            snprintf(buf, sizeof(buf), "0x%02X ", addr);
            _i2cResult += buf;
            found++;
        }
    }
    if (found == 0) _i2cResult = "None found";
}

void ExperimentalMode::_drawI2C(DisplayManager& disp) {
    disp.clear();
    disp.drawTitle("I2C Scanner");
    auto& d = disp.display();
    d.setTextSize(1);
    d.setCursor(0, 14);
    d.print(_i2cResult.substring(0, 21));
    if (_i2cResult.length() > 21) {
        d.setCursor(0, 24);
        d.print(_i2cResult.substring(21, 42));
    }
    disp.drawStatusBar("BACK", "OK=Rescan");
}
