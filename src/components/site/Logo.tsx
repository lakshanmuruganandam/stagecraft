export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd28a" />
          <stop offset="1" stopColor="#ffa928" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M13 4h6l7 22H6z" fill="url(#beam)" opacity=".85" />
      <rect x="11" y="2" width="10" height="5" rx="1.5" fill="#ffa928" />
      <ellipse cx="16" cy="27" rx="12" ry="3" fill="#ffa928" opacity=".35" />
    </svg>
  );
}
