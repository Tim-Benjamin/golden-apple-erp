import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchTrainingsFor } from './trainingService';

export default function MyTrainingWidget() {
  const { staffProfile } = useAuth();
  const { data: trainings, loading } = useAsyncData(() => fetchTrainingsFor(staffProfile.id), [staffProfile.id]);

  if (loading || !trainings || trainings.length === 0) return null;

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="account-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="hk-section-title">My Training &amp; Certifications</h3>
      <ul className="detail-list">
        {trainings.map((t) => {
          const isExpired = t.expiry_date && t.expiry_date < todayISO;
          const isExpiringSoon = t.expiry_date && !isExpired &&
            (new Date(t.expiry_date) - new Date()) / (1000 * 60 * 60 * 24) <= 30;
          return (
            <li key={t.id}>
              <span>
                {t.training_name}
                {t.score != null && <span style={{ color: 'var(--color-text-muted)' }}> · Score: {t.score}</span>}
              </span>
              {t.expiry_date && (
                <span style={{ color: isExpired ? 'var(--color-danger)' : isExpiringSoon ? 'var(--color-gold)' : 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                  {isExpired ? 'Expired' : `Expires ${t.expiry_date}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}