import './ActivityFeed.css';

const ACTION_LABELS = {
  reservation_created: 'New Reservation',
  guest_checked_in: 'Guest Checked In',
  guest_checked_out: 'Guest Checked Out',
  maintenance_request_created: 'Maintenance Request',
  housekeeper_assigned: 'Housekeeper Assigned',
  staff_account_created: 'Staff Account Created',
};

export default function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return <p className="activity-empty">No activity recorded in this period.</p>;
  }

  return (
    <div className="activity-feed">
      {activities.map((a) => (
        <div key={a.id} className="activity-row">
          <div className="activity-dot" />
          <div className="activity-content">
            <div className="activity-title">
              {ACTION_LABELS[a.action] ?? a.action.replace(/_/g, ' ')}
            </div>
            <div className="activity-meta">
              {a.staff?.full_name ?? 'System'} · {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}