export type FastTraffic = {
  carNum: string | null;
  classId: number | null;
  gapSeconds: number | null;
  catchInSeconds: number;
  count: number;
  lapping?: boolean;
  blueFlag?: boolean;
  sameClass?: boolean;
};
