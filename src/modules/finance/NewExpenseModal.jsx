import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createExpense } from './financeService';

const CATEGORIES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water (Utility Bill)' },
  { value: 'water_purchase', label: 'Water Purchase (Tanker/Sachet)' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet' },
  { value: 'wifi_prepaid', label: 'WiFi Prepaid Top-up' },
  { value: 'staff_salaries', label: 'Staff Salaries' },
  { value: 'staff_uniforms', label: 'Staff Uniforms' },
  { value: 'purchases', label: 'General Purchases' },
  { value: 'food_items_purchase', label: 'Food Items Purchase' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'fuel', label: 'Fuel (Vehicle)' },
  { value: 'generator_fuel', label: 'Generator Fuel' },
  { value: 'bin_collection', label: 'Bin Collection' },
  { value: 'septic_tank_collection', label: 'Septic Tank Collection' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = ['cash', 'momo', 'pos', 'bank_transfer', 'stripe'];

export default function NewExpenseModal({ onClose, onCreated }) {
  const { staffProfile } = useAuth();
  const [form, setForm] = useState({
    category: 'electricity',
    description: '',
    amount: '',
    payment_method: 'cash',
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createExpense({
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        expense_date: form.expense_date,
        recorded_by: staffProfile.id,
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
          <h2>Record Expense</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <label>
            Description
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <label>
            Amount (GH₵)
            <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>

          <label>
            Payment Method
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label>
            Date
            <input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 