import { useEffect, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';

// Límite general de grupos activos por conductor (solo ADMIN). Aplica a los
// conductores que no tienen un límite propio.
export const DefaultLimitCard = () => {
    const defaultLimit       = useGroupStore((s) => s.defaultLimit);
    const fetchDefaultLimit  = useGroupStore((s) => s.fetchDefaultLimit);
    const updateDefaultLimit = useGroupStore((s) => s.updateDefaultLimit);

    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchDefaultLimit(); }, [fetchDefaultLimit]);

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
        <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px',
            padding: '16px 18px', background: '#f0f7ff',
        }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
                    Límite general por conductor
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#6b7280' }}>
                    Máximo de grupos activos que puede tener cada conductor sin límite propio.
                    Bajarlo no elimina grupos: solo impide crear más.
                </p>
            </div>

            {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                        autoFocus
                        style={{
                            width: 64, padding: '7px 10px', borderRadius: 9,
                            border: '1.5px solid #005691', fontSize: 13.5, color: '#111827',
                            outline: 'none', textAlign: 'center',
                        }}
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '7px 14px', borderRadius: 9, border: 'none',
                            background: '#005691', color: '#fff', fontSize: 12.5,
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Guardar
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        style={{
                            padding: '7px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: 12.5,
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            ) : (
                <button
                    onClick={startEdit}
                    disabled={defaultLimit === null}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto',
                        padding: '7px 14px', borderRadius: 999, border: 'none',
                        background: '#005691', color: '#fff', fontSize: 12.5,
                        fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {defaultLimit ?? '...'} grupo{defaultLimit === 1 ? '' : 's'} por conductor
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
            )}
        </div>
    );
};
