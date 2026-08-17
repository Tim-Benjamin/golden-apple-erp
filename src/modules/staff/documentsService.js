import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchDocumentsFor(staffId) {
  const { data, error } = await supabase
    .from('staff_documents')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAllDocuments({ staffId = 'all', documentType = 'all' } = {}) {
  let query = supabase
    .from('staff_documents')
    .select('*, staff:staff!staff_documents_staff_id_fkey(id, full_name)')
    .order('created_at', { ascending: false });

  if (staffId !== 'all') query = query.eq('staff_id', staffId);
  if (documentType !== 'all') query = query.eq('document_type', documentType);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function uploadDocument({ staffId, documentType, title, expiryDate, file, actorId }) {
  const ext = file.name.split('.').pop();
  const path = `${staffId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { error: uploadError } = await supabase.storage.from('staff-documents').upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('staff_documents')
    .insert({
      staff_id: staffId,
      document_type: documentType,
      title,
      file_path: path,
      expiry_date: expiryDate || null,
      uploaded_by: actorId,
    })
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId,
    action: 'document_uploaded',
    entityTable: 'staff_documents',
    entityId: data.id,
    details: { staff_id: staffId, document_type: documentType, title },
  });

  return data;
}

export async function getDocumentUrl(filePath) {
  const { data, error } = await supabase.storage.from('staff-documents').createSignedUrl(filePath, 300); // 5 min link
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(documentId, filePath, actorId) {
  await supabase.storage.from('staff-documents').remove([filePath]);
  const { error } = await supabase.from('staff_documents').delete().eq('id', documentId);
  if (error) throw error;

  logActivity({
    actorId,
    action: 'document_deleted',
    entityTable: 'staff_documents',
    entityId: documentId,
    details: {},
  });
}

export async function fetchExpiringDocuments(daysAhead = 30) {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const futureISO = future.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('staff_documents')
    .select('*, staff:staff!staff_documents_staff_id_fkey(full_name)')
    .not('expiry_date', 'is', null)
    .gte('expiry_date', today)
    .lte('expiry_date', futureISO)
    .order('expiry_date');

  if (error) throw error;
  return data;
}