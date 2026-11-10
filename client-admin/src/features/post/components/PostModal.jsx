import { useState, useEffect, useRef } from 'react';
import { usePostStore } from '../store/postStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { Field, Icon, Modal } from '../../../shared/ui/index.js';

export const PostModal = ({ post, onClose }) => {
  const isEdit = Boolean(post);
  const addPost = usePostStore((s) => s.addPost);
  const editPost = usePostStore((s) => s.editPost);
  const loading = usePostStore((s) => s.loading);

  const [title, setTitle] = useState(post?.title ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [isUrgent, setIsUrgent] = useState(post?.isUrgent ?? false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(post?.imageUrl ?? null);
  const [groupId, setGroupId] = useState(post?.groupId ?? '');
  const fileRef = useRef(null);

  const groups = useGroupStore((s) => s.groups);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);
  const activeGroups = groups.filter((g) => g.isActive || g._id === groupId);

  useEffect(() => {
    if (groups.length === 0) fetchGroups();
  }, [groups.length, fetchGroups]);

  const handleImageChange = (event) => {
    const file = event.target.files[0] || null;
    setImageFile(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('content', content.trim());
    formData.append('isUrgent', String(isUrgent));
    if (groupId !== (post?.groupId ?? '')) formData.append('groupId', groupId);
    if (imageFile) formData.append('image', imageFile);

    const result = isEdit ? await editPost(post._id, formData) : await addPost(formData);

    if (result.success) onClose();
  };

  return (
    <Modal
      title={isEdit ? 'Editar anuncio' : 'Nuevo anuncio'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
          >
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Publicar'}
          </button>
        </>
      }
    >
      <Field label="Título">
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. El bus está por llegar"
        />
      </Field>

      <Field label="Mensaje">
        <textarea
          className="textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escribe el mensaje del anuncio…"
          rows={4}
        />
      </Field>

      <Field label="Dirigido a" hint="Un aviso de grupo solo lo ven los pasajeros de ese grupo.">
        <select className="select" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">Todos (aviso general)</option>
          {activeGroups.map((group) => (
            <option key={group._id} value={group._id}>
              Grupo: {group.name}
            </option>
          ))}
        </select>
      </Field>

      <label className={`check-row ${isUrgent ? 'is-on' : ''}`}>
        <input type="checkbox" checked={isUrgent} onChange={(event) => setIsUrgent(event.target.checked)} />
        <span>
          <span className="label" style={{ display: 'block', color: 'var(--ink)' }}>Marcar como urgente</span>
          <span className="hint">Se destaca en la lista y enciende un aviso en el menú hasta que se revise.</span>
        </span>
      </label>

      <Field label="Imagen (opcional)">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />
        <div className="upload">
          {preview && <img className="upload-preview" src={preview} alt="Vista previa" />}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={16} />
            {preview ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {preview && (
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
                setImageFile(null);
                setPreview(null);
              }}
            >
              Quitar
            </button>
          )}
        </div>
      </Field>
    </Modal>
  );
};
