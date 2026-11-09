import type { Side } from "./logic";

export type SpotterSettings = {
  spotterEnabled: boolean; // spotter lateral (tonos / voz)
  spotterTones: boolean;
  spotterVoice: boolean; // palabras del spotter lateral
  spotterAlerts: boolean; // avisos de voz: clase rápida, amarilla, combustible, box
  spotterVolume: number; // 0.1 .. 1
};

export const DEFAULT_SPOTTER: SpotterSettings = {
  spotterEnabled: true, spotterTones: true, spotterVoice: true, spotterAlerts: true, spotterVolume: 0.8,
};

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Pitido corto por el lado del coche (estéreo): izquierda grave-izq, derecha agudo-der, ambos = doble. */
export function playTone(side: Side, volume: number) {
  const a = audio();
  if (!a) return;
  const beep = (freq: number, pan: number, at: number, dur = 0.11) => {
    const osc = a.createOscillator();
    const gain = a.createGain();
    const panner = a.createStereoPanner();
    osc.type = "sine";
    osc.frequency.value = freq;
    panner.pan.value = pan;
    const t0 = a.currentTime + at;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume * 0.5, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(panner).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };
  if (side === "left") beep(660, -1, 0);
  else if (side === "right") beep(880, 1, 0);
  else if (side === "both") { beep(660, -1, 0); beep(880, 1, 0.13); }
  else beep(520, 0, 0, 0.08); // libre: tono suave centrado
}

let voice: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice;
  const list = window.speechSynthesis?.getVoices?.() ?? [];
  voice = list.find((v) => /^es[-_]ES/i.test(v.lang)) ?? list.find((v) => /^es/i.test(v.lang)) ?? null;
  return voice;
}

/** Habla en español. `interrupt` corta lo que esté sonando (el spotter lateral manda sobre los avisos). */
export function speak(text: string, volume: number, interrupt = false) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  if (interrupt) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.15;
  u.volume = Math.max(0, Math.min(1, volume));
  synth.speak(u);
}
