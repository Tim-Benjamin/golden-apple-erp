import { useState, useMemo } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchReservationsInRange, fetchAllRoomsBasic } from './availabilityService';
import { getEffectiveStatus } from '../../lib/reservationStatus';
import { getStayCountdown } from '../../lib/stayCountdown';
import './RoomAvailabilityCalendar.css';

const DAYS_TO_SHOW = 14;

function formatDateISO(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function RoomAvailabilityCalendar() {
  const [anchorDate, setAnchorDate] = useState(new Date());

  const dateColumns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      cols.push(addDays(anchorDate, i));
    }
    return cols;
  }, [anchorDate]);

  const rangeStart = formatDateISO(dateColumns[0]);
  const rangeEnd = formatDateISO(dateColumns[dateColumns.length - 1]);

  const { data: rooms, loading: roomsLoading } = useAsyncData(fetchAllRoomsBasic, []);
  const { data: reservations, loading: resLoading } = useAsyncData(
    () => fetchReservationsInRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  );

  function findBooking(roomId, dateISO) {
    return reservations?.find(
      (r) => r.room_id === roomId && dateISO >= r.check_in_date && dateISO < r.check_out_date
    );
  }

  // Checked-in guests whose checkout date lands on this cell — shown as a small
  // departure marker even though the occupancy range above excludes the checkout day itself.
  function findDeparture(roomId, dateISO) {
    return reservations?.find(
      (r) => r.room_id === roomId && r.check_out_date === dateISO && r.status === 'checked_in'
    );
  }

  function statusClass(booking) {
    const effective = getEffectiveStatus(booking);
    if (effective === 'checked_in') return 'cal-cell-occupied';
    if (effective === 'confirmed_paid') return 'cal-cell-paid';
    if (effective === 'confirmed') return 'cal-cell-reserved';
    if (effective === 'pending') return 'cal-cell-pending';
    return '';
  }

  const loading = roomsLoading || resLoading;

  return (
    <div className="calendar-wrapper">
      <div className="calendar-toolbar">
        <button className="modal-btn-secondary" onClick={() => setAnchorDate(addDays(anchorDate, -DAYS_TO_SHOW))}>
          ← Previous
        </button>
        <span className="calendar-range-label">
          {dateColumns[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} –{' '}
          {dateColumns[dateColumns.length - 1].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button className="modal-btn-secondary" onClick={() => setAnchorDate(addDays(anchorDate, DAYS_TO_SHOW))}>
          Next →
        </button>
        <button className="modal-btn-secondary" onClick={() => setAnchorDate(new Date())}>
          Today
        </button>
      </div>

      <div className="calendar-legend">
        <span><span className="legend-dot cal-cell-occupied" /> Checked In</span>
        <span><span className="legend-dot departure-warning" style={{ borderRadius: "4px" }} /> Checkout Due</span>
        <span><span className="legend-dot cal-cell-paid" /> Reserved &amp; Paid</span>
        <span><span className="legend-dot cal-cell-reserved" /> Confirmed (Unpaid)</span>
        <span><span className="legend-dot cal-cell-pending" /> Pending</span>
        <span><span className="legend-dot" /> Vacant</span>
      </div>

      <div className="calendar-scroll">
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="calendar-room-col">Room</th>
              {dateColumns.map((d) => (
                <th key={formatDateISO(d)} className="calendar-date-col">
                  <div className="calendar-date-weekday">{d.toLocaleDateString('default', { weekday: 'short' })}</div>
                  <div className="calendar-date-day">{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={DAYS_TO_SHOW + 1} className="table-empty">Loading calendar...</td></tr>
            ) : (
              rooms?.map((room) => (
                <tr key={room.id}>
                  <td className="calendar-room-col calendar-room-label">{room.room_number}</td>
                  {dateColumns.map((d) => {
                    const dateISO = formatDateISO(d);
                    const booking = findBooking(room.id, dateISO);
                    const departure = findDeparture(room.id, dateISO);
                    const departureCountdown = departure ? getStayCountdown(departure) : null;

                    return (
                      <td
                        key={dateISO}
                        className={`calendar-cell ${booking ? statusClass(booking) : ''}`}
                        title={
                          booking
                            ? `${booking.guest?.full_name} (${booking.check_in_date} → ${booking.check_out_date})`
                            : departure
                            ? `${departure.guest?.full_name} checking out today`
                            : 'Vacant'
                        }
                      >
                        {booking && dateISO === booking.check_in_date && (
                          <span className="calendar-guest-name">{booking.guest?.full_name}</span>
                        )}
                        {departure && (
                          <span className={`calendar-departure-chip departure-${departureCountdown?.urgency ?? 'normal'}`}>
                            ↦ {departure.guest?.full_name?.split(' ')[0]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}