import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateOwnPassword } from '../staff/staffService';
import PersonalProfileForm from '../staff/PersonalProfileForm';
import ClockInOutWidget from '../staff/ClockInOutWidget';
import MyTasksWidget from '../staff/MyTasksWidget';
import MyChecklistsWidget from '../staff/MyChecklistsWidget';
import MyLeaveWidget from '../staff/MyLeaveWidget';
import {
  isPushSupported,
  getPushPermissionState,
  enablePushNotifications,
  disablePushNotifications,
  isCurrentlySubscribed,
} from '../../lib/pushNotifications';
import './MyAccountPage.css';
import MyDocumentsWidget from '../staff/MyDocumentsWidget';
import MyTrainingWidget from '../staff/MyTrainingWidget';
import MyMeetingsWidget from '../staff/MyMeetingsWidget';

export default function MyAccountPage() {
  const { staffProfile, role } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [pushSupported, setPushSupported] = useState(true);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    setPushSupported(isPushSupported());
    if (isPushSupported()) {
      isCurrentlySubscribed().then(setPushSubscribed);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await updateOwnPassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message ?? 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePush() {
    setPushBusy(true);
    setPushError('');
    try {
      if (pushSubscribed) {
        await disablePushNotifications(staffProfile.id);
        setPushSubscribed(false);
      } else {
        await enablePushNotifications(staffProfile.id);
        setPushSubscribed(true);
      }
    } catch (err) {
      setPushError(err.message ?? 'Failed to update notification settings.');
    } finally {
      setPushBusy(false);
    }
  }

  if (!staffProfile) return null;

  return (
    <div>
      <h1 className="page-title">My Account</h1>
      <p className="page-subtitle">Manage your profile, login details, and notifications</p>

      <ClockInOutWidget />
      <MyTasksWidget />
      <MyChecklistsWidget />

      <MyChecklistsWidget />
      <MyLeaveWidget />

      <MyDocumentsWidget />
      <MyTrainingWidget />

      <MyMeetingsWidget />

      <div className="account-card">
        <h3 className="hk-section-title">My Profile</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          {staffProfile.full_name} · {staffProfile.email} ·{' '}
          <span className="table-capitalize">{role?.replace('_', ' ')}</span>
        </p>
        <PersonalProfileForm staff={staffProfile} currentActorId={staffProfile.id} editable />
      </div>

      <div className="account-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="hk-section-title">Notifications</h3>
        {!pushSupported ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Push notifications aren't supported on this browser/device. On iPhone, add this app to your
            Home Screen first (via the Install banner), then check back here.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.85rem' }}>
              {pushSubscribed
                ? "You'll receive notifications on this device for things assigned to you (room assignments, scheduled duties, and more)."
                : 'Turn this on to get notified on this device when something is assigned to you.'}
            </p>
            <button className="modal-btn-primary" onClick={handleTogglePush} disabled={pushBusy}>
              {pushBusy ? 'Working...' : pushSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
            </button>
            {pushError && <p className="modal-error" style={{ marginTop: '0.6rem' }}>{pushError}</p>}
          </>
        )}
      </div>

      <div className="account-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="hk-section-title">Change Password</h3>
        <form onSubmit={handleSubmit} className="modal-form" style={{ maxWidth: '360px' }}>
          <label>
            New Password
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm New Password
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {error && <p className="modal-error">{error}</p>}
          {success && <p style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>Password updated successfully.</p>}

          <button type="submit" className="modal-btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}