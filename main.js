/* ============================================================================
   main.js — Composição do sistema AUTOSAR (ECU Extract simulado)
   Instancia RTE + SWCs + BSW + View, conecta portas no VFB, inicia RTE.
   ============================================================================ */
(function boot() {
  "use strict";

  // 1) Infraestrutura
  const rte = new Rte();

  // 2) Application SWCs
  const speedSensor   = new SpeedSensorSWC(rte);
  const taskScheduler = new TaskSchedulerSWC(rte);
  const lcdDisplay    = new LcdDisplaySWC(rte);
  const ledActuator   = new LedActuatorSWC(rte);

  // 3) BSW
  const serialBsw = new SerialBsw();

  // 4) VFB: conecta portas (AssemblyConnectors)
  const vfb = new Vfb();
  vfb.connect(speedSensor.port_out,     taskScheduler.port_speed_in);
  vfb.connect(speedSensor.port_out,     lcdDisplay.port_speed_in);
  vfb.connect(taskScheduler.port_state_out, ledActuator.port_state_in);

  // 5) Saídas dos atuadores → BSW (o RTE não conhece hardware)
  lcdDisplay.port_lcd_out.subscribe((cmd) => serialBsw.send(cmd));
  ledActuator.port_led_out.subscribe((cmd) => serialBsw.send(cmd));

  // 6) DataReceivedEvent: TaskState_out → Runnable do LedActuator
  taskScheduler.port_state_out.subscribe((payload) => ledActuator.driveLeds(payload));

  // 7) HMI (fora da arquitetura — só assina portas)
  const view = new DashboardView(rte, speedSensor, taskScheduler);

  // 8) Inicia RTE
  rte.start();

  // 9) Botão Web Serial (injetado aqui, não é SWC)
  const btn = document.createElement("button");
  btn.id = "btn-serial";
  btn.textContent = "Conectar Arduino + LCD";
  if (!("serial" in navigator)) { btn.disabled = true; btn.textContent = "Web Serial indisponível"; }
  btn.addEventListener("click", async () => {
    if (serialBsw.connected) {
      await serialBsw.disconnect();
      btn.textContent = "Conectar Arduino + LCD";
      btn.style.background = "#0b5fff";
    } else {
      try {
        await serialBsw.connect();
        btn.textContent = "Desconectar";
        btn.style.background = "#d33";
      } catch (e) {
        alert("Falha ao conectar: " + e.message);
      }
    }
  });
  document.body.appendChild(btn);

  // debug
  window.__autosar = { rte, vfb, speedSensor, taskScheduler, lcdDisplay, ledActuator, serialBsw, view };
  console.log("[AUTOSAR] system initialized");
})();