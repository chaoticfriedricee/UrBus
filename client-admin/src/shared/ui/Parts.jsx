import { Icon } from './Icon.jsx';
import { ROLE_LABELS, ROLE_PANEL, getInitials, getTone } from '../utils/roles.js';

export const Spinner = ({ size = 18 }) => (
  <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Cargando" />
);

export const PageHeader = ({ role, title, subtitle, children }) => (
  <header className="page-head">
    <div>
      <span className="eyebrow">{ROLE_PANEL[role] ?? 'UrBus'}</span>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-sub">{subtitle}</p>}
    </div>
    {children && <div className="page-actions">{children}</div>}
  </header>
);

export const RefreshButton = ({ onClick, disabled, label = 'Actualizar' }) => (
  <button type="button" className="btn btn-ghost" onClick={onClick} disabled={disabled}>
    <Icon name="refresh" size={16} />
    {label}
  </button>
);

export const Banner = ({ tone = 'info', children }) => (
  <div className={`banner ${tone === 'warning' ? 'banner-warn' : tone === 'danger' ? 'banner-danger' : tone === 'good' ? 'banner-good' : ''}`} role={tone === 'warning' || tone === 'danger' ? 'alert' : undefined}>
    <Icon name={tone === 'warning' || tone === 'danger' ? 'alert' : 'info'} size={18} />
    <div>{children}</div>
  </div>
);

export const EmptyState = ({ icon = 'list', title, text, actionLabel, onAction }) => (
  <div className="empty">
    <div className="empty-mark">
      <Icon name={icon} size={28} strokeWidth={1.6} />
    </div>
    <p className="empty-title">{title}</p>
    {text && <p className="empty-text">{text}</p>}
    {actionLabel && (
      <button type="button" className="btn btn-primary" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

export const SkeletonRows = ({ count = 4, round = false }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <div className="row" key={index}>
        <div className="row-main">
          <span className="skeleton" style={{ width: 46, height: 46, borderRadius: round ? '50%' : 12, flexShrink: 0 }} />
          <div className="row-body" style={{ display: 'grid', gap: 8 }}>
            <span className="skeleton" style={{ height: 14, width: '46%' }} />
            <span className="skeleton" style={{ height: 12, width: '30%' }} />
          </div>
        </div>
      </div>
    ))}
  </>
);

export const FilterChips = ({ options, value, onChange, disabled, label }) => (
  <div className="chips" role="radiogroup" aria-label={label}>
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value ?? 'all'}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          className="chip"
          onClick={() => {
            if (!selected) onChange(option.value);
          }}
        >
          <span className="chip-label">{option.label}</span>
          {option.count !== undefined && option.count !== null && (
            <span className="chip-count">{option.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

export const Avatar = ({ name, src, size = '', onError }) => (
  src ? (
    <img className={`avatar ${size}`} src={src} alt="" onError={onError} />
  ) : (
    <span className={`avatar ${size} ${getTone(name)}`} aria-hidden="true">
      {getInitials(name)}
    </span>
  )
);

export const RolePill = ({ role }) => (
  <span className={`role-pill role-${role}`}>{ROLE_LABELS[role] ?? role ?? 'Sin rol'}</span>
);

export const Field = ({ label, hint, error, children }) => (
  <div className="field">
    {label && <label className="label">{label}</label>}
    {children}
    {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
  </div>
);
