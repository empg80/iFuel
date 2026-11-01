import React from "react";
import type { CarData } from "../../types/car";

type Props = { car: CarData | null };

export const CarSettings: React.FC<Props> = ({ car }) => {
  const items: { label: string; value: string }[] = [];
  if (car?.brakeBias != null && car.brakeBias !== 0) items.push({ label: "Bias", value: car.brakeBias.toFixed(1) });
  if (car?.tc1 != null) items.push({ label: "TC1", value: String(Math.round(car.tc1)) });
  if (car?.tc2 != null) items.push({ label: "TC2", value: String(Math.round(car.tc2)) });
  if (car?.abs != null) items.push({ label: "ABS", value: String(Math.round(car.abs)) });
  if (items.length === 0) return null;
  return (
    <div className="pb-settings">
      {items.map((i) => (
        <div key={i.label} className="pb-panel pb-setting">
          <span className="pb-lbl">{i.label}</span>
          <b className="pb-num">{i.value}</b>
        </div>
      ))}
    </div>
  );
};
