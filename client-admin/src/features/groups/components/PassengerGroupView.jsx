import { useEffect, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';

const CARD_STYLE = {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
    border: '1px solid #f0f0f0',
    padding: '20px 22px',
};

function JoinGroupCard({ currentGroup }) {
    const joinGroupByCode = useGroupStore((s) => s.joinGroupByCode);

    const [code, setCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const handleJoin = async () => {
        if (!code.trim()) {
            setFeedback({ ok: false, text: 'Ingresa el código que te compartió tu conductor' });
            return;
        }
        setJoining(true);
        setFeedback(null);
        const result = await joinGroupByCode(code.trim());
        setJoining(false);

        if (result.success) {
            setCode('');
            setFeedback({ ok: true, text: `Te uniste al grupo ${result.group?.name ?? ''}`.trim() });
        } else {
            setFeedback({ ok: false, text: result.error });
        }
    };

    return (
        <div style={CARD_STYLE}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>
                Unirme a un grupo
            </p>
            <p style={{ margin: '4px 0 14px', fontSize: 13, color: '#6b7280' }}>
                Ingresa el código de unión que te compartió tu conductor.
                {currentGroup && ` Si te unes a otro grupo dejarás «${currentGroup.name}».`}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <input
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setFeedback(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                    placeholder="Ej. A3F9K2"
                    maxLength={12}
                    autoCapitalize="characters"
                    autoComplete="off"
                    aria-label="Código de unión"
                    style={{
                        flex: '1 1 160px', minWidth: 0, padding: '10px 14px', borderRadius: 10,
                        border: `1.5px solid ${feedback && !feedback.ok ? '#ef4444' : '#e5e7eb'}`,
                        fontSize: 15, fontWeight: 700, letterSpacing: '2px', fontFamily: 'monospace',
                        color: '#111827', outline: 'none', boxSizing: 'border-box',
                    }}
                />
                <button
                    onClick={handleJoin}
                    disabled={joining}
                    style={{
                        flex: '0 0 auto', padding: '10px 20px', borderRadius: 10, border: 'none',
                        background: joining ? '#93c5fd' : '#005691', color: '#fff',
                        fontSize: 14, fontWeight: 600, cursor: joining ? 'default' : 'pointer',
                    }}
                >
                    {joining ? 'Uniendo...' : 'Unirme'}
                </button>
            </div>
            {feedback && (
                <p
                    role={feedback.ok ? 'status' : 'alert'}
                    style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: feedback.ok ? '#15803d' : '#ef4444' }}
                >
                    {feedback.text}
                </p>
            )}
        </div>
    );
}

function MyGroupCard({ group }) {
    return (
        <div style={CARD_STYLE}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Tu grupo
            </p>
            <p style={{ margin: '4px 0 2px', fontWeight: 800, fontSize: 18, color: '#005691', overflowWrap: 'anywhere' }}>
                {group.name}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                Código: <strong style={{ letterSpacing: '1px', color: '#374151' }}>{group.code}</strong>
                {' · '}{group.isActive ? 'Activo' : 'Inactivo'}
            </p>
            {!group.isActive && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#b45309' }}>
                    Este grupo está inactivo. Tu conductor debe reactivarlo para ver compañeros, anuncios y ubicación.
                </p>
            )}
        </div>
    );
}

// Vista de la sección Grupos para pasajeros (PASSENGER_ROLE / USER_ROLE)
export const PassengerGroupView = () => {
    const myPassenger        = useGroupStore((s) => s.myPassenger);
    const myPassengerLoading = useGroupStore((s) => s.myPassengerLoading);
    const notLinked          = useGroupStore((s) => s.notLinked);
    const fetchMyPassenger   = useGroupStore((s) => s.fetchMyPassenger);

    useEffect(() => { fetchMyPassenger(); }, [fetchMyPassenger]);

    // groupId llega poblado ({ name, code, isActive }) o null si no pertenece a ninguno
    const group = myPassenger?.groupId ?? null;

    if (myPassengerLoading && !myPassenger) {
        return <p style={{ fontSize: 13, color: '#9ca3af' }}>Cargando...</p>;
    }

    if (notLinked) {
        return (
            <div style={CARD_STYLE}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#374151' }}>
                    Aún no estás vinculado como pasajero
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                    Pide a tu conductor o a un administrador que te registre; después podrás unirte con un código.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
            {group ? (
                <MyGroupCard group={group} />
            ) : (
                <div style={CARD_STYLE}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#374151' }}>
                        Todavía no perteneces a ningún grupo
                    </p>
                </div>
            )}
            <JoinGroupCard currentGroup={group} />
        </div>
    );
};
