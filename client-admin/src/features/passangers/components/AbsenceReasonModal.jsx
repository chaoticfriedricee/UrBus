import { useState } from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { Modal } from '../../../shared/ui/index.js';

const REASONS = [
  { value: 'SALUD', label: 'Motivos de Salud' },
  { value: 'EMERGENCIA', label: 'Emergencias' },
  { value: 'EXTRACURRICULAR', label: 'Actividades Extracurriculares' },
  { value: 'OTRO', label: 'Otro Motivo' },
];

export const AbsenceReasonModal = ({ passenger, onClose }) => {
  const setPassengerAbsenceReason = usePassengerStore((s) => s.setPassengerAbsenceReason);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!reason) return;
    setSubmitting(true);
    const result = await setPassengerAbsenceReason(passenger._id, { reason, note: note.trim() || undefined });
    setSubmitting(false);
    if (result?.success !== false) onClose();
  };

  return (
    <Modal
      title="¿Motivo de ausencia?"
      subtitle={passenger?.name}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={!reason || submitting}>
            {submitting ? 'Guardando…' : 'Aceptar'}
          </button>
        </>
      }
    >
      <div className="radio-list" role="radiogroup" aria-label="Motivo de ausencia">
        {REASONS.map((item) => (
          <label key={item.value} className={`radio-row ${reason === item.value ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="absence-reason"
              value={item.value}
              checked={reason === item.value}
              onChange={() => setReason(item.value)}
            />
            {item.label}
          </label>
        ))}
      </div>
      {reason === 'OTRO' && (
        <textarea
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Describe el motivo (opcional)"
          rows={3}
        />
      )}
    </Modal>
  );
};
