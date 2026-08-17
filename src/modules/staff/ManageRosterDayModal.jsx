import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchShiftTypes, fetchRosterForMonth, createRosterEntry, deleteRosterEntry, markUnavailable } from './rosterService';
import { fetchStaff } from './staffService';

export default function ManageRosterDayModal({ dateISO, isAdmin, onClose, onChanged }) {
  const { staffProfile } = useAuth();
  const [year, month] = dateISO.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)));

  const [refreshKey, setRefreshKey] = useState(0);
  const { data: allEntries, loading } = useAsyncData(() => fetchRosterForMonth(year, month), [year, month, refreshKey]);
  const { data: shiftTypes } = useAsyncData(fetchShiftTypes, []);
  const { data: staffList } = useAsyncData(fetchStaff, []);

  const dayEntries = allEntries?.filter((e) => e.work_date === dateISO) ?? [];
  const myEntries = dayEntries.filter((e) => e.staff_id === staffProfile.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ staff_id: '', shift_type_id: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!newEntry.staff_id || !newEntry.shift_type_id) {
      setError('Please select both a staff member and a shift.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createRosterEntry({
        staff_id: newEntry.staff_id,
        shift_type_id: newEntry.shift_type_id,
        work_date: dateISO,
        status: 'scheduled',
        created_by: staffProfile.id,
      });
      setNewEntry({ staff_id: '', shift_type_id: '' });
      setShowAddForm(false);
      setRefreshKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setError(err.code === '23505' ? 'This staff member is already scheduled for that shift on this day.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkMyselfUnavailable(shiftTypeId) {
    setBusy(true);
    setError('');
    try {
      await markUnavailable(staffProfile.id, dateISO, shiftTypeId, staffProfile.id, 'Marked unavailable by staff');
      setRefreshKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(entryId) {
    setBusy(true);
    try {
      await deleteRosterEntry(entryId, staffProfile.id);
      setRefreshKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const formattedDate = new Date(`${dateISO}T00:00:00`).toLocaleDateString('default', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const visibleEntries = isAdmin ? dayEntries : myEntries;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{formattedDate}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        ) : (
          <>
            <ul className="duty-list">
              {visibleEntries.length === 0 && <li className="detail-list-empty">No shifts scheduled for this day.</li>}
              {visibleEntries.map((e) => (
                <li key={e.id} className="duty-list-item">
                  <div className="duty-list-main">
                    <span className={`duty-status-dot ${e.status === 'unavailable' ? 'duty-status-pending' : 'duty-status-done'}`} />
                    <div>
                      <div className="duty-list-area">
                        {e.shift?.name} ({e.shift?.start_time?.slice(0, 5)}–{e.shift?.end_time?.slice(0, 5)})
                        {isAdmin && <span className="duty-list-housekeeper"> — {e.staff?.full_name}</span>}
                        {e.status === 'unavailable' && <span style={{ color: 'var(--color-danger)' }}> · Unavailable</span>}
                      </div>
                      {e.notes && <div className="duty-list-notes">{e.notes}</div>}
                    </div>
                  </div>

                  <div className="duty-list-actions">
                    {!isAdmin && e.staff_id === staffProfile.id && e.status === 'scheduled' && (
                      <button className="table-action-btn" disabled={busy} onClick={() => handleMarkMyselfUnavailable(e.shift_type_id)}>
                        Mark Unavailable
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="table-action-btn"
                        style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        disabled={busy}
                        onClick={() => handleDelete(e.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {isAdmin && (
              <>
                {!showAddForm ? (
                  <button className="modal-btn-secondary" onClick={() => setShowAddForm(true)} style={{ marginTop: '0.75rem' }}>
                    + Assign Shift
                  </button>
                ) : (
                  <form onSubmit={handleAdd} className="modal-form" style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <label>
                      Staff Member
                      <select value={newEntry.staff_id} onChange={(e) => setNewEntry({ ...newEntry, staff_id: e.target.value })}>
                        <option value="">Select...</option>
                        {staffList?.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                      </select>
                    </label>
                    <label>
                      Shift
                      <select value={newEntry.shift_type_id} onChange={(e) => setNewEntry({ ...newEntry, shift_type_id: e.target.value })}>
                        <option value="">Select...</option>
                        {shiftTypes?.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)})</option>
                        ))}
                      </select>
                    </label>
                    <div className="modal-actions">
                      <button type="button" className="modal-btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                      <button type="submit" className="modal-btn-primary" disabled={busy}>
                        {busy ? 'Assigning...' : 'Assign Shift'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </>
        )}

        {error && <p className="modal-error">{error}</p>}
      </div>
    </div>
  );
}