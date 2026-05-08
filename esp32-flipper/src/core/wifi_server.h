#pragma once
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <functional>

// Callbacks the app registers to receive data from the phone
using ScriptCallback = std::function<void(const String& script)>;
using OTACodeCallback = std::function<void(const String& code)>;

class WifiServer {
public:
    void begin(ScriptCallback onScript, OTACodeCallback onCode);
    void stop();
    bool isRunning() const { return _running; }
    String ip() const;

private:
    void _setupRoutes();
    AsyncWebServer _server{WEB_PORT};
    ScriptCallback  _onScript;
    OTACodeCallback _onCode;
    bool _running = false;
};
