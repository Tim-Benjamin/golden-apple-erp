import { getEffectiveStatus } from './reservationStatus';

export const DEFAULT_RESERVATION_FILTERS = {
  search: '',
  status: 'all',
  fromDate: '',
  toDate: '',
};

export function filterReservations(reservations, filters) {
  if (!reservations) return [];

  return reservations.filter((r) => {
    // Text search: guest name, phone, or room number
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesName = r.guest?.full_name?.toLowerCase().includes(q);
      const matchesPhone = r.guest?.phone?.toLowerCase().includes(q);
      const matchesRoom = r.room?.room_number?.toLowerCase().includes(q);
      if (!matchesName && !matchesPhone && !matchesRoom) return false;
    }

    // Status filter uses the "effective" status, so selecting "Confirmed (Unpaid)"
    // correctly excludes paid ones, and "Reserved & Paid" only shows paid ones.
    if (filters.status !== 'all' && getEffectiveStatus(r) !== filters.status) return false;

    // Date range filter: matches if the reservation's stay overlaps the selected range at all
    if (filters.fromDate && r.check_out_date < filters.fromDate) return false;
    if (filters.toDate && r.check_in_date > filters.toDate) return false;

    return true;
  });
}