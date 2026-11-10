// Voz natural: frases pregrabadas (Piper, ver tools/gen_voices.py) montadas a partir de trozos.
// Si el texto contiene algo que no está grabado (frase editada por el usuario, clase desconocida...),
// speakNatural devuelve false y el spotter usa la voz del sistema.
import claude from "./voices/claude.json";
import dave from "./voices/dave.json";

import { matchClips, type Manifest } from "./clipMatch";
const MANIFESTS: Record<string, Manifest> = { claude, dave };
export type NaturalVoice = "claude" | "dave";
export const isNaturalVoice = (v: string): v is NaturalVoice => v in MANIFESTS;

export const toClips = (text: string, voice: NaturalVoice) => matchClips(text, MANIFESTS[voice]);

const dirOf = (voice: NaturalVoice) => `voices/${voice}/`;
const cache = new Map<string, HTMLAudioElement>();
let queue: HTMLAudioElement[] = [];
let current: HTMLAudioElement | null = null;

function el(url: string): HTMLAudioElement {
  let a = cache.get(url);
  if (!a) {
    a = new Audio(url);
    a.preload = "auto";
    cache.set(url, a);
  }
  return a;
}

/** Precarga todos los audios de la voz para que no haya retraso al hablar. */
export function preloadVoice(voice: NaturalVoice) {
  const m = MANIFESTS[voice];
  for (const group of [m.chunks, m.classes, m.nums]) for (const f of Object.values(group)) el(dirOf(voice) + f);
}

function next(volume: number) {
  const a = queue.shift();
  if (!a) { current = null; return; }
  current = a;
  a.volume = volume;
  a.currentTime = 0;
  a.onended = () => next(volume);
  a.onerror = () => next(volume);
  void a.play().catch(() => next(volume));
}

export function stopNatural() {
  queue = [];
  if (current) { current.onended = null; current.pause(); current = null; }
}

/** Reproduce el texto con la voz natural. false = no se pudo (usar la voz del sistema). */
export function speakNatural(text: string, voice: NaturalVoice, volume: number, interrupt: boolean): boolean {
  const clips = toClips(text, voice);
  if (!clips) return false;
  if (interrupt) stopNatural();
  queue.push(...clips.map((f) => el(dirOf(voice) + f)));
  if (!current) next(volume);
  return true;
}
