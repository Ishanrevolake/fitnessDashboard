type MiniChartProps = {
  data: number[];
  id: string;
};

export function MiniChart({ data, id }: MiniChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 80;
      const y = 40 - ((value - min) / range) * 30 - 5;
      return `${x},${y}`;
    })
    .join(" ");
  const lastPoint = points.split(" ").at(-1)?.split(",") ?? ["0", "0"];

  return (
    <div className="mini-chart">
      <svg viewBox="0 0 80 40" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-red)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent-red)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M 0,40 ${points.split(" ").map((point) => `L ${point}`).join(" ")} L 80,40 Z`} fill={`url(#gradient-${id})`} />
        <polyline points={points} fill="none" stroke="var(--accent-red)" strokeWidth="2" />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3" fill="var(--accent-red)" />
      </svg>
    </div>
  );
}
