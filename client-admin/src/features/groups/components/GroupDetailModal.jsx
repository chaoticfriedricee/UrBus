import { useEffect } from 'react';
import { useGroupStore } from '../store/groupStore.js';
import { copyToClipboard } from '../../../shared/utils/clipboard.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';
import { Avatar, Icon, Modal } from '../../../shared/ui/index.js';

export const GroupDetailModal = ({ groupId, onClose }) => {
  const activeGroup = useGroupStore((s) => s.activeGroup);
  const activeLoading = useGroupStore((s) => s.activeLoading);
  const fetchGroupDetail = useGroupStore((s) => s.fetchGroupDetail);
  const clearActiveGroup = useGroupStore((s) => s.clearActiveGroup);

  useEffect(() => {
    fetchGroupDetail(groupId);
    return () => clearActiveGroup();
  }, [groupId]);

  const passengers = activeGroup?.passengers ?? [];

  const handleCopy = async () => {
    if (await copyToClipboard(activeGroup.code)) showSuccess('Código copiado');
    else showError(`No se pudo copiar. El código es ${activeGroup.code}`);
  };

  return (
    <Modal
      title={activeGroup?.name ?? 'Grupo'}
      subtitle={
        activeGroup ? `${passengers.length} pasajero${passengers.length === 1 ? '' : 's'} en este grupo` : undefined
      }
      onClose={onClose}
    >
      {activeGroup?.code && (
        <div className="card" style={{ padding: 14, background: 'var(--paper)' }}>
          <p className="kv-key">Código de unión</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button type="button" className="code-ticket code-ticket-lg" onClick={handleCopy} title="Copiar código">
              {activeGroup.code}
              <Icon name="copy" size={16} />
            </button>
            <p className="hint" style={{ flex: '1 1 180px' }}>
              Los pasajeros lo escriben en «Unirme a un grupo» para quedar en este grupo.
            </p>
          </div>
        </div>
      )}

      {activeLoading ? (
        <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>Cargando pasajeros…</p>
      ) : passengers.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>
          Todavía no hay pasajeros en este grupo. Comparte el código para que se unan.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {passengers.map((passenger) => (
            <li
              key={passenger._id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1.5px dashed var(--line)' }}
            >
              <Avatar name={passenger.name} size="avatar-sm" />
              <span style={{ flex: 1, fontWeight: 600 }}>{passenger.name}</span>
              <span className={`badge ${passenger.status === 'PRESENT' ? 'badge-green' : ''}`}>
                {passenger.status === 'PRESENT' ? 'Presente' : 'Ausente'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
