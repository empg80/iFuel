import { useContext } from "react";
import {
  WidgetVisibilityContext,
  defaultVisibilityState,
} from "./WidgetVisibilityContext";

export function useWidgetVisibility() {
  const state = useContext(WidgetVisibilityContext) ?? defaultVisibilityState;

  return {
    visibility: {
      fuel: state.fuel,
      standingBattle: state.standingBattle,
      yellow: state.yellow,
      pitClearAir: state.pitClearAir,
    },
    widgetsLocked: state.widgetsLocked,
  };
}
