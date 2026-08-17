import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  fetchAllRoomsForHousekeeping,
  fetchHousekeepers,
  fetchCompletedDutiesLog,
} from './housekeepingService';
import StatusBadge from '../../components/shared/StatusBadge';
import { RoomCardSkeleton, TableRowSkeleton } from '../../components/shared/Skeleton';
import CleaningChecklistModal from './CleaningChecklistModal';
import AssignHousekeeperControl from './AssignHousekeeperControl';
import DutyScheduleCalendar from './DutyScheduleCalendar';
import { exportToCSV } from '../../lib/csvExport';
import './HousekeepingPage.css';

const ADMIN_ROLES = ['super_admin', 'general_manager', 'assistant_manager'];
const TABS = [
  { key: 'rooms', label: 'Room Cleaning' },
  { key: 'schedule', label: 'Duty Schedule' },
  { key: 'log', label: 'Completed Log' },
];

export default function HousekeepingPage() {
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => t.key !== 'log');

  const [activeTab, setActiveTab] = useState('rooms');

  return (
    <div>
      <h1 className="page-title">Housekeeping</h1>
      <p className="page-subtitle">Manage room cleaning, duty scheduling, and completed work</p>

      <div className="hk-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            className={`hk-tab ${activeTab === t.key ? 'hk-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'rooms' && <RoomCleaningTab />}
      {activeTab === 'schedule' && <DutyScheduleCalendar />}
      {activeTab === 'log' && isAdmin && <CompletedLogTab />}
    </div>
  );
}

function RoomCleaningTab() {
  const { role, staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: rooms, loading } = useAsyncData(fetchAllRoomsForHousekeeping, [refreshKey]);
  const { data: housekeepers } = useAsyncData(fetchHousekeepers, [refreshKey]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const isHousekeeper = role === 'housekeeper';

  const allNeedingCleaning = rooms?.filter((r) => r.status === 'cleaning') ?? [];
  const needsCleaning = isHousekeeper
    ? allNeedingCleaning.filter((r) => !r.housekeeper_id || r.housekeeper_id === staffProfile.id)
    : allNeedingCleaning;

  const otherRooms = rooms?.filter((r) => r.status !== 'cleaning') ?? [];

  return (
    <div>
      <div className="hk-section">
        <h3 className="hk-section-title">
          Needs Cleaning {!loading && `(${needsCleaning.length})`}
        </h3>
        <div className="hk-grid">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <RoomCardSkeleton key={i} />)
          ) : needsCleaning.length === 0 ? (
            <p className="hk-empty">
              {isHousekeeper ? 'No rooms assigned to you right now.' : 'All rooms are clean. Nice work!'}
            </p>
          ) : (
            needsCleaning.map((room) => (
              <div key={room.id} className="hk-room-card hk-priority">
                <div className="hk-room-header">
                  <span className="hk-room-number">{room.room_number}</span>
                  <StatusBadge status={room.status} />
                </div>

                {housekeepers && (
                  <AssignHousekeeperControl
                    room={room}
                    housekeepers={housekeepers}
                    onAssigned={() => setRefreshKey((k) => k + 1)}
                  />
                )}

                <button className="modal-btn-primary" onClick={() => setSelectedRoom(room)}>
                  Start Checklist
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="hk-section">
        <h3 className="hk-section-title">Other Rooms</h3>
        <div className="hk-grid">
          {!loading && otherRooms.map((room) => (
            <div key={room.id} className="hk-room-card">
              <div className="hk-room-header">
                <span className="hk-room-number">{room.room_number}</span>
                <StatusBadge status={room.status} />
              </div>
              <div className="hk-room-meta">
                Last cleaned: {room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleDateString() : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedRoom && (
        <CleaningChecklistModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onCompleted={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function CompletedLogTab() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [housekeeperId, setHousekeeperId] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: housekeepers } = useAsyncData(fetchHousekeepers, []);
  const { data: allEntries, loading } = useAsyncData(
    () => fetchCompletedDutiesLog({ fromDate, toDate, housekeeperId, search }),
    [fromDate, toDate, housekeeperId, search]
  );

  const entries = typeFilter === 'all' ? allEntries : allEntries?.filter((e) => e.source === typeFilter);

  function handleExport() {
    if (!entries || entries.length === 0) return;
    const rows = entries.map((e) => ({
      Housekeeper: e.housekeeper?.full_name ?? '',
      Type: e.typeLabel,
      Area: e.area,
      ScheduledDate: e.scheduledDate ?? 'Unscheduled',
      CompletedAt: new Date(e.completedAt).toLocaleString(),
      OnTime: e.onTime === null ? 'N/A' : e.onTime ? 'Yes' : 'No',
      Notes: e.notes ?? '',
    }));
    exportToCSV(`golden-apple-housekeeping-log-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const hasFilters = fromDate || toDate || housekeeperId !== 'all' || typeFilter !== 'all' || search;

  return (
    <div>
      <div className="res-filter-bar">
        <input
          type="text"
          className="res-filter-search"
          placeholder="Search housekeeper or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="res-filter-select" value={housekeeperId} onChange={(e) => setHousekeeperId(e.target.value)}>
          <option value="all">All Housekeepers</option>
          {housekeepers?.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
        </select>
        <select className="res-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="duty">Scheduled Duties</option>
          <option value="room_cleaning">Room Cleaning</option>
        </select>
        <label className="res-filter-date-label">
          From
          <input type="date" className="res-filter-date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="res-filter-date-label">
          To
          <input type="date" className="res-filter-date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        {hasFilters && (
          <button className="res-filter-clear" onClick={() => { setFromDate(''); setToDate(''); setHousekeeperId('all'); setTypeFilter('all'); setSearch(''); }}>
            Clear Filters
          </button>
        )}
        <button className="modal-btn-secondary" onClick={handleExport}>Export CSV</button>
      </div>

      {!loading && (
        <p className="res-filter-count">{entries?.length ?? 0} completed entr{entries?.length === 1 ? 'y' : 'ies'}</p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Housekeeper</th>
              <th>Type</th>
              <th>Area</th>
              <th>Scheduled Date</th>
              <th>Completed At</th>
              <th>Timing</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
            ) : entries?.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No completed work matches these filters.</td></tr>
            ) : (
              entries?.map((e) => (
                <tr key={e.id}>
                  <td>{e.housekeeper?.full_name}</td>
                  <td>
                    <span className={`hk-type-badge ${e.source === 'duty' ? 'hk-type-duty' : 'hk-type-cleaning'}`}>
                      {e.typeLabel}
                    </span>
                  </td>
                  <td>{e.area}</td>
                  <td>{e.scheduledDate ?? <span style={{ color: 'var(--color-text-muted)' }}>Unscheduled</span>}</td>
                  <td>{new Date(e.completedAt).toLocaleString()}</td>
                  <td>
                    {e.onTime === null ? (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    ) : e.onTime ? (
                      <span className="hk-timing-good">On Time</span>
                    ) : (
                      <span className="hk-timing-late">Different Day</span>
                    )}
                  </td>
                  <td>{e.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}