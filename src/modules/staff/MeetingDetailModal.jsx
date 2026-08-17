import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchStaff } from './staffService';
import {
  fetchMeetingDetail,
  updateMeetingNotes,
  toggleAttendance,
  createActionItem,
  markActionItemDone,
  convertActionItemToTask,
} from './meetingService';

export default function MeetingDetailModal({ meetingId, onClose, onUpdated }) {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: meeting, loading } = useAsyncData(() => fetchMeetingDetail(meetingId), [meetingId, refreshKey]);
  const { data: staffList } = useAsyncData(fetchStaff, []);

  const [minutes, setMinutes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ description: '', assigned_to: '', due_date: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading || !meeting) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateMeetingNotes(meetingId, {
        minutes: minutes || meeting.minutes,
        decisions: decisions || meeting.decisions,
      });
      setRefreshKey((k) => k + 1);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleToggleAttendance(attendeeRowId, current) {
    await toggleAttendance(attendeeRowId, !current);
    setRefreshKey((k) => k + 1);
  }

  async function handleAddActionItem(e) {
    e.preventDefault();
    if (!actionForm.description) return;
    setBusy(true);
    setError('');
    try {
      await createActionItem(meetingId, {
        description: actionForm.description,
        assigned_to: actionForm.assigned_to || null,
        due_date: actionForm.due_date || null,
      });
      setActionForm({ description: '', assigned_to: '', due_date: '' });
      setShowActionForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert(item) {
    setBusy(true);
    setError('');
    try {
      await convertActionItemToTask(item, meeting.title, staffProfile.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkDone(itemId) {
    setBusy(true);
    try {
      await markActionItemDone(itemId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{meeting.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          {meeting.meeting_date} · <span className="table-capitalize">{meeting.meeting_type.replace('_', ' ')}</span>
        </p>

        {meeting.agenda && (
          <div className="detail-section">
            <h3>Agenda</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{meeting.agenda}</p>
          </div>
        )}

        <div className="detail-section">
          <h3>Attendees</h3>
          <ul className="detail-list">
            {meeting.attendees.length === 0 ? (
              <li className="detail-list-empty">No attendees recorded.</li>
            ) : (
              meeting.attendees.map((a) => (
                <li key={a.id}>
                  <span>{a.staff?.full_name}</span>
                  <button
                    className="table-action-btn"
                    onClick={() => handleToggleAttendance(a.id, a.attended)}
                    style={{ color: a.attended ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                  >
                    {a.attended ? 'Present' : 'Absent'}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="detail-section">
          <h3>Minutes</h3>
          <textarea
            rows={3}
            placeholder="Meeting minutes..."
            defaultValue={meeting.minutes ?? ''}
            onChange={(e) => setMinutes(e.target.value)}
            style={{ width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical', marginBottom: '0.5rem' }}
          />
          <h3>Decisions</h3>
          <textarea
            rows={2}
            placeholder="Key decisions made..."
            defaultValue={meeting.decisions ?? ''}
            onChange={(e) => setDecisions(e.target.value)}
            style={{ width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
          />
          <button className="modal-btn-secondary" onClick={handleSaveNotes} disabled={savingNotes} style={{ marginTop: '0.5rem' }}>
            {savingNotes ? 'Saving...' : 'Save Minutes & Decisions'}
          </button>
        </div>

        <div className="detail-section">
          <h3>Action Items</h3>
          <ul className="detail-list">
            {meeting.actionItems.length === 0 ? (
              <li className="detail-list-empty">No action items yet.</li>
            ) : (
              meeting.actionItems.map((item) => (
                <li key={item.id} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>
                      {item.description}
                      {item.assignee && <span style={{ color: 'var(--color-text-muted)' }}> — {item.assignee.full_name}</span>}
                      {item.due_date && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}> (due {item.due_date})</span>}
                    </span>
                    <span style={{ display: 'flex', gap: '0.4rem' }}>
                      {item.status === 'open' && (
                        <>
                          <button className="table-action-btn" disabled={busy} onClick={() => handleConvert(item)}>Convert to Task</button>
                          <button className="table-action-btn" disabled={busy} onClick={() => handleMarkDone(item.id)}>Mark Done</button>
                        </>
                      )}
                      {item.status === 'converted' && <span style={{ color: 'var(--color-gold)', fontSize: '0.75rem' }}>→ Task Created</span>}
                      {item.status === 'done' && <span style={{ color: 'var(--color-success)', fontSize: '0.75rem' }}>✓ Done</span>}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>

          {!showActionForm ? (
            <button className="modal-btn-secondary" onClick={() => setShowActionForm(true)} style={{ marginTop: '0.5rem' }}>
              + Add Action Item
            </button>
          ) : (
            <form onSubmit={handleAddActionItem} className="inline-form" style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="Action item description"
                required
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                style={{ flex: 2, minWidth: '160px' }}
              />
              <select value={actionForm.assigned_to} onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <input type="date" value={actionForm.due_date} onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })} />
              <button type="submit" disabled={busy}>Add</button>
            </form>
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}
      </div>
    </div>
  );
}