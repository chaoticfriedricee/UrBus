import { useState } from 'react';
import { Icon } from '../../../shared/ui/index.js';

export const PasswordField = ({ value, onChange, onKeyDown, placeholder, autoComplete, id }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-icon has-toggle">
      <Icon name="lock" size={18} />
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="input-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Icon name="eye" size={18} />
      </button>
    </div>
  );
};

export const IconInput = ({ icon, value, onChange, onKeyDown, type = 'text', placeholder, autoComplete, id }) => (
  <div className="input-icon">
    <Icon name={icon} size={18} />
    <input
      id={id}
      className="input"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
  </div>
);
