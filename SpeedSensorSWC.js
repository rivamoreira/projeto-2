/* ============================================================================
   SpeedSensorSWC — Sensor SWC
   Runnable: ReadSpeed (TimingEvent 100ms) · PPort: Speed_out
   ============================================================================ */
class SpeedSensorSWC {
  constructor(rte) {
    this.rte = rte;
    this.speedKmh = 60;
    this.port_out = new SenderPort("Speed_out");
    rte.registerPort("Speed_out", this.port_out);
    rte.registerRunnable("SpeedSensor_ReadSpeed", () => this.readSpeed(), 100);
  }
  readSpeed() { this.rte.write("Speed_out", this.speedKmh); }
  setSpeed(kmh) { this.speedKmh = Math.max(0, Math.min(120, kmh)); }
}
window.SpeedSensorSWC = SpeedSensorSWC;