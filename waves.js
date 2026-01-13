
(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) return;

  // Evita doble init en Webflow
  if (canvas.dataset.init === "1") return;
  canvas.dataset.init = "1";

  const ctx = canvas.getContext("2d", { alpha: true });

  // ====== SETTINGS (Resonance) ======
  const SETTINGS = {
    lines: 3,

    // Look
    color: "rgba(255,59,26,0.85)", // tu rojo
    lineWidth: 1.2,
    bg: "transparent",

    // Layout: “carril” común para cruces
    centerY: 0.52,        // 0..1
    microOffsetPx: 10,    // juntitas pero no idénticas

    // Idle (latente)
    baseAmp: 4,           // px (muy sutil en reposo)
    baseSpeed: 0.18,      // MUY lento idle
    baseFreq: 0.0085,     // ondas largas (más bajo = más abiertas)
    breatheAmp: 0.10,     // respiración muy leve

    // Resonancia (cursor)
    hoverAmp: 58,         // amplificación extra
    hoverRadius: 220,     // radio de influencia
    hoverSmooth: 0.08,    // suavizado energía (0.06-0.12)
    liftFocus: 0.95,      // cuánto se levanta donde pasas (0..1.2)

    // Comunidad: propagación entre líneas
    coupling: 0.35,       // 0..1

    // Render
    samples: 260,         // suavidad
  };

  // ===== Helpers =====
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }

  // Pointer (coords canvas)
  let pointer = { x: 0, y: 0, inside: false };
  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  }, { passive: true });

  canvas.addEventListener("mouseleave", () => { pointer.inside = false; }, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Energía por línea (0..1)
  const energy = new Array(SETTINGS.lines).fill(0);
  const energyVel = new Array(SETTINGS.lines).fill(0);

  // Fases por línea
  const phase = Array.from({ length: SETTINGS.lines }, (_, i) => (Math.random() * Math.PI * 2) + i * 1.1);
  const speedMul = [1.00, 0.86, 0.72]; // ritmos distintos pero lentos
  const ampMul   = [1.10, 0.92, 1.18]; // variación visual sutil

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // BG
    if (SETTINGS.bg === "transparent") ctx.clearRect(0, 0, W, H);
    else { ctx.fillStyle = SETTINGS.bg; ctx.fillRect(0, 0, W, H); }

    // y base compartido (cruces)
    const yMid = H * SETTINGS.centerY;

    // Target energy según cercanía vertical al carril
    const target = new Array(SETTINGS.lines).fill(0);

    for (let i = 0; i < SETTINGS.lines; i++) {
      if (!pointer.inside) { target[i] = 0; continue; }

      const yLine = yMid + (i - 1) * SETTINGS.microOffsetPx;
      const dy = Math.abs(pointer.y - yLine);

      // Influencia sobre todo por cercanía vertical (más controlado)
      const n = 1 - Math.min(1, dy / SETTINGS.hoverRadius);
      target[i] = n * n; // curva suave
    }

    // Smooth + Coupling (comunidad)
    for (let i = 0; i < SETTINGS.lines; i++) {
      const left = i > 0 ? energy[i - 1] : energy[i];
      const right = i < SETTINGS.lines - 1 ? energy[i + 1] : energy[i];
      const neighborMean = (left + right) * 0.5;

      const coupledTarget = lerp(target[i], neighborMean, SETTINGS.coupling);

      // spring suave (entrada/salida premium)
      const accel = (coupledTarget - energy[i]) * (6.5 * SETTINGS.hoverSmooth / 0.08);
      energyVel[i] += accel * dt;
      energyVel[i] *= 0.88; // damping
      energy[i] += energyVel[i];

      energy[i] = clamp01(energy[i]);
    }

    // Draw style
    ctx.strokeStyle = SETTINGS.color;
    ctx.lineWidth = SETTINGS.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // respiración global muy lenta
    const breathe = 1 + Math.sin(now * 0.00035) * SETTINGS.breatheAmp;

    for (let i = 0; i < SETTINGS.lines; i++) {
      const yLine = yMid + (i - 1) * SETTINGS.microOffsetPx;

      // Amplitud: latente + resonancia
      const amp = (SETTINGS.baseAmp * breathe * ampMul[i]) + (SETTINGS.hoverAmp * energy[i]);

      // Onda limpia: SOLO seno
      const freq = SETTINGS.baseFreq; // compartida => look coherente
      const spd = SETTINGS.baseSpeed * speedMul[i] * (1 + energy[i] * 0.15); // casi constante

      phase[i] += dt * spd;

      ctx.beginPath();

      for (let s = 0; s <= SETTINGS.samples; s++) {
        const x = (s / SETTINGS.samples) * W;

        // “Resonance”: se levanta más cerca del cursor (pero limpio)
        let local = 1;
        if (pointer.inside) {
          const d = Math.abs(x - pointer.x);
          const m = 1 - Math.min(1, d / SETTINGS.hoverRadius);
          local = 1 + (m * m) * energy[i] * SETTINGS.liftFocus;
        }

        const y = yLine + Math.sin(x * freq + phase[i]) * amp * local;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

