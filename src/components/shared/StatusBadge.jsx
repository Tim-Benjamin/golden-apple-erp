import './StatusBadge.css';

const STATUS_STYLES = {
  vacant: { label: 'Vacant', className: 'status-vacant' },
  occupied: { label: 'Occupied', className: 'status-occupied' },
  reserved: { label: 'Reserved', className: 'status-reserved' },
  cleaning: { label: 'Cleaning', className: 'status-cleaning' },
  out_of_service: { label: 'Out of Service', className: 'status-out' },
  pending: { label: 'Awaiting Confirmation', className: 'status-cleaning' },
  confirmed: { label: 'Confirmed', className: 'status-reserved' },
  confirmed_paid: { label: 'Reserved & Paid', className: 'status-paid' },
  checked_in: { label: 'Checked In', className: 'status-occupied' },
  checked_out: { label: 'Checked Out', className: 'status-vacant' },
  cancelled: { label: 'Cancelled', className: 'status-out' },
  no_show: { label: 'No Show', className: 'status-out' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_STYLES[status] ?? { label: status, className: 'status-default' };
  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
}