/* ============================================================================
   LcdDisplaySWC — Actuator SWC
   Runnable: UpdateDisplay (TimingEvent 200ms)
   RPort: Speed_in · PPort: LcdCmd_out
   ============================================================================ */
class LcdDisplaySWC {
  constructor(rte) {
    this.rte = rte;
    this.lastSpeed = -1;
    this.port_speed_in = new ReceiverPort("Speed_in");
    this.port_lcd_out = new SenderPort("LcdCmd_out");
    rte.registerPort("Speed_in", this.port_speed_in);
    rte.registerPort("LcdCmd_out", this.port_lcd_out);
    rte.registerRunnable("LcdDisplay_UpdateDisplay", () => this.update(), 200);
  }
  update() {
    const kmh = this.rte.read("Speed_in");
    if (kmh === undefined || kmh === this.lastSpeed) return;
    this.lastSpeed = kmh;
    this.rte.write("LcdCmd_out", `SPD:${Math.round(kmh)}`);
  }
}
window.LcdDisplaySWC = LcdDisplaySWC;