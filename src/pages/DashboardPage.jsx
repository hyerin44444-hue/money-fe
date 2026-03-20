import { useState } from 'react'
import dayjs from 'dayjs'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import SummaryCard from '../components/SummaryCard'
import MonthCalendar from '../components/MonthCalendar'
import PeriodChart from '../components/PeriodChart'
import BudgetStatus from '../components/BudgetStatus'
import MonthlyOverview from '../components/MonthlyOverview'

const PIE_COLORS = [
  '#4f86f7', '#f7764f', '#4fc3f7', '#f7c44f', '#a5d6a7',
  '#ce93d8', '#ef9a9a', '#80cbc4', '#ffcc80', '#b0bec5',
]

export default function DashboardPage() {
  const today = dayjs()
  const [year, setYear] = useState(today.year())
  const [month, setMonth] = useState(today.month() + 1)
  const [period, setPeriod] = useState('daily')

  const {
    transactions, summary,
    loading, error,
  } = useTransactions(year, month)

  const handlePrev = () => {
    const d = dayjs(`${year}-${month}-01`).subtract(1, 'month')
    setYear(d.year())
    setMonth(d.month() + 1)
  }

  const handleNext = () => {
    const d = dayjs(`${year}-${month}-01`).add(1, 'month')
    setYear(d.year())
    setMonth(d.month() + 1)
  }

  return (
    <div className="page">
      {/* 월별 현황 */}
      <MonthlyOverview year={year} currentMonth={month} />

      {/* 월 네비게이션 */}
      <div className="month-nav">
        <button onClick={handlePrev}>◀</button>
        <span>{year}년 {month}월</span>
        <button onClick={handleNext}>▶</button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-msg">불러오는 중...</div>}

      {/* 요약 카드 */}
      <SummaryCard summary={summary} />

      {/* 예산 현황 */}
      <BudgetStatus transactions={transactions} />

      {/* 기간별 수입/지출 차트 */}
      <div className="card card-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>수입 / 지출 현황</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['daily', '일별'], ['monthly', '월별'], ['yearly', '년별']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`btn ${period === key ? 'primary' : 'secondary'}`}
                style={{ padding: '4px 12px', fontSize: 13 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="period-chart-wrap" style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <PeriodChart period={period} year={year} month={month} transactions={transactions} />
          </div>
          <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)', paddingLeft: 20, display: 'flex', flexDirection: 'column' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>카테고리별 지출</p>
            {(() => {
              const pieData = Object.entries(
                transactions
                  .filter((t) => t.type === 'expense')
                  .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc }, {})
              ).map(([name, value]) => ({ name, value }))

              if (!pieData.length) return (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  지출 내역 없음
                </div>
              )

              const total = pieData.reduce((s, d) => s + d.value, 0)

              const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
                if (percent < 0.05) return null
                const RADIAN = Math.PI / 180
                const r = innerRadius + (outerRadius - innerRadius) * 0.6
                const x = cx + r * Math.cos(-midAngle * RADIAN)
                const y = cy + r * Math.sin(-midAngle * RADIAN)
                return (
                  <text x={x} y={y} fill="#fff" textAnchor="middle" fontSize={10} fontWeight={600}>
                    <tspan x={x} dy="-0.4em">{`${(percent * 100).toFixed(0)}%`}</tspan>
                    <tspan x={x} dy="1.3em">{`${Math.round(value / 10000).toLocaleString()}만`}</tspan>
                  </text>
                )
              }

              return (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={72}
                      innerRadius={30}
                      labelLine={false}
                      label={renderLabel}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v.toLocaleString()}원 (${((v / total) * 100).toFixed(1)}%)`, '금액']}
                      contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            })()}
          </div>
        </div>
      </div>

      {/* 월별 달력 */}
      <MonthCalendar year={year} month={month} transactions={transactions} />


    </div>
  )
}
