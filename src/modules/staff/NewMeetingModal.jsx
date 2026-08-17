import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchStaff } from './staffService';
import { createMeeting } from './meetingService';

const MEETING_TYPES = [
  { value: 'management', label: 'Management Meeting' },
  { value: 'weekly_staff', label: 'Weekly Staff Meeting' },
  { value: 'department', label: 'Department Meeting' },
  { value: 'training', label: 'Training Meeting' },
];

export default function NewMeetingModal({ onClose, onCreated }) {
  const { staffProfile } = useAuth();
  const { data: staffList } = useAsyncData(fetchStaff, []);
  const [form, setForm] = useState({
    title: '',
    meeting_type: 'weekly_staff',
    meeting_date: new Date().toISOString().slice(0, 10),
    agenda: '',
  });
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleAttendee(staffId) {
    setSelectedAttendees((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const meeting = await createMeeting(
        { ...form, created_by: staffProfile.id },
        selectedAttendees
      );
      onCreated(meeting);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Meeting</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Title
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <div className="form-grid">
            <label>
              Type
              <select value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}>
                {MEETING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label>
              Date
              <input type="date" required value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} />
            </label>
          </div>
          <label>
            Agenda (optional)
            <textarea
              rows={3}
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </label>

          <label>Attendees</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto', padding: '0.5rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
            {staffList?.filter((s) => s.is_active).map((s) => (
              <label key={s.id} className="checklist-item" style={{ fontSize: '0.8rem' }}>
                <input type="checkbox" checked={selectedAttendees.includes(s.id)} onChange={() => toggleAttendee(s.id)} />
                {s.full_name}
              </label>
            ))}
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}