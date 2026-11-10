import { useEffect, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';
import { Icon } from '../../../shared/ui/index.js';

export const DefaultLimitCard = () => {
  const defaultLimit = useGroupStore((s) => s.defaultLimit);
  const fetchDefaultLimit = useGroupStore((s) => s.fetchDefaultLimit);
  const updateDefaultLimit = useGroupStore((s) => s.updateDefaultLimit);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDefaultLimit();
  }, [fetchDefaultLimit]);

  const startEdit = () => {
    setValue(defaultLimit ?? 0);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateDefaultLimit(Number(value));
    setSaving(false);
    if (result.success) setEditing(false);
  };

  return (
    <div className="row limit-box">
      <div className="row-body" style={{ flex: '1 1 240px' }}>
        <p className="row-title" style={{ whiteSpace: 'normal' }}>Límite general por conductor</p>
        <p className="hint" style={{ marginTop: 4, color: 'var(--yellow-ink)' }}>
          Máximo de grupos activos para cada conductor sin límite propio. Bajarlo no elimina grupos: solo impide crear más.
        </p>
      </div>

      {editing ? (
        <div className="limit-form row-actions">
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSave();
            }}
            autoFocus
            aria-label="Límite general"
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            Guardar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={startEdit} disabled={defaultLimit === null}>
          {defaultLimit ?? '…'} grupo{defaultLimit === 1 ? '' : 's'} por conductor
          <Icon name="edit" size={15} />
        </button>
      )}
    </div>
  );
};
