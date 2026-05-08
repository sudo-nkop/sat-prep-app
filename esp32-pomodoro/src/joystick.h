#pragma once
#include <Arduino.h>
#include "config.h"

// ─────────────────────────────────────────────
//  Directional / button events the rest of the
//  app consumes.  Only ONE event is returned per
//  call to getInput() – priority: long-press >
//  short-press > directional.
// ─────────────────────────────────────────────
enum class JoyInput {
    NONE,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    PRESS,        // short button press (released before LONG_PRESS_MS)
    LONG_PRESS,   // button held ≥ LONG_PRESS_MS
    DOUBLE_PRESS  // two presses within DOUBLE_PRESS_MS
};

class Joystick {
public:
    void begin() {
        pinMode(JOY_SW, INPUT_PULLUP);
        // Set ADC attenuation so the full 0–3.3 V range maps to 0–4095
        analogSetAttenuation(ADC_11db);
        // Calibrate center: average several reads at rest
        delay(50);
        long sx = 0, sy = 0;
        for (int i = 0; i < 16; i++) {
            sx += analogRead(JOY_VRY);   // axes swapped
            sy += analogRead(JOY_VRX);
            delay(5);
        }
        _centerX = sx / 16;
        _centerY = sy / 16;
    }

    // Call once per loop() iteration (no delays inside).
    void update() {
        unsigned long now = millis();

        // ── Button ────────────────────────────────
        bool rawBtn = (digitalRead(JOY_SW) == LOW);

        if (rawBtn != _btnRaw) {
            if (now - _btnLastEdge >= JOY_DEBOUNCE_MS) {
                _btnRaw = rawBtn;
                _btnLastEdge = now;
                if (_btnRaw) {
                    // pressed
                    _btnPressAt = now;
                    _longFired  = false;
                } else {
                    // released
                    if (!_longFired) {
                        if (_pressBuffered) {
                            _pressBuffered = false;
                            _pendingDouble = true;   // second press in window → double
                        } else {
                            _pressBuffered   = true; // first press → wait for possible second
                            _pressBufferedAt = now;
                        }
                    }
                }
            }
        } else {
            _btnLastEdge = now;
        }

        if (_btnRaw && !_longFired &&
            (now - _btnPressAt >= JOY_LONG_PRESS_MS)) {
            _longFired   = true;
            _pendingLong = true;
        }

        // Flush buffered single press after window expires
        if (_pressBuffered && (now - _pressBufferedAt >= DOUBLE_PRESS_MS)) {
            _pressBuffered = false;
            _pendingPress  = true;
        }

        // ── Analog stick ──────────────────────────
        int rx = analogRead(JOY_VRY);   // axes swapped
        int ry = analogRead(JOY_VRX);

        JoyInput dir = JoyInput::NONE;
        // Y-axis: pulling stick UP gives low ADC reading on most modules
        if      (ry < _centerY - JOY_DEADZONE) dir = JoyInput::UP;
        else if (ry > _centerY + JOY_DEADZONE) dir = JoyInput::DOWN;
        else if (rx < _centerX - JOY_DEADZONE) dir = JoyInput::LEFT;
        else if (rx > _centerX + JOY_DEADZONE) dir = JoyInput::RIGHT;

        if (dir != JoyInput::NONE) {
            if (dir != _stickDir) {
                // New direction – fire immediately, then schedule repeat
                _stickDir       = dir;
                _stickRepeatAt  = now + JOY_FIRST_REPEAT_MS;
                _pendingDir     = dir;
            } else if (now >= _stickRepeatAt) {
                // Auto-repeat
                _stickRepeatAt = now + JOY_REPEAT_MS;
                _pendingDir    = dir;
            }
        } else {
            _stickDir = JoyInput::NONE;
        }
    }

    // Returns (and clears) the next queued event.
    JoyInput getInput() {
        if (_pendingDouble) { _pendingDouble = false; return JoyInput::DOUBLE_PRESS; }
        if (_pendingLong)   { _pendingLong   = false; return JoyInput::LONG_PRESS; }
        if (_pendingPress)  { _pendingPress  = false; return JoyInput::PRESS; }
        if (_pendingDir != JoyInput::NONE) {
            JoyInput d  = _pendingDir;
            _pendingDir = JoyInput::NONE;
            return d;
        }
        return JoyInput::NONE;
    }

    // Discard any queued events (call when changing screens to avoid
    // stray inputs carrying over).
    void flush() {
        _pendingPress  = false;
        _pendingLong   = false;
        _pendingDir    = JoyInput::NONE;
        _pressBuffered = false;
        _pendingDouble = false;
    }

private:
    // Button state
    bool         _btnRaw      = false;
    bool         _longFired   = false;
    bool         _pendingPress= false;
    bool         _pendingLong = false;
    unsigned long _btnLastEdge= 0;
    unsigned long _btnPressAt = 0;

    // Calibrated center
    int          _centerX     = JOY_CENTER;
    int          _centerY     = JOY_CENTER;

    // Double-press detection
    bool          _pressBuffered   = false;
    unsigned long _pressBufferedAt = 0;
    bool          _pendingDouble   = false;

    // Stick state
    JoyInput     _stickDir    = JoyInput::NONE;
    JoyInput     _pendingDir  = JoyInput::NONE;
    unsigned long _stickRepeatAt = 0;
};
