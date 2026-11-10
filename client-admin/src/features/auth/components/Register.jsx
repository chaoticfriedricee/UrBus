import { useState } from 'react';
import { Spinner } from './Spinner.jsx';
import { IconInput, PasswordField } from './PasswordField.jsx';
import { useAuthStore } from '../store/authStore.js';
import { showError, showSuccess } from '../../../shared/utils/toast.js';
import { Field, Icon } from '../../../shared/ui/index.js';

export const Register = ({ onNavigate }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);

  const { register, loading } = useAuthStore();

  const handleRegister = async () => {
    if (!nombre.trim() || !apellido.trim() || !username.trim() || !email.trim() || !telefono.trim() || !password.trim()) {
      showError('Por favor completa todos los campos.');
      return;
    }
    if (password !== confirmar) {
      showError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8 || password.length > 50) {
      showError('La contraseña debe tener entre 8 y 50 caracteres.');
      return;
    }
    if (telefono.length !== 8) {
      showError('El teléfono debe tener 8 dígitos.');
      return;
    }

    const formData = new FormData();
    formData.append('name', nombre);
    formData.append('surname', apellido);
    formData.append('username', username);
    formData.append('email', email);
    formData.append('phone', telefono);
    formData.append('password', password);
    if (fotoFile) formData.append('profilePicture', fotoFile);

    const result = await register(formData);

    if (result.success) {
      showSuccess('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
      onNavigate('resend');
    } else {
      showError(result.error || 'Error al registrar usuario');
    }
  };

  const handleFotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFoto(URL.createObjectURL(file));
    setFotoFile(file);
  };

  return (
    <>
      <h1 className="auth-title">Crea tu cuenta</h1>
      <p className="auth-sub">Un par de datos y ya puedes unirte al grupo de tu bus.</p>

      <div className="auth-form">
        <label className="photo-pick">
          <input type="file" accept="image/*" onChange={handleFotoChange} />
          <span className="photo-pick-circle">
            {foto ? <img src={foto} alt="Foto de perfil" /> : <Icon name="camera" size={26} />}
          </span>
          <span>
            <span className="label" style={{ display: 'block' }}>Foto de perfil</span>
            <span className="hint">{foto ? 'Toca para cambiarla' : 'Opcional'}</span>
          </span>
        </label>

        <div className="auth-grid">
          <Field label="Nombre">
            <IconInput icon="user" value={nombre} onChange={setNombre} placeholder="Nombre" autoComplete="given-name" />
          </Field>
          <Field label="Apellido">
            <IconInput icon="user" value={apellido} onChange={setApellido} placeholder="Apellido" autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Nombre de usuario">
          <IconInput icon="user" value={username} onChange={setUsername} placeholder="usuario" autoComplete="username" />
        </Field>
        <Field label="Correo electrónico">
          <IconInput icon="mail" type="email" value={email} onChange={setEmail} placeholder="correo@ejemplo.com" autoComplete="email" />
        </Field>
        <Field label="Teléfono" hint="8 dígitos, sin espacios.">
          <IconInput icon="phone" type="tel" value={telefono} onChange={setTelefono} placeholder="12345678" autoComplete="tel" />
        </Field>
        <div className="auth-grid">
          <Field label="Contraseña">
            <PasswordField value={password} onChange={setPassword} placeholder="8 o más caracteres" autoComplete="new-password" />
          </Field>
          <Field label="Confirmar">
            <PasswordField value={confirmar} onChange={setConfirmar} placeholder="Repítela" autoComplete="new-password" />
          </Field>
        </div>

        <button type="button" className="btn btn-accent btn-lg btn-block" onClick={handleRegister} disabled={loading}>
          {loading ? <Spinner /> : 'Crear cuenta'}
        </button>
      </div>

      <div className="auth-links">
        <p>
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="link" onClick={() => onNavigate('login')}>
            Ingresa
          </button>
        </p>
      </div>
    </>
  );
};
