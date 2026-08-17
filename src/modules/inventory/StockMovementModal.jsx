import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { recordStockMovement } from './inventoryService';

const MOVEMENT_TYPES = ['receive', 'issue', 'transfer', 'return', 'adjust'];

export default function StockMovementModal({ item, onClose, onRecorded }) {
  const { staffProfile } = useAuth();
  const [form, setForm] = useState({ movement_type: 'receive', quantity: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdjust = form.movement_type === 'adjust';

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await recordStockMovement({
        item_id: item.id,
        movement_type: form.movement_type,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
        performed_by: staffProfile.id,
      });
      onRecorded();
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
          <h2>Stock Movement — {item.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Current stock: <strong style={{ color: 'var(--color-gold)' }}>{item.quantity_on_hand} {item.unit}</strong>
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Movement Type
            <select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
              {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label>
            {isAdjust ? 'Adjustment (use negative for reduction, e.g. -3)' : 'Quantity'}
            <input
              type="number"
              step="0.01"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </label>

          <label>
            Reason / Notes
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Supplier delivery, spoilage, breakage" />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}