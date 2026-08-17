import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';
import { sendTransactionalEmail } from '../../lib/emailService';
import { sendPushNotification } from '../../lib/pushService';

const DEFAULT_ANNUAL_DAYS = 15;

export async function fetchMyEntitlement(staffId) {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('leave_entitlements')
    .select('*')
    .eq('staff_id', staffId)
    .eq('year', year)
    .maybeSingle();

  if (error) throw error;
  return data ?? { staff_id: staffId, year, annual_days: DEFAULT_ANNUAL_DAYS };
}

export async function fetchMyLeaveUsed(staffId) {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('leave_requests')
    .select('start_date, end_date, leave_type, status')
    .eq('staff_id', staffId)
    .eq('status', 'approved')
    .eq('leave_type', 'annual')
    .gte('start_date', `${year}-01-01`)
    .lte('end_date', `${year}-12-31`);

  if (error) throw error;

  const daysUsed = data.reduce((sum, r) => {
    const days = Math.round((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0);

  return daysUsed;
}

export async function fetchMyLeaveRequests(staffId) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createLeaveRequest(request) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(request)
    .select('*, staff:staff!leave_requests_staff_id_fkey(full_name)')
    .single();

  if (error) throw error;

  logActivity({
    actorId: request.staff_id,
    action: 'leave_requested',
    entityTable: 'leave_requests',
    entityId: data.id,
    details: { leave_type: request.leave_type, start_date: request.start_date, end_date: request.end_date },
  });

  // Notify managers/HR of the new request
  const { data: managers } = await supabase
    .from('staff')
    .select('id, email')
    .in('role', ['super_admin', 'general_manager', 'hr'])
    .eq('is_active', true);

  (managers ?? []).forEach((m) => {
    if (m.email) {
      sendTransactionalEmail({
        to: m.email,
        subject: `Leave Request — ${data.staff?.full_name}`,
        html: `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>${data.staff?.full_name} has requested ${request.leave_type.replace('_', '/')} leave from ${request.start_date} to ${request.end_date}.</p></div>`,
      }).catch(() => {});
    }
    sendPushNotification({
      staffId: m.id,
      title: 'New Leave Request',
      body: `${data.staff?.full_name} requested leave: ${request.start_date} → ${request.end_date}`,
      url: '/staff',
    }).catch(() => {});
  });

  return data;
}

export async function cancelLeaveRequest(requestId, staffId) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId: staffId,
    action: 'leave_cancelled',
    entityTable: 'leave_requests',
    entityId: requestId,
    details: {},
  });

  return data;
}

export async function fetchAllLeaveRequests({ status = 'all', staffId = 'all' } = {}) {
  let query = supabase
    .from('leave_requests')
    .select('*, staff:staff!leave_requests_staff_id_fkey(id, full_name, email), reviewer:staff!leave_requests_reviewed_by_fkey(full_name)')
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);
  if (staffId !== 'all') query = query.eq('staff_id', staffId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function reviewLeaveRequest(requestId, decision, reviewerId, notes) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status: decision,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', requestId)
    .select('*, staff:staff!leave_requests_staff_id_fkey(id, full_name, email)')
    .single();

  if (error) throw error;

  logActivity({
    actorId: reviewerId,
    action: decision === 'approved' ? 'leave_approved' : 'leave_rejected',
    entityTable: 'leave_requests',
    entityId: requestId,
    details: { notes },
  });

  if (data.staff?.email) {
    sendTransactionalEmail({
      to: data.staff.email,
      subject: `Leave Request ${decision === 'approved' ? 'Approved' : 'Rejected'} — Golden Apple`,
      html: `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>Your leave request (${data.start_date} → ${data.end_date}) has been <strong>${decision}</strong>.${notes ? ` Note: ${notes}` : ''}</p></div>`,
    }).catch(() => {});
  }

  sendPushNotification({
    staffId: data.staff_id,
    title: `Leave Request ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
    body: `${data.start_date} → ${data.end_date}`,
    url: '/my-account',
  }).catch(() => {});

  return data;
}

export async function setEntitlement(staffId, year, annualDays) {
  const { data, error } = await supabase
    .from('leave_entitlements')
    .upsert({ staff_id: staffId, year, annual_days: annualDays }, { onConflict: 'staff_id,year' })
    .select()
    .single();

  if (error) throw error;
  return data;
}