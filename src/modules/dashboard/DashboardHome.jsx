import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { StatCardSkeleton, ChartCardSkeleton } from '../../components/shared/Skeleton';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import ExpenseBreakdownChart from '../../components/charts/ExpenseBreakdownChart';
import OccupancyChart from '../../components/charts/OccupancyChart';
import BookingSourceChart from '../../components/charts/BookingSourceChart';
import { fetchRealRevenueTrend, fetchRealExpenseBreakdown, fetchTodayStats } from '../finance/financeService';
import { fetchOccupancyTrend, fetchBookingSources } from '../../lib/sampleData';
import './DashboardHome.css';

const FINANCE_ROLES = ['super_admin', 'general_manager', 'accountant', 'auditor'];

export default function DashboardHome() {
  const { staffProfile, role } = useAuth();
  const canSeeFinance = FINANCE_ROLES.includes(role);

  const { data: stats, loading: statsLoading } = useAsyncData(fetchTodayStats, []);
  const { data: revenueData, loading: revenueLoading } = useAsyncData(
    () => (canSeeFinance ? fetchRealRevenueTrend() : Promise.resolve([])),
    [canSeeFinance]
  );
  const { data: expenseData, loading: expenseLoading } = useAsyncData(
    () => (canSeeFinance ? fetchRealExpenseBreakdown() : Promise.resolve([])),
    [canSeeFinance]
  );
  const { data: occupancyData, loading: occupancyLoading } = useAsyncData(fetchOccupancyTrend, []);
  const { data: sourceData, loading: sourceLoading } = useAsyncData(fetchBookingSources, []);

  return (
    <div>
      <h1 className="page-title">Welcome, {staffProfile?.full_name?.split(' ')[0]}</h1>
      <p className="page-subtitle">Here's what's happening at Golden Apple today.</p>

      <div className="stat-grid">
        {statsLoading ? (
          Array.from({ length: canSeeFinance ? 6 : 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Current Occupancy" value={stats.occupancy} />
            <StatCard label="Vacant Rooms" value={stats.vacantRooms} />
            <StatCard label="Today's Check-ins" value={stats.checkInsToday} />
            <StatCard label="Today's Check-outs" value={stats.checkOutsToday} />
            {canSeeFinance && (
              <>
                <StatCard label="Revenue Today" value={stats.revenueToday} subtitle={stats.revenueTodayBreakdown} />
                <StatCard label="Reserved & Paid Guests" value={stats.reservedAndPaid} />
              </>
            )}
          </>
        )}
      </div>

      <div className="chart-grid" style={{ marginTop: '1.5rem' }}>
        {canSeeFinance && (
          revenueLoading ? (
            <ChartCardSkeleton />
          ) : (
            <ChartCard title="Income vs Expenses (6 Months)">
              <RevenueTrendChart data={revenueData} />
            </ChartCard>
          )
        )}

        {occupancyLoading ? (
          <ChartCardSkeleton />
        ) : (
          <ChartCard title="Weekly Occupancy (sample)">
            <OccupancyChart data={occupancyData} />
          </ChartCard>
        )}

        {canSeeFinance && (
          expenseLoading ? (
            <ChartCardSkeleton />
          ) : (
            <ChartCard title="Expense Breakdown (This Month)">
              {expenseData.length === 0 ? (
                <p className="chart-empty-note">No expenses recorded this month yet.</p>
              ) : (
                <ExpenseBreakdownChart data={expenseData} />
              )}
            </ChartCard>
          )
        )}

        {sourceLoading ? (
          <ChartCardSkeleton />
        ) : (
          <ChartCard title="Bookings by Source (sample)">
            <BookingSourceChart data={sourceData} />
          </ChartCard>
        )}
      </div>

      {!canSeeFinance && (
        <p className="dashboard-note">
          Financial reports and revenue figures are visible to Super Admin, General Manager, and
          Accountant roles only.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <div className="chart-card-title">{title}</div>
      {children}
    </div>
  );
}