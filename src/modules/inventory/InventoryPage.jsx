import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchInventoryItems } from './inventoryService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import NewItemModal from './NewItemModal';
import StockMovementModal from './StockMovementModal';
import './InventoryPage.css';

export default function InventoryPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: items, loading } = useAsyncData(fetchInventoryItems, [refreshKey]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [movementItem, setMovementItem] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const lowStock = items?.filter((i) => Number(i.quantity_on_hand) <= Number(i.low_stock_threshold)) ?? [];
  const expiringSoon = items?.filter((i) => {
    if (!i.expiry_date) return false;
    const daysUntil = (new Date(i.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 14 && daysUntil >= 0;
  }) ?? [];

  const filteredItems = items?.filter((i) => categoryFilter === 'all' || i.category === categoryFilter) ?? [];
  const categories = [...new Set(items?.map((i) => i.category) ?? [])];

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Stock levels across all categories</p>
        </div>
        <button className="primary-btn" onClick={() => setShowNewModal(true)}>
          + New Item
        </button>
      </div>

      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div className="inventory-alerts">
          {lowStock.length > 0 && (
            <div className="inventory-alert inventory-alert-low">
              ⚠ {lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock: {lowStock.map((i) => i.name).join(', ')}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="inventory-alert inventory-alert-expiry">
              ⏰ {expiringSoon.length} item{expiringSoon.length > 1 ? 's' : ''} expiring within 14 days: {expiringSoon.map((i) => i.name).join(', ')}
            </div>
          )}
        </div>
      )}

      <select className="rooms-filter" style={{ marginBottom: '1.25rem' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
        <option value="all">All Categories</option>
        {categories.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
      </select>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No inventory items yet.</td></tr>
            ) : (
              filteredItems.map((item) => {
                const isLow = Number(item.quantity_on_hand) <= Number(item.low_stock_threshold);
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="table-capitalize">{item.category.replace('_', ' ')}</td>
                    <td>
                      <span style={{ color: isLow ? 'var(--color-danger)' : 'var(--color-text-primary)', fontWeight: isLow ? 600 : 400 }}>
                        {item.quantity_on_hand} {item.unit}
                      </span>
                    </td>
                    <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="table-action-btn" onClick={() => setMovementItem(item)}>
                        Record Movement
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <NewItemModal onClose={() => setShowNewModal(false)} onCreated={() => setRefreshKey((k) => k + 1)} />
      )}

      {movementItem && (
        <StockMovementModal
          item={movementItem}
          onClose={() => setMovementItem(null)}
          onRecorded={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}