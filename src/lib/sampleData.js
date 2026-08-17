// TEMPORARY sample data for dashboard charts.
// Replace each function's internals with real Supabase queries once
// the Finance/Reservations modules are built (Payments table, Charges table).

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRevenueTrend() {
  await delay(500);
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  return months.map((month) => ({
    month,
    income: Math.round(18000 + Math.random() * 12000),
    expenses: Math.round(9000 + Math.random() * 7000),
  }));
}

export async function fetchExpenseBreakdown() {
  await delay(500);
  return [
    { name: 'Salaries', value: 8200 },
    { name: 'Electricity', value: 2100 },
    { name: 'Water', value: 900 },
    { name: 'Food & Supplies', value: 3400 },
    { name: 'Maintenance', value: 1600 },
    { name: 'Marketing', value: 1100 },
  ];
}

export async function fetchOccupancyTrend() {
  await delay(500);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    occupied: Math.floor(Math.random() * 8) + 2,
    vacant: 10,
  }));
}

export async function fetchBookingSources() {
  await delay(500);
  return [
    { name: 'Direct', value: 34 },
    { name: 'Booking.com', value: 28 },
    { name: 'WhatsApp', value: 18 },
    { name: 'Expedia', value: 10 },
    { name: 'Agoda', value: 6 },
    { name: 'Airbnb', value: 4 },
  ];
}