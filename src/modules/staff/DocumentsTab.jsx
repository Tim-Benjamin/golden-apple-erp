import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchAllDocuments, getDocumentUrl, deleteDocument, uploadDocument } from './documentsService';
import { fetchStaff } from './staffService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'training_certificate', label: 'Training Certificate' },
  { value: 'health_certificate', label: 'Health Certificate' },
  { value: 'tax_document', label: 'Tax Document' },
  { value: 'ssnit_document', label: 'SSNIT Document' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'other', label: 'Other' },
];

export default function DocumentsTab() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffFilter, setStaffFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ staff_id: '', document_type: 'contract', title: '', expiry_date: '', file: null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const { data: staffList } = useAsyncData(fetchStaff, []);
  const { data: documents, loading } = useAsyncData(
    () => fetchAllDocuments({ staffId: staffFilter, documentType: typeFilter }),
    [staffFilter, typeFilter, refreshKey]
  );

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.staff_id || !form.file) {
      setError('Please select a staff member and a file.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadDocument({
        staffId: form.staff_id,
        documentType: form.document_type,
        title: form.title || form.file.name,
        expiryDate: form.expiry_date || null,
        file: form.file,
        actorId: staffProfile.id,
      });
      setForm({ staff_id: '', document_type: 'contract', title: '', expiry_date: '', file: null });
      setShowUpload(false);
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
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await deleteDocument(doc.id, doc.file_path, staffProfile.id);
    setRefreshKey((k) => k + 1);
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="page-header-row">
        <div />
        <button className="primary-btn" onClick={() => setShowUpload(true)}>+ Upload Document</button>
      </div>

      <div className="res-filter-bar">
        <select className="res-filter-select" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
          <option value="all">All Staff</option>
          {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select className="res-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Type</th>
              <th>Title</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : documents?.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No documents match these filters.</td></tr>
            ) : (
              documents?.map((d) => {
                const isExpired = d.expiry_date && d.expiry_date < todayISO;
                return (
                  <tr key={d.id}>
                    <td>{d.staff?.full_name}</td>
                    <td className="table-capitalize">{d.document_type.replace('_', ' ')}</td>
                    <td>{d.title}</td>
                    <td style={{ color: isExpired ? 'var(--color-danger)' : undefined }}>
                      {d.expiry_date ?? '—'}{isExpired && ' (Expired)'}
                    </td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="table-action-btn" onClick={() => handleView(d)}>View</button>
                      <button className="table-action-btn" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDelete(d)}>Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Document</h2>
              <button className="modal-close" onClick={() => setShowUpload(false)}>×</button>
            </div>
            <form onSubmit={handleUpload} className="modal-form">
              <label>
                Staff Member
                <select required value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
                  <option value="">Select...</option>
                  {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </label>
              <label>
                Document Type
                <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                  {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label>
                Title
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
                <button type="button" className="modal-btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="modal-btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}