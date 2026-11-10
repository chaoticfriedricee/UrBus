import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useVerifyEmail } from '../hooks/useVerifyEmail.js';
import { Icon } from '../../../shared/ui/index.js';

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');
  const { status, message } = useVerifyEmail(token);

  return (
    <AuthShell>
      <div className="status-box">
        {status === 'loading' && (
          <>
            <div className="status-mark" style={{ background: 'var(--yellow-soft)', color: 'var(--yellow-ink)' }}>
              <Spinner size={28} />
            </div>
            <div>
              <h1 className="auth-title">Verificando tu correo</h1>
              <p className="auth-sub" style={{ marginBottom: 0 }}>Un momento, estamos confirmando tu cuenta.</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="status-mark is-good">
              <Icon name="check" size={30} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="auth-title">¡Correo verificado!</h1>
              <p className="auth-sub" style={{ marginBottom: 0 }}>Tu cuenta ya está activa. Puedes ingresar.</p>
            </div>
            <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => navigate('/')}>
              Ir a ingresar
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="status-mark is-bad">
              <Icon name="x" size={30} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="auth-title">No pudimos verificarlo</h1>
              <p className="auth-sub" style={{ marginBottom: 0 }}>{message}</p>
            </div>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
};
