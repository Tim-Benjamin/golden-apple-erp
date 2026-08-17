import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchAllLeaveRequests, reviewLeaveRequest } from './leaveService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';

const STATUS_COLORS = {
  pending: 'var(--color-gold-muted)',
  approved: 'var(--color-success)',
  rejected: 'var(--color-danger)',
  cancelled: 'var(--color-text-muted)',
};

export default function LeaveTab() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: requests, loading } = useAsyncData(
    () => fetchAllLeaveRequests({ status: statusFilter }),
    [statusFilter, refreshKey]
  );

  async function handleReview(requestId, decision) {
    setBusy(true);
    try {
      await reviewLeaveRequest(requestId, decision, staffProfile.id, reviewNotes);
      setReviewingId(null);
      setReviewNotes('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  function daysBetween(start, end) {
    return Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <div>
      <div className="res-filter-bar">
        <select className="res-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
            ) : requests?.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No leave requests match this filter.</td></tr>
            ) : (
              requests?.map((r) => (
                <>
                  <tr key={r.id}>
                    <td>{r.staff?.full_name}</td>
                    <td className="table-capitalize">{r.leave_type.replace('_', '/')}</td>
                    <td>{r.start_date} → {r.end_date}</td>
                    <td>{daysBetween(r.start_date, r.end_date)}</td>
                    <td>{r.reason || '—'}</td>
                    <td>
                      <span style={{ color: STATUS_COLORS[r.status], fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <button className="table-action-btn" onClick={() => setReviewingId(reviewingId === r.id ? null : r.id)}>
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                  {reviewingId === r.id && (
                    <tr key={`${r.id}-review`}>
                      <td colSpan={7} style={{ background: 'var(--color-bg)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            style={{ flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.7rem', color: 'var(--color-text-primary)', fontSize: '0.82rem' }}
                          />
                          <button className="modal-btn-primary" disabled={busy} onClick={() => handleReview(r.id, 'approved')}>Approve</button>
                          <button className="modal-btn-secondary" disabled={busy} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleReview(r.id, 'rejected')}>Reject</button>
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
    </div>
  );
}