import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchReservations } from '../reservations/reservationsService';
import StatusBadge from '../../components/shared/StatusBadge';
import { getEffectiveStatus } from '../../lib/reservationStatus';
import StayCountdownBadge from '../../components/shared/StayCountdownBadge';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import ReservationDetailModal from './ReservationDetailModal';
import RoomAvailabilityCalendar from '../reservations/RoomAvailabilityCalendar';
import ReservationFilterBar from '../../components/shared/ReservationFilterBar';
import { DEFAULT_RESERVATION_FILTERS, filterReservations } from '../../lib/filterReservations';
import './FrontDeskPage.css';

export default function FrontDeskPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: reservations, loading } = useAsyncData(fetchReservations, [refreshKey]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_RESERVATION_FILTERS);

  // Front Desk focuses on active stays by default, but filters (including status)
  // let staff search across everything, including checked-out or cancelled history.
  const baseList = reservations?.filter((r) =>
    ['confirmed', 'pending', 'checked_in'].includes(r.status)
  ) ?? [];

  const hasCustomFilters = filters.search || filters.status !== 'all' || filters.fromDate || filters.toDate;
  const sourceList = hasCustomFilters ? reservations ?? [] : baseList;
  const filteredReservations = filterReservations(sourceList, filters);

  return (
    <div>
      <h1 className="page-title">Front Desk</h1>
      <p className="page-subtitle">Check guests in, check guests out, manage charges & payments</p>

      <RoomAvailabilityCalendar />

      <ReservationFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_RESERVATION_FILTERS)}
      />

      {!loading && (
        <p className="res-filter-count">
          Showing {filteredReservations.length} reservation{filteredReservations.length !== 1 ? 's' : ''}
          {!hasCustomFilters && ' (active stays)'}
        </p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th>Timing</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
            ) : filteredReservations.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No reservations match these filters.</td></tr>
            ) : (
              filteredReservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.guest?.full_name}</td>
                  <td>{r.room?.room_number}</td>
                  <td>{r.check_in_date}</td>
                  <td>{r.check_out_date}</td>
                  <td>
                    <StatusBadge status={getEffectiveStatus(r)} />
                  </td>
                  <td><StayCountdownBadge reservation={r} /></td>
                  <td>
                    <button className="table-action-btn" onClick={() => setSelectedReservation(r)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedReservation && (
        <ReservationDetailModal
          reservationId={selectedReservation.id}
          onClose={() => setSelectedReservation(null)}
          onUpdated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}