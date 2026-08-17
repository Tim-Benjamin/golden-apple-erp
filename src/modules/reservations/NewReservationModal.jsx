import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { findOrCreateGuest } from './guestsService';
import { createReservation } from './reservationsService';
import { fetchAvailableRooms } from './availabilityService';
import { sendTransactionalEmail } from '../../lib/emailService';
import { logActivity } from '../../lib/activityLog';
import './NewReservationModal.css';

const BOOKING_SOURCES = [
  'direct', 'walk_in', 'phone_call', 'whatsapp',
  'booking_com', 'expedia', 'agoda', 'airbnb',
];

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export default function NewReservationModal({ onClose, onCreated }) {
  const { staffProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [availableRooms, setAvailableRooms] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    passport_or_id: '',
    nationality: '',
    phone: '',
    email: '',
    vehicle_number: '',
    room_id: '',
    booking_source: 'walk_in',
    number_of_guests: 1,
    check_in_date: new Date().toISOString().slice(0, 10),
    check_out_date: '',
    arrival_time: '',
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    if (!form.check_in_date || !form.check_out_date) {
      setAvailableRooms(null);
      return;
    }
    if (form.check_out_date <= form.check_in_date) {
      setAvailableRooms([]);
      return;
    }

    let cancelled = false;
    setCheckingAvailability(true);
    fetchAvailableRooms(form.check_in_date, form.check_out_date)
      .then((rooms) => {
        if (cancelled) return;
        setAvailableRooms(rooms);
        setForm((f) => (rooms.some((r) => r.id === f.room_id) ? f : { ...f, room_id: '' }));
      })
      .catch((err) => console.error('Availability check failed:', err))
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });

    return () => { cancelled = true; };
  }, [form.check_in_date, form.check_out_date]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.room_id) {
      setError('Please select an available room.');
      return;
    }

    setSaving(true);

    try {
      const guest = await findOrCreateGuest({
        full_name: form.full_name,
        passport_or_id: form.passport_or_id,
        nationality: form.nationality,
        phone: form.phone,
        email: form.email || null,
        vehicle_number: form.vehicle_number,
      });

      const isWalkIn = form.booking_source === 'walk_in';
      const now = new Date();
      let status = 'confirmed';
      let confirmedAt = now.toISOString();
      let cancellationDeadline = null;

      if (!isWalkIn) {
        const checkInStart = new Date(`${form.check_in_date}T00:00:00`);
        const fortyEightHoursOut = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        cancellationDeadline = (checkInStart < fortyEightHoursOut ? checkInStart : fortyEightHoursOut).toISOString();
        status = 'pending';
        confirmedAt = null;
      }

      const reservation = await createReservation({
        guest_id: guest.id,
        room_id: form.room_id,
        booking_source: form.booking_source,
        number_of_guests: parseInt(form.number_of_guests, 10),
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        arrival_time: form.arrival_time || null,
        status,
        cancellation_deadline: cancellationDeadline,
        confirmed_at: confirmedAt,
        created_by: staffProfile.id,
      });

      logActivity({
        actorId: staffProfile.id,
        action: 'reservation_created',
        entityTable: 'reservations',
        entityId: reservation.id,
        details: { room: reservation.room.room_number, check_in: form.check_in_date, status },
      });

      if (guest.email) {
        sendTransactionalEmail({
          to: guest.email,
          subject: `Reservation ${status === 'pending' ? 'Received' : 'Confirmed'} — Golden Apple Guest House`,
          html: buildConfirmationEmail(guest, reservation, status),
        }).catch((err) => console.error('Email failed (non-blocking):', err));
      }

      onCreated(reservation);
      onClose();
    } catch (err) {
      if (err.code === '23P01' || err.message?.includes('no_overlapping_active_reservations')) {
        setError('This room was just booked for overlapping dates by someone else. Please pick another room or date range.');
      } else {
        setError(err.message ?? 'Failed to create reservation.');
      }
    } finally {
      setSaving(false);
    }
  }

  const datesReady = form.check_in_date && form.check_out_date && form.check_out_date > form.check_in_date;
  const selectedRoom = availableRooms?.find((r) => r.id === form.room_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Reservation</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="reservation-form">
          <div className="form-section-label">Booking Dates (choose first)</div>
          <div className="form-grid">
            <label>
              Check-in Date *
              <input type="date" required value={form.check_in_date} onChange={(e) => update('check_in_date', e.target.value)} />
            </label>
            <label>
              Check-out Date *
              <input type="date" required min={form.check_in_date} value={form.check_out_date} onChange={(e) => update('check_out_date', e.target.value)} />
            </label>
          </div>

          {form.check_out_date && form.check_out_date <= form.check_in_date && (
            <p className="modal-error">Check-out date must be after check-in date.</p>
          )}

          <div className="form-section-label">Room</div>
          {!datesReady ? (
            <p className="availability-hint">Select both dates to see available rooms.</p>
          ) : checkingAvailability ? (
            <p className="availability-hint">Checking availability...</p>
          ) : availableRooms?.length === 0 ? (
            <p className="modal-error">No rooms available for these dates. Try a different date range.</p>
          ) : (
            <>
              <select
                required
                value={form.room_id}
                onChange={(e) => update('room_id', e.target.value)}
              >
                <option value="" disabled>Select an available room...</option>
                {availableRooms?.map((r) => (
                  <option key={r.id} value={r.id}>{r.room_number} — {r.room_type} (GH₵{r.price}/night)</option>
                ))}
              </select>
              {selectedRoom && (
                <p className="availability-hint">
                  {nightsBetween(form.check_in_date, form.check_out_date)} night(s) × GH₵{selectedRoom.price} ={' '}
                  <strong style={{ color: 'var(--color-gold)' }}>
                    GH₵{(nightsBetween(form.check_in_date, form.check_out_date) * Number(selectedRoom.price)).toFixed(2)}
                  </strong> estimated
                </p>
              )}
            </>
          )}

          <div className="form-section-label" style={{ marginTop: '1rem' }}>Guest Details</div>
          <div className="form-grid">
            <label>
              Full Name *
              <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </label>
            <label>
              Passport / ID
              <input value={form.passport_or_id} onChange={(e) => update('passport_or_id', e.target.value)} />
            </label>
            <label>
              Nationality
              <input value={form.nationality} onChange={(e) => update('nationality', e.target.value)} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </label>
            <label>
              Vehicle Number
              <input value={form.vehicle_number} onChange={(e) => update('vehicle_number', e.target.value)} />
            </label>
          </div>

          <div className="form-section-label">Booking Details</div>
          <div className="form-grid">
            <label>
              Booking Source
              <select value={form.booking_source} onChange={(e) => update('booking_source', e.target.value)}>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label>
              Number of Guests
              <input type="number" min="1" value={form.number_of_guests} onChange={(e) => update('number_of_guests', e.target.value)} />
            </label>
            <label>
              Arrival Time
              <input type="time" value={form.arrival_time} onChange={(e) => update('arrival_time', e.target.value)} />
            </label>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving || !form.room_id}>
              {saving ? 'Creating...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildConfirmationEmail(guest, reservation, status) {
  const statusNote = status === 'pending'
    ? '<p>Your reservation is pending confirmation. It will be confirmed automatically 48 hours before your check-in, or you may be contacted sooner.</p>'
    : '<p>Your reservation has been confirmed.</p>';

  const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date);
  const roomPrice = Number(reservation.room.price);
  const estimatedTotal = (nights * roomPrice).toFixed(2);

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #a3872b;">Golden Apple Guest House</h2>
      <p>Dear ${guest.full_name},</p>
      ${statusNote}
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 6px 0; color: #666;">Room</td><td>${reservation.room.room_number} (${reservation.room.room_type})</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Room Rate</td><td>GH₵${roomPrice.toFixed(2)} / night</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Check-in</td><td>${reservation.check_in_date}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Check-out</td><td>${reservation.check_out_date}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Nights</td><td>${nights}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Guests</td><td>${reservation.number_of_guests}</td></tr>
        <tr><td style="padding: 10px 0 6px; color: #666; font-weight: bold; border-top: 1px solid #eee;">Estimated Total</td><td style="padding: 10px 0 6px; font-weight: bold; border-top: 1px solid #eee;">GH₵${estimatedTotal}</td></tr>
      </table>
      <p style="font-size: 12px; color: #999;">Final total may differ based on additional charges (food, drinks, laundry, etc.) added during your stay.</p>
      <p>We look forward to hosting you.</p>
      <p style="color: #999; font-size: 12px;">Golden Apple Guest House</p>
    </div>
  `;
}