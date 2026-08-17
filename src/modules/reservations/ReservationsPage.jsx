import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchReservations } from './reservationsService';
import StatusBadge from '../../components/shared/StatusBadge';
import { getEffectiveStatus } from '../../lib/reservationStatus';
import StayCountdownBadge from '../../components/shared/StayCountdownBadge';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import NewReservationModal from './NewReservationModal';
import RoomAvailabilityCalendar from './RoomAvailabilityCalendar';
import ReservationDetailModal from '../frontdesk/ReservationDetailModal';
import ReservationFilterBar from '../../components/shared/ReservationFilterBar';
import { DEFAULT_RESERVATION_FILTERS, filterReservations } from '../../lib/filterReservations';
import './ReservationsPage.css';

export default function ReservationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: reservations, loading } = useAsyncData(fetchReservations, [refreshKey]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_RESERVATION_FILTERS);

  const filteredReservations = filterReservations(reservations, filters);

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Reservations</h1>
          <p className="page-subtitle">All bookings across every source</p>
        </div>
        <button className="primary-btn" onClick={() => setShowNewModal(true)}>
          + New Reservation
        </button>
      </div>

      <RoomAvailabilityCalendar />

      <ReservationFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_RESERVATION_FILTERS)}
      />

      {!loading && (
        <p className="res-filter-count">
          Showing {filteredReservations.length} of {reservations?.length ?? 0} reservations
        </p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Room</th>
              <th>Source</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th>Timing</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)
            ) : filteredReservations.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">No reservations match these filters.</td></tr>
            ) : (
              filteredReservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.guest?.full_name}</td>
                  <td>{r.room?.room_number}</td>
                  <td className="table-capitalize">{r.booking_source.replace('_', ' ')}</td>
                  <td>{r.check_in_date}</td>
                  <td>{r.check_out_date}</td>
                  <td><StatusBadge status={getEffectiveStatus(r)} /></td>
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

      {showNewModal && (
        <NewReservationModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}

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