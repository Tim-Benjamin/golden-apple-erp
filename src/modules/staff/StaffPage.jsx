import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchStaff, updateStaffRole, toggleStaffActive } from './staffService';
import { ALL_ROLES, ROLE_LABELS } from '../../config/roles';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import AddStaffModal from './AddStaffModal';
import './StaffPage.css';

export default function StaffPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: staff, loading } = useAsyncData(fetchStaff, [refreshKey]);
  const [showAddModal, setShowAddModal] = useState(false);

  async function handleRoleChange(staffId, newRole) {
    await updateStaffRole(staffId, newRole);
    setRefreshKey((k) => k + 1);
  }

  async function handleToggleActive(staffId, currentlyActive) {
    await toggleStaffActive(staffId, !currentlyActive);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">Manage accounts, roles, and access</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
          + Add Staff
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : staff?.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No staff members yet.</td></tr>
            ) : (
              staff?.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name}</td>
                  <td>{s.email}</td>
                  <td>
                    <select
                      className="staff-role-select"
                      value={s.role}
                      onChange={(e) => handleRoleChange(s.id, e.target.value)}
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={s.is_active ? 'staff-status-active' : 'staff-status-inactive'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="table-action-btn"
                      onClick={() => handleToggleActive(s.id, s.is_active)}
                    >
                      {s.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}