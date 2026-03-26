// components/DriverFocusWidget.tsx
import React from "react";
import type { DriverFocusData } from "../types/driverFocus";
import { formatLapTimeSeconds } from "../utils/relativeFormat";

type Props = { driver: DriverFocusData | null };

export const DriverFocusWidget: React.FC<Props> = ({ driver }) => {
  if (!driver) return null;

  return (
    <div className="driver-focus">
      <div className="driver-focus__header">DRIVER FOCUS</div>
      <div className="driver-focus__body">
        <div className="driver-focus__pos-block">
          <div className="driver-focus__pos-label">POS</div>
          <div className="driver-focus__pos-value">{driver.position}</div>
        </div>

        <div className="driver-focus__main">
          <div className="driver-focus__number-name">
            <span className="driver-focus__car-number">{driver.carNumber}</span>
            <span className="driver-focus__driver-name">
              {driver.driverName}
            </span>
          </div>

          {driver.carModel && (
            <div className="driver-focus__car-model">{driver.carModel}</div>
          )}

          <div className="driver-focus__bottom-row">
            <div className="driver-focus__best-box">
              <span className="driver-focus__best-label">BEST</span>
              <span className="driver-focus__best-value">
                {formatLapTimeSeconds(driver.bestLapTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="driver-focus__glow" />
    </div>
  );
};
