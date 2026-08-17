import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function OccupancyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" vertical={false} />
        <XAxis dataKey="day" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #2f2f2f', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: '#f5f5f0' }}
        />
        <Bar dataKey="occupied" name="Rooms Occupied" fill="#d4af37" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}