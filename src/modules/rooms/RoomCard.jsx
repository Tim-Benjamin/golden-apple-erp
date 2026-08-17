import StatusBadge from '../../components/shared/StatusBadge';
import './RoomCard.css';

export default function RoomCard({ room, onEdit, canEdit }) {
  return (
    <div className="room-card">
      <div className="room-card-header">
        <span className="room-card-number">{room.room_number}</span>
        <StatusBadge status={room.status} />
      </div>

      <div className="room-card-type">{room.room_type}</div>
      <div className="room-card-price">GH₵{Number(room.price).toLocaleString()} / night</div>

      <div className="room-card-meta">
        <div>
          <span className="room-card-meta-label">Last Cleaned</span>
          <span>{room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleDateString() : '—'}</span>
        </div>
        <div>
          <span className="room-card-meta-label">Last Maintenance</span>
          <span>{room.last_maintenance_at ? new Date(room.last_maintenance_at).toLocaleDateString() : '—'}</span>
        </div>
      </div>

      {canEdit && (
        <button className="room-card-edit-btn" onClick={() => onEdit(room)}>
          Edit Room
        </button>
      )}
    </div>
  );
}