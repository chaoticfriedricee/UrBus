import { useState } from 'react';
import { useUserStore } from '../store/userStore.js';
import { AccountInfoModal } from '../../../shared/components/AccountInfoModal.jsx';
import { Avatar, Icon, RolePill } from '../../../shared/ui/index.js';
import { ROLE_LABELS } from '../../../shared/utils/roles.js';

const ROLE_OPTIONS = ['ADMIN_ROLE', 'PASSENGER_ROLE', 'DRIVER_ROLE', 'USER_ROLE'];

export const UserCard = ({ user, currentUserId }) => {
  const changeUserRole = useUserStore((s) => s.changeUserRole);
  const verifyEmail = useUserStore((s) => s.verifyEmail);
  const [updating, setUpdating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const { id, name, surname, email, role, status, isEmailVerified } = user;
  const isSelf = String(id) === String(currentUserId);
  const fullName = `${name ?? ''} ${surname ?? ''}`.trim();

  const handleRoleChange = async (event) => {
    const newRole = event.target.value;
    if (newRole === role) return;

    if (isSelf && role === 'ADMIN_ROLE' && newRole !== 'ADMIN_ROLE') {
      const confirmed = window.confirm(
        'Estás a punto de quitarte el rol de Administrador a ti mismo. ¿Deseas continuar?'
      );
      if (!confirmed) return;
    }

    setUpdating(true);
    await changeUserRole(id, newRole);
    setUpdating(false);
  };

  const handleVerifyEmail = async () => {
    const confirmed = window.confirm(`¿Confirmas que quieres verificar manualmente el email de ${fullName}?`.replace('  ', ' '));
    if (!confirmed) return;

    setVerifying(true);
    await verifyEmail(id);
    setVerifying(false);
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="row">
      <div className="row-main">
        <Avatar name={fullName} />
        <div className="row-body">
          <p className="row-title">
            {fullName || 'Sin nombre'}
            {isSelf && <span className="muted" style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 600 }}>(Tú)</span>}
          </p>
          <p className="row-meta">{email}</p>
          <button
            type="button"
            className="link"
            onClick={handleCopyId}
            title="Copiar ID de la cuenta"
            style={{ marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500, textDecoration: 'none', color: 'var(--ink-3)' }}
          >
            {copied ? 'ID copiado' : `ID: ${id}`}
          </button>
        </div>
      </div>

      <div className="row-actions">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <RolePill role={role} />
          {!status && <span className="badge badge-red">Inactivo</span>}
          {!isEmailVerified && <span className="badge badge-orange">Correo sin verificar</span>}
        </div>

        <button
          type="button"
          className="icon-btn is-brand"
          onClick={() => setShowInfo(true)}
          title="Ver información de la cuenta"
          aria-label="Ver información de la cuenta"
        >
          <Icon name="info" size={16} />
        </button>

        {!isEmailVerified && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleVerifyEmail}
            disabled={verifying}
            title="Verificar correo manualmente"
          >
            <Icon name="check" size={15} strokeWidth={2.4} />
            {verifying ? 'Verificando…' : 'Verificar'}
          </button>
        )}

        <select
          className="select select-sm"
          value={role ?? ''}
          onChange={handleRoleChange}
          disabled={updating}
          title="Cambiar rol"
          aria-label={`Cambiar rol de ${fullName || 'usuario'}`}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {showInfo && <AccountInfoModal account={user} onClose={() => setShowInfo(false)} />}
    </div>
  );
};
