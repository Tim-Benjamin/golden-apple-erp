import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  fetchReservationDetail,
  confirmReservation,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  addCharge,
  addPayment,
} from '../reservations/reservationsService';
import { sendTransactionalEmail } from '../../lib/emailService';
import { logActivity } from '../../lib/activityLog';
import StatusBadge from '../../components/shared/StatusBadge';
import { getEffectiveStatus } from '../../lib/reservationStatus';
import { nightsBetween } from '../../lib/stayCountdown';
import StayCountdownBadge from '../../components/shared/StayCountdownBadge';
import RefundModal from './RefundModal';
import Receipt from './Receipt';
import './ReservationDetailModal.css';

const CHARGE_TYPES = ['room', 'food', 'drinks', 'laundry', 'damage', 'tourist_levy', 'other'];
const PAYMENT_METHODS = ['cash', 'momo', 'pos', 'bank_transfer', 'stripe'];

export default function ReservationDetailModal({ reservationId, onClose, onUpdated }) {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: reservation, loading } = useAsyncData(
    () => fetchReservationDetail(reservationId),
    [reservationId, refreshKey]
  );

  const [chargeForm, setChargeForm] = useState({ charge_type: 'room', description: '', amount: '' });
  const [paymentForm, setPaymentForm] = useState({ method: 'cash', amount: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  function refresh() {
    setRefreshKey((k) => k + 1);
    onUpdated();
  }

  function emailIfPossible(subject, html, action, details) {
    if (!reservation.guest?.email) return;
    sendTransactionalEmail({ to: reservation.guest.email, subject, html }).catch((err) =>
      console.error('Email failed (non-blocking):', err)
    );
  }

  async function handleAddCharge(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const charge = await addCharge(reservationId, {
        charge_type: chargeForm.charge_type,
        description: chargeForm.description,
        amount: parseFloat(chargeForm.amount),
        created_by: staffProfile.id,
      });

      logActivity({
        actorId: staffProfile.id,
        action: 'charge_added',
        entityTable: 'charges',
        entityId: charge.id,
        details: { reservation_id: reservationId, room: reservation.room?.room_number, charge_type: chargeForm.charge_type, amount: chargeForm.amount },
      });

      setChargeForm({ charge_type: 'room', description: '', amount: '' });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const paidAt = new Date();
      const amount = parseFloat(paymentForm.amount);

      await addPayment(reservationId, {
        method: paymentForm.method,
        amount,
        reference: paymentForm.reference,
        received_by: staffProfile.id,
      });

      logActivity({
        actorId: staffProfile.id,
        action: 'payment_recorded',
        entityTable: 'payments',
        entityId: reservationId,
        details: { room: reservation.room?.room_number, amount, method: paymentForm.method, paid_at: paidAt.toISOString() },
      });

      emailIfPossible(
        `Payment Received — Golden Apple Guest House`,
        buildPaymentEmail(reservation, { amount, method: paymentForm.method, reference: paymentForm.reference, paidAt })
      );

      setPaymentForm({ method: 'cash', amount: '', reference: '' });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await confirmReservation(reservationId);

      logActivity({
        actorId: staffProfile.id,
        action: 'reservation_confirmed',
        entityTable: 'reservations',
        entityId: reservationId,
        details: { room: reservation.room?.room_number },
      });

      emailIfPossible(
        `Reservation Confirmed — Golden Apple Guest House`,
        `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>Dear ${reservation.guest.full_name},</p><p>Your reservation for Room ${reservation.room.room_number} has been confirmed. We look forward to hosting you.</p></div>`
      );

      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelConfirmed(refundData) {
    setBusy(true);
    setError('');
    try {
      await cancelReservation(
        reservationId,
        reservation.room_id,
        refundData ? { ...refundData, processedBy: staffProfile.id } : null
      );

      logActivity({
        actorId: staffProfile.id,
        action: 'reservation_cancelled',
        entityTable: 'reservations',
        entityId: reservationId,
        details: { room: reservation.room?.room_number, refund: refundData },
      });

      if (refundData) {
        logActivity({
          actorId: staffProfile.id,
          action: 'refund_issued',
          entityTable: 'refunds',
          entityId: reservationId,
          details: { room: reservation.room?.room_number, amount: refundData.amount, method: refundData.method, reason: refundData.reason },
        });
      }

      emailIfPossible(
        `Reservation Cancelled — Golden Apple Guest House`,
        `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>Dear ${reservation.guest.full_name},</p><p>Your reservation for Room ${reservation.room.room_number} has been cancelled.${refundData ? ` A refund of GH₵${refundData.amount} has been processed.` : ''}</p></div>`
      );

      setShowRefundModal(false);
      refresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    setBusy(true);
    setError('');
    try {
      await checkInReservation(reservationId, reservation.room_id, staffProfile.id);

      logActivity({
        actorId: staffProfile.id,
        action: 'guest_checked_in',
        entityTable: 'reservations',
        entityId: reservationId,
        details: { room: reservation.room?.room_number },
      });

      emailIfPossible(
        `Welcome to Golden Apple — You're Checked In`,
        `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>Dear ${reservation.guest.full_name},</p><p>You've been successfully checked in to room ${reservation.room.room_number}. Enjoy your stay!</p></div>`
      );

      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    setError('');
    try {
      await checkOutReservation(reservationId, reservation.room_id);

      logActivity({
        actorId: staffProfile.id,
        action: 'guest_checked_out',
        entityTable: 'reservations',
        entityId: reservationId,
        details: { room: reservation.room?.room_number },
      });

      refresh();
      setShowReceipt(true);

      emailIfPossible(
        `Thank You for Staying at Golden Apple`,
        `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>Dear ${reservation.guest.full_name},</p><p>Thank you for staying with us. We hope to welcome you back soon.</p></div>`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !reservation) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const totalCharges = reservation.charges?.reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;
  const totalPaid = reservation.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const balance = totalCharges - totalPaid;

  if (showReceipt) {
    return (
      <Receipt
        reservation={reservation}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
      />
    );
  }

  const canCancel = reservation.status === 'pending' || reservation.status === 'confirmed';
  const isReadOnly = ['checked_out', 'cancelled', 'no_show'].includes(reservation.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{reservation.guest?.full_name} — Room {reservation.room?.room_number}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {reservation.status === 'pending' && reservation.cancellation_deadline && (
          <div className="pending-notice">
            Awaiting confirmation — guest can cancel free of charge until{' '}
            <strong>{new Date(reservation.cancellation_deadline).toLocaleString()}</strong>. This will
            auto-confirm after that time if not cancelled or manually confirmed.
          </div>
        )}

        {reservation.status === 'cancelled' && (
          <div className="pending-notice" style={{ borderColor: 'rgba(168,64,47,0.3)', background: 'rgba(168,64,47,0.1)', color: '#e0705c' }}>
            This reservation has been cancelled.
          </div>
        )}

        {reservation.status === 'checked_out' && (
          <div className="pending-notice" style={{ borderColor: 'rgba(74,124,89,0.3)', background: 'rgba(74,124,89,0.1)', color: '#6fbd85' }}>
            This guest has checked out. Record shown below is final — read only.
          </div>
        )}

        <div className="detail-grid">
          <div>
            <span className="detail-label">Status</span>
            <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <StatusBadge status={getEffectiveStatus(reservation)} />
              <StayCountdownBadge reservation={reservation} />
            </span>
          </div>
          <div>
            <span className="detail-label">Room Rate</span>
            <span className="detail-value">
              GH₵{Number(reservation.room?.price ?? 0).toFixed(2)} / night · {nightsBetween(reservation.check_in_date, reservation.check_out_date)} night(s)
            </span>
          </div>
          <div>
            <span className="detail-label">Phone</span>
            <span className="detail-value">{reservation.guest?.phone || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Email</span>
            <span className="detail-value">{reservation.guest?.email || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Nationality</span>
            <span className="detail-value">{reservation.guest?.nationality || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Check-in Date</span>
            <span className="detail-value">{reservation.check_in_date}</span>
          </div>
          <div>
            <span className="detail-label">Check-out Date</span>
            <span className="detail-value">{reservation.check_out_date}</span>
          </div>
          {reservation.actual_check_in && (
            <div>
              <span className="detail-label">Actual Check-in</span>
              <span className="detail-value">{new Date(reservation.actual_check_in).toLocaleString()}</span>
            </div>
          )}
          {reservation.actual_check_out && (
            <div>
              <span className="detail-label">Actual Check-out</span>
              <span className="detail-value">{new Date(reservation.actual_check_out).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="detail-actions">
          {reservation.status === 'pending' && (
            <button className="modal-btn-primary" onClick={handleConfirm} disabled={busy}>
              Confirm Reservation
            </button>
          )}
          {canCancel && (
            <button
              className="modal-btn-secondary"
              onClick={() => setShowRefundModal(true)}
              disabled={busy}
              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            >
              Cancel Reservation
            </button>
          )}
          {reservation.status === 'confirmed' && (
            <button className="modal-btn-primary" onClick={handleCheckIn} disabled={busy}>
              Check In
            </button>
          )}
          {reservation.status === 'checked_in' && (
            <button className="modal-btn-primary" onClick={handleCheckOut} disabled={busy}>
              Check Out
            </button>
          )}
          {reservation.status === 'checked_out' && (
            <button className="modal-btn-secondary" onClick={() => setShowReceipt(true)}>
              View / Print Receipt
            </button>
          )}
        </div>

        <div className="detail-section">
          <h3>Charges</h3>
          <ul className="detail-list">
            {reservation.charges?.map((c) => (
              <li key={c.id}>
                <span className="table-capitalize">{c.charge_type.replace('_', ' ')}</span>
                {c.description ? ` — ${c.description}` : ''}
                <span className="detail-list-amount">GH₵{Number(c.amount).toFixed(2)}</span>
              </li>
            ))}
            {(!reservation.charges || reservation.charges.length === 0) && (
              <li className="detail-list-empty">No charges recorded</li>
            )}
          </ul>
          {!isReadOnly && (
            <form onSubmit={handleAddCharge} className="inline-form">
              <select value={chargeForm.charge_type} onChange={(e) => setChargeForm({ ...chargeForm, charge_type: e.target.value })}>
                {CHARGE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <input
                type="text"
                placeholder="Description"
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
              />
              <button type="submit" disabled={busy}>Add</button>
            </form>
          )}
        </div>

        <div className="detail-section">
          <h3>Payment History</h3>
          <ul className="detail-list">
            {reservation.payments?.map((p) => (
              <li key={p.id}>
                <span className="table-capitalize">{p.method.replace('_', ' ')}</span>
                {p.reference ? ` — ${p.reference}` : ''}
                <span className="detail-list-date">{new Date(p.created_at).toLocaleString()}</span>
                <span className="detail-list-amount">GH₵{Number(p.amount).toFixed(2)}</span>
              </li>
            ))}
            {(!reservation.payments || reservation.payments.length === 0) && (
              <li className="detail-list-empty">No payments recorded</li>
            )}
          </ul>
          {!isReadOnly && (
            <form onSubmit={handleAddPayment} className="inline-form">
              <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
              <input
                type="text"
                placeholder="Reference (optional)"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
              <button type="submit" disabled={busy}>Add</button>
            </form>
          )}
        </div>

        {reservation.refunds && reservation.refunds.length > 0 && (
          <div className="detail-section">
            <h3>Refund History</h3>
            <ul className="detail-list">
              {reservation.refunds.map((r) => (
                <li key={r.id}>
                  <span className="table-capitalize">{r.method.replace('_', ' ')}</span>
                  {r.reason ? ` — ${r.reason}` : ''}
                  <span className="detail-list-date">{new Date(r.created_at).toLocaleString()}</span>
                  <span className="detail-list-amount" style={{ color: 'var(--color-danger)' }}>
                    -GH₵{Number(r.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="detail-summary">
          <div><span>Total Charges</span><span>GH₵{totalCharges.toFixed(2)}</span></div>
          <div><span>Total Paid</span><span>GH₵{totalPaid.toFixed(2)}</span></div>
          <div className={balance > 0 ? 'balance-due' : 'balance-clear'}>
            <span>Balance</span><span>GH₵{balance.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="modal-error">{error}</p>}
      </div>

      {showRefundModal && (
        <RefundModal
          reservation={reservation}
          totalPaid={totalPaid}
          onClose={() => setShowRefundModal(false)}
          onConfirm={handleCancelConfirmed}
        />
      )}
    </div>
  );
}

function buildPaymentEmail(reservation, payment) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #a3872b;">Golden Apple Guest House</h2>
      <p>Dear ${reservation.guest.full_name},</p>
      <p>We've received your payment. Details below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 6px 0; color: #666;">Room</td><td>${reservation.room.room_number}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Amount Paid</td><td>GH₵${payment.amount.toFixed(2)}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Method</td><td style="text-transform: capitalize;">${payment.method.replace('_', ' ')}</td></tr>
        ${payment.reference ? `<tr><td style="padding: 6px 0; color: #666;">Reference</td><td>${payment.reference}</td></tr>` : ''}
        <tr><td style="padding: 6px 0; color: #666;">Date &amp; Time</td><td>${payment.paidAt.toLocaleString()}</td></tr>
      </table>
      <p>Thank you.</p>
      <p style="color: #999; font-size: 12px;">Golden Apple Guest House</p>
    </div>
  `;
}