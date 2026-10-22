import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getWhatsAppStatus,
  getWhatsAppQR,
  getWhatsAppGroups,
  sendArrivalNotification,
  sendDelayNotification,
  sendRouteChangeNotification,
  sendCustomNotification,
} from '../../../shared/api/notification.js';
import { useAuthStore } from '../../../features/auth/store/authStore.js';

const POLL_INTERVAL_DISCONNECTED = 5000;
const POLL_INTERVAL_CONNECTED = 30000;

const INPUT_BASE = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#1f2937',
  background: '#f9fafb',
  margin: '0 0 8px 0',
};

const INPUT_NO_MARGIN = { ...INPUT_BASE, margin: '0' };

const btnStyle = (color, disabled) => ({
  width: '100%',
  padding: '9px',
  borderRadius: '8px',
  border: 'none',
  background: disabled ? '#d1d5db' : color,
  color: '#fff',
  fontSize: '13px',
  fontWeight: '600',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s',
  margin: '0 0 6px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
});

const Spinner = () => (
  <span style={{
    width: '14px', height: '14px',
    border: '2px solid #fff', borderTopColor: 'transparent',
    borderRadius: '50%', display: 'inline-block',
    animation: 'wa-spin 0.8s linear infinite',
  }} />
);

export const WhatsAppBubble = () => {
  const user = useAuthStore((state) => state.user);

  // Administradores y conductores pueden usar WhatsApp desde el panel
  if (!['ADMIN_ROLE', 'DRIVER_ROLE'].includes(user?.role)) return null;

  return <WhatsAppPanel />;
};

const WhatsAppPanel = () => {
  const [open, setOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [sending, setSending] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('preset');

  const [formData, setFormData] = useState({
    number: '',
    busName: '',
    minutes: '',
    customMsg: '',
  });

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [recipientType, setRecipientType] = useState('manual');

  const panelRef = useRef(null);

  const showFeedback = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  };

  /* ── Status polling ── */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await getWhatsAppStatus();
      setIsReady(res.data.isReady);
    } catch {
      setIsReady(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(
      fetchStatus,
      isReady ? POLL_INTERVAL_CONNECTED : POLL_INTERVAL_DISCONNECTED
    );
    return () => clearInterval(interval);
  }, [isReady, fetchStatus]);

  /* ── QR ── */
  const fetchQR = useCallback(async () => {
    setLoadingQR(true);
    try {
      const res = await getWhatsAppQR();
      if (res.data.isReady) {
        setIsReady(true);
        setQrImage(null);
      } else {
        setQrImage(res.data.qr || null);
      }
    } catch {
      setQrImage(null);
    } finally {
      setLoadingQR(false);
    }
  }, []);

  useEffect(() => {
    if (open && !isReady) {
      fetchQR();
      const interval = setInterval(() => { if (!isReady) fetchQR(); }, 20000);
      return () => clearInterval(interval);
    }
  }, [open, isReady, fetchQR]);

  /* ── Grupos: SOLO llamada manual, sin useEffect automático ── */
  const fetchGroups = useCallback(async () => {
    if (loadingGroups) return; // evitar doble llamada
    setLoadingGroups(true);
    setGroupsError(null);
    try {
      const res = await getWhatsAppGroups();
      setGroups(res.data.groups || []);
    } catch (err) {
      setGroupsError(err?.response?.data?.message || 'Error al cargar grupos');
    } finally {
      setLoadingGroups(false);
    }
  }, [loadingGroups]);

  /* ── Cerrar al click fuera ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const bubble = document.getElementById('wa-bubble-btn');
        if (bubble && bubble.contains(e.target)) return;
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  /* ── Envío ── */
  const handleSend = async (type) => {
    const { number, busName, minutes, customMsg } = formData;
    const recipient = number.trim();

    if (!recipient) {
      showFeedback('Selecciona o ingresa un destinatario', false);
      return;
    }
    if (recipientType === 'manual' && recipient.length !== 8) {
      showFeedback('El número debe tener exactamente 8 dígitos', false);
      return;
    }
    if (type !== 'custom' && !busName.trim()) {
      showFeedback('Ingresa el nombre del bus', false);
      return;
    }

    setSending(type);
    try {
      if (type === 'arrival') await sendArrivalNotification(recipient, busName);
      else if (type === 'delay') {
        if (!minutes) { showFeedback('Ingresa los minutos de retraso', false); setSending(null); return; }
        await sendDelayNotification(recipient, busName, minutes);
      }
      else if (type === 'route') await sendRouteChangeNotification(recipient, busName);
      else if (type === 'custom') {
        if (!customMsg.trim()) { showFeedback('Escribe un mensaje', false); setSending(null); return; }
        await sendCustomNotification(recipient, customMsg);
      }
      showFeedback('¡Mensaje enviado correctamente! ✓');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Error al enviar';
      showFeedback(msg, false);
    } finally {
      setSending(null);
    }
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '7px 4px',
    border: 'none',
    background: active ? '#25D366' : '#f3f4f6',
    color: active ? '#fff' : '#6b7280',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderRadius: '6px',
    transition: 'all 0.15s',
  });

  const subTabStyle = (active) => ({
    ...tabStyle(active),
    fontSize: '12px',
    padding: '6px 10px',
  });

  /* ── Selector de destinatario (JSX inline — no definir como componente interno
        para evitar que React lo desmonte en cada re-render y pierda el foco) ── */
  const recipientSelectorJSX = (
    <>
      <div style={{ display: 'flex', gap: '6px', margin: '0 0 8px' }}>
        <button style={subTabStyle(recipientType === 'manual')} onClick={() => setRecipientType('manual')}>
          📱 Número
        </button>
        <button
          style={subTabStyle(recipientType === 'group')}
          onClick={() => {
            setRecipientType('group');
            if (groups.length === 0) fetchGroups();
          }}
        >
          👥 Grupo
        </button>
      </div>

      {recipientType === 'manual' ? (
        <>
          <input
            style={{
              ...INPUT_BASE,
              borderColor: formData.number.length > 0 && formData.number.length !== 8 ? '#ef4444' : '#e5e7eb',
            }}
            type="tel"
            inputMode="numeric"
            placeholder="Número (ej: 55551234)"
            value={formData.number}
            maxLength={8}
            onChange={e => {
              const onlyDigits = e.target.value.replace(/\D/g, '');
              setFormData(f => ({ ...f, number: onlyDigits }));
            }}
          />
          {formData.number.length > 0 && formData.number.length !== 8 && (
            <p style={{ fontSize: '11px', color: '#ef4444', margin: '-4px 0 8px', padding: '0 2px' }}>
              {formData.number.length}/8 dígitos — el número debe tener exactamente 8 dígitos
            </p>
          )}
        </>
      ) : (
        <div style={{ margin: '0 0 8px' }}>
          {loadingGroups ? (
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px', padding: '6px 0' }}>Cargando grupos...</p>
          ) : (
            <select
              style={{ ...INPUT_BASE, cursor: 'pointer' }}
              value={formData.number}
              onChange={e => setFormData(f => ({ ...f, number: e.target.value }))}
            >
              <option value="">— Selecciona un grupo —</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '310px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: "'Segoe UI', sans-serif",
            animation: 'wa-popup 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ background: '#25D366', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, color: '#fff', fontWeight: '700', fontSize: '14px' }}>WhatsApp</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>
                {isReady ? '● Conectado' : '○ Desconectado'}
              </p>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            {!isReady ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                  Escanea el código QR con WhatsApp para vincular
                </p>
                {loadingQR ? (
                  <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Generando QR...</span>
                  </div>
                ) : qrImage ? (
                  <>
                    <img src={qrImage} alt="QR WhatsApp" style={{ width: '200px', height: '200px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '8px 0 0' }}>El QR se actualiza automáticamente</p>
                    <button onClick={fetchQR} style={{ margin: '8px 0 0', background: 'none', border: '1px solid #25D366', color: '#25D366', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Refrescar QR
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>QR no disponible aún</p>
                    <button onClick={fetchQR} style={{ background: '#25D366', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                      Intentar de nuevo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Tabs principales */}
                <div style={{ display: 'flex', gap: '4px', margin: '0 0 14px' }}>
                  <button style={tabStyle(activeTab === 'preset')} onClick={() => setActiveTab('preset')}>🚌 Notif.</button>
                  <button style={tabStyle(activeTab === 'custom')} onClick={() => setActiveTab('custom')}>✏️ Custom</button>
                  <button
                    style={tabStyle(activeTab === 'groups')}
                    onClick={() => {
                      setActiveTab('groups');
                      fetchGroups();
                    }}
                  >
                    👥 Grupos
                  </button>
                </div>

                {/* ── Tab Grupos ── */}
                {activeTab === 'groups' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Grupos de WhatsApp
                      </p>
                      <button
                        onClick={fetchGroups}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit' }}
                      >
                        🔄 Actualizar
                      </button>
                    </div>
                    {loadingGroups ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ width: '22px', height: '22px', border: '3px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />
                      </div>
                    ) : groupsError ? (
                      <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '8px', padding: '10px 12px', fontSize: '12px' }}>
                        {groupsError}
                      </div>
                    ) : groups.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                        No hay grupos — presiona Actualizar
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groups.map((g) => (
                          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', gap: '8px' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{g.name}</p>
                              <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>{g.id}</p>
                            </div>
                            <button
                              onClick={() => {
                                setFormData(f => ({ ...f, number: g.id }));
                                setRecipientType('group');
                                setActiveTab('preset');
                                showFeedback(`Grupo "${g.name}" seleccionado`, true);
                              }}
                              style={{ background: '#25D366', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', flexShrink: 0 }}
                            >
                              Usar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab Notificaciones preset ── */}
                {activeTab === 'preset' && (
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Destinatario
                    </p>
                    {recipientSelectorJSX}

                    <input
                      style={INPUT_BASE}
                      placeholder="Nombre del bus"
                      value={formData.busName}
                      onChange={e => setFormData(f => ({ ...f, busName: e.target.value }))}
                    />

                    <div style={{ height: '1px', background: '#f3f4f6', margin: '4px 0 10px' }} />

                    <button style={btnStyle('#25D366', !!sending)} onClick={() => handleSend('arrival')} disabled={!!sending}>
                      {sending === 'arrival' ? <Spinner /> : '🚌'} Bus por llegar
                    </button>
                    <button style={btnStyle('#f59e0b', !!sending)} onClick={() => handleSend('route')} disabled={!!sending}>
                      {sending === 'route' ? <Spinner /> : '🔄'} Cambio de ruta
                    </button>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                      <input
                        style={{ ...INPUT_NO_MARGIN, flex: 1 }}
                        placeholder="Min. de retraso"
                        type="number"
                        min="1"
                        value={formData.minutes}
                        onChange={e => setFormData(f => ({ ...f, minutes: e.target.value }))}
                      />
                      <button
                        style={{ ...btnStyle('#ef4444', !!sending), width: 'auto', padding: '9px 14px', margin: '0' }}
                        onClick={() => handleSend('delay')}
                        disabled={!!sending}
                      >
                        {sending === 'delay' ? <Spinner /> : '⏱️'} Retraso
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Tab Mensaje personalizado ── */}
                {activeTab === 'custom' && (
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Mensaje personalizado
                    </p>
                    {recipientSelectorJSX}
                    <textarea
                      style={{ ...INPUT_BASE, height: '90px', resize: 'vertical', lineHeight: '1.5' }}
                      placeholder="Escribe tu mensaje..."
                      value={formData.customMsg}
                      onChange={e => setFormData(f => ({ ...f, customMsg: e.target.value }))}
                    />
                    <button style={btnStyle('#25D366', !!sending)} onClick={() => handleSend('custom')} disabled={!!sending}>
                      {sending === 'custom' ? <Spinner /> : '📨'} Enviar mensaje
                    </button>
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div style={{ margin: '10px 0 0', padding: '8px 12px', borderRadius: '8px', background: feedback.ok ? '#dcfce7' : '#fee2e2', color: feedback.ok ? '#15803d' : '#dc2626', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                    {feedback.msg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Burbuja flotante */}
      <button
        id="wa-bubble-btn"
        onClick={() => setOpen(prev => !prev)}
        title="WhatsApp"
        style={{ position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', background: '#25D366', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(37,211,102,0.45)', zIndex: 9998, transition: 'transform 0.2s, box-shadow 0.2s', outline: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.45)'; }}
      >
        <div style={{ position: 'absolute', top: '4px', right: '4px', width: '12px', height: '12px', borderRadius: '50%', background: isReady ? '#4ade80' : '#fbbf24', border: '2px solid #fff', transition: 'background 0.3s' }} />
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
            <line x1="18" y1="6" x2="6" y2="18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes wa-popup {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wa-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};