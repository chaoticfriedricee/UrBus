import { useEffect, useRef, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';
import { Field, Modal } from '../../../shared/ui/index.js';

export const GroupModal = ({ group = null, onClose }) => {
  const isEdit = Boolean(group);

  const addGroup = useGroupStore((s) => s.addGroup);
  const editGroup = useGroupStore((s) => s.editGroup);
  const loading = useGroupStore((s) => s.loading);

  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 3) {
      setError('Escribe al menos 3 caracteres');
      return;
    }

    const result = isEdit
      ? await editGroup(group._id, { name: name.trim() })
      : await addGroup({ name: name.trim() });

    if (result?.success !== false) onClose();
  };

  return (
    <Modal
      title={isEdit ? 'Editar grupo' : 'Nuevo grupo'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear grupo'}
          </button>
        </>
      }
    >
      <Field
        label="Nombre del grupo"
        error={error}
        hint={isEdit ? undefined : 'Al crearlo se genera un código único para que los pasajeros se unan.'}
      >
        <input
          ref={inputRef}
          className={`input ${error ? 'has-error' : ''}`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit();
          }}
          placeholder="Ej. Ruta Zona 10 - Mañana"
        />
      </Field>
    </Modal>
  );
};
