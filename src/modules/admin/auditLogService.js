import { supabase } from '../../lib/supabaseClient';

const PAGE_SIZE = 50;

export async function fetchAuditLog({ page = 0, action = 'all', actorId = 'all', fromDate = '', toDate = '', search = '' } = {}) {
  let query = supabase
    .from('audit_log')
    .select('*, staff(id, full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (action !== 'all') {
    query = query.eq('action', action);
  }
  if (actorId !== 'all') {
    query = query.eq('actor_id', actorId);
  }
  if (fromDate) {
    query = query.gte('created_at', `${fromDate}T00:00:00.000Z`);
  }
  if (toDate) {
    query = query.lte('created_at', `${toDate}T23:59:59.999Z`);
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  // Client-side search across action name, actor name, and details JSON —
  // kept simple since audit_log details vary in shape per action.
  const filtered = search
    ? data.filter((row) => {
        const q = search.toLowerCase();
        return (
          row.action?.toLowerCase().includes(q) ||
          row.staff?.full_name?.toLowerCase().includes(q) ||
          JSON.stringify(row.details ?? {}).toLowerCase().includes(q)
        );
      })
    : data;

  return { rows: filtered, totalCount: count ?? 0, pageSize: PAGE_SIZE };
}

export async function fetchDistinctActions() {
  const { data, error } = await supabase.from('audit_log').select('action');
  if (error) throw error;
  return [...new Set(data.map((r) => r.action))].sort();
}

export async function fetchActiveStaffForFilter() {
  const { data, error } = await supabase
    .from('staff')
    .select('id, full_name')
    .order('full_name');
  if (error) throw error;
  return data;
}