#pragma once
#include "../mode_base.h"
#include "../../core/wifi_server.h"

// Hosts WiFi AP + web UI. Phone sends a script (plain text commands),
// the device executes them line by line via a simple interpreter.
class ScriptRunnerMode : public ModeBase {
public:
    ScriptRunnerMode(WifiServer& wifi) : _wifi(wifi) {}

    void enter(DisplayManager& disp, Settings& settings) override;
    bool update(DisplayManager& disp, NavEvent ev, Settings& settings) override;
    void exit() override;

    // Called by WifiServer when a script arrives from the phone
    void receiveScript(const String& script);

private:
    void _draw(DisplayManager& disp);
    void _runNextLine();
    void _interpretLine(const String& line);

    WifiServer& _wifi;
    String      _script;
    int         _lineIdx    = -1;
    bool        _running    = false;
    String      _lastOutput;
    uint32_t    _stepDelay  = 0;
    uint32_t    _lastStep   = 0;
};
