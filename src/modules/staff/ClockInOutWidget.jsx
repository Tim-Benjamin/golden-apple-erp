import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchTodayAttendanceFor, clockIn, clockOut } from './attendanceService';
import './ClockInOutWidget.css';

export default function ClockInOutWidget() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: attendance, loading } = useAsyncData(
    () => fetchTodayAttendanceFor(staffProfile.id),
    [staffProfile.id, refreshKey]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClockIn() {
    setBusy(true);
    setError('');
    try {
      await clockIn(staffProfile.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    setBusy(true);
    setError('');
    try {
      await clockOut(staffProfile.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  const hasClockIn = !!attendance?.clock_in;
  const hasClockOut = !!attendance?.clock_out;

  return (
    <div className="clock-widget">
      <div>
        <div className="clock-widget-label">Today's Attendance</div>
        {hasClockIn ? (
          <div className="clock-widget-status">
            <span className={`clock-status-dot clock-status-${attendance.status}`} />
            Clocked in at {new Date(attendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {attendance.status === 'late' && <span className="clock-late-tag">Late</span>}
            {hasClockOut && ` — Clocked out at ${new Date(attendance.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        ) : (
          <div className="clock-widget-status">Not clocked in yet</div>
        )}
      </div>

      {!hasClockIn && (
        <button className="modal-btn-primary" onClick={handleClockIn} disabled={busy}>
          {busy ? 'Working...' : 'Clock In'}
        </button>
      )}
      {hasClockIn && !hasClockOut && (
        <button className="modal-btn-secondary" onClick={handleClockOut} disabled={busy}>
          {busy ? 'Working...' : 'Clock Out'}
        </button>
      )}
      {hasClockIn && hasClockOut && (
        <span style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>Day complete ✓</span>
      )}

      {error && <p className="modal-error">{error}</p>}
    </div>
  );
}