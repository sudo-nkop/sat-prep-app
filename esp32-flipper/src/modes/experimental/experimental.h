#pragma once
#include "../mode_base.h"
#include "../../core/wifi_server.h"

// Experimental playground.
// Sub-options: OTA code upload from phone, GPIO tester, I2C scanner.
class ExperimentalMode : public ModeBase {
public:
    ExperimentalMode(WifiServer& wifi) : _wifi(wifi) {}

    void enter(DisplayManager& disp, Settings& settings) override;
    bool update(DisplayManager& disp, NavEvent ev, Settings& settings) override;
    void exit() override;

    void receiveCode(const String& code);

private:
    enum class SubMode : uint8_t { MENU, OTA_WAIT, GPIO_TEST, I2C_SCAN };

    void _drawMenu(DisplayManager& disp);
    void _drawOTA(DisplayManager& disp);
    void _drawGPIO(DisplayManager& disp);
    void _drawI2C(DisplayManager& disp);
    void _runI2CScan();

    WifiServer& _wifi;
    SubMode     _sub         = SubMode::MENU;
    uint8_t     _menuSel     = 0;
    String      _uploadedCode;
    String      _i2cResult;
    uint8_t     _gpioPin     = 2;
    bool        _gpioState   = false;

    static constexpr const char* MENU_ITEMS[] = {
        "OTA Code Upload",
        "GPIO Tester",
        "I2C Scanner"
    };
    static constexpr uint8_t MENU_COUNT = 3;
};
