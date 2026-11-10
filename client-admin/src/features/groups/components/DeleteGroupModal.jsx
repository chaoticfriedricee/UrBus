import { useGroupStore } from '../store/groupStore.js';
import { ConfirmModal } from '../../../shared/ui/index.js';

export const DeleteGroupModal = ({ group, onClose }) => {
  const removeGroup = useGroupStore((s) => s.removeGroup);
  const loading = useGroupStore((s) => s.loading);

  const handleConfirm = async () => {
    await removeGroup(group._id);
    onClose();
  };

  return (
    <ConfirmModal
      title="¿Eliminar grupo?"
      confirmLabel="Sí, eliminar"
      loadingLabel="Eliminando…"
      loading={loading}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      Se eliminará <strong style={{ color: 'var(--ink)' }}>{group.name}</strong> y los pasajeros vinculados quedarán sin
      grupo. Esta acción no se puede deshacer.
    </ConfirmModal>
  );
};
