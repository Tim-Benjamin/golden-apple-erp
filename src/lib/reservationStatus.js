// A reservation is considered "Reserved & Paid" when it's confirmed (not yet checked in)
// AND has at least one payment recorded. This is a derived/computed status, not stored
// in the database — it's calculated here so every part of the UI treats it consistently.

export function hasPayment(reservation) {
  return Array.isArray(reservation?.payments) && reservation.payments.length > 0;
}

export function getEffectiveStatus(reservation) {
  if (reservation.status === 'confirmed' && hasPayment(reservation)) {
    return 'confirmed_paid';
  }
  return reservation.status;
}