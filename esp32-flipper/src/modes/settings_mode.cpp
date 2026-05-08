#include "settings_mode.h"

constexpr const char* SettingsMode::LABELS[];

void SettingsMode::enter(DisplayManager& disp, Settings& settings) {
    _sel     = 0;
    _editing = false;
    _draw(disp, settings);
    disp.show();
}

void SettingsMode::exit() {
    _editing = false;
}

bool SettingsMode::update(DisplayManager& disp, NavEvent ev, Settings& settings) {
    if (ev == NavEvent::BACK) {
        if (_editing) { _editing = false; settings.save(); }
        else return false;
    }
    if (!_editing) {
        if (ev == NavEvent::UP)      _sel = (_sel + COUNT - 1) % COUNT;
        if (ev == NavEvent::DOWN)    _sel = (_sel + 1) % COUNT;
        if (ev == NavEvent::CONFIRM) _editing = true;
    } else {
        _editSelected(ev, settings);
    }
    _draw(disp, settings);
    disp.show();
    return true;
}

void SettingsMode::_editSelected(NavEvent ev, Settings& settings) {
    auto& s = settings.get();
    int delta = (ev == NavEvent::UP) ? 1 : (ev == NavEvent::DOWN) ? -1 : 0;
    if (delta == 0) return;

    switch (_sel) {
        case 0: s.pomodoroWork   = constrain((int)s.pomodoroWork   + delta, 1, 90); break;
        case 1: s.pomodoroShort  = constrain((int)s.pomodoroShort  + delta, 1, 30); break;
        case 2: s.pomodoroLong   = constrain((int)s.pomodoroLong   + delta, 1, 60); break;
        case 3: s.pomodoroRounds = constrain((int)s.pomodoroRounds + delta, 1, 8);  break;
        case 4: s.wifiAutoStart  = !s.wifiAutoStart; break;
        case 5: s.soundEnabled   = !s.soundEnabled;  break;
    }
}

void SettingsMode::_draw(DisplayManager& disp, Settings& settings) {
    disp.clear();
    disp.drawTitle("Settings");
    auto& s = settings.get();

    // Show 4 items max; scroll based on _sel
    uint8_t start = (_sel >= 4) ? _sel - 3 : 0;
    for (uint8_t i = 0; i < 4 && (start + i) < COUNT; i++) {
        uint8_t idx = start + i;
        auto& d = disp.display();
        uint8_t y = 14 + i * 12;
        bool sel  = (idx == _sel);

        if (sel) {
            d.fillRect(0, y - 1, 128, 11, SSD1306_WHITE);
            d.setTextColor(SSD1306_BLACK);
        } else {
            d.setTextColor(SSD1306_WHITE);
        }
        d.setTextSize(1);
        d.setCursor(2, y);
        d.print(LABELS[idx]);
        d.print(": ");

        switch (idx) {
            case 0: d.print(s.pomodoroWork);   break;
            case 1: d.print(s.pomodoroShort);  break;
            case 2: d.print(s.pomodoroLong);   break;
            case 3: d.print(s.pomodoroRounds); break;
            case 4: d.print(s.wifiAutoStart ? "ON" : "OFF"); break;
            case 5: d.print(s.soundEnabled   ? "ON" : "OFF"); break;
        }
        d.setTextColor(SSD1306_WHITE);
    }
    disp.drawStatusBar(_editing ? "UP/DN=Change" : "OK=Edit", "BACK=Save");
}
