import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#4f86f7', '#f7764f', '#4fc3f7', '#f7c44f', '#a5d6a7',
  '#ce93d8', '#ef9a9a', '#80cbc4', '#ffcc80', '#b0bec5'
]

export default function CategoryChart({ transactions }) {
  const expenseByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})

  const data = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  if (!data.length) {
    return <div className="chart-empty">이번 달 지출 내역이 없습니다.</div>
  }

  return (
    <div className="chart-container">
      <h3>카테고리별 지출</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => v.toLocaleString('ko-KR') + '원'} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
