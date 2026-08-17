import { supabase } from '../../lib/supabaseClient';

export async function fetchInventoryItems() {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('category')
    .order('name');

  if (error) throw error;
  return data;
}

export async function createInventoryItem(item) {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordStockMovement(movement) {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert(movement)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchItemMovementHistory(itemId) {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*, staff(full_name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}