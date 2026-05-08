#pragma once
#include <Arduino.h>

enum class Session { WORK, SHORT_BREAK, LONG_BREAK };

class PomodoroTimer {
public:
    // ── Configuration ──────────────────────────────
    void setDurations(int workMin, int shortMin, int longMin, int sessionsBeforeLong) {
        _workSec            = workMin  * 60;
        _shortSec           = shortMin * 60;
        _longSec            = longMin  * 60;
        _sessionsBeforeLong = sessionsBeforeLong;
    }

    // ── Control ────────────────────────────────────
    void startWork() { _startSession(Session::WORK); }

    void pause()  { _running = false; }

    void resume() {
        if (!_running) {
            _running  = true;
            _lastTick = millis();
        }
    }

    void stop()   { _running = false; _remaining = 0; }

    // Advance to the next logical session.
    // skipBreak = true jumps straight to the next WORK session.
    void nextSession(bool skipBreak = false) {
        if (_session == Session::WORK) {
            if (!skipBreak) {
                if (_pomoCount % _sessionsBeforeLong == 0 && _pomoCount > 0) {
                    _startSession(Session::LONG_BREAK);
                } else {
                    _startSession(Session::SHORT_BREAK);
                }
            } else {
                _startSession(Session::WORK);
            }
        } else {
            // End of any break → go back to work
            _startSession(Session::WORK);
        }
    }

    void resetCount() { _pomoCount = 0; }

    // Force the current session to end as if the timer reached zero.
    void forceComplete() {
        _remaining = 0;
        _running   = false;
        if (_session == Session::WORK) _pomoCount++;
    }

    // ── Update (call every loop) ────────────────────
    // Returns true exactly once when the countdown hits 0.
    bool update() {
        if (!_running) return false;
        unsigned long now     = millis();
        int           elapsed = (int)((now - _lastTick) / 1000UL);
        if (elapsed > 0) {
            _lastTick += (unsigned long)elapsed * 1000UL;
            _remaining -= elapsed;
            if (_remaining <= 0) {
                _remaining = 0;
                _running   = false;
                if (_session == Session::WORK) _pomoCount++;
                return true;
            }
        }
        return false;
    }

    // ── Queries ────────────────────────────────────
    bool    isRunning()           const { return _running; }
    bool    isStarted()           const { return _started; }
    Session getSession()          const { return _session; }
    int     getRemaining()        const { return _remaining; }
    int     getTotal()            const { return _totalSec; }
    int     getPomoCount()        const { return _pomoCount; }
    int     getSessionsBeforeLong() const { return _sessionsBeforeLong; }

    const char* sessionLabel() const {
        switch (_session) {
            case Session::WORK:        return "WORK";
            case Session::SHORT_BREAK: return "SHORT BREAK";
            case Session::LONG_BREAK:  return "LONG BREAK";
        }
        return "";
    }

    // What comes AFTER the current session (for the "Time is up" prompt)
    const char* nextSessionLabel() const {
        if (_session == Session::WORK) {
            if (_pomoCount % _sessionsBeforeLong == 0 && _pomoCount > 0) {
                return "LONG BREAK";
            }
            return "SHORT BREAK";
        }
        return "WORK";
    }

    // Duration (seconds) of the upcoming break / work session
    int nextSessionSec() const {
        if (_session == Session::WORK) {
            if (_pomoCount % _sessionsBeforeLong == 0 && _pomoCount > 0) return _longSec;
            return _shortSec;
        }
        return _workSec;
    }

private:
    void _startSession(Session s) {
        _session = s;
        switch (s) {
            case Session::WORK:        _totalSec = _workSec;  break;
            case Session::SHORT_BREAK: _totalSec = _shortSec; break;
            case Session::LONG_BREAK:  _totalSec = _longSec;  break;
        }
        _remaining = _totalSec;
        _running   = true;
        _started   = true;
        _lastTick  = millis();
    }

    Session       _session   = Session::WORK;
    bool          _running   = false;
    bool          _started   = false;
    int           _remaining = 0;
    int           _totalSec  = 0;
    int           _workSec   = 25 * 60;
    int           _shortSec  =  5 * 60;
    int           _longSec   = 15 * 60;
    int           _sessionsBeforeLong = 4;
    int           _pomoCount = 0;
    unsigned long _lastTick  = 0;
};
