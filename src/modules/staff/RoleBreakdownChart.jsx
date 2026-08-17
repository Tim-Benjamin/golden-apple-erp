import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#d4af37', '#3f5540', '#a3872b', '#2d3e2c', '#8a6d1f', '#4a7c59', '#6b6b6b', '#e0705c', '#5a5a5a', '#c9a876', '#7d9b7f', '#b88a3d'];

export default function RoleBreakdownChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #2f2f2f', borderRadius: 8, fontSize: 13 }}
          formatter={(value) => `${value} staff`}
        />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, color: '#a3a3a3' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}