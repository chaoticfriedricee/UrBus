import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';
import { Avatar, Field, Icon, Modal, RolePill } from '../../../shared/ui/index.js';
import { normalizeProfilePicture } from '../../../shared/utils/profilePicture.js';
import { ROLE_LABELS } from '../../../shared/utils/roles.js';

export const ProfileModal = ({ onClose }) => {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [form, setForm] = useState({
    name: user?.name ?? '',
    surname: user?.surname ?? '',
    phone: user?.phone ?? '',
  });
  const [preview, setPreview] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const fileRef = useRef(null);

  const fullName = [form.name, form.surname].filter(Boolean).join(' ') || user?.username;
  const picture = preview || (imageFailed ? null : normalizeProfilePicture(user?.profilePicture));

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleChange = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async () => {
    if (saving) return;

    const phoneValue = form.phone.trim();
    if (!/^\d{8}$/.test(phoneValue)) {
      toast.error('El teléfono debe tener exactamente 8 dígitos numéricos');
      return;
    }
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!form.surname.trim()) {
      toast.error('El apellido es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error('Usuario no válido');

      const formData = new FormData();
      formData.append('Name', form.name.trim());
      formData.append('Surname', form.surname.trim());
      formData.append('Phone', phoneValue);
      if (imgFile) formData.append('ProfilePicture', imgFile);

      const result = await updateProfile(userId, formData);
      if (!result.success) throw new Error(result.error || 'Error al actualizar el perfil');

      toast.success('Perfil actualizado correctamente');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Mi perfil"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Cambiar foto de perfil"
          style={{ position: 'relative', padding: 0, border: 0, background: 'none', borderRadius: '50%' }}
        >
          <Avatar name={fullName} src={picture} size="avatar-lg" onError={() => setImageFailed(true)} />
          <span
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              border: '2px solid var(--card)',
              borderRadius: '50%',
              background: 'var(--yellow)',
              color: 'var(--ink)',
            }}
          >
            <Icon name="camera" size={15} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, overflowWrap: 'anywhere' }}>
            {fullName}
          </p>
          <p className="muted" style={{ marginBottom: 6, fontSize: 14 }}>@{user?.username}</p>
          <RolePill role={user?.role} />
        </div>
      </div>

      <div className="auth-grid">
        <Field label="Nombre">
          <input className="input" value={form.name} onChange={handleChange('name')} autoComplete="given-name" />
        </Field>
        <Field label="Apellido">
          <input className="input" value={form.surname} onChange={handleChange('surname')} autoComplete="family-name" />
        </Field>
      </div>
      <Field label="Teléfono" hint="8 dígitos, sin espacios.">
        <input className="input" value={form.phone} onChange={handleChange('phone')} placeholder="00000000" inputMode="numeric" autoComplete="tel" />
      </Field>
      <div className="auth-grid">
        <Field label="Usuario">
          <input className="input" value={user?.username ?? ''} readOnly style={{ background: 'var(--paper)' }} />
        </Field>
        <Field label="Rol">
          <input className="input" value={ROLE_LABELS[user?.role] ?? user?.role ?? 'Usuario'} readOnly style={{ background: 'var(--paper)' }} />
        </Field>
      </div>
      <Field label="Correo electrónico">
        <input className="input" value={user?.email ?? ''} readOnly style={{ background: 'var(--paper)' }} />
      </Field>
    </Modal>
  );
};
