#pragma once
#include "mode_base.h"

class SettingsMode : public ModeBase {
public:
    void enter(DisplayManager& disp, Settings& settings) override;
    bool update(DisplayManager& disp, NavEvent ev, Settings& settings) override;
    void exit() override;

private:
    void _draw(DisplayManager& disp, Settings& settings);
    void _editSelected(NavEvent ev, Settings& settings);

    uint8_t _sel     = 0;
    bool    _editing = false;

    static constexpr const char* LABELS[] = {
        "Pomo Work (min)",
        "Pomo Short (min)",
        "Pomo Long  (min)",
        "Pomo Rounds",
        "WiFi Auto-Start",
        "Sound"
    };
    static constexpr uint8_t COUNT = 6;
};
