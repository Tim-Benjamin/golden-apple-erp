// Computes a human-readable countdown + urgency level for a reservation's
// upcoming check-in or check-out, used across the detail modal, tables, and calendar.

function daysBetween(fromISO, toISO) {
  const a = new Date(`${fromISO}T00:00:00`);
  const b = new Date(`${toISO}T00:00:00`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function getStayCountdown(reservation) {
  const todayISO = new Date().toISOString().slice(0, 10);

  if (reservation.status === 'checked_in') {
    const daysLeft = daysBetween(todayISO, reservation.check_out_date);
    if (daysLeft < 0) return { label: 'Checkout overdue', urgency: 'overdue' };
    if (daysLeft === 0) return { label: 'Checkout today', urgency: 'warning' };
    if (daysLeft === 1) return { label: 'Checkout tomorrow', urgency: 'warning' };
    return { label: `${daysLeft} days until checkout`, urgency: 'normal' };
  }

  if (reservation.status === 'confirmed' || reservation.status === 'pending') {
    const daysUntil = daysBetween(todayISO, reservation.check_in_date);
    if (daysUntil < 0) return { label: 'Check-in overdue', urgency: 'overdue' };
    if (daysUntil === 0) return { label: 'Check-in today', urgency: 'warning' };
    if (daysUntil === 1) return { label: 'Check-in tomorrow', urgency: 'warning' };
    return { label: `${daysUntil} days until check-in`, urgency: 'normal' };
  }

  return null;
}

export function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}