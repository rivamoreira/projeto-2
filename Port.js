/* ============================================================================
   Port.js — VFB (Virtual Functional Bus) / Portas Sender-Receiver
   ============================================================================ */
class SenderPort {
  constructor(name) { this.name = name; this.value = undefined; this._listeners = new Set(); }
  write(v) { this.value = v; for (const fn of this._listeners) fn(v); }
  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
}
class ReceiverPort {
  constructor(name) { this.name = name; this._sender = null; }
  connect(sender) { this._sender = sender; }
  read() { return this._sender ? this._sender.value : undefined; }
}
class Vfb {
  constructor() { this.connections = []; }
  connect(senderPort, receiverPort) {
    receiverPort.connect(senderPort);
    this.connections.push({ sender: senderPort, receiver: receiverPort });
    console.log(`[VFB] connected ${senderPort.name} → ${receiverPort.name}`);
  }
}
window.Vfb = Vfb;
window.SenderPort = SenderPort;
window.ReceiverPort = ReceiverPort;
 