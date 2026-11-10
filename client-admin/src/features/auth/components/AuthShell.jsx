import urbusLogo from '../../../assets/img/UrBus-logo.png';

const STOPS = [
  [160, 640],
  [430, 560],
  [830, 700],
  [1180, 520],
  [260, 250],
  [700, 200],
  [1060, 170],
];

const RouteLine = () => (
  <svg className="auth-route" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="auth-dots" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.3" fill="#fff" fillOpacity="0.12" />
      </pattern>
    </defs>
    <rect width="1440" height="900" fill="url(#auth-dots)" />
    <circle cx="1330" cy="860" r="190" fill="none" stroke="#ffc107" strokeOpacity="0.16" strokeWidth="60" />
    <circle cx="70" cy="90" r="110" fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="34" />
    <path
      d="M-40 700 C 120 640, 260 770, 430 640 S 700 560, 830 700 S 1100 760, 1180 520 S 1400 470, 1500 520"
      fill="none"
      stroke="#fff"
      strokeOpacity="0.5"
      strokeWidth="4.5"
      strokeDasharray="2 15"
      strokeLinecap="round"
    />
    <path
      d="M-40 300 C 100 220, 200 330, 260 250 S 520 130, 700 200 S 960 260, 1060 170 S 1340 90, 1500 160"
      fill="none"
      stroke="#fff"
      strokeOpacity="0.3"
      strokeWidth="4.5"
      strokeDasharray="2 15"
      strokeLinecap="round"
    />
    {STOPS.map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="14" fill="#005691" stroke="#ffc107" strokeWidth="6" />
    ))}
  </svg>
);

export const AuthShell = ({ children, showVersion = false }) => (
  <div className="auth">
    <RouteLine />
    <div className="auth-brand">
      <img src={urbusLogo} alt="" />
      <span>UrBus</span>
    </div>
    <main className="auth-main">
      <div className="auth-card">
        {children}
        {showVersion && <p className="auth-version">v0.5.6</p>}
      </div>
    </main>
  </div>
);
