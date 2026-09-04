import { useEffect, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';

export const DriverLimitCard = ({ driver }) => {
    const driverLimits      = useGroupStore((s) => s.driverLimits);
    const fetchDriverLimit  = useGroupStore((s) => s.fetchDriverLimit);
    const updateDriverLimit = useGroupStore((s) => s.updateDriverLimit);

    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(0);
    const [saving, setSaving] = useState(false);

    const currentLimit = driverLimits[driver.id];

    useEffect(() => { fetchDriverLimit(driver.id); }, [driver.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const startEdit = () => {
        setValue(currentLimit ?? 0);
        setEditing(true);
    };

    const handleSave = async () => {
        setSaving(true);
        await updateDriverLimit(driver.id, Number(value));
        setSaving(false);
        setEditing(false);
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', background: '#fff',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0, fontWeight: 700, fontSize: 15, color: '#1a1a2e',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {`${driver.name ?? ''} ${driver.surname ?? ''}`.trim() || driver.username}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#9ca3af' }}>
                    {driver.username}
                </p>
            </div>

            {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <input
                        type="number"
                        min={0}
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
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                        padding: '7px 14px', borderRadius: 999,
                        border: '1.5px solid #e5e7eb', background: '#f9fafb',
                        color: '#374151', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {currentLimit ?? '...'} grupo{currentLimit === 1 ? '' : 's'} permitido{currentLimit === 1 ? '' : 's'}
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
            )}
        </div>
    );
};
