import { useState } from 'react';
import { createInventoryItem } from './inventoryService';

const CATEGORIES = ['food', 'drinks', 'cleaning_supplies', 'guest_supplies', 'office_supplies', 'furniture', 'maintenance_items'];

export default function NewItemModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    category: 'food',
    unit: '',
    quantity_on_hand: 0,
    low_stock_threshold: 5,
    expiry_date: '',
    unit_cost: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createInventoryItem({
        name: form.name,
        category: form.category,
        unit: form.unit || 'unit',
        quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
        low_stock_threshold: parseFloat(form.low_stock_threshold) || 5,
        expiry_date: form.expiry_date || null,
        unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Inventory Item</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Item Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label>
            Unit (e.g. bottle, kg, pack)
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="unit" />
          </label>

          <label>
            Starting Quantity
            <input type="number" step="0.01" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} />
          </label>

          <label>
            Low Stock Threshold
            <input type="number" step="0.01" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
          </label>

          <label>
            Expiry Date (optional)
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </label>

          <label>
            Unit Cost GH₵ (optional)
            <input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}