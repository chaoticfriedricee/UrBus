import { useState } from 'react';
import { Spinner } from './Spinner.jsx';
import { IconInput } from './PasswordField.jsx';
import { forgotPassword } from '../../../shared/api';
import { showError, showSuccess } from '../../../shared/utils/toast.js';
import { Banner, Field } from '../../../shared/ui/index.js';

export const ForgotPassword = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      showError('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      showSuccess('Si el correo existe, recibirás instrucciones.');
    } catch (err) {
      showError(err.response?.data?.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleSubmit();
  };

  const backToLogin = () => {
    setSent(false);
    setEmail('');
    onNavigate('login');
  };

  return (
    <>
      <h1 className="auth-title">Recupera tu contraseña</h1>
      <p className="auth-sub">
        {sent
          ? 'Listo. Te enviamos las instrucciones para crear una contraseña nueva.'
          : 'Escribe tu correo y te enviaremos un enlace para restablecerla.'}
      </p>

      {sent ? (
        <div className="auth-form">
          <Banner tone="good">Revisa tu bandeja de entrada y también la carpeta de spam.</Banner>
          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={backToLogin}>
            Volver a ingresar
          </button>
        </div>
      ) : (
        <div className="auth-form">
          <Field label="Correo electrónico">
            <IconInput
              icon="mail"
              type="email"
              value={email}
              onChange={setEmail}
              onKeyDown={handleKeyDown}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </Field>
          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : 'Enviar instrucciones'}
          </button>
        </div>
      )}

      <div className="auth-links">
        <p>
          ¿Ya la recordaste?{' '}
          <button type="button" className="link" onClick={() => onNavigate('login')}>
            Ingresar
          </button>
        </p>
      </div>
    </>
  );
};
