import { getStayCountdown } from '../../lib/stayCountdown';
import './StayCountdownBadge.css';

export default function StayCountdownBadge({ reservation }) {
  const countdown = getStayCountdown(reservation);
  if (!countdown) return null;

  return (
    <span className={`countdown-badge countdown-${countdown.urgency}`}>
      {countdown.label}
    </span>
  );
}