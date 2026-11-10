import { useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore.js';
import { usePassengerStore } from '../store/passengerStore.js';
import { AccountInfoModal } from '../../../shared/components/AccountInfoModal.jsx';
import { AbsenceReasonModal } from './AbsenceReasonModal.jsx';
import { getUserById } from '../../../shared/api/users.js';
import { showError } from '../../../shared/utils/toast.js';
import { isTodayGT } from '../../../shared/utils/date.js';
import { Avatar, Icon } from '../../../shared/ui/index.js';

const ABSENCE_REASON_LABELS = {
  SALUD: 'Motivos de Salud',
  EMERGENCIA: 'Emergencia',
  EXTRACURRICULAR: 'Actividad Extracurricular',
  OTRO: 'Otro Motivo',
};

export const PassengerCard = ({ passenger, onEdit, onDelete }) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN_ROLE';
  const isDriver = user?.role === 'DRIVER_ROLE';
  const canToggleStatus = isAdmin || isDriver;
  const canViewInfo = isAdmin || isDriver;

  const toggleStatus = usePassengerStore((s) => s.toggleStatus);
  const clearPassengerAbsenceReason = usePassengerStore((s) => s.clearPassengerAbsenceReason);
  const { _id, name, status, address, absenceReason, absenceReasonNote, absenceReasonAt } = passenger;
  const isPresent = status === 'PRESENT';

  const showAbsenceReason = !isPresent && absenceReason && isTodayGT(absenceReasonAt);
  const absenceReasonLabel = ABSENCE_REASON_LABELS[absenceReason] ?? absenceReason;

  const [infoAccount, setInfoAccount] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);

  const handleViewInfo = async () => {
    setShowInfo(true);
    setInfoLoading(true);
    try {
      const { data } = await getUserById(passenger.userId);
      setInfoAccount(data);
    } catch (err) {
      setInfoAccount(null);
      showError(err.response?.data?.message || 'No se pudo cargar la información de la cuenta');
    } finally {
      setInfoLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="row-main">
        <Avatar name={name} />
        <div className="row-body">
          <p className="row-title">{name}</p>
          <p className="row-meta">{address ?? `ID: ${_id?.slice(-6)}`}</p>
          {showAbsenceReason && (
            <p className="reason-note">
              <Icon name="alert" size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {absenceReasonLabel}
                {absenceReasonNote ? `: ${absenceReasonNote}` : ''}
              </span>
              {canToggleStatus && (
                <button
                  type="button"
                  onClick={() => clearPassengerAbsenceReason(_id)}
                  title="Quitar motivo de ausencia"
                  aria-label="Quitar motivo de ausencia"
                >
                  <Icon name="x" size={12} strokeWidth={2.6} />
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="row-actions">
        {canToggleStatus ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAbsenceModal(true)}
              title="Registrar motivo de ausencia"
            >
              Motivo de ausencia
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={isPresent}
              className={`presence ${isPresent ? 'is-on' : ''}`}
              onClick={() => toggleStatus(_id)}
              title={isPresent ? 'Marcar como ausente' : 'Marcar como presente'}
            >
              {isPresent ? 'Presente' : 'Ausente'}
            </button>
          </>
        ) : null}

        {canViewInfo && (
          <button
            type="button"
            className="icon-btn is-brand"
            onClick={handleViewInfo}
            title="Ver información de contacto"
            aria-label="Ver información de contacto"
          >
            <Icon name="info" size={16} />
          </button>
        )}

        {isAdmin && (
          <>
            <button
              type="button"
              className="icon-btn is-brand"
              onClick={() => onEdit(passenger)}
              title="Editar"
              aria-label="Editar pasajero"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              className="icon-btn is-danger"
              onClick={() => onDelete(passenger)}
              title="Eliminar"
              aria-label="Eliminar pasajero"
            >
              <Icon name="trash" size={16} />
            </button>
          </>
        )}
      </div>

      {showInfo && <AccountInfoModal account={infoAccount} loading={infoLoading} onClose={() => setShowInfo(false)} />}
      {showAbsenceModal && <AbsenceReasonModal passenger={passenger} onClose={() => setShowAbsenceModal(false)} />}
    </div>
  );
};
