import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { completeCleaningChecklist } from './housekeepingService';
import './CleaningChecklistModal.css';

const CHECKLIST_ITEMS = [
  { key: 'floor_mopped', label: 'Floor Mopped' },
  { key: 'towels_changed', label: 'Towels Changed' },
  { key: 'bed_made', label: 'Bed Made' },
  { key: 'toilet_cleaned', label: 'Toilet Cleaned' },
  { key: 'dust_removed', label: 'Dust Removed' },
  { key: 'soap_added', label: 'Soap Added' },
  { key: 'water_added', label: 'Water Added' },
  { key: 'mini_bar_checked', label: 'Mini Bar Checked' },
];

const INSPECTION_ITEMS = [
  { key: 'bathroom_inspection', label: 'Bathroom Inspection' },
  { key: 'mattress_inspection', label: 'Mattress Inspection' },
  { key: 'curtain_inspection', label: 'Curtain Inspection' },
  { key: 'furniture_inspection', label: 'Furniture Inspection' },
  { key: 'lighting_inspection', label: 'Lighting Inspection' },
  { key: 'tv_inspection', label: 'TV Inspection' },
  { key: 'ac_inspection', label: 'AC Inspection' },
  { key: 'fridge_inspection', label: 'Fridge Inspection' },
];

export default function CleaningChecklistModal({ room, onClose, onCompleted }) {
  const { staffProfile } = useAuth();
  const [checks, setChecks] = useState({});
  const [damageFound, setDamageFound] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(key) {
    setChecks((c) => ({ ...c, [key]: !c[key] }));
  }

  const allItems = [...CHECKLIST_ITEMS, ...INSPECTION_ITEMS];
  const completedCount = allItems.filter((item) => checks[item.key]).length;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await completeCleaningChecklist(
        room.id,
        { ...checks, damage_found: damageFound, damage_notes: damageNotes },
        staffProfile.id,
        room.room_number
      );
      onCompleted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cleaning Checklist — Room {room.room_number}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p className="checklist-progress">{completedCount} / {allItems.length} items completed</p>

        <form onSubmit={handleSubmit}>
          <div className="checklist-section-label">Cleaning Tasks</div>
          <div className="checklist-grid">
            {CHECKLIST_ITEMS.map((item) => (
              <label key={item.key} className="checklist-item">
                <input
                  type="checkbox"
                  checked={!!checks[item.key]}
                  onChange={() => toggle(item.key)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="checklist-section-label">Inspection</div>
          <div className="checklist-grid">
            {INSPECTION_ITEMS.map((item) => (
              <label key={item.key} className="checklist-item">
                <input
                  type="checkbox"
                  checked={!!checks[item.key]}
                  onChange={() => toggle(item.key)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="checklist-section-label">Damage Report</div>
          <label className="checklist-item">
            <input
              type="checkbox"
              checked={damageFound}
              onChange={(e) => setDamageFound(e.target.checked)}
            />
            Damage Found?
          </label>
          {damageFound && (
            <textarea
              className="checklist-damage-notes"
              placeholder="Describe the damage..."
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              rows={3}
            />
          )}

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? 'Submitting...' : 'Mark Room as Clean'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}