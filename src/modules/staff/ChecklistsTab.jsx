import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchChecklistStatusForDate, fetchAllTemplates } from './checklistService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';

export default function ChecklistsTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [templateFilter, setTemplateFilter] = useState('all');

  const { data: templates } = useAsyncData(fetchAllTemplates, []);
  const { data: statusRows, loading } = useAsyncData(() => fetchChecklistStatusForDate(selectedDate), [selectedDate]);

  const filtered = templateFilter === 'all' ? statusRows : statusRows?.filter((r) => r.template.id === templateFilter);

  const completedCount = filtered?.filter((r) => r.completed).length ?? 0;
  const totalCount = filtered?.length ?? 0;

  return (
    <div>
      <div className="res-filter-bar">
        <label className="res-filter-date-label">
          Date
          <input type="date" className="res-filter-date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </label>
        <select className="res-filter-select" value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}>
          <option value="all">All Checklists</option>
          {templates?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {!loading && (
        <p className="res-filter-count">
          {completedCount} of {totalCount} completed for {selectedDate}
        </p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Checklist</th>
              <th>Staff Member</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : filtered?.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No applicable staff for this filter.</td></tr>
            ) : (
              filtered?.map((row, i) => {
                const checkedCount = row.completion?.checked_items?.filter(Boolean).length ?? 0;
                const total = row.template.items.length;
                return (
                  <tr key={i}>
                    <td>{row.template.title}</td>
                    <td>{row.staff.full_name}</td>
                    <td>{checkedCount}/{total}</td>
                    <td>
                      {row.completed ? (
                        <span style={{ color: 'var(--color-success)', fontSize: '0.82rem' }}>✓ Completed</span>
                      ) : row.completion ? (
                        <span style={{ color: 'var(--color-gold-muted)', fontSize: '0.82rem' }}>In Progress</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Not Started</span>
                      )}
                    </td>
                    <td>{row.completion?.completed_at ? new Date(row.completion.completed_at).toLocaleTimeString() : '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}