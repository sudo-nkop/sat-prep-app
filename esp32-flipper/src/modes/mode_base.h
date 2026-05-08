#pragma once
#include "../core/display.h"
#include "../core/input.h"
#include "../settings/settings.h"

// Every mode inherits this. App calls enter/update/exit in a simple state machine.
class ModeBase {
public:
    virtual ~ModeBase() = default;

    virtual void enter(DisplayManager& disp, Settings& settings) = 0;
    // Returns true while mode is still active; false to go back to main menu.
    virtual bool update(DisplayManager& disp, NavEvent ev, Settings& settings) = 0;
    virtual void exit() {}
};
