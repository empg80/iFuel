import { useEffect, useRef, useState } from "react";

type RelativeCar = {
  carNum: number | string | null;
  position?: number | null;        // posición de carrera (clase)
  gapSeconds: number | null;
  lastLap: number | null;
  bestLap: number | null;
  deltaLastToMe: number | null;
  classId?: number | null;         // <- NUEVO
  classPosition?: number | null;   // <- NUEVO
} | null;

type RelativePayload = {
  myPosition?: number | null;      // tu posición de carrera
  ahead: RelativeCar;
  behind: RelativeCar;
};

type OnTrackCar = {
  carNum: number | string | null;
  gapSeconds: number | null;
  lapsDiff: number | null;
  classId?: number | null;         // <- NUEVO
  classPosition?: number | null;   // <- NUEVO
} | null;

type RawMessage = {
  fuelLevel: number;
  lap: number;
  lapCompleted: number;
  lastLapTime: number | null;      // tu última vuelta
  bestLapTime?: number | null;     // tu mejor vuelta
  sessionTimeRemain?: number;
  sessionLapsRemainEx?: number;
  fuelMax?: number;
  airTemp?: number;
  trackTemp?: number;

  relative?: RelativePayload;
  relativeOnTrack?: {
    ahead: OnTrackCar;
    behind: OnTrackCar;
  };
  classColorIndexById?: Record<number, number>; // <- NUEVO
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
  relativeMyPosition?: number | null;   // tu posición
  myBestLapTime?: number | null;        // tu mejor vuelta

  onTrackAhead?: OnTrackCar | null;   // NUEVO
  onTrackBehind?: OnTrackCar | null;  // NUEVO
  classColorIndexById?: Record<number, number>; // <- NUEVO
};

export type IfuelOptions = {
  minLapTimeSeconds?: number;
  minFuelUsedPerLap?: number;
  safetyExtraLaps?: number;
};

const DEFAULT_OPTS: Required<IfuelOptions> = {
  minLapTimeSeconds: 1,
  minFuelUsedPerLap: 0.0,
  safetyExtraLaps: 1,
};

export function useIfuelWebSocket(url: string, options: IfuelOptions = {}) {
  const optsRef = useRef({ ...DEFAULT_OPTS, ...options });

  useEffect(() => {
    optsRef.current = { ...DEFAULT_OPTS, ...options };
  }, [options]);

  const [state, setState] = useState<IfuelState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const lastLapCompletedRef = useRef<number | null>(null);
  const lapStartFuelRef = useRef<number | null>(null);
  const lapsRef = useRef<LapSample[]>([]);

  const maxFuelSeenRef = useRef<number>(0);

  const lastUpdateTimeRef = useRef<number>(0);
  const pendingStateRef = useRef<IfuelState | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      console.log("WS closed", event.code, event.reason);
    };

    socket.onerror = (err) => {
      console.error("Error en WebSocket iFuel:", err);
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
          sessionLapsRemainEx,
          sessionTimeRemain,
          airTemp,
          trackTemp,
          relative,
          relativeOnTrack,
          classColorIndexById,          // <- NUEVO 
        } = msg;

        const opts = optsRef.current;

        if (fuelLevel > maxFuelSeenRef.current) {
          maxFuelSeenRef.current = fuelLevel;
        }
        const fuelCapacity =
          fuelMax && fuelMax > 0 ? fuelMax : maxFuelSeenRef.current || null;

        const prevLapCompleted = lastLapCompletedRef.current;

        if (prevLapCompleted === null) {
          lastLapCompletedRef.current = lapCompleted;
          lapStartFuelRef.current = fuelLevel;
        } else {
          if (
            lapCompleted > prevLapCompleted &&
            lapStartFuelRef.current !== null
          ) {
            const fuelUsed = lapStartFuelRef.current - fuelLevel;

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

            lapStartFuelRef.current = fuelLevel;
            lastLapCompletedRef.current = lapCompleted;
          }
        }

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

        const fuelPerLapForEst = fuelAvg5 ?? fuelAvg ?? null;
        let estLaps: number | null = null;
        let estRefuel: number | null = null;
        let fuelTimeStr = "--:--";

        if (laps.length >= 2 && fuelPerLapForEst && fuelPerLapForEst > 0) {
          estLaps = fuelLevel / fuelPerLapForEst;

          const lapsRemain = sessionLapsRemainEx ?? 0;
          const timeRemain = sessionTimeRemain ?? 0;

          if (lapsRemain > 0 && lapsRemain < 1000) {
            const lapsWithSafety = lapsRemain + opts.safetyExtraLaps;
            const fuelNeededTotal = lapsWithSafety * fuelPerLapForEst;
            const fuelToAdd = fuelNeededTotal - fuelLevel;
            estRefuel = fuelToAdd > 0 ? fuelToAdd : 0;
          } else if (timeRemain > 0) {
            const avgLapTimeSeconds =
              laps.reduce((acc, l) => acc + l.lapTime, 0) / laps.length;

            if (avgLapTimeSeconds > 0) {
              const lapsPossible = fuelLevel / fuelPerLapForEst;
              const secondsOfFuel = lapsPossible * avgLapTimeSeconds;

              const safetySeconds = opts.safetyExtraLaps * avgLapTimeSeconds;
              const targetSeconds = timeRemain + safetySeconds;

              const extraSecondsNeeded = targetSeconds - secondsOfFuel;

              if (extraSecondsNeeded <= 0) {
                estRefuel = 0;
              } else {
                const extraLapsNeeded =
                  extraSecondsNeeded / avgLapTimeSeconds;
                estRefuel = extraLapsNeeded * fuelPerLapForEst;
              }
            } else {
              estRefuel = 0;
            }
          } else {
            estRefuel = 0;
          }

          const avgLapTimeSeconds =
            laps.reduce((acc, l) => acc + l.lapTime, 0) / laps.length;

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
            const timeDone =
              (lapNumberSafe ?? 0) * avgLapTimeSeconds;
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
              const secondsOfFuelNow =
                estLaps * avgLapTimeSeconds;
              const secondsShort =
                timeRemainForRace - secondsOfFuelNow;

              if (secondsShort <= 0) {
                earliestPitLap = null;
              } else {
                const fullTankSeconds =
                  (fuelCapacity / fuelPerLapForEst) * avgLapTimeSeconds;
                const extraSecondsFromFull =
                  fullTankSeconds - secondsOfFuelNow;

                if (extraSecondsFromFull > 0) {
                  const lapsToDelay =
                    secondsShort / extraSecondsFromFull;
                  const baseLap = lapNumberSafe ?? 0;
                  earliestPitLap = Math.round(baseLap + lapsToDelay);
                } else {
                  earliestPitLap = lapNumberSafe ?? null;
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
          classColorIndexById: classColorIndexById ?? undefined, // <- NUEVO
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

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      socket.close();
    };
  }, [url]);

  return { state, isConnected };
}
