#include "pomodoro.h"

void PomodoroMode::enter(DisplayManager& disp, Settings& settings) {
    _state   = PomoState::IDLE;
    _round   = 0;
    _paused  = false;
    _elapsed = 0;
    _draw(disp);
    disp.show();
}

void PomodoroMode::exit() {
    _state = PomoState::IDLE;
}

bool PomodoroMode::update(DisplayManager& disp, NavEvent ev, Settings& settings) {
    auto& s = settings.get();

    if (ev == NavEvent::BACK && _state == PomoState::IDLE) return false;

    if (ev == NavEvent::CONFIRM) {
        if (_state == PomoState::IDLE) {
            _state      = PomoState::WORK;
            _startMs    = millis();
            _durationMs = (uint32_t)s.pomodoroWork * 60000UL;
            _elapsed    = 0;
            _paused     = false;
        } else {
            _paused = !_paused;
            if (_paused) {
                _pausedAt = millis();
            } else {
                _startMs += millis() - _pausedAt;
            }
        }
    }

    if (ev == NavEvent::BACK && _state != PomoState::IDLE) {
        _state = PomoState::IDLE;
    }

    _tick(settings);
    _draw(disp);
    disp.show();
    return true;
}

void PomodoroMode::_tick(Settings& settings) {
    if (_state == PomoState::IDLE || _paused) return;
    auto& s = settings.get();

    uint32_t now     = millis();
    uint32_t elapsed = now - _startMs;

    if (elapsed >= _durationMs) {
        if (_state == PomoState::WORK) {
            _round++;
            if (_round >= s.pomodoroRounds) {
                _round      = 0;
                _state      = PomoState::LONG_BREAK;
                _durationMs = (uint32_t)s.pomodoroLong * 60000UL;
            } else {
                _state      = PomoState::SHORT_BREAK;
                _durationMs = (uint32_t)s.pomodoroShort * 60000UL;
            }
        } else {
            _state      = PomoState::WORK;
            _durationMs = (uint32_t)s.pomodoroWork * 60000UL;
        }
        _startMs = now;
    }
}

void PomodoroMode::_draw(DisplayManager& disp) {
    disp.clear();
    disp.drawTitle("Pomodoro");

    auto& d = disp.display();
    d.setTextSize(1);

    if (_state == PomoState::IDLE) {
        d.setCursor(10, 24);
        d.print("CONFIRM  = Start");
        d.setCursor(10, 36);
        d.print("BACK     = Menu");
    } else {
        // State label
        d.setCursor(0, 14);
        d.print(_stateLabel());

        // Time remaining
        uint32_t remaining = 0;
        if (!_paused) {
            uint32_t elapsed = millis() - _startMs;
            remaining = elapsed < _durationMs ? _durationMs - elapsed : 0;
        } else {
            remaining = _durationMs - (_pausedAt - _startMs);
        }
        uint32_t mins = remaining / 60000;
        uint32_t secs = (remaining % 60000) / 1000;

        char buf[8];
        snprintf(buf, sizeof(buf), "%02lu:%02lu", mins, secs);
        d.setTextSize(3);
        d.setCursor(20, 28);
        d.print(buf);
        d.setTextSize(1);

        // Round indicator dots
        for (uint8_t i = 0; i < 4; i++) {
            if (i < _round)
                d.fillCircle(110 + i * 6, 16, 2, SSD1306_WHITE);
            else
                d.drawCircle(110 + i * 6, 16, 2, SSD1306_WHITE);
        }

        disp.drawStatusBar(_paused ? "PAUSED" : "RUNNING", "OK=Pause");
    }
}

const char* PomodoroMode::_stateLabel() const {
    switch (_state) {
        case PomoState::WORK:        return "WORK";
        case PomoState::SHORT_BREAK: return "SHORT BREAK";
        case PomoState::LONG_BREAK:  return "LONG BREAK";
        default:                     return "IDLE";
    }
}
