export type YellowWarning = {
  active: boolean;
  distanceMeters: number | null;
  timeSeconds: number | null;
  carNum: number | string | null;
  classId: number | null;
  classPosition: number | null;
  type?: "incident" | "debris" | null;
} | null;
