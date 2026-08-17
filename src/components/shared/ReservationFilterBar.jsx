import './ReservationFilterBar.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Awaiting Confirmation' },
  { value: 'confirmed', label: 'Confirmed (Unpaid)' },
  { value: 'confirmed_paid', label: 'Reserved & Paid' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function ReservationFilterBar({ filters, onChange, onClear }) {
  function update(field, value) {
    onChange({ ...filters, [field]: value });
  }

  const hasActiveFilters =
    filters.search || filters.status !== 'all' || filters.fromDate || filters.toDate;

  return (
    <div className="res-filter-bar">
      <input
        type="text"
        className="res-filter-search"
        placeholder="Search by guest name, phone, or room..."
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
      />

      <select
        className="res-filter-select"
        value={filters.status}
        onChange={(e) => update('status', e.target.value)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <label className="res-filter-date-label">
        From
        <input
          type="date"
          className="res-filter-date"
          value={filters.fromDate}
          onChange={(e) => update('fromDate', e.target.value)}
        />
      </label>

      <label className="res-filter-date-label">
        To
        <input
          type="date"
          className="res-filter-date"
          value={filters.toDate}
          min={filters.fromDate}
          onChange={(e) => update('toDate', e.target.value)}
        />
      </label>

      {hasActiveFilters && (
        <button className="res-filter-clear" onClick={onClear}>
          Clear Filters
        </button>
      )}
    </div>
  );
}