import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from './Spinner.jsx';
import { IconInput, PasswordField } from './PasswordField.jsx';
import { useAuthStore } from '../store/authStore.js';
import { showError } from '../../../shared/utils/toast.js';
import { Field } from '../../../shared/ui/index.js';

export const LoginForm = ({ onNavigate }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!usuario.trim() || !password.trim()) {
      showError('Escribe tu usuario y tu contraseña.');
      return;
    }
    const result = await login({ emailOrUsername: usuario, password });
    if (result.success) navigate('/dashboard');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleLogin();
  };

  return (
    <>
      <h1 className="auth-title">Bienvenido de vuelta</h1>
      <p className="auth-sub">Ingresa con tu cuenta para ver el recorrido de tu bus.</p>

      <div className="auth-form">
        <Field label="Usuario o correo">
          <IconInput
            icon="user"
            value={usuario}
            onChange={setUsuario}
            onKeyDown={handleKeyDown}
            placeholder="tu.usuario o correo@ejemplo.com"
            autoComplete="username"
          />
        </Field>
        <Field label="Contraseña">
          <PasswordField
            value={password}
            onChange={setPassword}
            onKeyDown={handleKeyDown}
            placeholder="Tu contraseña"
            autoComplete="current-password"
          />
        </Field>

        {error && <p className="field-error" role="alert">{error}</p>}

        <button type="button" className="link" style={{ alignSelf: 'flex-end' }} onClick={() => onNavigate('forgot')}>
          ¿Olvidaste tu contraseña?
        </button>

        <button type="button" className="btn btn-accent btn-lg btn-block" onClick={handleLogin} disabled={loading}>
          {loading ? <Spinner /> : 'Ingresar'}
        </button>
      </div>

      <div className="auth-links">
        <p>
          ¿No tienes cuenta?{' '}
          <button type="button" className="link" onClick={() => onNavigate('register')}>
            Regístrate
          </button>
        </p>
        <p>
          ¿No verificaste tu correo?{' '}
          <button type="button" className="link" onClick={() => onNavigate('resend')}>
            Reenviar enlace
          </button>
        </p>
      </div>
    </>
  );
};
