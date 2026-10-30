const CLASS_COLOR_COUNT = 6; // --class-0 ... --class-5 en styles/overlay-theme.css

function getClassColorIndex(
  classId?: number | null,
  classColorIndexById?: Record<number, number>,
): number | null {
  if (classId == null) return null;
  const idxRaw =
    classColorIndexById && classColorIndexById[classId] != null
      ? classColorIndexById[classId]
      : 0;
  return idxRaw % CLASS_COLOR_COUNT;
}

/** "Hypercar" -> "HYPERCAR"; nombres largos se recortan para no desbordar la fila */
export function shortClassName(name: string): string {
  const n = name.trim().toUpperCase();
  return n.length > 9 ? n.slice(0, 9) : n;
}

export type ClassBadgeProps = {
  classId?: number | null;
  classPosition?: number | null;
  classColorIndexById?: Record<number, number>;
  small?: boolean;
  /** Nombres cortos de clase: si se pasan, la insignia dice p. ej. "LMP2 P3" en lugar de "P3" */
  classNames?: Record<number, string>;
};

export function ClassBadge({
  classId,
  classPosition,
  classColorIndexById,
  small,
  classNames,
}: ClassBadgeProps) {
  if (classId == null || !classPosition || classPosition <= 0) return null;

  const colorIndex = getClassColorIndex(classId, classColorIndexById);
  const sizeClass = small ? "class-badge--small" : "class-badge--normal";

  return (
    <div
      className={`class-badge ${sizeClass} class-badge--${colorIndex ?? "none"}`}
    >
      {classNames && classNames[classId] ? `${shortClassName(classNames[classId])} P${classPosition}` : `P${classPosition}`}
    </div>
  );
}
