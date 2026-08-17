import { useState } from 'react';
import { uploadAvatar } from '../../lib/avatarUpload';
import { updateEmployeeProfile } from './employeeProfileService';
import './PersonalProfileForm.css';

// readOnly=true renders the fields as plain text (used when an admin views someone
// else's profile without HR/edit permissions). editable users get real inputs.
export default function PersonalProfileForm({ staff, currentActorId, editable, onSaved }) {
  const [form, setForm] = useState({
    date_of_birth: staff.date_of_birth ?? '',
    gender: staff.gender ?? '',
    phone: staff.phone ?? '',
    address: staff.address ?? '',
    emergency_contact_name: staff.emergency_contact_name ?? '',
    emergency_contact_phone: staff.emergency_contact_phone ?? '',
  });
  const [avatarUrl, setAvatarUrl] = useState(staff.avatar_url ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const url = await uploadAvatar(staff.id, file);
      setAvatarUrl(url);
      await updateEmployeeProfile(staff.id, { avatar_url: url }, currentActorId);
      onSaved?.();
    } catch (err) {
      setError(err.message ?? 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await updateEmployeeProfile(
        staff.id,
        {
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          phone: form.phone || null,
          address: form.address || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
        },
        currentActorId
      );
      setSuccess(true);
      onSaved?.();
    } catch (err) {
      setError(err.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-form-wrapper">
      <div className="profile-avatar-row">
        <div className="profile-avatar-circle">
          {avatarUrl ? (
            <img src={avatarUrl} alt={staff.full_name} />
          ) : (
            <span>{staff.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
          )}
        </div>
        {editable && (
          <label className="profile-avatar-upload-btn">
            {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/*" hidden onChange={handlePhotoChange} disabled={uploadingPhoto} />
          </label>
        )}
      </div>

      <div className="profile-id-row">
        <span className="detail-label">Employee ID</span>
        <span className="detail-value">{staff.staff_code ?? '—'}</span>
      </div>

      {editable ? (
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <label>
              Date of Birth
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </label>
            <label>
              Gender
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label>
              Emergency Contact Name
              <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </label>
            <label>
              Emergency Contact Phone
              <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </label>
          </div>

          {error && <p className="modal-error">{error}</p>}
          {success && <p style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>Profile saved.</p>}

          <button type="submit" className="modal-btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      ) : (
        <div className="detail-grid" style={{ marginTop: '1rem' }}>
          <div><span className="detail-label">Date of Birth</span><span className="detail-value">{staff.date_of_birth ?? '—'}</span></div>
          <div><span className="detail-label">Gender</span><span className="detail-value table-capitalize">{staff.gender ?? '—'}</span></div>
          <div><span className="detail-label">Phone</span><span className="detail-value">{staff.phone ?? '—'}</span></div>
          <div><span className="detail-label">Address</span><span className="detail-value">{staff.address ?? '—'}</span></div>
          <div><span className="detail-label">Emergency Contact</span><span className="detail-value">{staff.emergency_contact_name ?? '—'}</span></div>
          <div><span className="detail-label">Emergency Phone</span><span className="detail-value">{staff.emergency_contact_phone ?? '—'}</span></div>
        </div>
      )}
    </div>
  );
}