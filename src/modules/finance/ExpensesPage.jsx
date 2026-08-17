import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchExpenses } from './financeService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import NewExpenseModal from './NewExpenseModal';
import { exportToCSV } from '../../lib/csvExport';

export default function ExpensesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: expenses, loading } = useAsyncData(fetchExpenses, [refreshKey]);
  const [showNewModal, setShowNewModal] = useState(false);

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  function handleExport() {
    if (!expenses) return;
    const rows = expenses.map((e) => ({
      Date: e.expense_date,
      Category: e.category.replace('_', ' '),
      Description: e.description || '',
      Method: e.payment_method.replace('_', ' '),
      RecordedBy: e.staff?.full_name ?? '',
      Amount: Number(e.amount).toFixed(2),
    }));
    exportToCSV(`golden-apple-expenses-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Total recorded: GH₵{totalExpenses.toLocaleString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="modal-btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="primary-btn" onClick={() => setShowNewModal(true)}>+ Record Expense</button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Category</th><th>Description</th><th>Method</th><th>Recorded By</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
            ) : expenses?.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">No expenses recorded yet.</td></tr>
            ) : (
              expenses?.map((e) => (
                <tr key={e.id}>
                  <td>{e.expense_date}</td>
                  <td className="table-capitalize">{e.category.replace('_', ' ')}</td>
                  <td>{e.description || '—'}</td>
                  <td className="table-capitalize">{e.payment_method.replace('_', ' ')}</td>
                  <td>{e.staff?.full_name ?? '—'}</td>
                  <td style={{ color: 'var(--color-gold)', fontWeight: 500 }}>GH₵{Number(e.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <NewExpenseModal onClose={() => setShowNewModal(false)} onCreated={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}