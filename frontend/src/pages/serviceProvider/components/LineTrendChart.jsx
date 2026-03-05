const buildPoints = (values, width, height, padding) => {
  if (!Array.isArray(values) || values.length === 0) return "";

  const safeValues = values.map((value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );
  const maxValue = Math.max(...safeValues, 1);
  const minValue = Math.min(...safeValues, 0);
  const range = maxValue - minValue || 1;
  const stepX =
    safeValues.length === 1
      ? 0
      : (width - padding * 2) / (safeValues.length - 1);

  return safeValues
    .map((value, index) => {
      const x = padding + index * stepX;
      const y =
        height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
};

export default function LineTrendChart({ data = [] }) {
  const values = data.map((item) => Number(item?.revenue || 0));
  const width = 620;
  const height = 180;
  const padding = 18;
  const points = buildPoints(values, width, height, padding);

  return (
    <div className="provider-line-chart">
      {values.length === 0 ? (
        <p className="muted-text">No trend data.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue trend">
          <polyline
            fill="none"
            stroke="#1e7fd8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      )}
      <div className="provider-line-chart-labels">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
