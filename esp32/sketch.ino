/*
 * SmartBus AI — Intelligent Bus Occupancy Prediction and Monitoring System
 * ESP32 Simulation Firmware for Wokwi
 *
 * Hardware Connections:
 * - Green Push Button (Passenger Entry): GPIO 18 (Active LOW with internal pull-up)
 * - Red Push Button (Passenger Exit): GPIO 19 (Active LOW with internal pull-up)
 * - I2C 16x2 LCD Display:
 *     - SDA -> GPIO 21
 *     - SCL -> GPIO 22
 *     - VCC -> 5V
 *     - GND -> GND
 * - Capacity: 40 passengers
 *
 * Serial Monitor Output:
 * - Format: time_s,entries,exits,passengers,occupancy_pct
 * - Baud rate: 115200
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Pins
const int PIN_ENTRY = 18;
const int PIN_EXIT = 19;
const int PIN_SDA = 21;
const int PIN_SCL = 22;

// Bus Configuration
const int BUS_CAPACITY = 40;

// LCD configuration (Default address is usually 0x27)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// State variables
int cumulativeEntries = 0;
int cumulativeExits = 0;
int currentPassengers = 0;
float occupancyPct = 0.0;

// Button debounce timing
unsigned long lastEntryPressTime = 0;
unsigned long lastExitPressTime = 0;
const unsigned long DEBOUNCE_DELAY_MS = 200;

// Periodic reporting timing
unsigned long lastReportTime = 0;
const unsigned long REPORT_INTERVAL_MS = 5000; // Output to Serial every 5 seconds

// Keep track of previous button states
int prevEntryState = HIGH;
int prevExitState = HIGH;

void updateLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Pass: ");
  lcd.print(currentPassengers);
  lcd.print("/");
  lcd.print(BUS_CAPACITY);
  lcd.print(" ");
  lcd.print((int)occupancyPct);
  lcd.print("%");

  lcd.setCursor(0, 1);
  if (occupancyPct < 40.0) {
    lcd.print("Status: LOW");
  } else if (occupancyPct < 75.0) {
    lcd.print("Status: MODERATE");
  } else {
    lcd.print("Status: HIGH!");
  }
}

void outputSerialRecord() {
  unsigned long time_s = millis() / 1000;
  // Format: time_s,entries,exits,passengers,occupancy_pct
  Serial.print(time_s);
  Serial.print(",");
  Serial.print(cumulativeEntries);
  Serial.print(",");
  Serial.print(cumulativeExits);
  Serial.print(",");
  Serial.print(currentPassengers);
  Serial.print(",");
  Serial.println(occupancyPct, 1);
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // Configure pins with pull-ups
  pinMode(PIN_ENTRY, INPUT_PULLUP);
  pinMode(PIN_EXIT, INPUT_PULLUP);

  // Initialize I2C LCD
  Wire.begin(PIN_SDA, PIN_SCL);
  lcd.init();
  lcd.backlight();

  // Welcome splash
  lcd.setCursor(0, 0);
  lcd.print("SmartBus AI");
  lcd.setCursor(0, 1);
  lcd.print("System Ready");
  delay(1500);

  updateLCD();

  // Print CSV Header
  Serial.println("time_s,entries,exits,passengers,occupancy_pct");
  outputSerialRecord();
}

void loop() {
  unsigned long now = millis();
  bool stateChanged = false;

  // Read Entry Button (Active LOW)
  int entryState = digitalRead(PIN_ENTRY);
  if (entryState == LOW && prevEntryState == HIGH && (now - lastEntryPressTime > DEBOUNCE_DELAY_MS)) {
    lastEntryPressTime = now;
    if (currentPassengers < BUS_CAPACITY) {
      cumulativeEntries++;
      currentPassengers++;
      stateChanged = true;
    } else {
      // Capacity limit reached - alert on LCD momentarily
      lcd.setCursor(0, 1);
      lcd.print("MAX CAPACITY 40!");
      delay(500);
      updateLCD();
    }
  }
  prevEntryState = entryState;

  // Read Exit Button (Active LOW)
  int exitState = digitalRead(PIN_EXIT);
  if (exitState == LOW && prevExitState == HIGH && (now - lastExitPressTime > DEBOUNCE_DELAY_MS)) {
    lastExitPressTime = now;
    if (currentPassengers > 0) {
      cumulativeExits++;
      currentPassengers--;
      stateChanged = true;
    }
  }
  prevExitState = exitState;

  // Calculate percentage
  occupancyPct = ((float)currentPassengers / (float)BUS_CAPACITY) * 100.0;

  // If state changed or periodic report interval elapsed, report data
  if (stateChanged) {
    updateLCD();
    outputSerialRecord();
    lastReportTime = now;
  } else if (now - lastReportTime >= REPORT_INTERVAL_MS) {
    outputSerialRecord();
    lastReportTime = now;
  }

  delay(20);
}
