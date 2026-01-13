(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) return;

  // Evita doble init en Webflow
  if (canvas.dataset.init === "1") return;
  canvas.dataset.init = "1";

  const ctx = canvas.getContext("2d", { alpha: true });

  /* =============================
     SETTINGS – RESONANCE
  ============================= */
  const SETTINGS = {
    lines: 3,

    color: "rgba(255,59,26,0.85)",
    lineWidth: 1.2,
    bg: "transparent",

    centerY: 0.52,
    microOffsetPx: 12,

    // Idle (latente)
    baseAmp: 5,
    baseSpeed: 0.16,
    baseFreq: 0.008,
    breatheAmp: 0.12,

    // Resonancia (cursor)
    hoverAmp: 70,
    hoverRadius: 240,
    liftFocus: 1.05,

    // Comunidad
    coupling: 0.38,

    // Render
    samples: 260
  };

  /* =============================
     HELPERS
  ============================= */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width  = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = rect.width + "px";
    canvas.style.height = rect.height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* =============================
     POINTER
  ============================= */
  let pointer = { x: 0, y: 0, inside: false };

  canvas.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  });

  canvas.addEventListener("mouseleave", () => {
    pointer.inside = false;
  });

  window.addEventListener("resize", resize);
  resize();

  /* =============================
     STATE
  ============================= */
  const energy = new Array(SETTINGS.lines).fill(0);
  const energyVel = new Array(SETTINGS.lines).fill(0);

  const phase = Array.from(
    { length: SETTINGS.lines },
    (_, i) => Math.random() * Math.PI * 2 + i * 1.2
  );

  const speedMul = [1.0, 0.85, 0.7];
  const ampMul   = [1.15, 0.95, 1.2];

  let last = performance.now();

  /* =============================
     LOOP
  ============================= */
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    ctx.clearRect(0, 0, W, H);

    const yMid = H * SETTINGS.centerY;

    /* Target energy por línea */
    const target = new Array(SETTINGS.lines).fill(0);

    for (let i = 0; i < SETTINGS.lines; i++) {
      if (!pointer.inside) continue;

      const yLine = yMid + (i - 1) * SETTINGS.microOffsetPx;
      const dy = Math.abs(pointer.y - yLine);

      const n = 1 - Math.min(1, dy / SETTINGS.hoverRadius);
      target[i] = n * n;
    }

    /* Suavizado + propagación */
    for (let i = 0; i < SETTINGS.lines; i++) {
      const left  = i > 0 ? energy[i - 1] : energy[i];
      const right = i < SETTINGS.lines - 1 ? energy[i + 1] : energy[i];
      const coupled = lerp(target[i], (left + right) * 0.5, SETTINGS.coupling);

      const accel = (coupled - energy[i]) * 6.5;
      energyVel[i] += accel * dt;
      energyVel[i] *= 0.88;
      energy[i] += energyVel[i];
      energy[i] = clamp01(energy[i]);
    }

    ctx.strokeStyle = SETTINGS.color;
    ctx.lineWidth = SETTINGS.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const breathe = 1 + Math.sin(now * 0.00035) * SETTINGS.breatheAmp;

    for (let i = 0; i < SETTINGS.lines; i++) {
      const yLine = yMid + (i - 1) * SETTINGS.microOffsetPx;

      const amp =
        SETTINGS.baseAmp * breathe * ampMul[i] +
        SETTINGS.hoverAmp * energy[i];

      const freq = SETTINGS.baseFreq;
      const spd =
        SETTINGS.baseSpeed *
        speedMul[i] *
        (1 + energy[i] * 0.15);

      phase[i] += dt * spd;

      ctx.beginPath();

      for (let s = 0; s <= SETTINGS.samples; s++) {
        const x = (s / SETTINGS.samples) * W;

        let local = 1;
        if (pointer.inside) {
          const d = Math.abs(x - pointer.x);
          const m = 1 - Math.min(1, d / SETTINGS.hoverRadius);
          local = 1 + m * m * energy[i] * SETTINGS.liftFocus;
        }

        const y =
          yLine +
          Math.sin(x * freq + phase[i]) * amp * local;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
