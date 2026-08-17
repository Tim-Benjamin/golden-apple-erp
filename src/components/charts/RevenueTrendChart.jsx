import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function RevenueTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8402f" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a8402f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" vertical={false} />
        <XAxis dataKey="month" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #2f2f2f', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: '#f5f5f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#a3a3a3' }} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#d4af37" fill="url(#incomeGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#a8402f" fill="url(#expenseGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}