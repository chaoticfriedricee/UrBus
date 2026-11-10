const PATHS = {
  map: <><path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" /><path d="M9 4v13M15 7v13" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20v-1.5a4.5 4.5 0 0 0-3-4.2" /></>,
  megaphone: <><path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1Z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  group: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5v-1A5.5 5.5 0 0 1 10 14h4a5.5 5.5 0 0 1 5.5 5.5v1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14.3-4.4L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M4 13a8 8 0 0 0 14.3 4.4L20 15.5" /><path d="M20 20v-4.5h-4.5" /></>,
  edit: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="m15 8 4 4-4 4M19 12H9" /></>,
  alert: <><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.5h.01" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="9.5" r="1.6" /><path d="m21 16-5-5L6 20" /></>,
  bus: <><rect x="4" y="3.5" width="16" height="14" rx="3" /><path d="M4 11h16M8 21v-3.5M16 21v-3.5M8 14.5h.01M16 14.5h.01" /></>,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7.5 8.5 6 8.5-6" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></>,
  pencil: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 5h12l-2.5 4L17 13H5" /></>,
  play: <path d="M7 4.5v15l12-7.5-12-7.5Z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  shield: <><path d="M12 3 5 6v5.5c0 4.4 2.9 8 7 9.5 4.1-1.5 7-5.100 7-9.500V6l-7-3Z" /><path d="m9 12 2.200 2.200L15.200 10" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  home: <><path d="m3 11.500 9-7.500 9 7.500" /><path d="M5.500 10v9.500h13V10" /><path d="M10 19.500v-5h4v5" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
};

export const Icon = ({ name, size = 18, strokeWidth = 1.9, className, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    {...rest}
  >
    {PATHS[name]}
  </svg>
);
