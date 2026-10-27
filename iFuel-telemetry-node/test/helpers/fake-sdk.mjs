// SDK de iRacing simulado para probar el servidor sin iRacing ni Windows.
// Pista de 4 km, 4 coches; el jugador es el carIdx 2.
const v = (arr) => ({ value: arr });

export function createFakeSdk(overrides = {}) {
  const st = {
    tick: 0,
    sessionVersion: 1,
    sessionDataCalls: 0,
    getTelemetryCalls: 0,
    variableRequests: new Set(),
    stopCalls: 0,
    throwOnTick: -1,
    running: true,
    flags: 0,
    replay: false,
    playerSpeed: 60, // m/s
    // pct de cada coche en tick 0 y su velocidad (m/s); el coche 3 está parado
    carPct0: [0.55, 0.3, 0.5, 0.6],
    carSpeed: [60, 60, 60, 0],
    ...overrides,
  };
  const TRACK_M = 4000;
  const DT = 0.25; // segundos de simulación por tick
  const pct = (i) => (st.carPct0[i] + (st.carSpeed[i] * st.tick * DT) / TRACK_M) % 1;

  const table = () => ({
    SessionTime: v([st.tick * DT]), SessionNum: v([0]), SessionFlags: v([st.flags]),
    SessionTimeRemain: v([1000]), SessionLapsRemainEx: v([20]),
    FuelLevel: v([40]), PlayerCarIdx: v([2]), CamCarIdx: v([2]),
    OnPitRoad: v([false]), IsInGarage: v([false]), IsReplayPlaying: v([st.replay]),
    LapDistPct: v([pct(2)]), LapCompleted: v([3]), Lap: v([4]), LapLastLapTime: v([90]),
    Speed: v([st.playerSpeed]),
    CarIdxLapDistPct: v([0, 1, 2, 3].map(pct)), CarIdxLapCompleted: v([3, 3, 3, 3]), CarIdxLap: v([4, 4, 4, 4]),
    CarIdxOnPitRoad: v([false, false, false, false]), CarIdxPosition: v([1, 2, 3, 4]),
    CarIdxClassPosition: v([1, 1, 2, 2]), CarIdxTrackSurface: v([3, 3, 3, 3]),
    CarIdxBestLapTime: v([88, 89, 90, 91]), CarIdxLastLapTime: v([89, 90, 91, 92]),
    CarIdxClass: v([4000, 4000, 4000, 4000]),
    TrackTemp: v([30]), AirTemp: v([22]),
  });

  const sdk = {
    state: st,
    startSDK: () => true,
    stopSDK: () => { st.stopCalls++; },
    waitForData: () => { st.tick++; return st.running; },
    getSessionVersionNum: () => st.sessionVersion,
    getSessionData: () => {
      st.sessionDataCalls++;
      return {
        WeekendInfo: { SubSessionID: 111, TrackName: "test", TrackLength: "4.00 km" },
        DriverInfo: {
          DriverCarIdx: 2, DriverCarFuelMaxLtr: 100, DriverCarMaxFuelPct: 0.5,
          Drivers: [0, 1, 2, 3].map((i) => ({
            CarIdx: i, UserName: `D${i}`, CarNumber: String(10 + i),
            CarClassID: 4000, CarClassShortName: "C", CarClassColor: 0xff0000,
          })),
        },
        SessionInfo: { Sessions: [{ SessionNum: 0, SessionType: "Race", ResultsPositions: [] }] },
      };
    },
    getTelemetry: () => { st.getTelemetryCalls++; return table(); },
    getTelemetryVariable: (name) => {
      st.variableRequests.add(name);
      if (st.tick === st.throwOnTick) throw new Error("fallo simulado");
      return table()[name] ?? null;
    },
  };
  return sdk;
}
