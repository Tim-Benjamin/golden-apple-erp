import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchAllDisciplinaryRecords, createDisciplinaryRecord, updateDisciplinaryRecord } from './disciplinaryService';
import { fetchStaff } from './staffService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';

const WARNING_LEVELS = [
  { value: 'verbal', label: 'Verbal Warning' },
  { value: 'written', label: 'Written Warning' },
  { value: 'final', label: 'Final Warning' },
  { value: 'termination', label: 'Termination' },
];

const WARNING_COLORS = { verbal: 'var(--color-text-secondary)', written: 'var(--color-gold-muted)', final: 'var(--color-gold)', termination: 'var(--color-danger)' };

export default function DisciplinaryTab() {
  const { staffProfile, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffFilter, setStaffFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [followUpDrafts, setFollowUpDrafts] = useState({});

  const { data: staffList } = useAsyncData(fetchStaff, []);
  const { data: records, loading } = useAsyncData(() => fetchAllDisciplinaryRecords({ staffId: staffFilter }), [staffFilter, refreshKey]);

  const [form, setForm] = useState({
    staff_id: '', incident_date: new Date().toISOString().slice(0, 10), description: '',
    warning_level: 'verbal', employee_response: '', management_decision: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.staff_id || !form.description) {
      setError('Staff member and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createDisciplinaryRecord({ ...form, created_by: staffProfile.id });
      setForm({ staff_id: '', incident_date: new Date().toISOString().slice(0, 10), description: '', warning_level: 'verbal', employee_response: '', management_decision: '' });
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFollowUp(recordId) {
    const notes = followUpDrafts[recordId];
    if (!notes) return;
    await updateDisciplinaryRecord(recordId, { follow_up_notes: notes, follow_up_date: new Date().toISOString().slice(0, 10) }, staffProfile.id);
    setFollowUpDrafts((d) => ({ ...d, [recordId]: '' }));
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <div className="pending-notice" style={{ borderColor: 'rgba(168,64,47,0.3)', background: 'rgba(168,64,47,0.08)', color: '#e0705c', marginBottom: '1.25rem' }}>
        Restricted section — visible only to Super Admin, General Manager, and HR. Records here are permanent and cannot be deleted.
      </div>

      <div className="page-header-row">
        <div />
        <button className="primary-btn" onClick={() => setShowForm(true)}>+ New Record</button>
      </div>

      <div className="res-filter-bar">
        <select className="res-filter-select" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
          <option value="all">All Staff</option>
          {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Date</th>
              <th>Warning Level</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : records?.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No disciplinary records.</td></tr>
            ) : (
              records?.map((r) => (
                <>
                  <tr key={r.id}>
                    <td>{r.staff?.full_name}</td>
                    <td>{r.incident_date}</td>
                    <td>
                      <span style={{ color: WARNING_COLORS[r.warning_level], fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                        {r.warning_level}
                      </span>
                    </td>
                    <td style={{ maxWidth: '260px' }}>{r.description}</td>
                    <td>
                      <button className="table-action-btn" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        {expandedId === r.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={5} style={{ background: 'var(--color-bg)', padding: '1rem 1.25rem' }}>
                        {r.employee_response && <p style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}><strong>Employee Response:</strong> {r.employee_response}</p>}
                        {r.management_decision && <p style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}><strong>Management Decision:</strong> {r.management_decision}</p>}
                        {r.follow_up_notes && <p style={{ fontSize: '0.82rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}><strong>Follow-up ({r.follow_up_date}):</strong> {r.follow_up_notes}</p>}
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Recorded by {r.creator?.full_name}</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder="Add follow-up note..."
                            value={followUpDrafts[r.id] ?? ''}
                            onChange={(e) => setFollowUpDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                            style={{ flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.7rem', color: 'var(--color-text-primary)', fontSize: '0.82rem' }}
                          />
                          <button className="modal-btn-primary" onClick={() => handleAddFollowUp(r.id)}>Add Follow-up</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Disciplinary Record</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <label>
                  Staff Member
                  <select required value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
                    <option value="">Select...</option>
                    {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </label>
                <label>
                  Incident Date
                  <input type="date" required value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
                </label>
              </div>
              <label>
                Warning Level
                <select value={form.warning_level} onChange={(e) => setForm({ ...form, warning_level: e.target.value })}>
                  {WARNING_LEVELS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </label>
              <label>
                Description
                <textarea
                  required rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </label>
              <label>
                Employee Response (optional)
                <input value={form.employee_response} onChange={(e) => setForm({ ...form, employee_response: e.target.value })} />
              </label>
              <label>
                Management Decision (optional)
                <input value={form.management_decision} onChange={(e) => setForm({ ...form, management_decision: e.target.value })} />
              </label>

              {error && <p className="modal-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="modal-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="modal-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}