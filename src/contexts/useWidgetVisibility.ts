import { useContext } from "react";
import {
  WidgetVisibilityContext,
  defaultVisibilityState,
  type VisibilityState,
} from "./WidgetVisibilityContext";

export function useWidgetVisibility(): VisibilityState {
  const state = useContext(WidgetVisibilityContext) as VisibilityState | undefined;
  const safeState = state ?? defaultVisibilityState;
  return safeState;
}
