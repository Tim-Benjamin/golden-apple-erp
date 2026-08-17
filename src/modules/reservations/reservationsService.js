import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';
import { nightsBetween } from '../../lib/stayCountdown';

export async function autoConfirmDueReservations() {
  const nowISO = new Date().toISOString();
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'confirmed', confirmed_at: nowISO, auto_confirmed: true })
    .eq('status', 'pending')
    .lte('cancellation_deadline', nowISO);

  if (error) console.error('Auto-confirm failed:', error);
}

// Lazily checks out any guest whose scheduled check-out date has fully passed
// (i.e. today is later than their check_out_date) but who was never manually
// checked out. Runs on every reservation list load — same pattern as auto-confirm.
export async function autoCheckoutOverdueReservations() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const { data: overdue, error } = await supabase
    .from('reservations')
    .select('id, room_id, check_out_date')
    .eq('status', 'checked_in')
    .lt('check_out_date', todayISO);

  if (error) {
    console.error('Auto-checkout failed:', error);
    return;
  }
  if (!overdue || overdue.length === 0) return;

  for (const r of overdue) {
    const nowISO = new Date().toISOString();
    await supabase
      .from('reservations')
      .update({ status: 'checked_out', actual_check_out: nowISO })
      .eq('id', r.id);
    await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', r.room_id);

    logActivity({
      actorId: null,
      action: 'guest_checked_out',
      entityTable: 'reservations',
      entityId: r.id,
      details: { auto: true, reason: 'checkout_date_passed' },
    });
  }
}

export async function fetchReservations() {
  await autoConfirmDueReservations();
  await autoCheckoutOverdueReservations();

  const { data, error } = await supabase
    .from('reservations')
    .select(`*, guest:guests(*), room:rooms(*), payments(id, amount)`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchReservationDetail(reservationId) {
  await autoConfirmDueReservations();
  await autoCheckoutOverdueReservations();

  const { data, error } = await supabase
    .from('reservations')
    .select(`*, guest:guests(*), room:rooms(*), charges(*), payments(*), refunds(*)`)
    .eq('id', reservationId)
    .single();

  if (error) throw error;
  return data;
}

export async function createReservation(reservation) {
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select(`*, guest:guests(*), room:rooms(*)`)
    .single();

  if (error) throw error;
  return data;
}

export async function confirmReservation(reservationId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', reservationId)
    .select(`*, guest:guests(*), room:rooms(*)`)
    .single();

  if (error) throw error;
  return data;
}

export async function cancelReservation(reservationId, roomId, refund) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .select(`*, guest:guests(*), room:rooms(*)`)
    .single();

  if (error) throw error;

  if (roomId) {
    await supabase.from('rooms').update({ status: 'vacant' }).eq('id', roomId);
  }

  if (refund && refund.amount > 0) {
    const { error: refundError } = await supabase.from('refunds').insert({
      reservation_id: reservationId,
      amount: refund.amount,
      method: refund.method,
      reason: refund.reason,
      processed_by: refund.processedBy,
    });
    if (refundError) throw refundError;
  }

  return data;
}

// Checking in now auto-adds the room charge (nights × current room price) so
// front desk never has to manually re-type the amount. It only adds this once —
// if a "room" charge already exists (e.g. added manually before this feature,
// or added again for some reason), it won't duplicate it.
export async function checkInReservation(reservationId, roomId, actorId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'checked_in', actual_check_in: new Date().toISOString() })
    .eq('id', reservationId)
    .select(`*, guest:guests(*), room:rooms(*)`)
    .single();

  if (error) throw error;

  await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId);

  const { data: existingRoomCharges } = await supabase
    .from('charges')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('charge_type', 'room')
    .limit(1);

  if (!existingRoomCharges || existingRoomCharges.length === 0) {
    const nights = nightsBetween(data.check_in_date, data.check_out_date);
    const roomPrice = Number(data.room.price);
    const amount = nights * roomPrice;

    const { data: charge } = await supabase
      .from('charges')
      .insert({
        reservation_id: reservationId,
        charge_type: 'room',
        description: `${nights} night(s) @ GH₵${roomPrice.toFixed(2)}/night`,
        amount,
        created_by: actorId ?? null,
      })
      .select()
      .single();

    if (charge) {
      logActivity({
        actorId: actorId ?? null,
        action: 'charge_added',
        entityTable: 'charges',
        entityId: charge.id,
        details: { reservation_id: reservationId, room: data.room.room_number, charge_type: 'room', amount, auto: true },
      });
    }
  }

  return data;
}

export async function checkOutReservation(reservationId, roomId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'checked_out', actual_check_out: new Date().toISOString() })
    .eq('id', reservationId)
    .select(`*, guest:guests(*), room:rooms(*)`)
    .single();

  if (error) throw error;

  await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', roomId);

  return data;
}

export async function addCharge(reservationId, charge) {
  const { data, error } = await supabase
    .from('charges')
    .insert({ reservation_id: reservationId, ...charge })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addPayment(reservationId, payment) {
  const { data, error } = await supabase
    .from('payments')
    .insert({ reservation_id: reservationId, ...payment })
    .select()
    .single();

  if (error) throw error;
  return data;
}