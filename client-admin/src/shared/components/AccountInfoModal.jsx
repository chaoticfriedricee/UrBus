import { Modal, Spinner } from '../ui/index.js';
import { formatDateGT } from '../utils/date.js';

export const AccountInfoModal = ({ account, loading = false, onClose }) => {
  const fullName = [account?.name, account?.surname].filter(Boolean).join(' ');

  const rows = [
    { label: 'Nombre completo', value: fullName },
    { label: 'Usuario', value: account?.username },
    { label: 'Teléfono', value: account?.phone },
    { label: 'Correo electrónico', value: account?.email },
    { label: 'Cuenta creada', value: formatDateGT(account?.createdAt) },
  ];

  return (
    <Modal
      title="Información de la cuenta"
      subtitle={!loading && fullName ? fullName : undefined}
      size="sm"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', color: 'var(--blue)' }}>
          <Spinner size={28} />
        </div>
      ) : !account ? (
        <p className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>
          No se pudo cargar la información de esta cuenta.
        </p>
      ) : (
        <div>
          {rows.map((row) => (
            <div className="kv" key={row.label}>
              <span className="kv-key">{row.label}</span>
              <span className="kv-value">{row.value || 'No disponible'}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
