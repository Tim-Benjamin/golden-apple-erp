import './Skeleton.css';

// Generic skeleton block. Use width/height/radius to shape it for any context.
export function Skeleton({ width = '100%', height = '1rem', radius = 'var(--radius-sm)', style = {} }) {
  return (
    <div
      className="skeleton-block"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

// Pre-built skeleton for a stat card (matches StatCard layout)
export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton width="60%" height="0.75rem" style={{ marginBottom: '0.6rem' }} />
      <Skeleton width="40%" height="1.6rem" />
    </div>
  );
}

// Pre-built skeleton for a chart card
export function ChartCardSkeleton({ height = 280 }) {
  return (
    <div className="chart-card">
      <Skeleton width="35%" height="0.9rem" style={{ marginBottom: '1.25rem' }} />
      <Skeleton width="100%" height={`${height}px`} radius="var(--radius-md)" />
    </div>
  );
}

// Pre-built skeleton for a table row
export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '0.75rem 1rem' }}>
          <Skeleton height="0.9rem" />
        </td>
      ))}
    </tr>
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <Skeleton width="30%" height="1.2rem" />
        <Skeleton width="25%" height="1.2rem" radius="999px" />
      </div>
      <Skeleton width="50%" height="0.85rem" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="60%" height="0.95rem" style={{ marginBottom: '1rem' }} />
      <Skeleton width="100%" height="2.2rem" />
    </div>
  );
}