#include "wifi_server.h"
#include <WiFi.h>
#include <LittleFS.h>
#include "../config.h"

void WifiServer::begin(ScriptCallback onScript, OTACodeCallback onCode) {
    _onScript = onScript;
    _onCode   = onCode;

    WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
    _setupRoutes();
    _server.begin();
    _running = true;
}

void WifiServer::stop() {
    _server.end();
    WiFi.softAPdisconnect(true);
    _running = false;
}

String WifiServer::ip() const {
    return WiFi.softAPIP().toString();
}

void WifiServer::_setupRoutes() {
    // Serve static UI from LittleFS /data
    _server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // POST /run  — run a script snippet
    _server.on("/run", HTTP_POST, [](AsyncWebServerRequest*){},
        nullptr,
        [this](AsyncWebServerRequest* req, uint8_t* data, size_t len, size_t, size_t) {
            String body((char*)data, len);
            if (_onScript) _onScript(body);
            req->send(200, "application/json", "{\"ok\":true}");
        }
    );

    // POST /upload  — upload experimental code
    _server.on("/upload", HTTP_POST, [](AsyncWebServerRequest*){},
        nullptr,
        [this](AsyncWebServerRequest* req, uint8_t* data, size_t len, size_t, size_t) {
            String body((char*)data, len);
            if (_onCode) _onCode(body);
            req->send(200, "application/json", "{\"ok\":true}");
        }
    );

    _server.onNotFound([](AsyncWebServerRequest* req) {
        req->send(404, "text/plain", "Not found");
    });
}
