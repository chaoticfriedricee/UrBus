import { useEffect, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';
import { Avatar, Icon } from '../../../shared/ui/index.js';

export const DriverLimitCard = ({ driver }) => {
  const driverLimits = useGroupStore((s) => s.driverLimits);
  const fetchDriverLimit = useGroupStore((s) => s.fetchDriverLimit);
  const updateDriverLimit = useGroupStore((s) => s.updateDriverLimit);
  const resetDriverLimit = useGroupStore((s) => s.resetDriverLimit);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const currentLimit = driverLimits[driver.id]?.maxGroups;
  const isCustom = driverLimits[driver.id]?.isCustom;
  const displayName = `${driver.name ?? ''} ${driver.surname ?? ''}`.trim() || driver.username;

  useEffect(() => {
    fetchDriverLimit(driver.id);
  }, [driver.id]);

  const startEdit = () => {
    setValue(currentLimit ?? 0);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateDriverLimit(driver.id, Number(value));
    setSaving(false);
    if (result.success) setEditing(false);
  };

  const handleReset = async () => {
    setSaving(true);
    await resetDriverLimit(driver.id);
    setSaving(false);
  };

  return (
    <div className="row">
      <div className="row-main">
        <Avatar name={displayName} />
        <div className="row-body">
          <p className="row-title">{displayName}</p>
          <p className="row-meta">
            {driver.username}
            {currentLimit !== undefined && (isCustom ? ' · Límite propio' : ' · Usa el límite general')}
          </p>
        </div>
      </div>

      {editing ? (
        <div className="limit-form row-actions">
          <input
            className="input"
            type="number"
            min={0}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSave();
            }}
            autoFocus
            aria-label={`Límite de ${displayName}`}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            Guardar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="row-actions">
          {isCustom && (
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={handleReset}
              disabled={saving}
              title="Quitar el límite propio y usar el límite general"
            >
              Usar general
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
            {currentLimit ?? '…'} grupo{currentLimit === 1 ? '' : 's'} permitido{currentLimit === 1 ? '' : 's'}
            <Icon name="edit" size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
