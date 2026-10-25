// Selector del grupo de pasajeros que se quiere ver (conductor: sus grupos; admin: todos)
export const GroupFilter = ({ groups, selectedGroupId, onSelect, disabled }) => {
    const options = [
        { value: null, label: 'Todos', hint: null },
        ...groups.map((g) => ({
            value: g._id,
            label: g.name,
            hint: g.isActive ? `${g.passengerCount ?? 0}` : 'inactivo',
        })),
    ];

    return (
        <div
            role="radiogroup"
            aria-label="Grupo de pasajeros"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
        >
            {options.map((o) => {
                const selected = o.value === selectedGroupId;
                return (
                    <button
                        key={o.value ?? 'all'}
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => { if (!selected) onSelect(o.value); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%',
                            padding: '7px 14px', borderRadius: 999,
                            border: selected ? 'none' : '1.5px solid #e5e7eb',
                            background: selected ? '#005691' : '#fff',
                            color: selected ? '#fff' : '#374151',
                            fontSize: 12.5, fontWeight: 600,
                            cursor: disabled ? 'default' : 'pointer',
                        }}
                    >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.label}
                        </span>
                        {o.hint && (
                            <span style={{
                                padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                                background: selected ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                                color: selected ? '#fff' : '#6b7280',
                            }}>
                                {o.hint}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
