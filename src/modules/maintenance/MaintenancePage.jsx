import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchMaintenanceRequests, fetchMaintenanceOfficers, assignMaintenanceRequest, completeMaintenanceRequest } from './maintenanceService';
import { fetchRooms } from '../rooms/roomsService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import NewMaintenanceModal from './NewMaintenanceModal';
import { logActivity } from '../../lib/activityLog';
import './MaintenancePage.css';

const PRIORITY_COLORS = { low: '#6b6b6b', medium: '#a3872b', high: '#d4af37', urgent: '#a8402f' };

export default function MaintenancePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: requests, loading } = useAsyncData(fetchMaintenanceRequests, [refreshKey]);
  const { data: officers } = useAsyncData(fetchMaintenanceOfficers, [refreshKey]);
  const { data: rooms } = useAsyncData(fetchRooms, [refreshKey]);
  const [showNewModal, setShowNewModal] = useState(false);

  async function handleAssign(requestId, staffId) {
    if (!staffId) return;
    await assignMaintenanceRequest(requestId, staffId);
    setRefreshKey((k) => k + 1);
  }

  async function handleComplete(requestId) {
    const cost = prompt('Enter cost of repair (GH₵), or leave blank for 0:');
    await completeMaintenanceRequest(requestId, cost ? parseFloat(cost) : 0);
    setRefreshKey((k) => k + 1);
  }

  const openRequests = requests?.filter((r) => r.status !== 'completed' && r.status !== 'cancelled') ?? [];
  const closedRequests = requests?.filter((r) => r.status === 'completed' || r.status === 'cancelled') ?? [];

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Open jobs and repair history</p>
        </div>
        <button className="primary-btn" onClick={() => setShowNewModal(true)}>
          + New Request
        </button>
      </div>

      <h3 className="hk-section-title">Open Jobs {!loading && `(${openRequests.length})`}</h3>
      <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Description</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
            ) : openRequests.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No open maintenance jobs.</td></tr>
            ) : (
              openRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.room?.room_number ?? 'General'}</td>
                  <td className="table-capitalize">{r.category.replace('_', ' ')}</td>
                  <td>
                    <span style={{ color: PRIORITY_COLORS[r.priority], fontWeight: 600, textTransform: 'capitalize', fontSize: '0.8rem' }}>
                      {r.priority}
                    </span>
                  </td>
                  <td style={{ maxWidth: '220px' }}>{r.description}</td>
                  <td>
                    {r.assigned?.full_name ?? (
                      <select
                        className="staff-role-select"
                        defaultValue=""
                        onChange={(e) => handleAssign(r.id, e.target.value)}
                      >
                        <option value="" disabled>Assign...</option>
                        {officers?.map((o) => (
                          <option key={o.id} value={o.id}>{o.full_name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="table-capitalize">{r.status.replace('_', ' ')}</td>
                  <td>
                    {r.status === 'in_progress' && (
                      <button className="table-action-btn" onClick={() => handleComplete(r.id)}>
                        Mark Done
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="hk-section-title">History</h3>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Category</th>
              <th>Description</th>
              <th>Cost</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {closedRequests.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No completed jobs yet.</td></tr>
            ) : (
              closedRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.room?.room_number ?? 'General'}</td>
                  <td className="table-capitalize">{r.category.replace('_', ' ')}</td>
                  <td style={{ maxWidth: '220px' }}>{r.description}</td>
                  <td>{r.cost ? `GH₵${Number(r.cost).toFixed(2)}` : '—'}</td>
                  <td>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && rooms && (
        <NewMaintenanceModal
          rooms={rooms}
          maintenanceOfficers={officers ?? []}
          onClose={() => setShowNewModal(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}