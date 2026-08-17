import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchHousekeepers, createDutiesForDateRange } from './housekeepingService';
import { fetchRooms } from '../rooms/roomsService';

const DUTY_AREA_PRESETS = [
  'Room Cleaning', 'Lobby', 'Reception', 'Corridors', 'Garden', 'Parking Area', 'Kitchen',
  'Dining Area', 'Laundry Room', 'Staff Quarters', 'Compound / Surroundings', 'Storage Area',
];

export default function BulkScheduleDutiesModal({ onClose, onScheduled }) {
  const { staffProfile } = useAuth();
  const { data: housekeepers } = useAsyncData(fetchHousekeepers, []);
  const { data: rooms } = useAsyncData(fetchRooms, []);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    housekeeper_id: '',
    duty_area: DUTY_AREA_PRESETS[0],
    room_id: '',
    start_date: today,
    end_date: today,
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const isRoomCleaning = form.duty_area === 'Room Cleaning';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.housekeeper_id) {
      setError('Please select a housekeeper.');
      return;
    }
    if (isRoomCleaning && !form.room_id) {
      setError('Please select a room for a Room Cleaning duty.');
      return;
    }
    if (form.end_date < form.start_date) {
      setError('End date must be on or after the start date.');
      return;
    }

    setBusy(true);
    try {
      const created = await createDutiesForDateRange({
        housekeeperId: form.housekeeper_id,
        dutyArea: form.duty_area,
        roomId: isRoomCleaning ? form.room_id : null,
        notes: form.notes,
        startDate: form.start_date,
        endDate: form.end_date,
        createdBy: staffProfile.id,
      });
      setSuccess(created.length);
      onScheduled();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bulk Schedule Duties</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {success !== null ? (
          <div>
            <p style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
              Scheduled {success} day{success !== 1 ? 's' : ''} successfully.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-0.4rem' }}>
              Schedules the same duty across every day in the range — use this for a whole month,
              a week, or any multi-day assignment instead of adding one day at a time.
            </p>

            <label>
              Housekeeper
              <select required value={form.housekeeper_id} onChange={(e) => setForm({ ...form, housekeeper_id: e.target.value })}>
                <option value="">Select...</option>
                {housekeepers?.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
              </select>
            </label>

            <label>
              Duty Area
              <select value={form.duty_area} onChange={(e) => setForm({ ...form, duty_area: e.target.value, room_id: '' })}>
                {DUTY_AREA_PRESETS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>

            {isRoomCleaning && (
              <label>
                Room
                <select required value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
                  <option value="">Select a room...</option>
                  {rooms?.map((r) => <option key={r.id} value={r.id}>{r.room_number}</option>)}
                </select>
              </label>
            )}

            <label>
              Start Date
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </label>

            <label>
              End Date
              <input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>

            <label>
              Notes (optional)
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>

            {error && <p className="modal-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="modal-btn-primary" disabled={busy}>
                {busy ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}