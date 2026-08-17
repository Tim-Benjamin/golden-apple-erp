import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchTodayRosterWithAttendance } from './rosterService';
import { fetchTodaySummary, fetchAttendanceLog } from './attendanceService';
import { fetchStaff } from './staffService';
import StatusBadge from '../../components/shared/StatusBadge';
import { StatCardSkeleton, TableRowSkeleton } from '../../components/shared/Skeleton';
import { exportToCSV } from '../../lib/csvExport';

const ATTENDANCE_STATUS_LABELS = {
  present: { label: 'Present', className: 'status-vacant' },
  late: { label: 'Late', className: 'status-reserved' },
  absent: { label: 'Absent', className: 'status-out' },
  on_leave: { label: 'On Leave', className: 'status-cleaning' },
};

function AttendanceStatusBadge({ status }) {
  const config = ATTENDANCE_STATUS_LABELS[status] ?? { label: status, className: 'status-default' };
  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
}

export default function AttendanceTab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: summary, loading: summaryLoading } = useAsyncData(fetchTodaySummary, [refreshKey]);
  const { data: todayWorkforce, loading: workforceLoading } = useAsyncData(fetchTodayRosterWithAttendance, [refreshKey]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [staffId, setStaffId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: staffList } = useAsyncData(fetchStaff, []);
  const { data: log, loading: logLoading } = useAsyncData(
    () => fetchAttendanceLog({ fromDate, toDate, staffId, status: statusFilter }),
    [fromDate, toDate, staffId, statusFilter, refreshKey]
  );

  function handleExport() {
    if (!log || log.length === 0) return;
    const rows = log.map((a) => ({
      Staff: a.staff?.full_name ?? '',
      Date: a.work_date,
      ClockIn: a.clock_in ? new Date(a.clock_in).toLocaleTimeString() : '',
      ClockOut: a.clock_out ? new Date(a.clock_out).toLocaleTimeString() : '',
      Status: a.status,
    }));
    exportToCSV(`golden-apple-attendance-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div>
      <div className="stat-grid">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Present Today" value={summary.present} accent="success" />
            <StatCard label="Late Today" value={summary.late} accent="gold" />
            <StatCard label="Absent Today" value={summary.absent} accent="danger" />
            <StatCard label="On Leave" value={summary.onLeave} accent="muted" />
          </>
        )}
      </div>

      <h3 className="hk-section-title" style={{ marginTop: '1.75rem' }}>Today's Workforce</h3>
      <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Shift</th>
              <th>Clock In</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {workforceLoading ? (
              Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)
            ) : todayWorkforce?.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">No one is scheduled to work today.</td></tr>
            ) : (
              todayWorkforce?.map((r) => (
                <tr key={r.id}>
                  <td>{r.staff?.full_name}</td>
                  <td>{r.shift?.name} ({r.shift?.start_time?.slice(0, 5)}–{r.shift?.end_time?.slice(0, 5)})</td>
                  <td>{r.attendance?.clock_in ? new Date(r.attendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>
                    {r.attendance ? (
                      <AttendanceStatusBadge status={r.attendance.status} />
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Not clocked in</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="hk-section-title">Attendance Log</h3>
      <div className="res-filter-bar">
        <select className="res-filter-select" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="all">All Staff</option>
          {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select className="res-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="on_leave">On Leave</option>
        </select>
        <label className="res-filter-date-label">
          From
          <input type="date" className="res-filter-date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="res-filter-date-label">
          To
          <input type="date" className="res-filter-date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button className="modal-btn-secondary" onClick={handleExport}>Export CSV</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logLoading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : log?.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No attendance records match these filters.</td></tr>
            ) : (
              log?.map((a) => (
                <tr key={a.id}>
                  <td>{a.staff?.full_name}</td>
                  <td>{a.work_date}</td>
                  <td>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td><AttendanceStatusBadge status={a.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = 'gold' }) {
  const colorMap = {
    gold: 'var(--color-gold)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    muted: 'var(--color-text-secondary)',
  };
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: colorMap[accent] }}>{value}</div>
    </div>
  );
}