export function getRangeForPreset(preset) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const dayOfWeek = start.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      start.setDate(start.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

// Groups a date range into buckets appropriate to its span
// (day-by-day for week, week-by-week for month, month-by-month for year)
export function getBucketsForRange(preset, start, end) {
  const buckets = [];

  if (preset === 'today' || preset === 'week') {
    const cursor = new Date(start);
    while (cursor <= end) {
      buckets.push({
        label: cursor.toLocaleDateString('default', { weekday: 'short', day: 'numeric' }),
        start: new Date(cursor.setHours(0, 0, 0, 0)),
        end: new Date(cursor.setHours(23, 59, 59, 999)),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (preset === 'month') {
    const cursor = new Date(start);
    let weekNum = 1;
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > end) weekEnd.setTime(end.getTime());
      buckets.push({ label: `Wk ${weekNum}`, start: weekStart, end: weekEnd });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }
  } else if (preset === 'year') {
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(start.getFullYear(), m, 1);
      const monthEnd = new Date(start.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      if (monthStart > end) break;
      buckets.push({
        label: monthStart.toLocaleString('default', { month: 'short' }),
        start: monthStart,
        end: monthEnd,
      });
    }
  }

  return buckets;
}

export function getCustomRange(startStr, endStr) {
  const start = new Date(startStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Picks sensible bucket granularity based on how many days the custom range spans
export function getBucketsForCustomRange(start, end) {
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (days <= 14) {
    // day-by-day
    const buckets = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const dayStart = new Date(cursor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      buckets.push({
        label: cursor.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        start: dayStart,
        end: dayEnd,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  if (days <= 90) {
    // week-by-week
    const buckets = [];
    const cursor = new Date(start);
    let weekNum = 1;
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > end) weekEnd.setTime(end.getTime());
      buckets.push({ label: `Wk ${weekNum}`, start: weekStart, end: weekEnd });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }
    return buckets;
  }

  // month-by-month for anything longer
  const buckets = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    buckets.push({
      label: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      start: monthStart,
      end: monthEnd > end ? end : monthEnd,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

// Calculates the equivalent PRIOR period for comparison (e.g. "This Month" -> last month)
export function getPreviousRange(preset, start, end) {
  if (preset === 'custom') {
    const durationMs = end - start;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    return { start: prevStart, end: prevEnd };
  }

  switch (preset) {
    case 'today': {
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);
      return { start: prevStart, end: prevEnd };
    }
    case 'week': {
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 7);
      return { start: prevStart, end: prevEnd };
    }
    case 'month': {
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      return { start: prevStart, end: prevEnd };
    }
    case 'year': {
      const prevStart = new Date(start.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { start: prevStart, end: prevEnd };
    }
    default:
      return { start, end };
  }
}