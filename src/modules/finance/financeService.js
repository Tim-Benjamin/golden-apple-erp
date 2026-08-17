import { supabase } from '../../lib/supabaseClient';

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, staff(full_name)')
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createExpense(expense) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Real revenue trend for the last 6 months, built from `payments`
export async function fetchRealRevenueTrend() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [{ data: payments, error: pError }, { data: expenses, error: eError }] = await Promise.all([
    supabase.from('payments').select('amount, created_at').gte('created_at', sixMonthsAgo.toISOString()),
    supabase.from('expenses').select('amount, expense_date').gte('expense_date', sixMonthsAgo.toISOString().slice(0, 10)),
  ]);

  if (pError) throw pError;
  if (eError) throw eError;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short' }) });
  }

  return months.map(({ key, label }) => {
    const [year, month] = key.split('-').map(Number);
    const income = payments
      .filter((p) => {
        const d = new Date(p.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const expensesTotal = expenses
      .filter((e) => {
        const d = new Date(e.expense_date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return { month: label, income, expenses: expensesTotal };
  });
}

// Real expense breakdown for the current month, built from `expenses`
export async function fetchRealExpenseBreakdown() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .gte('expense_date', startOfMonth);

  if (error) throw error;

  const grouped = {};
  data.forEach((e) => {
    grouped[e.category] = (grouped[e.category] || 0) + Number(e.amount);
  });

  return Object.entries(grouped).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));
}

// Today's stats for the dashboard stat cards.
// IMPORTANT: "outstanding" only counts charges/payments tied to reservations that are
// still active (pending/confirmed/checked_in/checked_out). Cancelled or no-show
// reservations are excluded so a cancelled booking never inflates what guests "still owe".
export async function fetchTodayStats() {
  const today = new Date().toISOString().slice(0, 10);
  const startOfToday = `${today}T00:00:00.000Z`;
  const endOfToday = `${today}T23:59:59.999Z`;

  const [
    { data: rooms },
    { data: todayCheckIns },
    { data: todayCheckOuts },
    { data: todayPayments },
    { data: chargesWithStatus },
    { data: paymentsWithStatus },
    { data: reservedPaid },
  ] = await Promise.all([
    supabase.from('rooms').select('status'),
    supabase.from('reservations').select('id').gte('actual_check_in', startOfToday).lte('actual_check_in', endOfToday),
    supabase.from('reservations').select('id').gte('actual_check_out', startOfToday).lte('actual_check_out', endOfToday),
    supabase.from('payments').select('amount').gte('created_at', startOfToday).lte('created_at', endOfToday),
    supabase.from('charges').select('amount, reservation:reservations(status)'),
    supabase.from('payments').select('amount, reservation:reservations(status)'),
    supabase.from('reservations').select('id, payments(id)').in('status', ['confirmed', 'checked_in']),
  ]);

  const occupied = rooms?.filter((r) => r.status === 'occupied').length ?? 0;
  const vacant = rooms?.filter((r) => r.status === 'vacant').length ?? 0;

  const isActive = (row) => row.reservation && !['cancelled', 'no_show'].includes(row.reservation.status);

  const totalCharges = chargesWithStatus?.filter(isActive).reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;
  const totalPaidActive = paymentsWithStatus?.filter(isActive).reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalOutstanding = Math.max(0, totalCharges - totalPaidActive);

  const revenueTodayPayments = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  // Revenue Today folds in all currently outstanding (unpaid, active) balances, per business logic
  const revenueToday = revenueTodayPayments + totalOutstanding;

  const reservedAndPaid = reservedPaid?.filter((r) => r.payments && r.payments.length > 0).length ?? 0;

  return {
    occupancy: `${occupied} / ${rooms?.length ?? 0}`,
    vacantRooms: vacant,
    checkInsToday: todayCheckIns?.length ?? 0,
    checkOutsToday: todayCheckOuts?.length ?? 0,
    revenueToday: `GH₵${revenueToday.toLocaleString()}`,
    revenueTodayBreakdown: `GH₵${revenueTodayPayments.toLocaleString()} collected + GH₵${totalOutstanding.toLocaleString()} outstanding`,
    reservedAndPaid,
  };
}

// Financial summary for a given date range (used by Reports page).
// Same fix applied here: "outstanding" excludes cancelled/no-show reservations.
export async function fetchFinancialSummary(startISO, endISO) {
  const [
    { data: payments, error: pError },
    { data: expenses, error: eError },
    { data: chargesWithStatus, error: cError },
    { data: refunds, error: rError },
  ] = await Promise.all([
    supabase.from('payments').select('amount, method, created_at').gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('expenses').select('amount, category, expense_date').gte('expense_date', startISO.slice(0, 10)).lte('expense_date', endISO.slice(0, 10)),
    supabase.from('charges').select('amount, charge_type, created_at, reservation:reservations(status)').gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('refunds').select('amount, created_at').gte('created_at', startISO).lte('created_at', endISO),
  ]);

  if (pError) throw pError;
  if (eError) throw eError;
  if (cError) throw cError;
  if (rError) throw rError;

  const activeCharges = chargesWithStatus.filter(
    (c) => c.reservation && !['cancelled', 'no_show'].includes(c.reservation.status)
  );

  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCharged = activeCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    totalIncome,
    totalExpenses,
    totalCharged,
    totalRefunds,
    netBalance: totalIncome - totalExpenses - totalRefunds,
    outstanding: Math.max(0, totalCharged - totalIncome),
    incomeByMethod: groupSum(payments, 'method', 'amount'),
    expensesByCategory: groupSum(expenses, 'category', 'amount'),
    chargesByType: groupSum(activeCharges, 'charge_type', 'amount'),
    payments,
    expenses,
    charges: activeCharges,
    refunds,
  };
}

export async function fetchTrendForBuckets(buckets) {
  const results = [];
  for (const bucket of buckets) {
    const startISO = bucket.start.toISOString();
    const endISO = bucket.end.toISOString();

    const [{ data: payments }, { data: expenses }] = await Promise.all([
      supabase.from('payments').select('amount').gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('expenses').select('amount').gte('expense_date', startISO.slice(0, 10)).lte('expense_date', endISO.slice(0, 10)),
    ]);

    results.push({
      label: bucket.label,
      income: payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0,
      expenses: expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0,
    });
  }
  return results;
}

export async function fetchActivityLog(startISO, endISO) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*, staff(full_name)')
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return data;
}

export async function fetchTopPerformers(startISO, endISO) {
  const [{ data: charges, error: cErr }, { data: reservations, error: rErr }] = await Promise.all([
    supabase.from('charges').select('amount, reservation_id, created_at').gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('reservations').select('id, booking_source, actual_check_in, created_at, room:rooms(room_number)').gte('created_at', startISO).lte('created_at', endISO),
  ]);

  if (cErr) throw cErr;
  if (rErr) throw rErr;

  const resMap = {};
  reservations.forEach((r) => { resMap[r.id] = r; });

  const roomRevenue = {};
  charges.forEach((c) => {
    const res = resMap[c.reservation_id];
    const label = res?.room?.room_number ?? 'Unknown';
    roomRevenue[label] = (roomRevenue[label] || 0) + Number(c.amount);
  });
  const topRoomEntry = Object.entries(roomRevenue).sort((a, b) => b[1] - a[1])[0];

  const sourceCounts = {};
  reservations.forEach((r) => {
    sourceCounts[r.booking_source] = (sourceCounts[r.booking_source] || 0) + 1;
  });
  const topSourceEntry = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];

  const dayCounts = {};
  reservations.forEach((r) => {
    if (!r.actual_check_in) return;
    const day = new Date(r.actual_check_in).toLocaleDateString('default', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const topDayEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    topRoom: topRoomEntry ? { label: topRoomEntry[0], value: topRoomEntry[1] } : null,
    topSource: topSourceEntry ? { label: topSourceEntry[0].replace('_', ' '), value: topSourceEntry[1] } : null,
    topDay: topDayEntry ? { label: topDayEntry[0], value: topDayEntry[1] } : null,
  };
}

function groupSum(rows, groupKey, sumKey) {
  const grouped = {};
  rows.forEach((r) => {
    const key = r[groupKey];
    grouped[key] = (grouped[key] || 0) + Number(r[sumKey]);
  });
  return Object.entries(grouped).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
}