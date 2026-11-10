import { useState } from 'react';
import { AuthShell } from '../components/AuthShell.jsx';
import { LoginForm } from '../components/LoginForm.jsx';
import { Register } from '../components/Register.jsx';
import { ForgotPassword } from '../components/ForgotPassword.jsx';
import { ResendVerification } from '../components/ResendVerification.jsx';

export const AuthPage = () => {
  const [view, setView] = useState('login');

  const views = {
    login: <LoginForm onNavigate={setView} />,
    register: <Register onNavigate={setView} />,
    forgot: <ForgotPassword onNavigate={setView} />,
    resend: <ResendVerification onNavigate={setView} />,
  };

  return <AuthShell showVersion>{views[view]}</AuthShell>;
};
