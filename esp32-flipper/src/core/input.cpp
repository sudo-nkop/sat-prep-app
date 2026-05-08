#include "input.h"

void InputManager::begin() {
    pinMode(JOY_BTN_PIN, INPUT_PULLUP);
    pinMode(BTN_BACK_PIN, INPUT_PULLUP);
}

NavEvent InputManager::read() {
    NavEvent ev = _readJoystick();

    // button edges
    static bool lastConfirm = false, lastBack = false;
    bool confirm = digitalRead(JOY_BTN_PIN) == LOW;
    bool back    = digitalRead(BTN_BACK_PIN) == LOW;

    if (confirm && !lastConfirm) ev = NavEvent::CONFIRM;
    if (back    && !lastBack)    ev = NavEvent::BACK;
    lastConfirm = confirm;
    lastBack    = back;

    // auto-repeat for directional held input
    if (ev != NavEvent::NONE &&
        ev != NavEvent::CONFIRM &&
        ev != NavEvent::BACK) {
        _held       = ev;
        _lastRepeat = millis();
        return ev;
    }
    if (_held != NavEvent::NONE &&
        ev == NavEvent::NONE &&
        millis() - _lastRepeat >= JOY_REPEAT_MS) {
        // check joystick still held
        NavEvent still = _readJoystick();
        if (still == _held) {
            _lastRepeat = millis();
            return _held;
        }
        _held = NavEvent::NONE;
    }
    return ev;
}

NavEvent InputManager::_readJoystick() {
    int x = analogRead(JOY_X_PIN) - 2048;
    int y = analogRead(JOY_Y_PIN) - 2048;
    if      (y >  JOY_DEAD_ZONE) return NavEvent::DOWN;
    else if (y < -JOY_DEAD_ZONE) return NavEvent::UP;
    else if (x >  JOY_DEAD_ZONE) return NavEvent::RIGHT;
    else if (x < -JOY_DEAD_ZONE) return NavEvent::LEFT;
    return NavEvent::NONE;
}
