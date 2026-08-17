import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInstallPromptState, subscribeToInstallPrompt, triggerInstallPrompt } from '../../lib/installPromptStore';
import './TopBar.css';

const roleLabels = {
  super_admin: 'Super Admin',
  general_manager: 'General Manager',
  assistant_manager: 'Assistant Manager',
  front_desk: 'Front Desk',
  accountant: 'Accountant',
  housekeeper: 'Housekeeper',
  maintenance_officer: 'Maintenance Officer',
  kitchen_staff: 'Kitchen Staff',
  store_manager: 'Store Manager',
  security: 'Security',
  hr: 'HR',
  auditor: 'Auditor',
};

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function TopBar({ onMenuClick }) {
  const { staffProfile, role, signOut } = useAuth();
  const [canInstall, setCanInstall] = useState(getInstallPromptState().canInstall);
  const [installed, setInstalled] = useState(isInStandaloneMode());
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToInstallPrompt(() => {
      const state = getInstallPromptState();
      setCanInstall(state.canInstall);
      if (state.installed) setInstalled(true);
    });
    return unsubscribe;
  }, []);

  async function handleInstallClick() {
    if (isIos()) {
      setShowIosInstructions(true);
      return;
    }
    if (canInstall) {
      await triggerInstallPrompt();
    }
  }

  const showInstallButton = !installed && (canInstall || isIos());

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        ☰
      </button>

      <div className="topbar-spacer" />

      {showInstallButton && (
        <button className="topbar-install-btn" onClick={handleInstallClick}>
          ⬇ Install App
        </button>
      )}

      <div className="topbar-user">
        <div className="topbar-user-info">
          <div className="topbar-user-name">{staffProfile?.full_name}</div>
          <div className="topbar-user-role">{roleLabels[role] ?? role}</div>
        </div>
        <button className="topbar-signout" onClick={signOut}>
          Sign Out
        </button>
      </div>

      {showIosInstructions && (
        <div className="modal-overlay" onClick={() => setShowIosInstructions(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Install on iPhone / iPad</h2>
              <button className="modal-close" onClick={() => setShowIosInstructions(false)}>×</button>
            </div>
            <ol className="ios-install-steps">
              <li>Tap the <strong>Share</strong> button in Safari (the square with an arrow, bottom of screen).</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
              <li>Tap <strong>"Add"</strong> in the top-right corner.</li>
            </ol>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              This must be done in Safari — installing from Chrome or another browser on iOS isn't supported by Apple.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={() => setShowIosInstructions(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}