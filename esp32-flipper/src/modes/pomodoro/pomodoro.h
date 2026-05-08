#pragma once
#include "../mode_base.h"

enum class PomoState : uint8_t { IDLE, WORK, SHORT_BREAK, LONG_BREAK };

class PomodoroMode : public ModeBase {
public:
    void enter(DisplayManager& disp, Settings& settings) override;
    bool update(DisplayManager& disp, NavEvent ev, Settings& settings) override;
    void exit() override;

private:
    void _draw(DisplayManager& disp);
    void _tick(Settings& settings);
    const char* _stateLabel() const;

    PomoState _state      = PomoState::IDLE;
    uint32_t  _startMs    = 0;
    uint32_t  _durationMs = 0;
    uint8_t   _round      = 0;
    bool      _paused     = false;
    uint32_t  _pausedAt   = 0;
    uint32_t  _elapsed    = 0;
};
