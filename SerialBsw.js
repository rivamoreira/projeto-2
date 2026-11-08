/* ============================================================================
   SerialBsw.js — BSW: acesso ao hardware via Web Serial
   Só sabe escrever bytes. Nenhuma lógica de aplicação.
   ============================================================================ */
class SerialBsw {
  constructor() { this.port=null; this.writer=null; this.reader=null; this.connected=false; this.writeQueue=Promise.resolve(); }

  async connect() {
    if (!("serial" in navigator)) throw new Error("Web Serial indisponível");
    this.port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x2341 }, { usbVendorId: 0x1A86 }, { usbVendorId: 0x10C4 }],
    });
    try { await this.port.open({ baudRate: 115200 }); }
    catch { await this.port.open({ baudRate: 5500 }); }
    await new Promise(r => setTimeout(r, 1500));
    this.writer = this.port.writable.getWriter();
    this.connected = true;
    this._readLoop();
    console.log("[SerialBsw] connected");
  }

  async disconnect() {
    this.connected = false;
    try { await this.reader?.cancel(); } catch {}
    try { await this.writer?.releaseLock(); } catch {}
    try { await this.port?.close(); } catch {}
    this.port = null;
  }

  send(cmd) {
    if (!this.connected || !this.writer) return;
    this.writeQueue = this.writeQueue
      .then(() => this.writer.write(new TextEncoder().encode(cmd + "\n")))
      .catch(e => console.warn("[SerialBsw] write:", e));
  }

  async _readLoop() {
    if (!this.port?.readable) return;
    this.reader = this.port.readable.getReader();
    const dec = new TextDecoder();
    try {
      while (this.connected) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) console.debug("[Arduino]", dec.decode(value, { stream: true }).trim());
      }
    } catch (e) { if (this.connected) console.warn("[SerialBsw] read:", e); }
    finally { try { this.reader?.releaseLock(); } catch {} }
  }
}
window.SerialBsw = SerialBsw;