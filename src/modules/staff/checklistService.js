import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchAllTemplates() {
  const { data, error } = await supabase.from('checklist_templates').select('*').eq('is_active', true).order('title');
  if (error) throw error;
  return data;
}

export async function fetchTemplatesForRole(role) {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('is_active', true)
    .contains('applicable_roles', [role]);

  if (error) throw error;
  return data;
}

export async function createTemplate(template) {
  const { data, error } = await supabase.from('checklist_templates').insert(template).select().single();
  if (error) throw error;
  return data;
}

export async function fetchOrCreateTodayCompletion(templateId, staffId) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: fetchError } = await supabase
    .from('checklist_completions')
    .select('*')
    .eq('template_id', templateId)
    .eq('staff_id', staffId)
    .eq('work_date', today)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('checklist_completions')
    .insert({ template_id: templateId, staff_id: staffId, work_date: today, checked_items: [], completed: false })
    .select()
    .single();

  if (createError) throw createError;
  return created;
}

export async function toggleChecklistItem(completionId, checkedItems, itemCount, staffId) {
  const completed = checkedItems.filter(Boolean).length === itemCount && itemCount > 0;

  const { data, error } = await supabase
    .from('checklist_completions')
    .update({
      checked_items: checkedItems,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', completionId)
    .select()
    .single();

  if (error) throw error;

  if (completed) {
    logActivity({
      actorId: staffId,
      action: 'checklist_completed',
      entityTable: 'checklist_completions',
      entityId: completionId,
      details: {},
    });
  }

  return data;
}

// Admin view: for a given date, shows every template × every applicable staff member,
// with their completion status — so management can see who has/hasn't done their checklist.
export async function fetchChecklistStatusForDate(dateISO) {
  const [{ data: templates, error: templatesError }, { data: staffList, error: staffError }, { data: completions, error: completionsError }] =
    await Promise.all([
      supabase.from('checklist_templates').select('*').eq('is_active', true),
      supabase.from('staff').select('id, full_name, role').eq('is_active', true),
      supabase.from('checklist_completions').select('*').eq('work_date', dateISO),
    ]);

  if (templatesError) throw templatesError;
  if (staffError) throw staffError;
  if (completionsError) throw completionsError;

  const rows = [];
  templates.forEach((template) => {
    const applicableStaff = staffList.filter((s) => template.applicable_roles.includes(s.role));
    applicableStaff.forEach((staffMember) => {
      const completion = completions.find((c) => c.template_id === template.id && c.staff_id === staffMember.id);
      rows.push({
        template,
        staff: staffMember,
        completion: completion ?? null,
        completed: completion?.completed ?? false,
      });
    });
  });

  return rows;
}