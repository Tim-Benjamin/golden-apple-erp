import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchStaff, updateStaffRole, toggleStaffActive } from './staffService';
import { fetchStaffStats } from './employeeProfileService';
import { logActivity } from '../../lib/activityLog';
import { useAuth } from '../../context/AuthContext';
import { ALL_ROLES, ROLE_LABELS } from '../../config/roles';
import { StatCardSkeleton, ChartCardSkeleton, TableRowSkeleton } from '../../components/shared/Skeleton';
import RoleBreakdownChart from './RoleBreakdownChart';
import AddStaffModal from './AddStaffModal';
import EmployeeProfileModal from './EmployeeProfileModal';
import RosterCalendar from './RosterCalendar';
import AttendanceTab from './AttendanceTab';
import TasksTab from './TasksTab';
import ChecklistsTab from './ChecklistsTab';
import './StaffManagementPage.css';
import LeaveTab from './LeaveTab';
import DocumentsTab from './DocumentsTab';
import TrainingTab from './TrainingTab';
import MeetingsTab from './MeetingsTab';
import DisciplinaryTab from './DisciplinaryTab';

const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'employees', label: 'Employees' },
    { key: 'roster', label: 'Roster' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'checklists', label: 'Checklists' },
    { key: 'leave', label: 'Leave' },
    // { key: 'documents', label: 'Documents' },
    { key: 'training', label: 'Training' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'disciplinary', label: 'Disciplinary' },
];

export default function StaffManagementPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div>
            <h1 className="page-title">Staff Management</h1>
            <p className="page-subtitle">Employee directory, profiles, and workforce overview</p>

            <div className="hk-tabs">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        className={`hk-tab ${activeTab === t.key ? 'hk-tab-active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && <OverviewTab refreshKey={refreshKey} />}
            {activeTab === 'employees' && <EmployeesTab refreshKey={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />}
            {activeTab === 'roster' && <RosterCalendar />}
            {activeTab === 'attendance' && <AttendanceTab />}
            {activeTab === 'tasks' && <TasksTab />}
            {activeTab === 'checklists' && <ChecklistsTab />}
            {activeTab === 'leave' && <LeaveTab />}
            {/* {activeTab === 'documents' && <DocumentsTab />} */}
            {activeTab === 'training' && <TrainingTab />}
            {activeTab === 'meetings' && <MeetingsTab />}
            {activeTab === 'disciplinary' && <DisciplinaryTab />}
        </div>
    );
}

function OverviewTab({ refreshKey }) {
    const { data: stats, loading } = useAsyncData(fetchStaffStats, [refreshKey]);
    const { data: staff, loading: staffLoading } = useAsyncData(fetchStaff, [refreshKey]);

    const recentlyAdded = staff
        ?.slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    return (
        <div>
            <div className="stat-grid">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        <StatCard label="Total Staff" value={stats.total} />
                        <StatCard label="Active Staff" value={stats.active} accent="success" />
                        <StatCard label="Inactive Staff" value={stats.inactive} accent="muted" />
                    </>
                )}
            </div>

            <div className="chart-grid" style={{ marginTop: '1.5rem' }}>
                {loading ? (
                    <ChartCardSkeleton />
                ) : (
                    <div className="chart-card">
                        <div className="chart-card-title">Staff by Role</div>
                        {stats.byRole.length === 0 ? (
                            <p className="chart-empty-note">No staff yet.</p>
                        ) : (
                            <RoleBreakdownChart data={stats.byRole} />
                        )}
                    </div>
                )}

                <div className="chart-card">
                    <div className="chart-card-title">Recently Added</div>
                    <ul className="detail-list">
                        {staffLoading ? (
                            <li className="detail-list-empty">Loading...</li>
                        ) : recentlyAdded?.length === 0 ? (
                            <li className="detail-list-empty">No staff yet.</li>
                        ) : (
                            recentlyAdded?.map((s) => (
                                <li key={s.id}>
                                    <span>{s.full_name}</span>
                                    <span className="detail-list-date table-capitalize">{ROLE_LABELS[s.role] ?? s.role.replace('_', ' ')}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            <div className="staff-coming-soon">
                <h3 className="hk-section-title">Coming Next</h3>
                <p>
                    Leave balances, task completion rates, and performance scores will appear here once the
                    Tasks, Leave, and Performance sections are built — planned as the next phases of Staff Management.
                </p>
            </div>
        </div>
    );
}

function EmployeesTab({ refreshKey, onRefresh }) {
    const { staffProfile } = useAuth();
    const { data: staff, loading } = useAsyncData(fetchStaff, [refreshKey]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    async function handleRoleChange(staffId, newRole) {
        await updateStaffRole(staffId, newRole);
        logActivity({
            actorId: staffProfile.id,
            action: 'staff_role_changed',
            entityTable: 'staff',
            entityId: staffId,
            details: { new_role: newRole },
        });
        onRefresh();
    }

    async function handleToggleActive(staffId, currentlyActive) {
        await toggleStaffActive(staffId, !currentlyActive);
        logActivity({
            actorId: staffProfile.id,
            action: 'staff_status_changed',
            entityTable: 'staff',
            entityId: staffId,
            details: { active: !currentlyActive },
        });
        onRefresh();
    }

    const filtered = staff?.filter((s) => {
        if (roleFilter !== 'all' && s.role !== roleFilter) return false;
        if (statusFilter !== 'all' && (statusFilter === 'active') !== s.is_active) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!s.full_name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q) && !s.staff_code?.toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    });

    return (
        <div>
            <div className="page-header-row">
                <div />
                <button className="primary-btn" onClick={() => setShowAddModal(true)}>+ Add Staff</button>
            </div>

            <div className="res-filter-bar">
                <input
                    type="text"
                    className="res-filter-search"
                    placeholder="Search name, email, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className="res-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="all">All Roles</option>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <select className="res-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                        ) : filtered?.length === 0 ? (
                            <tr><td colSpan={7} className="table-empty">No staff match these filters.</td></tr>
                        ) : (
                            filtered?.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="staff-row-avatar">
                                            {s.avatar_url ? (
                                                <img src={s.avatar_url} alt={s.full_name} />
                                            ) : (
                                                <span>{s.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{s.staff_code}</td>
                                    <td>{s.full_name}</td>
                                    <td>{s.email}</td>
                                    <td>
                                        <select className="staff-role-select" value={s.role} onChange={(e) => handleRoleChange(s.id, e.target.value)}>
                                            {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <span className={s.is_active ? 'staff-status-active' : 'staff-status-inactive'}>
                                            {s.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button className="table-action-btn" onClick={() => setSelectedStaffId(s.id)}>Profile</button>
                                        <button className="table-action-btn" onClick={() => handleToggleActive(s.id, s.is_active)}>
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
                <AddStaffModal onClose={() => setShowAddModal(false)} onCreated={onRefresh} />
            )}

            {selectedStaffId && (
                <EmployeeProfileModal
                    staffId={selectedStaffId}
                    onClose={() => setSelectedStaffId(null)}
                    onUpdated={onRefresh}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, accent = 'gold' }) {
    const colorMap = {
        gold: 'var(--color-gold)',
        success: 'var(--color-success)',
        muted: 'var(--color-text-secondary)',
    };
    return (
        <div className="stat-card">
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value" style={{ color: colorMap[accent] }}>{value}</div>
        </div>
    );
}