/* ============================================================================
   DashboardView — HMI (fora da arquitetura AUTOSAR)
   Responsabilidade: pintar DOM. Nunca altera estado de SWC, só assina portas.
   Substitui todo o "render" que antes vivia no script.js.
   ============================================================================ */
class DashboardView {
  constructor(rte, speedSensor, taskScheduler) {
    this.rte = rte;
    this.speedSensor = speedSensor;
    this.taskScheduler = taskScheduler;

    this.KMH_MIN = 0; this.KMH_MAX = 120; this.KMH_DEFAULT = 60;
    this.PULSE_WIDTH_MS = 80;
    this.TRACKS = [
      { key:"pulses10",  label:"Task_Acquisition", pin:"D8",  led:"L1", color:"#0b5fff", baseMs:1000 },
      { key:"pulses20",  label:"Task_Processing",  pin:"D9",  led:"L2", color:"#00b894", baseMs: 500 },
      { key:"pulses50",  label:"Task_Display",     pin:"D10", led:"L3", color:"#f39c12", baseMs: 200 },
      { key:"pulses100", label:"Task_Output",      pin:"D11", led:"L4", color:"#e74c3c", baseMs: 100 },
      { key:"pulses200", label:"Task_Storage",     pin:"D12", led:"L5", color:"#8e44ad", baseMs:  50 },
    ];

    this.el = Object.create(null);
    this.refs = null;
    this.startAt = performance.now();
    this._lastKmh = this.KMH_DEFAULT;

    this.buildUI();
    this.bindPorts();
  }

  // ---------- UI ----------
  buildUI() {
    const root = document.querySelector("[data-sinallab-root]");
    if (!root) return console.warn("[DashboardView] <main data-sinallab-root> ausente");
    root.innerHTML = "";

    // header
    const header = document.createElement("header");
    header.className = "sinallab__header";
    header.innerHTML = `
      <div>
        <h1 class="sinallab__title">UTFPR-PG· TRAMPOLINE OSEK-VDX- AUTOSAR  </h1>
        <p class="sinallab__subtitle">
          Applicações SWCs → RTE → BSW · LCD 1602A · Arduino Uno
        </p>
      </div>
      <div class="controls">
        <button id="btn-start" class="btn btn--primary" type="button">Start</button>
        <button id="btn-stop"  class="btn btn--danger"  type="button">Stop</button>
        <button id="btn-reset" class="btn btn--ghost"   type="button">Reset</button>
      </div>`;
    root.appendChild(header);

    // grid: velocímetro + telemetria
    const grid = document.createElement("div");
    grid.className = "grid";

    const speedCard = document.createElement("section");
    speedCard.className = "speed-card";
    speedCard.innerHTML = `
      <h2 class="speed-card__title">Velocidade</h2>
      <div class="speed-card__gauge">
        <canvas id="gauge" width="260" height="260" aria-label="Velocímetro"></canvas>
        <div class="speed-card__readout">
          <span id="kmh-big" class="speed-card__kmh">${this.KMH_DEFAULT}</span>
          <span class="speed-card__unit">km/h</span>
        </div>
      </div>
      <div class="speed-controls">
        <input id="speed-range" class="speed-input" type="range"
               min="${this.KMH_MIN}" max="${this.KMH_MAX}" step="1" value="${this.KMH_DEFAULT}">
        <div class="speed-buttons">
          <button id="btn-slower" class="btn btn--ghost" type="button">−10</button>
          <button id="btn-faster" class="btn btn--ghost" type="button">+10</button>
        </div>
        <div class="speed-presets">
          ${[0,30,60,90,120].map(v =>
            `<button type="button" class="btn btn--preset ${v===this.KMH_DEFAULT?"is-active":""}" data-kmh="${v}">${v}</button>`
          ).join("")}
        </div>
      </div>`;
    grid.appendChild(speedCard);

    const telemetry = document.createElement("section");
    telemetry.className = "telemetry";
    telemetry.innerHTML = `
      <div class="telemetry__item"><span class="telemetry__label">Estado</span><strong class="telemetry__value" id="tlm-state">rodando</strong></div>
      <div class="telemetry__item"><span class="telemetry__label">Fator</span><strong class="telemetry__value" id="tlm-factor">1,67×</strong></div>
      <div class="telemetry__item"><span class="telemetry__label">Pulsos</span><strong class="telemetry__value" id="tlm-pulses">0</strong></div>
      <div class="telemetry__item"><span class="telemetry__label">Uptime</span><strong class="telemetry__value" id="tlm-uptime">0,0 s</strong></div>`;
    grid.appendChild(telemetry);
    root.appendChild(grid);

    // tracklines
    const list = document.createElement("div");
    list.className = "tracklines";
    for (const t of this.TRACKS) {
      const card = document.createElement("div");
      card.id = t.key; card.className = "trackline";
      card.dataset.led = t.led; card.dataset.pin = t.pin;
      card.style.setProperty("--color", t.color);
      card.innerHTML = `
        <span class="trackline__dot"></span>
        <div class="trackline__name"><strong>${t.label}</strong><span>${t.key} · ${t.pin} · ${t.led}</span></div>
        <div class="trackline__period">${t.baseMs} ms</div>
        <div class="trackline__count">0</div>
        <div class="trackline__bar"><div class="trackline__fill"></div></div>`;
      list.appendChild(card);
      this.el[t.key] = {
        card,
        count: card.querySelector(".trackline__count"),
        period: card.querySelector(".trackline__period"),
        fill: card.querySelector(".trackline__fill"),
        base: t.baseMs, lastActive: false, lastCount: -1, lastPeriod: -1,
      };
    }
    root.appendChild(list);

    const footer = document.createElement("footer");
    footer.className = "sinallab__footer";
    footer.innerHTML = `
      <span>Atalhos: <strong>Espaço</strong> start/stop · <strong>↑/↓</strong> acelerar/frear</span>
      <span>Chrome/Edge · <strong>127.0.0.1:5500</strong> · LCD 1602A via I²C</span>`;
    root.appendChild(footer);

    // refs
    this.refs = {
      gauge: root.querySelector("#gauge"),
      kmhBig: root.querySelector("#kmh-big"),
      range: root.querySelector("#speed-range"),
      factor: root.querySelector("#tlm-factor"),
      pulses: root.querySelector("#tlm-pulses"),
      uptime: root.querySelector("#tlm-uptime"),
      state: root.querySelector("#tlm-state"),
      presets: [...root.querySelectorAll(".btn--preset")],
    };

    // handlers — só alteram o SWC de sensor, nunca o DOM diretamente
    root.querySelector("#btn-start").addEventListener("click", () => this.setRunning(true));
    root.querySelector("#btn-stop" ).addEventListener("click", () => this.setRunning(false));
    root.querySelector("#btn-reset").addEventListener("click", () => this.reset());
    root.querySelector("#btn-slower").addEventListener("click", () => this.changeSpeed(-10));
    root.querySelector("#btn-faster").addEventListener("click", () => this.changeSpeed(+10));
    this.refs.range.addEventListener("input", () => this.setSpeed(parseFloat(this.refs.range.value)));
    this.refs.presets.forEach(p =>
      p.addEventListener("click", () => this.setSpeed(parseFloat(p.dataset.kmh))));

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space")     { e.preventDefault(); this.setRunning(!this._running); }
      if (e.code === "ArrowUp")   { e.preventDefault(); this.changeSpeed(+10); }
      if (e.code === "ArrowDown") { e.preventDefault(); this.changeSpeed(-10); }
    });

    this._running = true;
    this.drawGauge(this.KMH_DEFAULT);
    this.startTicker();
  }

  // ---------- Portas (assinaturas VFB — somente leitura) ----------
  bindPorts() {
    // Velocidade → velocímetro + readout + fator
    this.speedSensor.port_out.subscribe((kmh) => {
      if (kmh === this._lastKmh) return;
      this._lastKmh = kmh;
      if (this.refs) {
        this.refs.kmhBig.textContent = kmh;
        this.refs.range.value = kmh;
        this.refs.factor.textContent = kmh > 0 ? `${(100/kmh).toFixed(2).replace(".",",")}×` : "—";
        this.refs.presets.forEach(p =>
          p.classList.toggle("is-active", Number(p.dataset.kmh) === Math.round(kmh)));
        this.drawGauge(kmh);
      }
      for (const t of this.TRACKS) this.paintPeriod(t.key, kmh);
      if (kmh <= 0) this.setRunning(false);
    });

    // Estado das tracklines → cards + telemetria
    this.taskScheduler.port_state_out.subscribe((payload) => {
      const { state, counts, odo } = payload;
      for (const t of this.TRACKS) {
        const e = this.el[t.key]; if (!e) continue;
        const on = !!state[t.key];
        if (on !== e.lastActive) {
          e.card.classList.toggle("active", on);
          e.lastActive = on;
        }
        const c = counts[this.TRACKS.indexOf(t)];
        if (c !== e.lastCount) { e.count.textContent = c.toLocaleString("pt-BR"); e.lastCount = c; }
      }
      if (this.refs) this.refs.pulses.textContent = odo.toLocaleString("pt-BR");
    });
  }

  // ---------- Ações do usuário (chamam o SWC, não o DOM) ----------
  setSpeed(kmh) {
    const v = Math.max(this.KMH_MIN, Math.min(this.KMH_MAX, Math.round(kmh)));
    this.speedSensor.setSpeed(v);
    if (v > 0 && !this._running) this.setRunning(true);
    if (v === 0) this.setRunning(false);
  }
  changeSpeed(delta) { this.setSpeed(this._lastKmh + delta); }

  setRunning(on) {
    this._running = on;
    if (this.refs) this.refs.state.textContent = on ? "rodando" : "parado";
    if (!on) this.speedSensor.setSpeed(0);
    else if (this.speedSensor.speedKmh === 0) this.speedSensor.setSpeed(this.KMH_DEFAULT);
    if (on) this.startAt = performance.now();
  }

  reset() {
    for (const t of this.taskScheduler.tracks) { t.count = 0; t.nextAt = 0; }
    this.taskScheduler.odoPulses = 0;
    for (const t of this.TRACKS) {
      const e = this.el[t.key]; if (!e) continue;
      e.count.textContent = "0"; e.fill.style.width = "0%";
    }
    if (this.refs) { this.refs.pulses.textContent = "0"; this.refs.uptime.textContent = "0,0 s"; }
    this.startAt = performance.now();
  }

  // ---------- Pintura ----------
  paintPeriod(key, kmh) {
    const e = this.el[key]; if (!e) return;
    const p = kmh > 0 ? Math.max(20, e.base * (100 / kmh)) : Infinity;
    const pRounded = Number.isFinite(p) ? Math.round(p) : -1;
    if (pRounded !== e.lastPeriod) {
      e.period.textContent = Number.isFinite(p) ? `${pRounded} ms` : "—";
      e.lastPeriod = pRounded;
    }
  }

  startTicker() {
    const tick = () => {
      requestAnimationFrame(tick);
      const now = performance.now();
      // progresso de cada barra
      for (const t of this.TRACKS) {
        const e = this.el[t.key]; if (!e) continue;
        const k = this.taskScheduler.tracks[this.TRACKS.indexOf(t)];
        const period = this._lastKmh > 0 ? Math.max(20, e.base * (100/this._lastKmh)) : Infinity;
        if (!Number.isFinite(period) || !k.lastAt) continue;
        const prog = Math.min(100, Math.max(0, ((now - k.lastAt) / period) * 100));
        e.fill.style.width = prog.toFixed(1) + "%";
      }
      // uptime
      if (this.refs && this._running) {
        const sec = (now - this.startAt) / 1000;
        this.refs.uptime.textContent = `${sec.toFixed(1).replace(".", ",")} s`;
      }
    };
    requestAnimationFrame(tick);
  }

  drawGauge(kmh) {
    const c = this.refs?.gauge; if (!c) return;
    const ctx = c.getContext("2d"), W = c.width, H = c.height;
    const cx = W/2, cy = H/2 + 6, R = Math.min(W, H)/2 - 14;
    ctx.clearRect(0, 0, W, H);
    const A0 = Math.PI * 1.22, A1 = -Math.PI * 0.22, span = A1 - A0;

    ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.strokeStyle = "#e7eaf0";
    ctx.beginPath(); ctx.arc(cx, cy, R, A0, A1); ctx.stroke();

    const frac = Math.max(0, Math.min(1, kmh / this.KMH_MAX));
    const Acur = A0 + span * frac;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#00b894"); grad.addColorStop(.5, "#f39c12"); grad.addColorStop(1, "#e74c3c");
    ctx.strokeStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R, A0, Acur); ctx.stroke();

    ctx.strokeStyle = "#cbd2dc"; ctx.lineWidth = 2;
    for (let v = 0; v <= this.KMH_MAX; v += 20) {
      const a = A0 + span * (v / this.KMH_MAX);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*(R-18), cy + Math.sin(a)*(R-18));
      ctx.lineTo(cx + Math.cos(a)*(R-26), cy + Math.sin(a)*(R-26));
      ctx.stroke();
    }

    ctx.strokeStyle = "#0b5fff"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(Acur)*(R-22), cy + Math.sin(Acur)*(R-22)); ctx.stroke();
    ctx.fillStyle = "#0b5fff"; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();
  }
}
window.DashboardView = DashboardView;