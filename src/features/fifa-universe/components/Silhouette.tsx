export function Silhouette({ height }: { height: number }) {
  return (
    <svg viewBox="0 0 120 150" style={{ height }} className="w-auto" aria-hidden>
      <g fill="#33270a" fillOpacity="0.22">
        <circle cx="60" cy="46" r="30" />
        <path d="M14 150c0-30 20-52 46-52s46 22 46 52z" />
      </g>
    </svg>
  );
}
