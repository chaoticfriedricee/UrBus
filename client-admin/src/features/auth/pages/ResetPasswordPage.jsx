import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../../shared/api/auth';
import { AuthShell } from '../components/AuthShell.jsx';
import { PasswordField } from '../components/PasswordField.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { showError } from '../../../shared/utils/toast.js';
import { Field, Icon } from '../../../shared/ui/index.js';

export const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get('token');

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmar) {
      showError('Completa todos los campos.');
      return;
    }
    if (password.length < 8) {
      showError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmar) {
      showError('Las contraseñas no coinciden.');
      return;
    }
    if (!token) {
      showError('El enlace es inválido o ya expiró.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await resetPassword(token, password);
      if (!data?.success) {
        showError(data?.message || 'El enlace es inválido o ya expiró.');
        return;
      }
      setDone(true);
    } catch (error) {
      showError(
        error.response?.data?.errors?.[0]?.message ||
          error.response?.data?.message ||
          'Error al restablecer la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleReset();
  };

  if (done) {
    return (
      <AuthShell>
        <div className="status-box">
          <div className="status-mark is-good">
            <Icon name="check" size={30} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="auth-title">Contraseña actualizada</h1>
            <p className="auth-sub" style={{ marginBottom: 0 }}>Ya puedes iniciar sesión con tu contraseña nueva.</p>
          </div>
          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => navigate('/')}>
            Ir a ingresar
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="auth-title">Crea una contraseña nueva</h1>
      <p className="auth-sub">Elige una contraseña de al menos 8 caracteres.</p>

      <div className="auth-form">
        <Field label="Contraseña nueva">
          <PasswordField
            value={password}
            onChange={setPassword}
            onKeyDown={handleKeyDown}
            placeholder="8 o más caracteres"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmar contraseña">
          <PasswordField
            value={confirmar}
            onChange={setConfirmar}
            onKeyDown={handleKeyDown}
            placeholder="Repítela"
            autoComplete="new-password"
          />
        </Field>
        <button type="button" className="btn btn-accent btn-lg btn-block" onClick={handleReset} disabled={loading}>
          {loading ? <Spinner /> : 'Guardar contraseña'}
        </button>
      </div>

      <div className="auth-links">
        <p>
          <button type="button" className="link" onClick={() => navigate('/')}>
            Volver a ingresar
          </button>
        </p>
      </div>
    </AuthShell>
  );
};
