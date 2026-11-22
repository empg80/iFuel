// Posiciones "en vivo": iRacing actualiza CarIdxPosition solo al cruzar la línea de meta. Aquí se reordena por
// progreso real (vuelta + % de vuelta) para que un adelantamiento se vea cuando ocurre.
//
// - Solo coches con progreso válido se reordenan; los demás (en boxes sin dato, fuera del mundo) conservan su
//   posición oficial y el resto se reparte por los huecos libres, así que el resultado siempre es una permutación.
// - Histéresis: dos coches a menos de `eps` vueltas (~3 m en un trazado de 5 km) no intercambian su orden anterior,
//   para que un duelo rueda con rueda no parpadee.
// - Un salto de ~1 vuelta hacia atrás es el desfase de un tick entre CarIdxLap y el % al cruzar meta: se ignora.

export function createLivePositions({ eps = 0.0006 } = {}) {
  const prevProgress = new Map();
  let prevOrder = [];

  return {
    reset() { prevProgress.clear(); prevOrder = []; },
    /**
     * @param {{idx:number, pos:number, lap:number, pct:number, valid?:boolean}[]} cars  pos = posición oficial (>0)
     * @returns {Map<number, number>} idx → posición en vivo
     */
    update(cars) {
      const live = new Map();
      const movable = [];
      const fixed = new Map();
      for (const c of cars) {
        const ok = c.valid !== false && Number.isFinite(c.lap) && Number.isFinite(c.pct) && c.lap >= 0 && c.pct >= 0;
        if (!ok) { fixed.set(c.pos, c.idx); continue; }
        let p = c.lap + c.pct;
        const prev = prevProgress.get(c.idx);
        if (prev != null && prev - p > 0.9 && prev - p < 1.1) p = prev;
        prevProgress.set(c.idx, p);
        movable.push({ idx: c.idx, p });
      }
      // orden base: el anterior (para la histéresis); los nuevos entran por progreso
      const known = new Map(movable.map((m) => [m.idx, m]));
      const seed = prevOrder.filter((i) => known.has(i)).map((i) => known.get(i));
      const seen = new Set(seed.map((m) => m.idx));
      const fresh = movable.filter((m) => !seen.has(m.idx)).sort((a, b) => b.p - a.p);
      const arr = [...seed, ...fresh];
      // inserción: un coche sube si supera con margen al de delante
      for (let i = 1; i < arr.length; i++) {
        let j = i;
        while (j > 0 && arr[j].p - arr[j - 1].p > eps) { [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]]; j--; }
      }
      prevOrder = arr.map((m) => m.idx);
      // reparto: los huecos libres, de mejor a peor, para los movibles en su orden
      const total = cars.length;
      let k = 0;
      for (let pos = 1; pos <= total; pos++) {
        if (fixed.has(pos)) { live.set(fixed.get(pos), pos); continue; }
        if (k < arr.length) live.set(arr[k++].idx, pos);
      }
      // posiciones oficiales fuera de 1..total (huecos): los que queden sin asignar van al final
      for (const m of arr) if (!live.has(m.idx)) live.set(m.idx, total + 1 + live.size);
      for (const [pos, idx] of fixed) if (!live.has(idx)) live.set(idx, pos);
      return live;
    },
  };
}
