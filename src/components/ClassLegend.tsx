import { shortClassName } from "./ClassBadge";

type Props = {
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
};

/** Leyenda de colores por categoría. Solo aparece en sesiones multiclase (2 o más clases). */
export function ClassLegend({ classColorIndexById, classNames }: Props) {
  if (!classNames) return null;
  const ids = Object.keys(classNames)
    .map(Number)
    .filter((id) => classColorIndexById?.[id] != null)
    .sort((a, b) => (classColorIndexById![a] ?? 0) - (classColorIndexById![b] ?? 0));
  if (ids.length < 2) return null;

  return (
    <div className="class-legend" aria-label="Class colors">
      {ids.map((id) => (
        <span key={id} className="class-legend__item">
          <span
            className={`class-legend__swatch class-badge--${(classColorIndexById![id] ?? 0) % 6}`}
          />
          {shortClassName(classNames[id])}
        </span>
      ))}
    </div>
  );
}
