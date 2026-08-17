import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchDocumentsFor, uploadDocument, getDocumentUrl, deleteDocument } from './documentsService';

const DOCUMENT_TYPES = [
  { value: 'id_card', label: 'ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'training_certificate', label: 'Training Certificate' },
  { value: 'health_certificate', label: 'Health Certificate' },
  { value: 'other', label: 'Other' },
];

export default function MyDocumentsWidget() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: documents, loading } = useAsyncData(() => fetchDocumentsFor(staffProfile.id), [staffProfile.id, refreshKey]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ document_type: 'id_card', title: '', expiry_date: '', file: null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.file) {
      setError('Please choose a file.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadDocument({
        staffId: staffProfile.id,
        documentType: form.document_type,
        title: form.title || form.file.name,
        expiryDate: form.expiry_date || null,
        file: form.file,
        actorId: staffProfile.id,
      });
      setForm({ document_type: 'id_card', title: '', expiry_date: '', file: null });
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleView(doc) {
    const url = await getDocumentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  async function handleDelete(doc) {
    if (!confirm('Delete this document?')) return;
    await deleteDocument(doc.id, doc.file_path, staffProfile.id);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="account-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="hk-section-title">My Documents</h3>

      {!showForm ? (
        <button className="modal-btn-primary" onClick={() => setShowForm(true)}>+ Upload Document</button>
      ) : (
        <form onSubmit={handleSubmit} className="modal-form" style={{ maxWidth: '420px', marginBottom: '1rem' }}>
          <label>
            Document Type
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
              {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label>
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. National ID" />
          </label>
          <label>
            Expiry Date (optional)
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </label>
          <label>
            File
            <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      <ul className="detail-list" style={{ marginTop: '0.75rem' }}>
        {loading ? (
          <li className="detail-list-empty">Loading...</li>
        ) : documents.length === 0 ? (
          <li className="detail-list-empty">No documents uploaded yet.</li>
        ) : (
          documents.map((d) => (
            <li key={d.id}>
              <span>
                <span className="table-capitalize">{d.document_type.replace('_', ' ')}</span> — {d.title}
                {d.expiry_date && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}> (expires {d.expiry_date})</span>}
              </span>
              <span style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="table-action-btn" onClick={() => handleView(d)}>View</button>
                <button className="table-action-btn" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDelete(d)}>Delete</button>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}