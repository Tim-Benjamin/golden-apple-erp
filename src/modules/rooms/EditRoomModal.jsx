import { useState } from 'react';
import './EditRoomModal.css';

const ROOM_STATUSES = ['vacant', 'occupied', 'reserved', 'cleaning', 'out_of_service'];

export default function EditRoomModal({ room, onClose, onSave }) {
  const [form, setForm] = useState({
    room_type: room.room_type ?? '',
    price: room.price ?? 0,
    status: room.status,
    amenities: (room.amenities ?? []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave(room.id, {
        room_type: form.room_type,
        price: parseFloat(form.price),
        status: form.status,
        amenities: form.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (err) {
      setError(err.message ?? 'Failed to update room.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Room {room.room_number}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Room Type
            <input
              type="text"
              value={form.room_type}
              onChange={(e) => setForm({ ...form, room_type: e.target.value })}
              required
            />
          </label>

          <label>
            Price (GH₵ / night)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ROOM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amenities (comma-separated)
            <input
              type="text"
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              placeholder="AC, TV, Fridge, WiFi"
            />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}