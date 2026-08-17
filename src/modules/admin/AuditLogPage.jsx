import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchAuditLog, fetchDistinctActions, fetchActiveStaffForFilter } from './auditLogService';
import { labelForAction } from '../../lib/actionLabels';
import { exportToCSV } from '../../lib/csvExport';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import './AuditLogPage.css';

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('all');
  const [actorId, setActorId] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: actions } = useAsyncData(fetchDistinctActions, []);
  const { data: staffList } = useAsyncData(fetchActiveStaffForFilter, []);

  const { data, loading } = useAsyncData(
    () => fetchAuditLog({ page, action, actorId, fromDate, toDate, search }),
    [page, action, actorId, fromDate, toDate, search]
  );

  const rows = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function resetToFirstPage(setter) {
    return (value) => {
      setPage(0);
      setter(value);
    };
  }

  function handleExport() {
    if (rows.length === 0) return;
    const csvRows = rows.map((r) => ({
      Date: new Date(r.created_at).toLocaleString(),
      Action: labelForAction(r.action),
      Actor: r.staff?.full_name ?? 'System',
      Role: r.staff?.role ?? '',
      Table: r.entity_table ?? '',
      Details: JSON.stringify(r.details ?? {}),
    }));
    exportToCSV(`golden-apple-audit-log-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
  }

  const hasActiveFilters = action !== 'all' || actorId !== 'all' || fromDate || toDate || search;

  function clearFilters() {
    setPage(0);
    setAction('all');
    setActorId('all');
    setFromDate('');
    setToDate('');
    setSearch('');
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Complete record of every tracked action across the system</p>
        </div>
        <button className="modal-btn-secondary" onClick={handleExport}>Export Page CSV</button>
      </div>

      <div className="audit-filter-bar">
        <input
          type="text"
          className="res-filter-search"
          placeholder="Search action, staff name, or details..."
          value={search}
          onChange={(e) => resetToFirstPage(setSearch)(e.target.value)}
        />

        <select className="res-filter-select" value={action} onChange={(e) => resetToFirstPage(setAction)(e.target.value)}>
          <option value="all">All Actions</option>
          {actions?.map((a) => (
            <option key={a} value={a}>{labelForAction(a)}</option>
          ))}
        </select>

        <select className="res-filter-select" value={actorId} onChange={(e) => resetToFirstPage(setActorId)(e.target.value)}>
          <option value="all">All Staff</option>
          {staffList?.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        <label className="res-filter-date-label">
          From
          <input type="date" className="res-filter-date" value={fromDate} onChange={(e) => resetToFirstPage(setFromDate)(e.target.value)} />
        </label>
        <label className="res-filter-date-label">
          To
          <input type="date" className="res-filter-date" min={fromDate} value={toDate} onChange={(e) => resetToFirstPage(setToDate)(e.target.value)} />
        </label>

        {hasActiveFilters && (
          <button className="res-filter-clear" onClick={clearFilters}>Clear Filters</button>
        )}
      </div>

      {!loading && (
        <p className="res-filter-count">
          {totalCount} total log entr{totalCount === 1 ? 'y' : 'ies'} · Page {page + 1} of {totalPages}
        </p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Action</th>
              <th>Staff Member</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No audit log entries match these filters.</td></tr>
            ) : (
              rows.map((r) => (
                <>
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>{labelForAction(r.action)}</td>
                    <td>{r.staff?.full_name ?? 'System'}</td>
                    <td className="table-capitalize">{r.staff?.role?.replace('_', ' ') ?? '—'}</td>
                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                      >
                        {expandedRow === r.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === r.id && (
                    <tr key={`${r.id}-details`}>
                      <td colSpan={5} className="audit-details-cell">
                        <pre className="audit-details-json">{JSON.stringify(r.details ?? {}, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="audit-pagination">
          <button className="modal-btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </button>
          <span className="audit-page-label">Page {page + 1} of {totalPages}</span>
          <button className="modal-btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}