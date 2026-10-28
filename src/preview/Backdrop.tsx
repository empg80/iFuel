// Fondo ilustrativo de "simulador" para las vistas previas (no es una captura de iRacing).
export function Backdrop() {
  return (
    <svg
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#25395c" />
          <stop offset="0.55" stopColor="#7d8fb0" />
          <stop offset="1" stopColor="#e2b08a" />
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3f47" />
          <stop offset="1" stopColor="#1b1d22" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f5a34" />
          <stop offset="1" stopColor="#1f2e1b" />
        </linearGradient>
        <radialGradient id="sun" cx="0.72" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2c9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff2c9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0d10" stopOpacity="0" />
          <stop offset="1" stopColor="#0c0d10" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#sky)" />
      <ellipse cx="1380" cy="470" rx="420" ry="300" fill="url(#sun)" />
      <path d="M0 520 L260 470 L520 510 L820 455 L1120 505 L1420 462 L1700 500 L1920 470 L1920 600 L0 600Z" fill="#46556f" />
      <rect y="560" width="1920" height="520" fill="url(#grass)" />
      <path d="M700 560 L1150 560 L1980 1080 L-260 1080Z" fill="url(#road)" />
      <path d="M700 560 L720 560 L-60 1080 L-260 1080Z" fill="#c43b3b" />
      <path d="M1130 560 L1150 560 L1980 1080 L1780 1080Z" fill="#e8e8e8" />
      <path d="M918 560 L932 560 L1010 1080 L840 1080Z" fill="#cfd2d8" opacity="0.55" />
      <g fill="#14161a">
        <rect x="905" y="585" width="52" height="22" rx="5" />
        <rect x="868" y="640" width="84" height="34" rx="7" />
        <rect x="1022" y="610" width="64" height="26" rx="6" />
      </g>
      <g fill="#e6572e" opacity="0.9">
        <rect x="912" y="591" width="38" height="5" rx="2" />
        <rect x="878" y="650" width="62" height="7" rx="3" />
      </g>
      <rect y="760" width="1920" height="320" fill="url(#dash)" />
    </svg>
  );
}
