import { useState } from 'react';
import { showSuccess, showError } from '../../../shared/utils/toast.js';
import { copyToClipboard } from '../../../shared/utils/clipboard.js';
import { Icon } from '../../../shared/ui/index.js';

export const GroupCard = ({ group, canManage, onView, onEdit, onDelete, onToggleActive }) => {
  const { name, code, isActive, passengerCount } = group;
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event) => {
    event.stopPropagation();
    if (!(await copyToClipboard(code))) {
      showError(`No se pudo copiar. El código es ${code}`);
      return;
    }
    setCopied(true);
    showSuccess('Código copiado');
    setTimeout(() => setCopied(false), 1500);
  };

  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler(group);
  };

  return (
    <div className={`row is-clickable ${isActive ? '' : 'is-muted'}`} onClick={() => onView(group)}>
      <div className="row-main">
        <span className="tile">
          <Icon name="bus" size={22} />
        </span>
        <div className="row-body">
          <p className="row-title">{name}</p>
          <p className="row-meta">
            {passengerCount ?? 0} pasajero{passengerCount === 1 ? '' : 's'}
          </p>
        </div>
        <span className={`badge ${isActive ? 'badge-green' : ''}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
      </div>

      <div className="row-actions">
        <button type="button" className="code-ticket" onClick={handleCopy} title="Copiar código de unión">
          {code}
          <Icon name={copied ? 'check' : 'copy'} size={15} />
        </button>

        {canManage && (
          <>
            <button
              type="button"
              className={`icon-btn ${isActive ? '' : 'is-good'}`}
              onClick={stop(onToggleActive)}
              title={isActive ? 'Desactivar grupo' : 'Activar grupo'}
              aria-label={isActive ? 'Desactivar grupo' : 'Activar grupo'}
            >
              <Icon name={isActive ? 'ban' : 'check'} size={16} />
            </button>
            <button
              type="button"
              className="icon-btn is-brand"
              onClick={stop(onEdit)}
              title="Editar"
              aria-label="Editar grupo"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              className="icon-btn is-danger"
              onClick={stop(onDelete)}
              title="Eliminar"
              aria-label="Eliminar grupo"
            >
              <Icon name="trash" size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
