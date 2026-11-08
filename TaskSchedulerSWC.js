/* ============================================================================
   TaskSchedulerSWC — Core SWC
   Runnable: ScheduleTasks (TimingEvent 16ms)
   RPort: Speed_in · PPort: TaskState_out
   ============================================================================ */
class TaskSchedulerSWC {
  constructor(rte) {
    this.rte = rte;
    this.port_speed_in = new ReceiverPort("Speed_in");
    this.port_state_out = new SenderPort("TaskState_out");
    rte.registerPort("Speed_in", this.port_speed_in);
    rte.registerPort("TaskState_out", this.port_state_out);

    this.tracks = [
      { key:"pulses10",  baseMs:1000, active:false, nextAt:0, count:0 },
      { key:"pulses20",  baseMs: 500, active:false, nextAt:0, count:0 },
      { key:"pulses50",  baseMs: 200, active:false, nextAt:0, count:0 },
      { key:"pulses100", baseMs: 100, active:false, nextAt:0, count:0 },
      { key:"pulses200", baseMs:  50, active:false, nextAt:0, count:0 },
    ];
    this.odoPulses = 0;

    rte.registerRunnable("TaskScheduler_ScheduleTasks", () => this.schedule(), 16);
  }
  schedule() {
    const kmh = this.rte.read("Speed_in") || 0;
    const now = performance.now();

    if (kmh <= 0) {
      let changed = false;
      for (const t of this.tracks) if (t.active) { t.active = false; changed = true; }
      if (changed) this.publish();
      return;
    }
    const factor = 100 / kmh;
    let changed = false;
    for (const t of this.tracks) {
      const period = Math.max(20, t.baseMs * factor);
      if (t.nextAt === 0) t.nextAt = now + period;
      if (now >= t.nextAt) {
        t.count++; t.active = true; t.nextAt = now + period; this.odoPulses++; changed = true;
        setTimeout(() => { t.active = false; this.publish(); }, Math.max(20, 80 * (100 / kmh)));
      }
    }
    if (changed || this.tracks.some(t => t.active)) this.publish();
  }
  publish() {
    const s = {};
    for (const t of this.tracks) s[t.key] = t.active;
    this.rte.write("TaskState_out", { state: s, counts: this.tracks.map(t => t.count), odo: this.odoPulses });
  }
}
window.TaskSchedulerSWC = TaskSchedulerSWC;