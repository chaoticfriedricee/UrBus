import { useEffect, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';
import { useAuthStore } from '../../auth/store/authStore.js';
import { Banner } from '../../../shared/ui/index.js';

const JoinGroupCard = ({ currentGroup }) => {
  const joinGroupByCode = useGroupStore((s) => s.joinGroupByCode);
  const user = useAuthStore((s) => s.user);

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleJoin = async () => {
    if (!code.trim()) {
      setFeedback({ ok: false, text: 'Escribe el código que te compartió tu conductor' });
      return;
    }
    setJoining(true);
    setFeedback(null);
    const displayName = [user?.name, user?.surname].filter(Boolean).join(' ') || user?.username;
    const result = await joinGroupByCode(code.trim(), displayName);
    setJoining(false);

    if (result.success) {
      setCode('');
      setFeedback({ ok: true, text: `Te uniste al grupo ${result.group?.name ?? ''}`.trim() });
    } else {
      setFeedback({ ok: false, text: result.error });
    }
  };

  return (
    <section className="card card-pad">
      <h2 className="empty-title" style={{ fontSize: 20 }}>Unirme a un grupo</h2>
      <p className="muted" style={{ margin: '6px 0 16px', fontSize: 14.5 }}>
        Escribe el código de unión que te compartió tu conductor.
        {currentGroup && ` Si te unes a otro grupo dejarás «${currentGroup.name}».`}
      </p>
      <div className="join-row">
        <input
          className={`input ${feedback && !feedback.ok ? 'has-error' : ''}`}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setFeedback(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleJoin();
          }}
          placeholder="A3F9K2"
          maxLength={12}
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Código de unión"
        />
        <button type="button" className="btn btn-accent" onClick={handleJoin} disabled={joining}>
          {joining ? 'Uniendo…' : 'Unirme'}
        </button>
      </div>
      {feedback && (
        <p
          role={feedback.ok ? 'status' : 'alert'}
          className={feedback.ok ? 'hint' : 'field-error'}
          style={{ marginTop: 10, fontWeight: 700, color: feedback.ok ? 'var(--green)' : undefined }}
        >
          {feedback.text}
        </p>
      )}
    </section>
  );
};

const MyGroupCard = ({ group }) => (
  <section className="card my-group">
    <p className="eyebrow">Tu grupo</p>
    <p className="my-group-name">{group.name}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <span className="code-ticket">{group.code}</span>
      <span className={`badge ${group.isActive ? 'badge-green' : ''}`}>{group.isActive ? 'Activo' : 'Inactivo'}</span>
    </div>
    {!group.isActive && (
      <div style={{ marginTop: 16 }}>
        <Banner tone="warning">
          Este grupo está inactivo. Tu conductor debe reactivarlo para que veas compañeros, anuncios y ubicación.
        </Banner>
      </div>
    )}
  </section>
);

export const PassengerGroupView = () => {
  const myPassenger = useGroupStore((s) => s.myPassenger);
  const myPassengerLoading = useGroupStore((s) => s.myPassengerLoading);
  const notLinked = useGroupStore((s) => s.notLinked);
  const fetchMyPassenger = useGroupStore((s) => s.fetchMyPassenger);

  useEffect(() => {
    fetchMyPassenger();
  }, [fetchMyPassenger]);

  const group = myPassenger?.groupId ?? null;

  if (myPassengerLoading && !myPassenger && !notLinked) {
    return <p className="muted">Cargando…</p>;
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      {group ? (
        <MyGroupCard group={group} />
      ) : (
        <Banner>
          <strong>Todavía no perteneces a ningún grupo.</strong> Escribe abajo el código de tu bus para quedar asignado al
          grupo de tu conductor.
        </Banner>
      )}
      <JoinGroupCard currentGroup={group} />
    </div>
  );
};
