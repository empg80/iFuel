import { test } from "node:test";
import assert from "node:assert/strict";
import { readIbt } from "../ibt/ibtReader.mjs";
import { analyzeIbt } from "../ibt/ibtAnalyzer.mjs";

// .ibt sintético: circuito de 3000 m con 2 curvas (vértices a 1000 y 2000 m), 60 Hz
const VARS = [["SessionTime", 5], ["Lap", 2], ["LapDistPct", 4], ["Speed", 4], ["Throttle", 4], ["Brake", 4], ["SteeringWheelAngle", 4], ["Gear", 2],
  ["RPM", 4], ["LatAccel", 4], ["LongAccel", 4], ["OnPitRoad", 1], ["PlayerTrackSurface", 2]];
const SIZE = { 1: 1, 2: 4, 4: 4, 5: 8 };

function lapProfile(brakeShift) {
  // velocidad (m/s) según distancia: 55 recta, 22 en vértices; frenada de 150 m antes (brakeShift m antes en esta vuelta)
  return (x) => {
    let v = 55, br = 0, th = 1;
    for (const ap of [1000, 2000]) {
      const bs = ap - 150 - brakeShift;
      if (x >= bs && x < ap) { const f = (x - bs) / (ap - bs); v = Math.min(v, 55 - 33 * f); br = 0.8; th = 0; }
      if (x >= ap && x < ap + 150) { const f = (x - ap) / 150; v = Math.min(v, 22 + 33 * f); th = f > 0.2 ? 1 : 0; }
    }
    return { v, br, th };
  };
}

function buildIbt() {
  const L = 3000, hz = 60;
  const recs = [];
  let t = 100, lap = 0;
  const specs = [{ shift: 0, pit: true }, { shift: 0 }, { shift: 25 }, { shift: 0, partial: 0.3 }];
  for (const sp of specs) {
    const prof = lapProfile(sp.shift);
    let x = 0;
    while (x < L * (sp.partial ?? 1)) {
      const { v, br, th } = prof(x);
      recs.push({ t, lap, pct: x / L, v, br, th, pit: sp.pit ? 1 : 0 });
      x += (v / hz); t += 1 / hz;
    }
    lap++;
  }
  const varHdrOff = 144, dataOff = varHdrOff + VARS.length * 144 + 2000 /*yaml*/;
  const yaml = "---\nWeekendInfo:\n TrackName: test\n TrackDisplayName: Circuito de Prueba\n TrackLength: 3.00 km\nDriverInfo:\n DriverCarIdx: 3\n Drivers:\n - CarIdx: 3\n   UserName: Yo\n   CarScreenName: Coche de Prueba\n...\n";
  let off = 0; const offs = {};
  for (const [n, ty] of VARS) { offs[n] = off; off += SIZE[ty]; }
  const bufLen = off;
  const buf = Buffer.alloc(dataOff + recs.length * bufLen);
  buf.writeInt32LE(2, 0); buf.writeInt32LE(60, 8); buf.writeInt32LE(yaml.length, 16); buf.writeInt32LE(varHdrOff + VARS.length * 144, 20);
  buf.writeInt32LE(VARS.length, 24); buf.writeInt32LE(varHdrOff, 28); buf.writeInt32LE(1, 32); buf.writeInt32LE(bufLen, 36); buf.writeInt32LE(dataOff, 52);
  buf.writeInt32LE(recs.length, 112 + 28);
  buf.write(yaml, varHdrOff + VARS.length * 144, "latin1");
  VARS.forEach(([n, ty], i) => { const o = varHdrOff + i * 144; buf.writeInt32LE(ty, o); buf.writeInt32LE(offs[n], o + 4); buf.writeInt32LE(1, o + 8); buf.write(n, o + 16, "latin1"); });
  recs.forEach((r, i) => {
    const b = dataOff + i * bufLen;
    buf.writeDoubleLE(r.t, b + offs.SessionTime); buf.writeInt32LE(r.lap, b + offs.Lap); buf.writeFloatLE(r.pct, b + offs.LapDistPct);
    buf.writeFloatLE(r.v, b + offs.Speed); buf.writeFloatLE(r.th, b + offs.Throttle); buf.writeFloatLE(r.br, b + offs.Brake);
    buf.writeInt32LE(4, b + offs.Gear); buf.writeFloatLE(6000, b + offs.RPM); buf.writeUInt8(r.pit, b + offs.OnPitRoad); buf.writeInt32LE(3, b + offs.PlayerTrackSurface);
  });
  return buf;
}

test("ibt: el lector extrae canales y la sesión", () => {
  const r = readIbt(buildIbt());
  assert.equal(r.tickRate, 60);
  assert.ok(r.records > 1000);
  assert.ok(r.data.Speed.length === r.records);
  assert.match(r.sessionYaml, /TrackLength: 3.00 km/);
});

test("ibt: archivo que no es .ibt se rechaza", () => {
  assert.throws(() => readIbt(Buffer.alloc(400)));
});

test("ibt: separa vueltas, elige la mejor, encuentra las 2 curvas y detecta la frenada anticipada", () => {
  const a = analyzeIbt(buildIbt());
  assert.equal(a.meta.car, "Coche de Prueba");
  assert.equal(a.laps.filter((l) => l.clean).length, 2);
  assert.equal(a.laps[0].clean, false); // vuelta de salida por boxes
  assert.equal(a.reference.lap, 1);
  assert.equal(a.corners.length, 2);
  assert.ok(Math.abs(a.corners[0].apexM - 1000) <= 40, `apex ${a.corners[0].apexM}`);
  assert.ok(a.laps[2].timeS > a.laps[1].timeS); // la vuelta 2 frena antes: más lenta
  const c = a.corners[0];
  assert.ok(c.tips.some((t) => /antes/.test(t)), `tips: ${c.tips.join("|")}`);
  assert.ok(c.lossAvgS > 0);
  assert.ok(a.summary.idealS <= a.summary.bestS + 1e-9); // la vuelta ideal nunca es peor que la mejor
  assert.ok(a.corners.every((c) => c.potentialS >= 0));
  assert.equal(a.profile.laps.length, 2);
  assert.equal(a.profile.laps[0].speed.length, a.profile.laps[1].speed.length);
});

test("ibtReader: rechaza cabeceras con desplazamientos o tamaños fuera del archivo", () => {
  const b = buildIbt();
  const bad = (mutate) => { const c = Buffer.from(b); mutate(c); assert.throws(() => readIbt(c), /no válida/); };
  bad((c) => c.writeInt32LE(1_000_000_000, 28)); // varHeaderOffset fuera
  bad((c) => c.writeInt32LE(1_000_000_000, 20)); // sessionInfoOffset fuera
  bad((c) => c.writeInt32LE(2_000_000_000, 16)); // sessionInfoLen enorme
  bad((c) => c.writeInt32LE(5_000_000, 36)); // bufLen absurdo
  bad((c) => c.writeInt32LE(100_000, 8)); // tickRate absurdo
});
