#pragma once
#include <Arduino.h>
#include "../config.h"

enum class NavEvent : uint8_t { NONE, UP, DOWN, LEFT, RIGHT, CONFIRM, BACK };

class InputManager {
public:
    void begin();
    NavEvent read();  // call each loop(); returns one event or NONE

private:
    NavEvent _readJoystick();
    NavEvent _pending    = NavEvent::NONE;
    uint32_t _lastRepeat = 0;
    NavEvent _held       = NavEvent::NONE;
};
