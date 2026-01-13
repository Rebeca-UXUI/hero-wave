(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) { console.error("[Waves] canvas #waves not found"); return; }
  const ctx = canvas.getContext("2d");

  const cfg = {
    stroke: "#ff3b1a",
    lineWidth: 1.15,
    stepPx: 2,

    centerY: 0.52,      // carril donde viven
    microOffsetPx: 6,   // muy juntitas (evita que se pisen siempre)

    // Ondas “abiertas”
    baseFreq: 0.85,     // más bajo = más abiertas
    // Más lento
    baseSpeed: 0.22,    // 🔥 baja mucho la velocidad

    // Amplitud grande + respiración global (suave pero visible)
    ampBase: 0.14,      // amplitud base (relativa a altura)
    breatheSpeed: 0.35, // lento
    breatheAmount: 0.60 // cuánto sube/baja (0..1)
  };

  // Fases distintas => se cruzan (porque comparten freq)
  const lines = [
    { phase: 0.0,  alpha: 0.95, mo: -1, ampMul: 1.05, speedMul: 1.00 },
    { phase: 2.1,  alpha: 0.80, mo:  0, ampMul: 0.85, speedMul: 0.86 },
    { phase: 4.2,  alpha: 0.70, mo:  1, ampMul: 1.15, speedMul: 0.72 }
  ];

  let t0 = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawLine(line, t, w, h) {
    const yBase = h * cfg.centerY + line.mo * cfg.microOffsetPx;

    // amplitud base en px
    const A0 = h * cfg.ampBase * line.ampMul;

    // “respiración” global (crece/decrece) — limpia (solo seno)
    const breathe = 1 + Math.sin(t * cfg.breatheSpeed + line.phase) * cfg.breatheAmount;
    const A = A0 * breathe;

    // misma frecuencia base para todas => cruces
    const k = (Math.PI * 2 * cfg.baseFreq) / w;

    const speed = cfg.baseSpeed * line.speedMul;

    ctx.globalAlpha = line.alpha;
    ctx.beginPath();

    for (let x = -30; x <= w + 30; x += cfg.stepPx) {
      // SOLO una senoide = onda limpia
      const y = yBase + Math.sin(x * k + t * speed + line.phase) * A;
      if (x === -30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  function frame(now) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w < 2 || h < 2) { requestAnimationFrame(frame); return; }

    const t = (now - t0) / 1000;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = cfg.stroke;
    ctx.lineWidth = cfg.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawLine(lines[0], t, w, h);
    drawLine(lines[1], t, w, h);
    drawLine(lines[2], t, w, h);

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
})();
