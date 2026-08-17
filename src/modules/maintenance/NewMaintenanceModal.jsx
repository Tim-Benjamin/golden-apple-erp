import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createMaintenanceRequest } from './maintenanceService';
import { sendTransactionalEmail } from '../../lib/emailService';

const CATEGORIES = ['electrical', 'plumbing', 'ac', 'generator', 'furniture', 'painting', 'cleaning_equipment', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function NewMaintenanceModal({ rooms, maintenanceOfficers, onClose, onCreated }) {
  const { staffProfile } = useAuth();
  const [form, setForm] = useState({
    room_id: '',
    category: 'electrical',
    priority: 'medium',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const request = await createMaintenanceRequest({
        room_id: form.room_id || null,
        category: form.category,
        priority: form.priority,
        description: form.description,
        reported_by: staffProfile.id,
        status: 'open',
      });

      // Notify all maintenance officers of the new request (non-blocking)
      maintenanceOfficers?.forEach((officer) => {
        if (officer.email) {
          sendTransactionalEmail({
            to: officer.email,
            subject: `New Maintenance Request${form.priority === 'urgent' ? ' — URGENT' : ''}`,
            html: `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>A new ${form.priority} priority maintenance request has been logged.</p><p><strong>Category:</strong> ${form.category}<br/><strong>Description:</strong> ${form.description}</p></div>`,
            actorId: staffProfile.id,
            action: 'maintenance_request_created',
            entityTable: 'maintenance_requests',
            entityId: request.id,
            details: { category: form.category, priority: form.priority },
          }).catch((err) => console.error('Email failed (non-blocking):', err));
        }
      });

      onCreated(request);
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
          <h2>New Maintenance Request</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Room (optional)
            <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
              <option value="">General / Not room-specific</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.room_number}</option>
              ))}
            </select>
          </label>

          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label>
            Priority
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label>
            Description
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}