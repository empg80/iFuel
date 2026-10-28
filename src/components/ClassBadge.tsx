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

export type ClassBadgeProps = {
  classId?: number | null;
  classPosition?: number | null;
  classColorIndexById?: Record<number, number>;
  small?: boolean;
};

export function ClassBadge({
  classId,
  classPosition,
  classColorIndexById,
  small,
}: ClassBadgeProps) {
  if (classId == null || !classPosition || classPosition <= 0) return null;

  const colorIndex = getClassColorIndex(classId, classColorIndexById);
  const sizeClass = small ? "class-badge--small" : "class-badge--normal";

  return (
    <div
      className={`class-badge ${sizeClass} class-badge--${colorIndex ?? "none"}`}
    >
      {`P${classPosition}`}
    </div>
  );
}
