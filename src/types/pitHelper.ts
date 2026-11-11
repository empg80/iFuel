export type PitHelper = {
  speedKph: number;
  limitKph: number | null;
  overKph: number | null;
  limiterOn: boolean;
  boxDistM: number | null; // >0 tu box está por delante
  status: "ok" | "speeding" | "no-limiter";
};
