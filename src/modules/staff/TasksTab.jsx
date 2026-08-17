import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchTasks, verifyTask, deleteTask } from './taskService';
import { fetchStaff } from './staffService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import NewTaskModal from './NewTaskModal';

const PRIORITY_COLORS = { low: '#6b6b6b', medium: '#a3872b', high: '#a8402f' };
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', verified: 'Verified' };

export default function TasksTab() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [assignedTo, setAssignedTo] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const { data: staffList } = useAsyncData(fetchStaff, []);
  const { data: tasks, loading } = useAsyncData(
    () => fetchTasks({ assignedTo, status, priority }),
    [assignedTo, status, priority, refreshKey]
  );

  async function handleVerify(taskId) {
    await verifyTask(taskId, staffProfile.id);
    setRefreshKey((k) => k + 1);
  }

  async function handleDelete(taskId) {
    if (!confirm('Remove this task?')) return;
    await deleteTask(taskId, staffProfile.id);
    setRefreshKey((k) => k + 1);
  }

  const now = new Date();

  return (
    <div>
      <div className="page-header-row">
        <div />
        <button className="primary-btn" onClick={() => setShowNewModal(true)}>+ New Task</button>
      </div>

      <div className="res-filter-bar">
        <select className="res-filter-select" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="all">All Staff</option>
          {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select className="res-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="verified">Verified</option>
        </select>
        <select className="res-filter-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
            ) : tasks?.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">No tasks match these filters.</td></tr>
            ) : (
              tasks?.map((t) => {
                const isOverdue = t.due_at && new Date(t.due_at) < now && !['completed', 'verified'].includes(t.status);
                return (
                  <tr key={t.id}>
                    <td>
                      <div>{t.title}</div>
                      {t.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.description}</div>}
                    </td>
                    <td>{t.assignee?.full_name}</td>
                    <td>
                      <span style={{ color: PRIORITY_COLORS[t.priority], fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ color: isOverdue ? 'var(--color-danger)' : undefined }}>
                      {t.due_at ? new Date(t.due_at).toLocaleString() : '—'}
                      {isOverdue && ' (Overdue)'}
                    </td>
                    <td>{STATUS_LABELS[t.status]}</td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      {t.status === 'completed' && (
                        <button className="table-action-btn" onClick={() => handleVerify(t.id)}>Verify</button>
                      )}
                      <button
                        className="table-action-btn"
                        style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        onClick={() => handleDelete(t.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <NewTaskModal onClose={() => setShowNewModal(false)} onCreated={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}