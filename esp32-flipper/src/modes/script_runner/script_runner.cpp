#include "script_runner.h"

void ScriptRunnerMode::enter(DisplayManager& disp, Settings& settings) {
    _lineIdx    = -1;
    _running    = false;
    _lastOutput = "Waiting for script...";
    _draw(disp);
    disp.show();
}

void ScriptRunnerMode::exit() {
    _running = false;
    _script  = "";
}

bool ScriptRunnerMode::update(DisplayManager& disp, NavEvent ev, Settings& settings) {
    if (ev == NavEvent::BACK && !_running) return false;
    if (ev == NavEvent::CONFIRM && !_running && _script.length() > 0) {
        _lineIdx = 0;
        _running = true;
        _lastStep = millis();
    }
    if (ev == NavEvent::BACK && _running) {
        _running = false;
        _lineIdx = -1;
        _lastOutput = "Stopped.";
    }

    if (_running && millis() - _lastStep >= _stepDelay) {
        _runNextLine();
        _lastStep = millis();
    }

    _draw(disp);
    disp.show();
    return true;
}

void ScriptRunnerMode::receiveScript(const String& script) {
    _script     = script;
    _lineIdx    = -1;
    _running    = false;
    _lastOutput = "Script ready. CONFIRM to run.";
}

void ScriptRunnerMode::_runNextLine() {
    if (_lineIdx < 0) return;

    // Collect current line
    int start = 0;
    int cur   = 0;
    int count = 0;
    while (cur < (int)_script.length()) {
        if (_script[cur] == '\n' || cur == (int)_script.length() - 1) {
            if (count == _lineIdx) {
                int end = (_script[cur] == '\n') ? cur : cur + 1;
                String line = _script.substring(start, end);
                line.trim();
                if (line.length() > 0 && !line.startsWith("#"))
                    _interpretLine(line);
                _lineIdx++;
                if (_lineIdx > count) {
                    _running    = false;
                    _lastOutput = "Done.";
                }
                return;
            }
            count++;
            start = cur + 1;
        }
        cur++;
    }
    _running    = false;
    _lastOutput = "Done.";
}

// Minimal built-in script language:
//   PRINT <msg>
//   DELAY <ms>
//   LED ON / LED OFF
//   GPIO <pin> HIGH / LOW
void ScriptRunnerMode::_interpretLine(const String& line) {
    _lastOutput = line;
    _stepDelay  = 50;

    if (line.startsWith("PRINT ")) {
        _lastOutput = line.substring(6);
        Serial.println(_lastOutput);
    } else if (line.startsWith("DELAY ")) {
        _stepDelay = (uint32_t)line.substring(6).toInt();
    } else if (line == "LED ON") {
        digitalWrite(LED_BUILTIN, HIGH);
    } else if (line == "LED OFF") {
        digitalWrite(LED_BUILTIN, LOW);
    } else if (line.startsWith("GPIO ")) {
        // GPIO 2 HIGH
        int sp1 = line.indexOf(' ', 5);
        if (sp1 > 0) {
            int pin   = line.substring(5, sp1).toInt();
            String val = line.substring(sp1 + 1);
            val.trim();
            pinMode(pin, OUTPUT);
            digitalWrite(pin, val == "HIGH" ? HIGH : LOW);
        }
    }
}

void ScriptRunnerMode::_draw(DisplayManager& disp) {
    disp.clear();
    disp.drawTitle("Script Runner");

    auto& d = disp.display();
    d.setTextSize(1);

    // IP address hint
    d.setCursor(0, 14);
    d.print("WiFi: ");
    d.print(WIFI_AP_SSID);

    // Status
    d.setCursor(0, 26);
    d.print(_running ? "Running..." : (_lineIdx == -1 ? "Idle" : "Done"));

    // Last output (word-wrap at 21 chars)
    d.setCursor(0, 38);
    d.print(_lastOutput.substring(0, 21));
    if (_lastOutput.length() > 21) {
        d.setCursor(0, 48);
        d.print(_lastOutput.substring(21, 42));
    }

    disp.drawStatusBar("BACK=Stop", "OK=Run");
}
