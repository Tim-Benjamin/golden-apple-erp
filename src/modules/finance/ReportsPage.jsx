import { useState, useMemo } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  fetchFinancialSummary,
  fetchTrendForBuckets,
  fetchActivityLog,
  fetchTopPerformers,
} from './financeService';
import {
  getRangeForPreset,
  getBucketsForRange,
  getCustomRange,
  getBucketsForCustomRange,
  getPreviousRange,
} from '../../lib/dateRanges';
import { exportToCSV } from '../../lib/csvExport';
import DateRangeFilter from '../../components/shared/DateRangeFilter';
import { StatCardSkeleton, ChartCardSkeleton } from '../../components/shared/Skeleton';
import ActivityFeed from './ActivityFeed';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import ExpenseBreakdownChart from '../../components/charts/ExpenseBreakdownChart';
import './ReportsPage.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [preset, setPreset] = useState('month');
  const [customRange, setCustomRange] = useState({ start: thirtyDaysAgoStr(), end: todayStr() });
  const [refreshKey, setRefreshKey] = useState(0);

  const { start, end } = useMemo(() => {
    if (preset === 'custom') return getCustomRange(customRange.start, customRange.end);
    return getRangeForPreset(preset);
  }, [preset, customRange]);

  const buckets = useMemo(() => {
    if (preset === 'custom') return getBucketsForCustomRange(start, end);
    return getBucketsForRange(preset, start, end);
  }, [preset, start, end]);

  const previousRange = useMemo(() => getPreviousRange(preset, start, end), [preset, start, end]);

  const { data: summary, loading: summaryLoading } = useAsyncData(
    () => fetchFinancialSummary(start.toISOString(), end.toISOString()),
    [preset, start, end, refreshKey]
  );

  const { data: previousSummary, loading: previousLoading } = useAsyncData(
    () => fetchFinancialSummary(previousRange.start.toISOString(), previousRange.end.toISOString()),
    [preset, start, end, refreshKey]
  );

  const { data: trend, loading: trendLoading } = useAsyncData(
    () => fetchTrendForBuckets(buckets),
    [preset, start, end, refreshKey]
  );

  const { data: activities, loading: activitiesLoading } = useAsyncData(
    () => fetchActivityLog(start.toISOString(), end.toISOString()),
    [preset, start, end, refreshKey]
  );

  const { data: topPerformers, loading: topLoading } = useAsyncData(
    () => fetchTopPerformers(start.toISOString(), end.toISOString()),
    [preset, start, end, refreshKey]
  );

  const trendChartData = trend?.map((t) => ({ month: t.label, income: t.income, expenses: t.expenses })) ?? [];

  function handleExportSummary() {
    if (!summary) return;
    const rows = [
      { Metric: 'Total Income', Value: summary.totalIncome.toFixed(2) },
      { Metric: 'Total Expenses', Value: summary.totalExpenses.toFixed(2) },
      { Metric: 'Total Refunds', Value: summary.totalRefunds.toFixed(2) },
      { Metric: 'Net Balance', Value: summary.netBalance.toFixed(2) },
      { Metric: 'Outstanding', Value: summary.outstanding.toFixed(2) },
      { Metric: 'Period', Value: labelForPreset(preset, customRange) },
    ];
    exportToCSV(`golden-apple-summary-${todayStr()}.csv`, rows);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="page-header-row no-print">
        <div>
          <h1 className="page-title">Reports & Finance</h1>
          <p className="page-subtitle">Full breakdown of income, expenses, and activity</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="modal-btn-secondary" onClick={handleExportSummary}>Export Summary CSV</button>
          <button className="modal-btn-secondary" onClick={handlePrint}>Print Report</button>
        </div>
      </div>

      <div className="no-print">
        <DateRangeFilter
          activePreset={preset}
          onChange={setPreset}
          customStart={customRange.start}
          customEnd={customRange.end}
          onCustomChange={setCustomRange}
        />
      </div>

      <div className="print-area">
        <h2 className="print-only-title">Golden Apple Guest House — Financial Report</h2>
        <p className="print-only-subtitle">{labelForPreset(preset, customRange)}</p>

        <div className="stat-grid" style={{ marginTop: '1.5rem' }}>
          {summaryLoading || previousLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Total Income"
                value={`GH₵${summary.totalIncome.toLocaleString()}`}
                accent="gold"
                change={percentChange(summary.totalIncome, previousSummary.totalIncome)}
              />
              <StatCard
                label="Total Expenses"
                value={`GH₵${summary.totalExpenses.toLocaleString()}`}
                accent="danger"
                change={percentChange(summary.totalExpenses, previousSummary.totalExpenses)}
                inverse
              />
              <StatCard
                label="Total Refunds"
                value={`GH₵${summary.totalRefunds.toLocaleString()}`}
                accent="danger"
                change={percentChange(summary.totalRefunds, previousSummary.totalRefunds)}
                inverse
              />
              <StatCard
                label="Net Balance"
                value={`GH₵${summary.netBalance.toLocaleString()}`}
                accent={summary.netBalance >= 0 ? 'success' : 'danger'}
                change={percentChange(summary.netBalance, previousSummary.netBalance)}
              />
              <StatCard label="Outstanding" value={`GH₵${summary.outstanding.toLocaleString()}`} accent="muted" />
            </>
          )}
        </div>

        <div className="top-performers-row">
          {topLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <TopPerformerCard label="Top Room by Revenue" data={topPerformers.topRoom} suffix=" GH₵" />
              <TopPerformerCard label="Top Booking Source" data={topPerformers.topSource} suffix=" bookings" />
              <TopPerformerCard label="Busiest Check-in Day" data={topPerformers.topDay} suffix=" check-ins" />
            </>
          )}
        </div>

        <div className="chart-grid" style={{ marginTop: '1.5rem' }}>
          {trendLoading ? (
            <ChartCardSkeleton />
          ) : (
            <ChartCard title={`Income vs Expenses — ${labelForPreset(preset, customRange)}`}>
              <RevenueTrendChart data={trendChartData} />
            </ChartCard>
          )}

          {summaryLoading ? (
            <ChartCardSkeleton />
          ) : (
            <ChartCard title="Expenses by Category">
              {summary.expensesByCategory.length === 0 ? (
                <p className="chart-empty-note">No expenses in this period.</p>
              ) : (
                <ExpenseBreakdownChart data={summary.expensesByCategory} />
              )}
            </ChartCard>
          )}

          {summaryLoading ? (
            <ChartCardSkeleton />
          ) : (
            <ChartCard title="Income by Payment Method">
              {summary.incomeByMethod.length === 0 ? (
                <p className="chart-empty-note">No income in this period.</p>
              ) : (
                <ExpenseBreakdownChart data={summary.incomeByMethod} />
              )}
            </ChartCard>
          )}

          <div className="chart-card no-print">
            <div className="chart-card-title">Activity Log — {labelForPreset(preset, customRange)}</div>
            {activitiesLoading ? (
              <p className="chart-empty-note">Loading activity...</p>
            ) : (
              <ActivityFeed activities={activities} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function labelForPreset(preset, customRange) {
  if (preset === 'custom') return `${customRange.start} → ${customRange.end}`;
  return { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' }[preset];
}

function StatCard({ label, value, accent = 'gold', change = null, inverse = false }) {
  const colorMap = {
    gold: 'var(--color-gold)',
    danger: 'var(--color-danger)',
    success: 'var(--color-success)',
    muted: 'var(--color-text-secondary)',
  };

  let changeColor = 'var(--color-text-muted)';
  let changeSymbol = '';
  if (change !== null) {
    const isPositive = change >= 0;
    const isGood = inverse ? !isPositive : isPositive;
    changeColor = isGood ? 'var(--color-success)' : 'var(--color-danger)';
    changeSymbol = isPositive ? '▲' : '▼';
  }

  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: colorMap[accent] }}>{value}</div>
      {change !== null && (
        <div className="stat-card-change" style={{ color: changeColor }}>
          {changeSymbol} {Math.abs(change).toFixed(1)}% vs previous period
        </div>
      )}
    </div>
  );
}

function TopPerformerCard({ label, data, suffix }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ fontSize: '1.2rem' }}>
        {data ? data.label : '—'}
      </div>
      {data && (
        <div className="stat-card-change" style={{ color: 'var(--color-text-secondary)' }}>
          {data.value.toLocaleString()}{suffix}
        </div>
      )}
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