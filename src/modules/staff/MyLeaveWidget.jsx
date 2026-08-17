import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchMyEntitlement, fetchMyLeaveUsed, fetchMyLeaveRequests, createLeaveRequest, cancelLeaveRequest } from './leaveService';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'maternity_paternity', label: 'Maternity/Paternity' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

const STATUS_COLORS = {
  pending: 'var(--color-gold-muted)',
  approved: 'var(--color-success)',
  rejected: 'var(--color-danger)',
  cancelled: 'var(--color-text-muted)',
};

export default function MyLeaveWidget() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: entitlement, loading: entLoading } = useAsyncData(() => fetchMyEntitlement(staffProfile.id), [staffProfile.id, refreshKey]);
  const { data: daysUsed, loading: usedLoading } = useAsyncData(() => fetchMyLeaveUsed(staffProfile.id), [staffProfile.id, refreshKey]);
  const { data: requests, loading: reqLoading } = useAsyncData(() => fetchMyLeaveRequests(staffProfile.id), [staffProfile.id, refreshKey]);

  const loading = entLoading || usedLoading;
  const remaining = loading ? null : Math.max(0, entitlement.annual_days - daysUsed);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.end_date < form.start_date) {
      setError('End date must be on or after the start date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createLeaveRequest({
        staff_id: staffProfile.id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
        status: 'pending',
      });
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(requestId) {
    if (!confirm('Cancel this leave request?')) return;
    await cancelLeaveRequest(requestId, staffProfile.id);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="account-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="hk-section-title">Leave &amp; Holidays</h3>

      {!loading && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.85rem' }}>
          Annual leave remaining: <strong style={{ color: 'var(--color-gold)' }}>{remaining} days</strong> (of {entitlement.annual_days})
        </p>
      )}

      {!showForm ? (
        <button className="modal-btn-primary" onClick={() => setShowForm(true)}>+ Request Leave</button>
      ) : (
        <form onSubmit={handleSubmit} className="modal-form" style={{ maxWidth: '420px', marginBottom: '1rem' }}>
          <label>
            Leave Type
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Start Date
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </label>
            <label>
              End Date
              <input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
          </div>
          <label>
            Reason (optional)
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      <h4 style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '1rem', marginBottom: '0.5rem' }}>My Requests</h4>
      <ul className="detail-list">
        {reqLoading ? (
          <li className="detail-list-empty">Loading...</li>
        ) : !requests || requests.length === 0 ? (
          <li className="detail-list-empty">No leave requests yet.</li>
        ) : (
          requests.map((r) => (
            <li key={r.id}>
              <span className="table-capitalize">{r.leave_type.replace('_', '/')} · {r.start_date} → {r.end_date}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: STATUS_COLORS[r.status], fontWeight: 600, fontSize: '0.75rem', textTransform: 'capitalize' }}>
                  {r.status}
                </span>
                {r.status === 'pending' && (
                  <button className="table-action-btn" onClick={() => handleCancel(r.id)}>Cancel</button>
                )}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}