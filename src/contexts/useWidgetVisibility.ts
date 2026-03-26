import { useContext } from "react";
import {
  WidgetVisibilityContext,
  defaultVisibilityState,
  type VisibilityState,
} from "./WidgetVisibilityContext";

export function useWidgetVisibility(): VisibilityState {
  return (
    (useContext(WidgetVisibilityContext) as VisibilityState | undefined) ??
    defaultVisibilityState
  );
}
