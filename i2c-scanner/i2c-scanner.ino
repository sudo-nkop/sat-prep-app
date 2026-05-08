#include <Wire.h>

void scan() {
    Serial.println("=== I2C Scan ===");
    int found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        byte err = Wire.endTransmission();
        if (err == 0) {
            Serial.print("Device at 0x");
            if (addr < 16) Serial.print("0");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) Serial.println("No devices found - check wiring!");
    Serial.println("================");
}

void setup() {
    Serial.begin(115200);
    Wire.begin(22, 21);
}

void loop() {
    scan();
    delay(3000);
}
