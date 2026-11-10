import { useState } from 'react';
import { Spinner } from './Spinner.jsx';
import { IconInput } from './PasswordField.jsx';
import { resendVerification } from '../../../shared/api';
import { showError, showSuccess } from '../../../shared/utils/toast.js';
import { Banner, Field } from '../../../shared/ui/index.js';

export const ResendVerification = ({ onNavigate }) => {
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
      const { data } = await resendVerification(email.trim());
      if (!data?.success) {
        showError(data?.message || 'No se pudo reenviar la verificación.');
        return;
      }
      setSent(true);
      showSuccess('Correo de verificación enviado.');
    } catch (err) {
      showError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Error al reenviar la verificación.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleSubmit();
  };

  return (
    <>
      <h1 className="auth-title">Verifica tu correo</h1>
      <p className="auth-sub">
        {sent
          ? 'Enviamos el enlace de verificación. Ábrelo para activar tu cuenta.'
          : 'Escribe tu correo y te reenviamos el enlace para activar tu cuenta.'}
      </p>

      {sent ? (
        <div className="auth-form">
          <Banner tone="good">Si no lo ves en unos minutos, revisa la carpeta de spam.</Banner>
          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => onNavigate('login')}>
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
            {loading ? <Spinner /> : 'Reenviar verificación'}
          </button>
        </div>
      )}

      <div className="auth-links">
        <p>
          ¿Ya verificaste tu cuenta?{' '}
          <button type="button" className="link" onClick={() => onNavigate('login')}>
            Ingresar
          </button>
        </p>
      </div>
    </>
  );
};
