import { useState } from 'react';
import { createStaffAccount } from './staffService';
import { ALL_ROLES, ROLE_LABELS } from '../../config/roles';

function generateSuggestedPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default function AddStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'front_desk',
    password: generateSuggestedPassword(),
  });
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createStaffAccount(form);
      setSuccess(true);
      onCreated();
    } catch (err) {
      setError(err.message ?? 'Failed to create staff account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Staff Member</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {success ? (
          <div>
            <p style={{ color: 'var(--color-success)', marginBottom: '0.75rem' }}>
              Account created for {form.email}.
            </p>
            <div className="staff-credentials-box">
              <div><span className="detail-label">Email</span><div className="detail-value">{form.email}</div></div>
              <div style={{ marginTop: '0.6rem' }}><span className="detail-label">Password</span><div className="detail-value">{form.password}</div></div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
              Share these credentials with the staff member securely. They can change their password after logging in.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <label>
              Full Name
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>

            <label>
              Password (min 8 characters)
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="modal-btn-secondary"
                  onClick={() => setForm({ ...form, password: generateSuggestedPassword() })}
                >
                  Regenerate
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', fontSize: '0.78rem' }}>
                <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} style={{ width: 'auto' }} />
                Show password
              </label>
            </label>

            {error && <p className="modal-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="modal-btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}