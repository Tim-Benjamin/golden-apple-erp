import { useState, useEffect } from 'react';
import { getInstallPromptState, subscribeToInstallPrompt, triggerInstallPrompt } from '../../lib/installPromptStore';
import './InstallAppPrompt.css';

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallAppPrompt() {
  const [canInstall, setCanInstall] = useState(getInstallPromptState().canInstall);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem('installBannerDismissed');

    if (isIos()) {
      if (!dismissed) setShowBanner(true);
      return;
    }

    const unsubscribe = subscribeToInstallPrompt(() => {
      const state = getInstallPromptState();
      setCanInstall(state.canInstall);
      if (state.canInstall && !dismissed) setShowBanner(true);
      if (state.installed) setShowBanner(false);
    });

    // In case the event already fired before this component mounted
    if (getInstallPromptState().canInstall && !dismissed) setShowBanner(true);

    return unsubscribe;
  }, []);

  async function handleInstallClick() {
    if (isIos()) {
      setShowIosInstructions(true);
      return;
    }
    await triggerInstallPrompt();
    setShowBanner(false);
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', 'true');
  }

  if (!showBanner) return null;

  return (
    <>
      <div className="install-banner">
        <div className="install-banner-text">
          <strong>Install Golden Apple ERP</strong>
          <span>Add this app to your home screen for quick access, even offline.</span>
        </div>
        <div className="install-banner-actions">
          <button className="install-banner-btn-primary" onClick={handleInstallClick}>Install</button>
          <button className="install-banner-btn-dismiss" onClick={handleDismiss}>×</button>
        </div>
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
              <button className="modal-btn-primary" onClick={() => { setShowIosInstructions(false); handleDismiss(); }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}