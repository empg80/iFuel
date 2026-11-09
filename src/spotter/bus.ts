type Listener = (carLeftRight: number) => void;
const listeners = new Set<Listener>();
export const onSpotter = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const emitSpotter = (v: number) => listeners.forEach((l) => l(v));
