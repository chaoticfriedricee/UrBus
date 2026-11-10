import { usePassengerStore } from '../store/passengerStore.js';
import { ConfirmModal } from '../../../shared/ui/index.js';

export const DeleteConfirmModal = ({ passenger, onClose }) => {
  const removePassenger = usePassengerStore((s) => s.removePassenger);
  const loading = usePassengerStore((s) => s.loading);

  const handleConfirm = async () => {
    await removePassenger(passenger._id);
    onClose();
  };

  return (
    <ConfirmModal
      title="¿Eliminar pasajero?"
      confirmLabel="Sí, eliminar"
      loadingLabel="Eliminando…"
      loading={loading}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      Se eliminará a <strong style={{ color: 'var(--ink)' }}>{passenger.name}</strong>. Esta acción no se puede deshacer.
    </ConfirmModal>
  );
};
