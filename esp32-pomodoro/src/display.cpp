#include "display.h"

// ─── 128×32 layout constants ───────────────────────────────────────────────
static const int TITLE_H =  10;   // inverted title bar
static const int ITEM_H  =  11;   // scrollable row height
// Row positions for two-row content under a title bar
static const int ROW0_Y  =   0;
static const int ROW1_Y  =  10;
static const int ROW2_Y  =  21;

static const int TS2_W = 12;
static const int TS2_H = 16;

// ─── begin ─────────────────────────────────────────────────────────────────
bool DisplayManager::begin() {
    if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) return false;
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.display();
    return true;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
void DisplayManager::formatMMSS(char* buf, int seconds) {
    if (seconds < 0) seconds = 0;
    snprintf(buf, 8, "%02d:%02d", seconds / 60, seconds % 60);
}
void DisplayManager::formatHHMMSS(char* buf, const struct tm* ti) {
    snprintf(buf, 10, "%02d:%02d:%02d", ti->tm_hour, ti->tm_min, ti->tm_sec);
}
void DisplayManager::printCentered(const char* str, int y, uint8_t size) {
    int x = (SCREEN_W - (int)strlen(str) * 6 * size) / 2;
    if (x < 0) x = 0;
    oled.setTextSize(size);
    oled.setCursor(x, y);
    oled.print(str);
}

// Inverted title bar helper
static void titleBar(Adafruit_SSD1306& oled, const char* text) {
    oled.fillRect(0, 0, 128, TITLE_H, SSD1306_WHITE);
    oled.setTextColor(SSD1306_BLACK);
    oled.setTextSize(1);
    int x = (128 - (int)strlen(text) * 6) / 2;
    oled.setCursor(x < 0 ? 0 : x, 1);
    oled.print(text);
    oled.setTextColor(SSD1306_WHITE);
}

void DisplayManager::drawTopBar(const struct tm* ti, bool hasTime,
                                 int pomoCount, int sessionsBeforeLong) {
    oled.setTextSize(1);
    if (hasTime) {
        char buf[10]; formatHHMMSS(buf, ti);
        oled.setCursor(0, ROW0_Y); oled.print(buf);
    } else {
        oled.setCursor(0, ROW0_Y); oled.print("--:--:--");
    }
    char pb[10]; snprintf(pb, sizeof(pb), "P:%d/%d", pomoCount, sessionsBeforeLong);
    oled.setCursor(SCREEN_W - (int)strlen(pb) * 6, ROW0_Y);
    oled.print(pb);
}

void DisplayManager::drawProgressBar(int remaining, int total, int y) {
    if (total <= 0) return;
    float frac = 1.0f - (float)remaining / (float)total;
    int fw = (int)(frac * 126.0f);
    fw = fw < 0 ? 0 : fw > 126 ? 126 : fw;
    oled.drawRect(0, y, 128, 4, SSD1306_WHITE);
    if (fw > 0) oled.fillRect(1, y + 1, fw, 2, SSD1306_WHITE);
}

// ─── Splash ────────────────────────────────────────────────────────────────
void DisplayManager::drawSplash() {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    printCentered("POMODORO", 0, 2);   // 16px tall fills almost all 32px
    printCentered("ESP32 Timer", 20, 1);
    oled.display();
}

// ─── Clock ─────────────────────────────────────────────────────────────────
// Row 0: HH:MM:SS  (textSize 2, 16px)
// Row 1: Day  Date
void DisplayManager::drawClock(const struct tm* ti, bool hasTime) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    if (hasTime) {
        char tbuf[10]; formatHHMMSS(tbuf, ti);
        oled.setTextSize(2);
        int tx = (SCREEN_W - 8 * TS2_W) / 2;
        oled.setCursor(tx < 0 ? 0 : tx, 0);
        oled.print(tbuf);

        static const char* days[]   = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};
        static const char* months[] = {"Jan","Feb","Mar","Apr","May","Jun",
                                        "Jul","Aug","Sep","Oct","Nov","Dec"};
        char dbuf[20];
        snprintf(dbuf, sizeof(dbuf), "%s %s %d",
                 days[ti->tm_wday], months[ti->tm_mon], ti->tm_mday);
        printCentered(dbuf, 20, 1);
    } else {
        printCentered("No Time Sync", 0, 1);
        printCentered("Set in Menu", 12, 1);
    }
    oled.display();
}

// ─── Timer ─────────────────────────────────────────────────────────────────
// Row 0 (y=0):  HH:MM:SS        P:x/x
// Row 1 (y=10): WORK | 25:00
// Row 2 (y=21): [======  ] progress bar
void DisplayManager::drawTimer(const struct tm* ti, bool hasTime,
                                const char* sessionLabel,
                                int remaining, int total,
                                int pomoCount, int sessionsBeforeLong,
                                bool paused) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    // Row 0: clock + pomo count
    drawTopBar(ti, hasTime, pomoCount, sessionsBeforeLong);

    // Row 1: session label + countdown on same line
    char tbuf[8]; formatMMSS(tbuf, remaining);
    char line[28];
    snprintf(line, sizeof(line), "%s%s %s",
             paused ? "[P] " : "",
             sessionLabel, tbuf);
    oled.setTextSize(1);
    printCentered(line, ROW1_Y, 1);

    // Row 2: progress bar
    drawProgressBar(remaining, total, ROW2_Y + 2);

    oled.display();
}

// ─── Alert flash ───────────────────────────────────────────────────────────
void DisplayManager::drawAlertFlash(bool inverted) {
    oled.invertDisplay(inverted);
}

// ─── Prompt ────────────────────────────────────────────────────────────────
// Title: TIME IS UP!
// Scroll 2 options: Continue / Skip Break
void DisplayManager::drawPrompt(const char* completedLabel, int completedSec,
                                 const char* nextLabel, int cursor) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    // Build title string
    char title[24];
    snprintf(title, sizeof(title), "UP! %s %02d:%02d",
             completedLabel, completedSec / 60, completedSec % 60);
    titleBar(oled, title);

    const char* opts[2] = { "Continue", "Skip Break" };

    oled.setTextSize(1);
    for (int i = 0; i < 2; i++) {
        int y = TITLE_H + i * ITEM_H;
        if (i == cursor) {
            oled.fillRect(0, y, 128, ITEM_H, SSD1306_WHITE);
            oled.setTextColor(SSD1306_BLACK);
            oled.setCursor(4, y + 1);
            oled.print("> "); oled.print(opts[i]);
            oled.setTextColor(SSD1306_WHITE);
        } else {
            oled.setCursor(4, y + 1);
            oled.print("  "); oled.print(opts[i]);
        }
    }
    oled.display();
}

// ─── Menu ──────────────────────────────────────────────────────────────────
// Scrolling 2-item window follows the cursor.
void DisplayManager::drawMenu(const char* const items[], int count,
                               int cursor, const char* title) {
    static int scrollOffset = 0;
    const int MAX_VIS = 2;

    if (cursor < scrollOffset) scrollOffset = cursor;
    if (cursor >= scrollOffset + MAX_VIS) scrollOffset = cursor - MAX_VIS + 1;

    oled.clearDisplay();
    titleBar(oled, title);

    // Up arrow
    oled.setTextSize(1);
    if (scrollOffset > 0) {
        oled.setCursor(120, TITLE_H); oled.print("^");
    }

    for (int i = 0; i < MAX_VIS && scrollOffset + i < count; i++) {
        int idx = scrollOffset + i;
        int y   = TITLE_H + i * ITEM_H;

        if (idx == cursor) {
            oled.fillRect(0, y, 128, ITEM_H, SSD1306_WHITE);
            oled.setTextColor(SSD1306_BLACK);
            oled.setCursor(4, y + 1);
            oled.print("> "); oled.print(items[idx]);
            oled.setTextColor(SSD1306_WHITE);
        } else {
            oled.setCursor(4, y + 1);
            oled.print("  "); oled.print(items[idx]);
        }
    }

    // Down arrow
    if (scrollOffset + MAX_VIS < count) {
        oled.setCursor(120, TITLE_H + (MAX_VIS - 1) * ITEM_H + 1);
        oled.print("v");
    }

    oled.display();
}

// ─── Settings ──────────────────────────────────────────────────────────────
// Scrolling 2-row window.
void DisplayManager::drawSettings(int workMin, int shortMin, int longMin,
                                   int sessions, int cursor, bool editing) {
    static int scrollOffset = 0;
    const int MAX_VIS = 2;

    if (cursor < scrollOffset) scrollOffset = cursor;
    if (cursor >= scrollOffset + MAX_VIS) scrollOffset = cursor - MAX_VIS + 1;

    oled.clearDisplay();
    titleBar(oled, editing ? "SETTINGS [EDIT]" : "SETTINGS");

    struct Row { const char* label; int value; const char* unit; };
    Row rows[4] = {
        {"Work",     workMin,  "m"},
        {"Shrt Brk", shortMin, "m"},
        {"Long Brk", longMin,  "m"},
        {"Sessions", sessions, ""},
    };

    oled.setTextSize(1);
    if (scrollOffset > 0) { oled.setCursor(120, TITLE_H); oled.print("^"); }

    for (int i = 0; i < MAX_VIS && scrollOffset + i < 4; i++) {
        int ri  = scrollOffset + i;
        int y   = TITLE_H + i * ITEM_H;
        bool sel = (ri == cursor);

        if (sel) {
            oled.fillRect(0, y, 128, ITEM_H, SSD1306_WHITE);
            oled.setTextColor(SSD1306_BLACK);
        }
        oled.setCursor(2, y + 1);
        oled.print(sel ? ">" : " ");
        oled.print(" ");
        oled.print(rows[ri].label);
        oled.print(":");
        if (sel && editing) {
            oled.print("["); oled.print(rows[ri].value); oled.print("]");
        } else {
            oled.print(rows[ri].value);
        }
        if (strlen(rows[ri].unit)) oled.print(rows[ri].unit);
        if (sel) oled.setTextColor(SSD1306_WHITE);
    }

    if (scrollOffset + MAX_VIS < 4) {
        oled.setCursor(120, TITLE_H + (MAX_VIS - 1) * ITEM_H + 1);
        oled.print("v");
    }

    oled.display();
}

// ─── Set Time ──────────────────────────────────────────────────────────────
// Title bar + large HH:MM filling the remaining 22px.
void DisplayManager::drawSetTime(int hh, int mm, int cursor) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    titleBar(oled, "SET TIME");

    // HH:MM at textSize 2 (16px tall) starting y=TITLE_H (10)
    // → ends at y=26, leaving 6px: just fits in 32px
    static const int TY  = TITLE_H;
    static const int HHX = 34;
    static const int CLX = 58;
    static const int MMX = 70;

    oled.setTextSize(2);

    if (cursor == 0) {
        oled.fillRect(HHX, TY, 24, TS2_H, SSD1306_WHITE);
        oled.setTextColor(SSD1306_BLACK);
    }
    char hbuf[4]; snprintf(hbuf, sizeof(hbuf), "%02d", hh);
    oled.setCursor(HHX, TY); oled.print(hbuf);
    oled.setTextColor(SSD1306_WHITE);

    oled.setCursor(CLX, TY); oled.print(":");

    if (cursor == 1) {
        oled.fillRect(MMX, TY, 24, TS2_H, SSD1306_WHITE);
        oled.setTextColor(SSD1306_BLACK);
    }
    char mbuf[4]; snprintf(mbuf, sizeof(mbuf), "%02d", mm);
    oled.setCursor(MMX, TY); oled.print(mbuf);
    oled.setTextColor(SSD1306_WHITE);

    oled.display();
}
