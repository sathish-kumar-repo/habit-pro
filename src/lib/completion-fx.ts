let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === "closed") {
      _ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    return _ctx;
  } catch {
    return null;
  }
}

export function playCompletionSound(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const notes: { freq: number; start: number; dur: number }[] = [
      { freq: 659.25, start: 0, dur: 0.28 },
      { freq: 830.61, start: 0.11, dur: 0.38 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lp = ctx.createBiquadFilter();

      lp.type = "lowpass";
      lp.frequency.value = 4200;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.075, t0 + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
    });
  } catch {
    /* audio is optional — never crash */
  }
}

export function triggerHaptic(): void {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([10, 35, 12]);
    }
  } catch {
    /* haptic is optional */
  }
}
