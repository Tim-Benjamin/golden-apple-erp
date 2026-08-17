import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchMyTasks, updateTaskStatus } from './taskService';

const PRIORITY_COLORS = { low: '#6b6b6b', medium: '#a3872b', high: '#a8402f' };

export default function MyTasksWidget() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: tasks, loading } = useAsyncData(() => fetchMyTasks(staffProfile.id), [staffProfile.id, refreshKey]);
  const [busyId, setBusyId] = useState(null);

  async function handleAdvance(task) {
    const nextStatus = task.status === 'pending' ? 'in_progress' : 'completed';
    setBusyId(task.id);
    try {
      await updateTaskStatus(task.id, nextStatus, staffProfile.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return null;

  return (
    <div className="account-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="hk-section-title">My Tasks {tasks.length > 0 && `(${tasks.length})`}</h3>
      {tasks.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No open tasks right now.</p>
      ) : (
        <ul className="detail-list">
          {tasks.map((t) => (
            <li key={t.id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{t.title}</strong>
                  <span style={{ color: PRIORITY_COLORS[t.priority], fontSize: '0.7rem', marginLeft: '0.5rem', textTransform: 'capitalize' }}>
                    {t.priority}
                  </span>
                </div>
                <button className="table-action-btn" disabled={busyId === t.id} onClick={() => handleAdvance(t)}>
                  {t.status === 'pending' ? 'Start' : 'Mark Complete'}
                </button>
              </div>
              {t.description && <div className="duty-list-notes">{t.description}</div>}
              {t.due_at && (
                <div className="detail-list-date" style={{ marginRight: 0 }}>
                  Due {new Date(t.due_at).toLocaleString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}