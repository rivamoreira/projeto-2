/* ============================================================================
   LedActuatorSWC — Actuator SWC
   Runnable: driveLeds (DataReceivedEvent)
   RPort: TaskState_in · PPort: LedCmd_out
   ============================================================================ */
class LedActuatorSWC {
  constructor(rte) {
    this.rte = rte;
    this.lastState = {};
    this.port_state_in = new ReceiverPort("TaskState_in");
    this.port_led_out = new SenderPort("LedCmd_out");
    rte.registerPort("TaskState_in", this.port_state_in);
    rte.registerPort("LedCmd_out", this.port_led_out);
    this.map = { pulses10:"L1", pulses20:"L2", pulses50:"L3", pulses100:"L4", pulses200:"L5" };
  }
  driveLeds(payload) {
    const state = payload?.state || {};
    for (const [track, led] of Object.entries(this.map)) {
      const on = !!state[track];
      if (this.lastState[led] === on) continue;
      this.lastState[led] = on;
      this.rte.write("LedCmd_out", `LED:${led}:${on ? 1 : 0}`);
    }
  }
}
window.LedActuatorSWC = LedActuatorSWC;