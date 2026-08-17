import { useState } from 'react';
import './DateRangeFilter.css';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

export default function DateRangeFilter({ activePreset, onChange, customStart, customEnd, onCustomChange }) {
  const [showCustom, setShowCustom] = useState(activePreset === 'custom');

  function handlePresetClick(key) {
    if (key === 'custom') {
      setShowCustom(true);
      onChange('custom');
    } else {
      setShowCustom(false);
      onChange(key);
    }
  }

  return (
    <div>
      <div className="date-range-filter">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={`date-range-btn ${activePreset === p.key ? 'date-range-btn-active' : ''}`}
            onClick={() => handlePresetClick(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="custom-range-row">
          <label>
            From
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => onCustomChange({ start: e.target.value, end: customEnd })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(e) => onCustomChange({ start: customStart, end: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}