import { planRefuel } from "./utils/refuelPlan";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { PitClearAirData } from "./types/pit";
import type { StandingsRow } from "./types/standings";
import { interpolateFuelAtLine } from "./utils/fuelInterpolation";

type RelativeCar = {
  carNum: number | string | null;
  position?: number | null;
  gapSeconds: number | null;
  lastLap: number | null;
  bestLap: number | null;
  deltaLastToMe: number | null;
  classId?: number | null;
  classPosition?: number | null;
} | null;

type RelativePayload = {
  myPosition?: number | null;
  ahead: RelativeCar;
  behind: RelativeCar;
};

type OnTrackCar = {
  carNum: number | string | null;
  gapSeconds: number | null;
  lapsDiff: number | null;
  classId?: number | null;
  classPosition?: number | null;
} | null;

type YellowWarning = {
  active: boolean;
  distanceMeters: number | null;
  timeSeconds: number | null;
  carNum: number | string | null;
  classId: number | null;
  classPosition: number | null;
} | null;

type PitClearAir = PitClearAirData;

type StandingsRowPayload = {
  position: number;
  carNumber: string;
  classId: number;
  driverName: string;
  bestLapSeconds: number | null;
  stintLapCount: number;
  lastPitDurationSeconds: number | null;
  gapToLeaderSeconds: number | null;
  lapsDown: number;
  pitStops: number;
  inPit: boolean;
  carModel?: string;
};

type CameraDriverPayload = {
  carIdx: number;
  carNumber: string;
  classId: number;
  position: number;
  driverName: string;
  carModel: string;
  bestLapSeconds: number | null;
} | null;

type RawMessage = {
  fuelLevel: number;
  lap: number;
  lapCompleted: number;
  lastLapTime: number | null;
  bestLapTime?: number | null;
  sessionTimeRemain?: number;
  sessionLapsRemainEx?: number;
  fuelMax?: number;
  sessionKey?: string;
  onPitRoad?: boolean;
  isInGarage?: boolean;
  isReplayPlaying?: boolean;
  lapDistPct?: number | null;
  sessionFlags?: number;
  airTemp?: number;
  trackTemp?: number;

  relative?: RelativePayload;
  relativeOnTrack?: {
    ahead: OnTrackCar;
    behind: OnTrackCar;
  };
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
  fuelPlan?: FuelPlan | null;

  yellowWarning?: YellowWarning;
  pitClearAir?: PitClearAir;
  standings?: StandingsRowPayload[];
  cameraCarNumber?: string | null;
  playerCarNumber?: string | null;
  cameraDriver?: CameraDriverPayload;

  // datos para TrackInfoWidget
  trackName?: string;
  trackLength?: string;
  windSpeed?: number | null;
  windDirection?: string | null;
  rainChance?: number | null;
};

/** Plan de combustible y parada calculado por el servidor (única fuente para fuel y pit clear air) */
export type FuelPlan = {
  perLap: number | null;
  perLapSource: "laps" | "measured" | null;
  status: "unknown" | "no-stop" | "window" | "extra-stop" | "critical";
  stops: number | null;
  stintLaps: number[];
  litersToAdd: number | null;
  litersNextStop: number | null;
  windowStartLap: number | null;
  windowEndLap: number | null;
  remainingLaps: number | null;
};

type LapSample = {
  lapNumber: number;
  fuelUsed: number;
  lapTime: number;
};

export type IfuelState = {
  fuel: number;
  fuelMax: number | null;
  fuelCapacity: number | null;
  lapNumber: number | null;
  lapTime: number | null;
  fuelLast: number | null;
  fuelAvg: number | null;
  fuelAvg2: number | null;
  fuelAvg5: number | null;
  fuelAvg10: number | null;
  estLaps: number | null;
  estRefuel: number | null;
  fuelTime: string;
  sessionLapsRemainEx: number | null;
  sessionTimeRemain: number | null;

  airTemp: number | null;
  trackTemp: number | null;

  earliestPitLap: number | null;
  totalStops: number | null;
  stintLaps: number[];

  lapHistoryLast5: LapSample[];
  lapHistoryLast30: LapSample[];

  relativeAhead: RelativeCar;
  relativeBehind: RelativeCar;
  relativeMyPosition?: number | null;
  myBestLapTime?: number | null;

  onTrackAhead?: OnTrackCar | null;
  onTrackBehind?: OnTrackCar | null;
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
  fuelPlan?: FuelPlan | null;

  yellowWarning?: YellowWarning;
  pitClearAir?: PitClearAir;
  standings?: StandingsRow[];
  cameraCarNumber?: string | null;
  playerCarNumber?: string | null;
  isReplayPlaying: boolean;
  cameraDriver?: CameraDriverPayload | null;

  // Track info
  trackName?: string;
  trackLength?: string;
  windSpeed?: number | null;
  windDirection?: string | null;
  rainChance?: number | null;
};

export type IfuelOptions = {
  minLapTimeSeconds?: number;
  minFuelUsedPerLap?: number;
  safetyExtraLaps?: number;
  /** Excluye de la media las vueltas con bandera amarilla/cautela (por defecto, sí). */
  excludeYellowLaps?: boolean;
};

// Banderas amarillas/cautela de irsdk_Flags: yellow, yellowWaving, caution, cautionWaving
const YELLOW_FLAG_MASK = 0x00000008 | 0x00000100 | 0x00004000 | 0x00008000;
// Solo se mide una vuelta si se empezó a seguir cerca de la línea de meta (<= 3 % de vuelta)
const LAP_START_TOLERANCE_PCT = 0.03;
// Si el combustible sube más de esto durante una vuelta, hubo repostaje: vuelta descartada
const REFUEL_DETECT_LTR = 0.05;
const DEFAULT_OPTS: Required<IfuelOptions> = {
  minLapTimeSeconds: 1,
  minFuelUsedPerLap: 0.0,
  safetyExtraLaps: 1,
  excludeYellowLaps: true,
};

export function useIfuelWebSocket(url: string, options: IfuelOptions = {}) {
  const optsRef = useRef({ ...DEFAULT_OPTS, ...options });

  useEffect(() => {
    optsRef.current = { ...DEFAULT_OPTS, ...options };
  }, [options]);

  const [state, setState] = useState<IfuelState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const socketRef = useRef<WebSocket | null>(null);

  const lastLapCompletedRef = useRef<number | null>(null);
  const lapStartFuelRef = useRef<number | null>(null);
  const lapsRef = useRef<LapSample[]>([]);

  const maxFuelSeenRef = useRef<number>(0);
  const lapDirtyRef = useRef<boolean>(false); // la vuelta en curso no es válida para la media
  const sessionKeyRef = useRef<string | null>(null);
  const prevFuelRef = useRef<number | null>(null); // lectura anterior, para interpolar en meta
  const prevPctRef = useRef<number | null>(null);

  const lastUpdateTimeRef = useRef<number>(0);
  const pendingStateRef = useRef<IfuelState | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let closedByApp = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      setServerStatus("connecting");
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setServerStatus("connected");
      };

      socket.onclose = () => {
        setIsConnected(false);
        setServerStatus("disconnected");
        socketRef.current = null;

        if (!closedByApp) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (!closedByApp && !socketRef.current) {
              connect();
            }
          }, 2000);
        }
      };

      socket.onerror = (err) => {
        console.error("Error en WebSocket iFuel:", err);
        setServerStatus("disconnected");
      };

      socket.onmessage = (event) => {
        try {
          const msg: RawMessage = JSON.parse(event.data);
          const {
            fuelLevel,
            lap,
            lapCompleted,
            lastLapTime,
            bestLapTime,
            fuelMax,
            sessionKey,
            onPitRoad,
            isInGarage,
            isReplayPlaying,
            lapDistPct,
            sessionFlags,
            sessionLapsRemainEx,
            sessionTimeRemain,
            airTemp,
            trackTemp,
            relative,
            relativeOnTrack,
            classColorIndexById,
            classNames,
            fuelPlan,
            yellowWarning,
            pitClearAir,
            standings: standingsRaw,
            cameraCarNumber: rawCameraCarNumber,
            playerCarNumber: rawPlayerCarNumber,
            cameraDriver,
            trackName,
            trackLength,
            windSpeed,
            windDirection,
            rainChance,
          } = msg;

          const cameraCarNumber =
            typeof rawCameraCarNumber === "string" && rawCameraCarNumber !== ""
              ? rawCameraCarNumber
              : null;

          const playerCarNumber =
            typeof rawPlayerCarNumber === "string" && rawPlayerCarNumber !== ""
              ? rawPlayerCarNumber
              : null;

          const opts = optsRef.current;

          // Nueva sesión (otro coche/pista/sesión): el historial anterior ya no vale
          if (sessionKey !== undefined && sessionKey !== sessionKeyRef.current) {
            sessionKeyRef.current = sessionKey;
            lapsRef.current = [];
            lastLapCompletedRef.current = null;
            lapStartFuelRef.current = null;
            lapDirtyRef.current = false;
            maxFuelSeenRef.current = 0;
            prevFuelRef.current = null;
            prevPctRef.current = null;
          }

          if (fuelLevel > maxFuelSeenRef.current) {
            maxFuelSeenRef.current = fuelLevel;
          }
          const fuelCapacity =
            fuelMax && fuelMax > 0 ? fuelMax : maxFuelSeenRef.current || null;

          // Una vuelta solo es válida para la media si no hubo pit, garaje, repostaje
          // ni (opcionalmente) bandera amarilla, y se midió desde la línea de meta.
          const yellowNow =
            opts.excludeYellowLaps && ((sessionFlags ?? 0) & YELLOW_FLAG_MASK) !== 0;
          // En un replay LapCompleted/FuelLevel reproducen otro momento: no sirven para medir
          const dirtyNow = !!onPitRoad || !!isInGarage || !!isReplayPlaying || yellowNow;
          const prevLapCompleted = lastLapCompletedRef.current;

          if (prevLapCompleted === null || lapCompleted < prevLapCompleted) {
            // Primer mensaje, o el contador de vueltas se ha reiniciado (reset, remolque, sesión nueva).
            // Si entramos a mitad de vuelta no medimos esa vuelta parcial: esperamos a la meta.
            lastLapCompletedRef.current = lapCompleted;
            lapStartFuelRef.current =
              typeof lapDistPct === "number" &&
              lapDistPct >= 0 &&
              lapDistPct <= LAP_START_TOLERANCE_PCT
                ? fuelLevel
                : null;
            lapDirtyRef.current = dirtyNow;
          } else if (isReplayPlaying) {
            // Durante un replay no se mide nada; al salir se empieza de cero en la siguiente meta
            lapStartFuelRef.current = null;
            lastLapCompletedRef.current = lapCompleted;
            lapDirtyRef.current = true;
          } else {
            if (
              dirtyNow ||
              (lapStartFuelRef.current !== null &&
                fuelLevel > lapStartFuelRef.current + REFUEL_DETECT_LTR)
            ) {
              lapDirtyRef.current = true;
            }

            if (lapCompleted > prevLapCompleted) {
              const fuelAtLine = interpolateFuelAtLine(
                prevFuelRef.current,
                prevPctRef.current,
                fuelLevel,
                lapDistPct,
              );

              if (
                lapStartFuelRef.current !== null &&
                !lapDirtyRef.current &&
                lapCompleted === prevLapCompleted + 1
              ) {
                const fuelUsed = lapStartFuelRef.current - fuelAtLine;

                if (
                  lastLapTime != null &&
                  lastLapTime > opts.minLapTimeSeconds &&
                  fuelUsed > opts.minFuelUsedPerLap
                ) {
                  const lapSample: LapSample = {
                    lapNumber: lapCompleted,
                    fuelUsed,
                    lapTime: lastLapTime,
                  };
                  lapsRef.current = [...lapsRef.current, lapSample];
                }
              }

              lapStartFuelRef.current = fuelAtLine;
              lastLapCompletedRef.current = lapCompleted;
              lapDirtyRef.current = dirtyNow;
            }
          }

          prevFuelRef.current = fuelLevel;
          prevPctRef.current = typeof lapDistPct === "number" ? lapDistPct : null;

          const laps = lapsRef.current;

          const takeLastN = (n: number): number | null => {
            if (laps.length === 0) return null;
            const slice = laps.slice(-n);
            const total = slice.reduce((acc, l) => acc + l.fuelUsed, 0);
            return total / slice.length;
          };

          const fuelLast = laps.length ? laps[laps.length - 1].fuelUsed : null;
          const fuelAvg =
            laps.length > 0
              ? laps.reduce((acc, l) => acc + l.fuelUsed, 0) / laps.length
              : null;
          const fuelAvg2 = takeLastN(2);
          const fuelAvg5 = takeLastN(5);
          const fuelAvg10 = takeLastN(10);

          // Sin vueltas válidas todavía: se usa el consumo que mide el servidor rodando
          const measuredFpl = fuelPlan?.perLapSource === "measured" ? fuelPlan.perLap ?? null : null;
          const fuelPerLapForEst = fuelAvg5 ?? fuelAvg ?? measuredFpl;
          let estLaps: number | null = null;
          let estRefuel: number | null = null;
          let fuelTimeStr = "--:--";

          if ((laps.length >= 2 || measuredFpl != null) && fuelPerLapForEst && fuelPerLapForEst > 0) {
            estLaps = fuelLevel / fuelPerLapForEst;

            const avgLapTimeSeconds = laps.length
              ? laps.reduce((acc, l) => acc + l.lapTime, 0) / laps.length
              : lastLapTime && lastLapTime > 0 ? lastLapTime : 0;

            estRefuel = planRefuel({
              fuelLevel,
              fuelPerLap: fuelPerLapForEst,
              avgLapTime: avgLapTimeSeconds,
              lapsRemain: sessionLapsRemainEx,
              timeRemain: sessionTimeRemain,
              safetyLaps: opts.safetyExtraLaps,
            }).toAdd;
            // El servidor es la única fuente de los litros (misma cifra que el pit clear air)
            if (fuelPlan?.litersNextStop != null) estRefuel = fuelPlan.litersNextStop;

            if (avgLapTimeSeconds > 0 && fuelPerLapForEst > 0) {
              const lapsPossible = fuelLevel / fuelPerLapForEst;
              const estSeconds = lapsPossible * avgLapTimeSeconds;
              const mm = Math.floor(estSeconds / 60)
                .toString()
                .padStart(2, "0");
              const ss = Math.floor(estSeconds % 60)
                .toString()
                .padStart(2, "0");
              fuelTimeStr = `${mm}:${ss}`;
            }
          }

          const lapHistoryLast5 = laps.slice(-5);
          const lapHistoryLast30 = laps.slice(-30);

          let earliestPitLap: number | null = null;
          let totalStops: number | null = null;
          let stintLaps: number[] = [];

          const lapNumberSafe = lap ?? null;
          const lapsRemainForRace = sessionLapsRemainEx ?? 0;
          const timeRemainForRace = sessionTimeRemain ?? 0;

          if (
            lapNumberSafe !== null &&
            lapsRemainForRace > 0 &&
            lapsRemainForRace < 1000 &&
            fuelPerLapForEst &&
            fuelPerLapForEst > 0 &&
            fuelCapacity &&
            fuelCapacity > 0
          ) {
            const maxStintLaps = fuelCapacity / fuelPerLapForEst;
            const raceLapsTotal = lapNumberSafe + lapsRemainForRace;

            if (maxStintLaps > 0 && raceLapsTotal > 0) {
              totalStops = Math.max(
                0,
                Math.ceil(raceLapsTotal / maxStintLaps) - 1,
              );

              const approxStint = raceLapsTotal / (totalStops + 1);
              stintLaps = Array.from({ length: totalStops }, (_, i) =>
                Math.round(approxStint * (i + 1)),
              );
            }

            if (estLaps && estLaps > 0) {
              const lapsPossibleFromNow = estLaps;
              const lapsRemain2 = lapsRemainForRace;

              if (lapsRemain2 > lapsPossibleFromNow) {
                const lapsThatMustBeCoveredAfterStop =
                  lapsRemain2 - lapsPossibleFromNow;

                if (lapsThatMustBeCoveredAfterStop <= maxStintLaps) {
                  earliestPitLap =
                    lapNumberSafe + Math.floor(lapsPossibleFromNow);
                } else {
                  const extraLapsNeeded =
                    lapsThatMustBeCoveredAfterStop - maxStintLaps;
                  earliestPitLap =
                    lapNumberSafe +
                    Math.floor(lapsPossibleFromNow + extraLapsNeeded);
                }
              } else {
                earliestPitLap = null;
              }
            }
          } else if (
            timeRemainForRace > 0 &&
            fuelPerLapForEst &&
            fuelPerLapForEst > 0 &&
            fuelCapacity &&
            fuelCapacity > 0 &&
            laps.length >= 2
          ) {
            const avgLapTimeSeconds =
              laps.reduce((acc, l) => acc + l.lapTime, 0) / laps.length;

            if (avgLapTimeSeconds > 0) {
              const timeDone = (lapNumberSafe ?? 0) * avgLapTimeSeconds;
              const raceTimeTotal = timeDone + timeRemainForRace;

              const stintTimeMax =
                (fuelCapacity / fuelPerLapForEst) * avgLapTimeSeconds;

              if (stintTimeMax > 0 && raceTimeTotal > 0) {
                totalStops = Math.max(
                  0,
                  Math.ceil(raceTimeTotal / stintTimeMax) - 1,
                );

                const approxStintTime = raceTimeTotal / (totalStops + 1);
                stintLaps = Array.from({ length: totalStops }, (_, i) => {
                  const targetTime = approxStintTime * (i + 1);
                  const targetLap = targetTime / avgLapTimeSeconds;
                  return Math.round(targetLap);
                });
              }

              if (estLaps && estLaps > 0 && stintTimeMax > 0) {
                const secondsOfFuelNow = estLaps * avgLapTimeSeconds;
                const secondsShort = timeRemainForRace - secondsOfFuelNow;

                if (secondsShort <= 0) {
                  earliestPitLap = null;
                } else {
                  const fullTankSeconds =
                    (fuelCapacity / fuelPerLapForEst) * avgLapTimeSeconds;
                  const extraSecondsFromFull =
                    fullTankSeconds - secondsOfFuelNow;

                  if (extraSecondsFromFull > 0) {
                    const lapsToDelay = secondsShort / extraSecondsFromFull;
                    const baseLap = lapNumberSafe ?? 0;
                    earliestPitLap = Math.round(baseLap + lapsToDelay);
                  } else {
                    earliestPitLap = lapNumberSafe ?? null;
                  }
                }
              }

              // FALLOUT PARA SESIONES SOLO POR TIEMPO:
              // si después de todo lo anterior earliestPitLap sigue null,
              // aproximamos una vuelta de parada usando "vueltas virtuales".
              if (earliestPitLap == null) {
                const raceLapsTotal = raceTimeTotal / avgLapTimeSeconds; // vueltas virtuales

                if (raceLapsTotal > 0 && fuelPerLapForEst > 0) {
                  const maxStintLaps = fuelCapacity / fuelPerLapForEst;
                  if (maxStintLaps > 0) {
                    const totalStopsTime = Math.max(
                      0,
                      Math.ceil(raceLapsTotal / maxStintLaps) - 1,
                    );

                    if (totalStopsTime > 0) {
                      const approxStintLaps =
                        raceLapsTotal / (totalStopsTime + 1);
                      earliestPitLap = Math.round(approxStintLaps);
                    }
                  }
                }
              }
            }
          }

          const relativeAhead = relative?.ahead ?? null;
          const relativeBehind = relative?.behind ?? null;
          const relativeMyPosition = relative?.myPosition ?? null;

          const onTrackAhead = relativeOnTrack?.ahead ?? null;
          const onTrackBehind = relativeOnTrack?.behind ?? null;

          const standings: StandingsRow[] =
            standingsRaw?.map((car) => ({
              position: car.position,
              carNumber: car.carNumber,
              classId: car.classId,
              driverName: car.driverName,
              bestLapTime: car.bestLapSeconds,
              gapToLeader: car.gapToLeaderSeconds ?? null,
              lapsDown: car.lapsDown ?? 0,
              stintLapCount: car.stintLapCount,
              lastPitDurationSeconds: car.lastPitDurationSeconds,
              pitStops: car.pitStops ?? 0,
              inPit: !!car.inPit,
              carModel: car.carModel ?? "",
            })) ?? [];

          // Ventana, paradas y vueltas de parada: las del servidor, para que coincidan con el pit clear air
          if (fuelPlan && fuelPlan.status !== "unknown") {
            earliestPitLap = fuelPlan.status === "no-stop" ? null : fuelPlan.windowStartLap;
            totalStops = fuelPlan.stops;
            stintLaps = fuelPlan.stintLaps;
          }

          const nextState: IfuelState = {
            fuel: fuelLevel,
            fuelMax: fuelMax ?? null,
            fuelCapacity,
            lapNumber: lap ?? null,
            lapTime: lastLapTime || null,
            fuelLast,
            fuelAvg,
            fuelAvg2,
            fuelAvg5,
            fuelAvg10,
            estLaps,
            estRefuel,
            fuelTime: fuelTimeStr,
            sessionLapsRemainEx: sessionLapsRemainEx ?? null,
            sessionTimeRemain: sessionTimeRemain ?? null,
            airTemp: airTemp ?? null,
            trackTemp: trackTemp ?? null,
            earliestPitLap,
            totalStops,
            stintLaps,
            lapHistoryLast5,
            lapHistoryLast30,
            relativeAhead,
            relativeBehind,
            relativeMyPosition,
            myBestLapTime: bestLapTime ?? null,
            onTrackAhead,
            onTrackBehind,
            classColorIndexById: classColorIndexById ?? undefined,
            classNames: classNames ?? undefined,
            yellowWarning: yellowWarning ?? null,
            pitClearAir: pitClearAir ?? null,
            standings,
            cameraCarNumber,
            playerCarNumber,
            isReplayPlaying: !!isReplayPlaying,
            cameraDriver: cameraDriver ?? null,
            // Track info
            trackName: trackName ?? "",
            trackLength: trackLength ?? "",
            windSpeed: windSpeed ?? null,
            windDirection: windDirection ?? null,
            rainChance: rainChance ?? null,
          };

          pendingStateRef.current = nextState;

          if (rafIdRef.current === null) {
            rafIdRef.current = window.requestAnimationFrame((ts) => {
              rafIdRef.current = null;
              const last = lastUpdateTimeRef.current;
              const MIN_INTERVAL = 50;

              if (ts - last >= MIN_INTERVAL && pendingStateRef.current) {
                lastUpdateTimeRef.current = ts;
                setState(pendingStateRef.current);
              }
            });
          }
        } catch (e) {
          console.error("Error parseando mensaje iFuel:", e);
        }
      };
    }

    connect();

    return () => {
      closedByApp = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        socketRef.current.close();
      }
      socketRef.current = null;
    };
  }, [url]);

  const sendMessage = useCallback((msg: unknown) => {
    const s = socketRef.current;

    if (!s || s.readyState !== WebSocket.OPEN) return;
    try {
      s.send(JSON.stringify(msg));
    } catch (e) {
      console.error("Error enviando mensaje iFuel WS:", e);
    }
  }, []);

  // Único emisor de la estrategia de parada: el servidor calcula la ventana con el combustible real,
  // solo necesita el consumo por vuelta y el margen. Se redondea para no enviar en cada actualización.
  const fuelPerLapSrc = state?.fuelAvg5 ?? state?.fuelAvg ?? null;
  const fuelPerLapRounded =
    fuelPerLapSrc && fuelPerLapSrc > 0 ? Math.round(fuelPerLapSrc * 100) / 100 : null;
  const pitSafetyLaps = options.safetyExtraLaps ?? DEFAULT_OPTS.safetyExtraLaps ?? 1;

  useEffect(() => {
    if (!isConnected) return;
    // null = sin vueltas válidas: el servidor usa el consumo que mide rodando
    sendMessage({
      type: "updatePitStrategy",
      fuelPerLap: fuelPerLapRounded,
      safetyLaps: pitSafetyLaps,
    });
  }, [fuelPerLapRounded, pitSafetyLaps, isConnected, sendMessage]);

  const raceStandingsRows: StandingsRow[] = useMemo(
    () => state?.standings ?? [],
    [state?.standings],
  );

  return { state, isConnected, sendMessage, raceStandingsRows, serverStatus };
}
