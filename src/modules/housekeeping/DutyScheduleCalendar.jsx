import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchDutiesForMonth } from './housekeepingService';
import ManageDayDutiesModal from './ManageDayDutiesModal';
import BulkScheduleDutiesModal from './BulkScheduleDutiesModal';
import './DutyScheduleCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ADMIN_ROLES = ['super_admin', 'general_manager', 'assistant_manager'];

export default function DutyScheduleCalendar() {
  const { role, staffProfile } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const isHousekeeper = role === 'housekeeper';

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const { data: duties, loading } = useAsyncData(
    () => fetchDutiesForMonth(year, month),
    [year, month, refreshKey]
  );

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  function dutiesForDay(day) {
    if (!day) return [];
    const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return duties?.filter((d) => d.duty_date === dateISO) ?? [];
  }

  function goToMonth(offset) {
    setViewDate(new Date(year, month + offset, 1));
  }

  function handleDayClick(day) {
    if (!day) return;
    const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDuties = dutiesForDay(day);

    if (!isAdmin && dayDuties.filter((d) => d.housekeeper_id === staffProfile.id).length === 0) return;

    setSelectedDay(dateISO);
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="duty-calendar-wrapper">
      <div className="duty-calendar-toolbar">
        <button className="modal-btn-secondary" onClick={() => goToMonth(-1)}>← Previous</button>
        <span className="duty-calendar-month-label">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button className="modal-btn-secondary" onClick={() => goToMonth(1)}>Next →</button>
        <button className="modal-btn-secondary" onClick={() => setViewDate(new Date())}>Today</button>
        {isAdmin && (
          <button className="modal-btn-primary" onClick={() => setShowBulkModal(true)} style={{ marginLeft: 'auto' }}>
            + Bulk Schedule
          </button>
        )}
      </div>

      <p className="duty-calendar-hint">
        {isAdmin
          ? 'Click any day to schedule or manage duties, or use Bulk Schedule for a whole month/range at once.'
          : isHousekeeper
          ? 'Days with your name are your scheduled duties. Click to mark as done.'
          : 'Viewing the housekeeping duty schedule.'}
      </p>

      <div className="duty-calendar-grid">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="duty-calendar-weekday">{wd}</div>
        ))}

        {loading ? (
          <div className="duty-calendar-loading">Loading schedule...</div>
        ) : (
          calendarCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="duty-calendar-cell duty-calendar-cell-empty" />;

            const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayDuties = dutiesForDay(day);
            const myDuties = dayDuties.filter((d) => d.housekeeper_id === staffProfile.id);
            const isToday = dateISO === todayISO;
            const isClickable = isAdmin || myDuties.length > 0;

            return (
              <div
                key={dateISO}
                className={`duty-calendar-cell ${isToday ? 'duty-calendar-cell-today' : ''} ${isClickable ? 'duty-calendar-cell-clickable' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className="duty-calendar-day-num">{day}</span>
                <div className="duty-calendar-entries">
                  {(isAdmin ? dayDuties : myDuties).slice(0, 3).map((d) => (
                    <span
                      key={d.id}
                      className={`duty-calendar-chip ${d.status === 'completed' ? 'duty-chip-done' : 'duty-chip-scheduled'}`}
                    >
                      {isAdmin ? d.housekeeper?.full_name?.split(' ')[0] : d.duty_area}
                      {d.status === 'completed' ? ' ✓' : ''}
                    </span>
                  ))}
                  {isAdmin && dayDuties.length > 3 && (
                    <span className="duty-calendar-more">+{dayDuties.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedDay && (
        <ManageDayDutiesModal
          dateISO={selectedDay}
          isAdmin={isAdmin}
          onClose={() => setSelectedDay(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {showBulkModal && (
        <BulkScheduleDutiesModal
          onClose={() => setShowBulkModal(false)}
          onScheduled={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}