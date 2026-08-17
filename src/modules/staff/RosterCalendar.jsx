import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchRosterForMonth, duplicateWeek } from './rosterService';
import ManageRosterDayModal from './ManageRosterDayModal';
import './RosterCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ADMIN_ROLES = ['super_admin', 'general_manager', 'assistant_manager', 'hr'];

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function RosterCalendar() {
  const { role, staffProfile } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [duplicating, setDuplicating] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const { data: entries, loading } = useAsyncData(() => fetchRosterForMonth(year, month), [year, month, refreshKey]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  function entriesForDay(day) {
    if (!day) return [];
    const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries?.filter((e) => e.work_date === dateISO) ?? [];
  }

  function goToMonth(offset) {
    setViewDate(new Date(year, month + offset, 1));
  }

  function handleDayClick(day) {
    if (!day) return;
    const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEntries = entriesForDay(day);
    if (!isAdmin && dayEntries.filter((e) => e.staff_id === staffProfile.id).length === 0) return;
    setSelectedDay(dateISO);
  }

  async function handleDuplicateThisWeek() {
    const thisWeekStart = startOfWeek(new Date());
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    setDuplicating(true);
    try {
      const count = await duplicateWeek(
        thisWeekStart.toISOString().slice(0, 10),
        nextWeekStart.toISOString().slice(0, 10),
        staffProfile.id
      );
      setRefreshKey((k) => k + 1);
      alert(`Duplicated ${count.length} shift(s) to next week.`);
    } catch (err) {
      alert(`Failed to duplicate: ${err.message}`);
    } finally {
      setDuplicating(false);
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="duty-calendar-wrapper">
      <div className="duty-calendar-toolbar">
        <button className="modal-btn-secondary" onClick={() => goToMonth(-1)}>← Previous</button>
        <span className="duty-calendar-month-label">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <button className="modal-btn-secondary" onClick={() => goToMonth(1)}>Next →</button>
        <button className="modal-btn-secondary" onClick={() => setViewDate(new Date())}>Today</button>
        {isAdmin && (
          <button className="modal-btn-primary" onClick={handleDuplicateThisWeek} disabled={duplicating} style={{ marginLeft: 'auto' }}>
            {duplicating ? 'Duplicating...' : 'Duplicate This Week → Next Week'}
          </button>
        )}
      </div>

      <p className="duty-calendar-hint">
        {isAdmin ? 'Click any day to assign shifts.' : 'Days with your name are your scheduled shifts.'}
      </p>

      <div className="duty-calendar-grid">
        {WEEKDAYS.map((wd) => <div key={wd} className="duty-calendar-weekday">{wd}</div>)}

        {loading ? (
          <div className="duty-calendar-loading">Loading roster...</div>
        ) : (
          calendarCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="duty-calendar-cell duty-calendar-cell-empty" />;

            const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEntries = entriesForDay(day);
            const myEntries = dayEntries.filter((e) => e.staff_id === staffProfile.id);
            const isToday = dateISO === todayISO;
            const isClickable = isAdmin || myEntries.length > 0;

            return (
              <div
                key={dateISO}
                className={`duty-calendar-cell ${isToday ? 'duty-calendar-cell-today' : ''} ${isClickable ? 'duty-calendar-cell-clickable' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className="duty-calendar-day-num">{day}</span>
                <div className="duty-calendar-entries">
                  {(isAdmin ? dayEntries : myEntries).slice(0, 3).map((e) => (
                    <span key={e.id} className={`duty-calendar-chip ${e.status === 'unavailable' ? 'roster-chip-unavailable' : 'duty-chip-scheduled'}`}>
                      {isAdmin ? e.staff?.full_name?.split(' ')[0] : e.shift?.name}
                      {e.status === 'unavailable' ? ' (off)' : ''}
                    </span>
                  ))}
                  {isAdmin && dayEntries.length > 3 && <span className="duty-calendar-more">+{dayEntries.length - 3} more</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedDay && (
        <ManageRosterDayModal
          dateISO={selectedDay}
          isAdmin={isAdmin}
          onClose={() => setSelectedDay(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}