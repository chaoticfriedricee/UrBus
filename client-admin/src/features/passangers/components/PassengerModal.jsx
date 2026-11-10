import { useEffect, useRef, useState, useMemo } from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { useUserStore } from '../../users/store/userStore.js';
import { Field, Modal } from '../../../shared/ui/index.js';

export const PassengerModal = ({ passenger = null, onClose }) => {
  const isEdit = Boolean(passenger);

  const addPassenger = usePassengerStore((s) => s.addPassenger);
  const editPassenger = usePassengerStore((s) => s.editPassenger);
  const loading = usePassengerStore((s) => s.loading);
  const passengers = usePassengerStore((s) => s.passengers);

  const allUsers = useUserStore((s) => s.users);
  const fetchUsers = useUserStore((s) => s.fetchUsers);

  const [name, setName] = useState(passenger?.name ?? '');
  const [userId, setUserId] = useState(passenger?.userId ?? '');
  const [errors, setErrors] = useState({});
  const inputRef = useRef(null);

  const eligibleUsers = useMemo(() => {
    const linkedIds = new Set(passengers.map((p) => String(p.userId)));
    return (allUsers || []).filter(
      (u) => !linkedIds.has(String(u.id)) && u.role !== 'ADMIN_ROLE' && u.role !== 'DRIVER_ROLE'
    );
  }, [allUsers, passengers]);

  useEffect(() => {
    if (!isEdit && (!allUsers || allUsers.length === 0)) fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectUser = (event) => {
    const selectedId = event.target.value;
    setUserId(selectedId);
    setErrors((current) => ({ ...current, userId: '' }));

    const selectedUser = eligibleUsers.find((u) => String(u.id) === selectedId);
    if (selectedUser) {
      const fullName = `${selectedUser.name ?? ''} ${selectedUser.surname ?? ''}`.trim();
      if (fullName) setName(fullName);
    }
  };

  const validate = () => {
    const found = {};
    if (!name.trim()) found.name = 'El nombre es obligatorio';
    else if (name.trim().length < 3) found.name = 'Escribe al menos 3 caracteres';
    if (!isEdit && !userId.trim()) found.userId = 'Elige una cuenta para vincular';
    return found;
  };

  const handleSubmit = async () => {
    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    const result = isEdit
      ? await editPassenger(passenger._id, { name: name.trim() })
      : await addPassenger({ name: name.trim(), userId: userId.trim() });

    if (result?.success !== false) onClose();
  };

  return (
    <Modal
      title={isEdit ? 'Editar pasajero' : 'Vincular pasajero a una cuenta'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {isEdit ? 'Guardar cambios' : 'Vincular'}
          </button>
        </>
      }
    >
      <Field label="Nombre completo" error={errors.name}>
        <input
          ref={inputRef}
          className={`input ${errors.name ? 'has-error' : ''}`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: '' }));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit();
          }}
          placeholder="Ej. María García"
        />
      </Field>

      {!isEdit && (
        <Field
          label="Cuenta de usuario"
          error={errors.userId}
          hint="Solo aparecen cuentas que todavía no están vinculadas a un pasajero. Al elegir una, el nombre se completa solo (puedes editarlo)."
        >
          <select className={`select ${errors.userId ? 'has-error' : ''}`} value={userId} onChange={handleSelectUser}>
            <option value="">
              {eligibleUsers.length === 0 ? 'No hay cuentas disponibles para vincular' : 'Selecciona una cuenta…'}
            </option>
            {eligibleUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {`${u.name ?? ''} ${u.surname ?? ''}`.trim() || u.username} — {u.username}
              </option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
};
