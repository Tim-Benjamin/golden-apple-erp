import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchHousekeepers, createDuty, deleteDuty, completeDuty, fetchDutiesForMonth } from './housekeepingService';
import { fetchRooms } from '../rooms/roomsService';
import './ManageDayDutiesModal.css';

const DUTY_AREA_PRESETS = [
  'Room Cleaning', 'Lobby', 'Reception', 'Corridors', 'Garden', 'Parking Area', 'Kitchen',
  'Dining Area', 'Laundry Room', 'Staff Quarters', 'Compound / Surroundings', 'Storage Area',
];

export default function ManageDayDutiesModal({ dateISO, isAdmin, onClose, onChanged }) {
  const { staffProfile } = useAuth();
  const [year, month] = dateISO.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)));

  const [refreshKey, setRefreshKey] = useState(0);
  const { data: allDuties, loading } = useAsyncData(() => fetchDutiesForMonth(year, month), [year, month, refreshKey]);
  const { data: housekeepers } = useAsyncData(fetchHousekeepers, []);
  const { data: rooms } = useAsyncData(fetchRooms, []);

  const dayDuties = allDuties?.filter((d) => d.duty_date === dateISO) ?? [];
  const myDuties = dayDuties.filter((d) => d.housekeeper_id === staffProfile.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDuty, setNewDuty] = useState({ housekeeper_id: '', duty_area: DUTY_AREA_PRESETS[0], room_id: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const isRoomCleaning = newDuty.duty_area === 'Room Cleaning';

  async function handleAddDuty(e) {
    e.preventDefault();
    if (!newDuty.housekeeper_id) {
      setError('Please select a housekeeper.');
      return;
    }
    if (isRoomCleaning && !newDuty.room_id) {
      setError('Please select a room for a Room Cleaning duty.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createDuty({
        housekeeper_id: newDuty.housekeeper_id,
        duty_date: dateISO,
        duty_area: newDuty.duty_area,
        room_id: isRoomCleaning ? newDuty.room_id : null,
        notes: newDuty.notes || null,
        status: 'scheduled',
        created_by: staffProfile.id,
      });
      setNewDuty({ housekeeper_id: '', duty_area: DUTY_AREA_PRESETS[0], room_id: '', notes: '' });
      setShowAddForm(false);
      setRefreshKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(dutyId) {
    setBusy(true);
    try {
      await deleteDuty(dutyId, staffProfile.id);
      setRefreshKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete(dutyId) {
    setBusy(true);
    setError('');
    try {
      await completeDuty(dutyId, completionNotes, staffProfile.id);
      setCompletingId(null);
      setCompletionNotes('');
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

  const visibleDuties = isAdmin ? dayDuties : myDuties;

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
              {visibleDuties.length === 0 && (
                <li className="detail-list-empty">No duties scheduled for this day.</li>
              )}
              {visibleDuties.map((d) => (
                <li key={d.id} className="duty-list-item">
                  <div className="duty-list-main">
                    <span className={`duty-status-dot ${d.status === 'completed' ? 'duty-status-done' : 'duty-status-pending'}`} />
                    <div>
                      <div className="duty-list-area">
                        {d.room?.room_number ? `${d.duty_area} (${d.room.room_number})` : d.duty_area}
                        {isAdmin && <span className="duty-list-housekeeper"> — {d.housekeeper?.full_name}</span>}
                      </div>
                      {d.notes && <div className="duty-list-notes">{d.notes}</div>}
                      {d.status === 'completed' && (
                        <div className="duty-list-completed-meta">
                          Completed {new Date(d.completed_at).toLocaleString()}
                          {d.completion_notes ? ` — "${d.completion_notes}"` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="duty-list-actions">
                    {d.status === 'scheduled' && d.housekeeper_id === staffProfile.id && (
                      completingId === d.id ? (
                        <div className="duty-complete-form">
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                          />
                          <button className="modal-btn-primary" disabled={busy} onClick={() => handleComplete(d.id)}>
                            Confirm Done
                          </button>
                          <button className="modal-btn-secondary" onClick={() => setCompletingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="table-action-btn" onClick={() => setCompletingId(d.id)}>
                          ✓ Mark Done
                        </button>
                      )
                    )}
                    {isAdmin && d.status === 'scheduled' && (
                      <button
                        className="table-action-btn"
                        style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        disabled={busy}
                        onClick={() => handleDelete(d.id)}
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
                    + Schedule a Duty
                  </button>
                ) : (
                  <form onSubmit={handleAddDuty} className="modal-form" style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <label>
                      Housekeeper
                      <select value={newDuty.housekeeper_id} onChange={(e) => setNewDuty({ ...newDuty, housekeeper_id: e.target.value })}>
                        <option value="">Select...</option>
                        {housekeepers?.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
                      </select>
                    </label>
                    <label>
                      Duty Area
                      <select value={newDuty.duty_area} onChange={(e) => setNewDuty({ ...newDuty, duty_area: e.target.value, room_id: '' })}>
                        {DUTY_AREA_PRESETS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>
                    {isRoomCleaning && (
                      <label>
                        Room
                        <select value={newDuty.room_id} onChange={(e) => setNewDuty({ ...newDuty, room_id: e.target.value })}>
                          <option value="">Select a room...</option>
                          {rooms?.map((r) => <option key={r.id} value={r.id}>{r.room_number}</option>)}
                        </select>
                      </label>
                    )}
                    <label>
                      Notes (optional)
                      <input value={newDuty.notes} onChange={(e) => setNewDuty({ ...newDuty, notes: e.target.value })} />
                    </label>
                    <div className="modal-actions">
                      <button type="button" className="modal-btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                      <button type="submit" className="modal-btn-primary" disabled={busy}>
                        {busy ? 'Scheduling...' : 'Schedule Duty'}
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