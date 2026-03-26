// components/DriverFocusWidgetContainer.tsx
import React, { useMemo } from "react";
import type { DriverFocusData } from "../types/driverFocus";
import type { StandingsRow } from "../types/standings";
import { DriverFocusWidget } from "./DriverFocusWidget";

type CameraDriver = {
  carIdx: number;
  carNumber: string;
  classId: number;
  position: number;
  driverName: string;
  carModel: string;
  bestLapSeconds: number | null;
} | null;

type Props = {
  rows: StandingsRow[];
  cameraDriver: CameraDriver;
};

export const DriverFocusWidgetContainer: React.FC<Props> = ({
  rows,
  cameraDriver,
}) => {
  const driver: DriverFocusData | null = useMemo(() => {
    if (cameraDriver) {
      const result: DriverFocusData = {
        position: cameraDriver.position,
        carNumber: cameraDriver.carNumber,
        driverName: cameraDriver.driverName,
        carModel: cameraDriver.carModel || "",
        bestLapTime: cameraDriver.bestLapSeconds ?? null,
      };
      return result;
    }

    if (!rows.length) return null;

    const row = rows[0];

    const result: DriverFocusData = {
      position: row.position,
      carNumber: row.carNumber,
      driverName: row.driverName,
      carModel: row.carModel || "",
      bestLapTime: row.bestLapTime ?? null,
    };

    return result;
  }, [rows, cameraDriver]);

  return <DriverFocusWidget key={driver?.carNumber} driver={driver} />;
};
