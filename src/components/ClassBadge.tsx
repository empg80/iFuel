type ClassColor = { bg: string; text: string };

const CLASS_COLORS: ClassColor[] = [
  { bg: "#4caf50", text: "#ffffff" },
  { bg: "#2196f3", text: "#ffffff" },
  { bg: "#ff9800", text: "#000000" },
  { bg: "#9c27b0", text: "#ffffff" },
  { bg: "#f44336", text: "#ffffff" },
  { bg: "#607d8b", text: "#ffffff" },
];

function getClassColor(
  classId?: number | null,
  classColorIndexById?: Record<number, number>,
): ClassColor {
  if (classId == null) return { bg: "#444", text: "#fff" };
  const idxRaw =
    classColorIndexById && classColorIndexById[classId] != null
      ? classColorIndexById[classId]
      : 0;
  const idx = idxRaw % CLASS_COLORS.length;
  return CLASS_COLORS[idx] ?? { bg: "#444", text: "#fff" };
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

  const { bg, text } = getClassColor(classId, classColorIndexById);
  const sizeClass = small ? "class-badge--small" : "class-badge--normal";

  return (
    <div
      className={`class-badge ${sizeClass}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {`P${classPosition}`}
    </div>
  );
}
