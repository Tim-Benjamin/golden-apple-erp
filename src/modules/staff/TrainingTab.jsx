import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchAllTrainings, createTraining, deleteTraining, fetchExpiringCertifications } from './trainingService';
import { fetchStaff } from './staffService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';

export default function TrainingTab() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffFilter, setStaffFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staff_id: '', training_name: '', trainer: '', training_date: new Date().toISOString().slice(0, 10), score: '', expiry_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: staffList } = useAsyncData(fetchStaff, []);
  const { data: trainings, loading } = useAsyncData(() => fetchAllTrainings({ staffId: staffFilter }), [staffFilter, refreshKey]);
  const { data: expiring } = useAsyncData(() => fetchExpiringCertifications(30), [refreshKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.staff_id || !form.training_name) {
      setError('Please fill in staff member and training name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createTraining({
        staff_id: form.staff_id,
        training_name: form.training_name,
        trainer: form.trainer || null,
        training_date: form.training_date,
        score: form.score ? parseFloat(form.score) : null,
        expiry_date: form.expiry_date || null,
        created_by: staffProfile.id,
      });
      setForm({ staff_id: '', training_name: '', trainer: '', training_date: new Date().toISOString().slice(0, 10), score: '', expiry_date: '' });
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this training record?')) return;
    await deleteTraining(id, staffProfile.id);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      {expiring && expiring.length > 0 && (
        <div className="inventory-alert inventory-alert-expiry" style={{ marginBottom: '1.25rem' }}>
          ⚠ {expiring.length} certificate{expiring.length > 1 ? 's' : ''} expiring within 30 days:{' '}
          {expiring.map((e) => `${e.staff?.full_name} (${e.training_name})`).join(', ')}
        </div>
      )}

      <div className="page-header-row">
        <div />
        <button className="primary-btn" onClick={() => setShowForm(true)}>+ Record Training</button>
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
              <th>Training</th>
              <th>Trainer</th>
              <th>Date</th>
              <th>Score</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
            ) : trainings?.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No training records match this filter.</td></tr>
            ) : (
              trainings?.map((t) => (
                <tr key={t.id}>
                  <td>{t.staff?.full_name}</td>
                  <td>{t.training_name}</td>
                  <td>{t.trainer || '—'}</td>
                  <td>{t.training_date}</td>
                  <td>{t.score ?? '—'}</td>
                  <td>{t.expiry_date ?? '—'}</td>
                  <td>
                    <button className="table-action-btn" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDelete(t.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Training</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Staff Member
                <select required value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
                  <option value="">Select...</option>
                  {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </label>
              <label>
                Training Name
                <input required value={form.training_name} onChange={(e) => setForm({ ...form, training_name: e.target.value })} placeholder="e.g. Fire Safety" />
              </label>
              <label>
                Trainer (optional)
                <input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} />
              </label>
              <div className="form-grid">
                <label>
                  Training Date
                  <input type="date" required value={form.training_date} onChange={(e) => setForm({ ...form, training_date: e.target.value })} />
                </label>
                <label>
                  Score (optional)
                  <input type="number" step="0.1" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                </label>
              </div>
              <label>
                Certificate Expiry (optional)
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              </label>

              {error && <p className="modal-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="modal-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="modal-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Record Training'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}