/* ============================================================================
   Rte.js — Runtime Environment (simulado)    feat(rte):  
Fornece a API Rte_Write/Rte_Read para acesso a portas e o dispatcher de Runnables ativados por TimingEvent (periodMs). Substitui setInterval/requestAnimationFrame espalhados pelos SWCs por um único
agendador central — equivalente ao RTE gerado por toolchain AUTOSAR.
   ============================================================================ */
class Rte {
  constructor() {
    this.ports = new Map();
    this.runnables = [];
    this._running = false;
  }
  registerPort(name, port) { this.ports.set(name, port); }
  write(portName, value) {
    const p = this.ports.get(portName);
    if (!p || typeof p.write !== "function") return console.warn(`[RTE] write: "${portName}" não é SenderPort`);
    p.write(value);
  }
  read(portName) {
    const p = this.ports.get(portName);
    if (!p || typeof p.read !== "function") { console.warn(`[RTE] read: "${portName}" não é ReceiverPort`); return undefined; }
    return p.read();
  }
  registerRunnable(name, fn, periodMs) {
    this.runnables.push({ name, fn, periodMs, lastRun: 0 });
    console.log(`[RTE] Runnable "${name}" (period=${periodMs}ms)`);
  }
  start() {
    if (this._running) return;
    this._running = true;
    const tick = () => {
      if (!this._running) return;
      const now = performance.now();
      for (const r of this.runnables) {
        if (now - r.lastRun >= r.periodMs) {
          r.lastRun = now;
          try { r.fn(); } catch (e) { console.error(`[RTE] "${r.name}":`, e); }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    console.log("[RTE] started");
  }
  stop() { this._running = false; }
}
window.Rte = Rte;
