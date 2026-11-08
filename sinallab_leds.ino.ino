/* ============================================================================
   TRAMPOLINE - RTOS_leds.ino — recebe comandos do bridge.js via Serial
   Protocolo:  "LED:<Lx>:<0|1>\n"   ex.:  LED:L1:1\n
   Pinos:      L1=D8  L2=D9  L3=D10  L4=D11  L5=D12
   ============================================================================ */

const uint8_t LEDS[5] = {8, 9, 10, 11, 6};   // D8..D12

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < 5; i++) {
    pinMode(LEDS[i], OUTPUT);
    digitalWrite(LEDS[i], LOW);
  }
  Serial.println("SINALLAB ready");
}

void loop() {
  if (!Serial.available()) return;

  String s = Serial.readStringUntil('\n');
  s.trim();
  if (s.length() == 0) return;

  if (!s.startsWith("LED:")) {
    Serial.print("ERR unknown cmd: ");
    Serial.println(s);
    return;
  }

  int p1 = s.indexOf(':');
  int p2 = s.indexOf(':', p1 + 1);
  if (p2 < 0) return;

  String led = s.substring(p1 + 1, p2);       // "L1".."L5"
  int on     = s.substring(p2 + 1).toInt();   // 0|1
  if (!led.startsWith("L")) return;

  int idx = led.substring(1).toInt() - 1;     // L1→0 … L5→4
  if (idx < 0 || idx > 4) return;

  digitalWrite(LEDS[idx], on ? HIGH : LOW);

  Serial.print("OK ");
  Serial.print(led);
  Serial.print(' ');
  Serial.println(on);
}