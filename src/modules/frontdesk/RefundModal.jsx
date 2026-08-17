import { useState } from 'react';

const PAYMENT_METHODS = ['cash', 'momo', 'pos', 'bank_transfer', 'stripe'];

export default function RefundModal({ reservation, totalPaid, onClose, onConfirm }) {
  const [issueRefund, setIssueRefund] = useState(totalPaid > 0);
  const [form, setForm] = useState({ amount: totalPaid, method: 'cash', reason: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onConfirm(issueRefund ? { amount: parseFloat(form.amount), method: form.method, reason: form.reason } : null);
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cancel Reservation</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {reservation.guest?.full_name} — Room {reservation.room?.room_number}
        </p>

        {totalPaid > 0 && (
          <label className="checklist-item" style={{ marginBottom: '1rem' }}>
            <input type="checkbox" checked={issueRefund} onChange={(e) => setIssueRefund(e.target.checked)} />
            Issue a refund (Total paid: GH₵{totalPaid.toFixed(2)})
          </label>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {issueRefund && totalPaid > 0 && (
            <>
              <label>
                Refund Amount (GH₵)
                <input
                  type="number"
                  step="0.01"
                  max={totalPaid}
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label>
                Refund Method
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </label>
            </>
          )}

          <label>
            Reason for Cancellation
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" />
          </label>

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Back</button>
            <button type="submit" className="modal-btn-primary" disabled={saving} style={{ background: 'var(--color-danger)' }}>
              {saving ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}