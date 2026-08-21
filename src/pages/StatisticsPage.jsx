import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { getTransactions, getCategories } from '../api/client'
import PeriodChart from '../components/PeriodChart'
import { getMatchSet } from '../utils/categoryUtils'

const PIE_COLORS = [
  '#4f86f7', '#f7764f', '#4fc3f7', '#f7c44f', '#a5d6a7',
  '#ce93d8', '#ef9a9a', '#80cbc4', '#ffcc80', '#b0bec5',
]

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function StatisticsPage() {
  const today = dayjs()
  const [year, setYear] = useState(today.year())
  const [month, setMonth] = useState(today.month() + 1)
  const [period, setPeriod] = useState('daily')
  const [monthlyData, setMonthlyData] = useState([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [selectedCat, setSelectedCat] = useState(null)
  const [allCategories, setAllCategories] = useState([])

  const { transactions } = useTransactions(year, month)

  // 최근 6개월 데이터 불러오기 (카테고리별 비교용)
  useEffect(() => {
    const fetchMonthly = async () => {
      setLoadingMonthly(true)
      try {
        const months = []
        for (let i = 5; i >= 0; i--) {
          const d = dayjs(`${year}-${month}-01`).subtract(i, 'month')
          months.push({ year: d.year(), month: d.month() + 1, label: d.format('YY.MM') })
        }
        const results = await Promise.all(
          months.map((m) => getTransactions({ year: m.year, month: m.month }))
        )
        setMonthlyData(months.map((m, i) => ({ ...m, transactions: results[i].data })))
      } finally {
        setLoadingMonthly(false)
      }
    }
    fetchMonthly()
    getCategories().then((r) => setAllCategories(r.data))
  }, [year, month])

  const handlePrev = () => {
    const d = dayjs(`${year}-${month}-01`).subtract(1, 'month')
    setYear(d.year()); setMonth(d.month() + 1)
  }
  const handleNext = () => {
    const d = dayjs(`${year}-${month}-01`).add(1, 'month')
    setYear(d.year()); setMonth(d.month() + 1)
  }

  // 카테고리별 월별 비교 데이터 (계층형)
  const categoryMonthly = (() => {
    const catSet = new Set()
    monthlyData.forEach(({ transactions: txs }) => {
      txs.filter((t) => t.type === 'expense').forEach((t) => catSet.add(t.category))
    })

    const calcRow = (catName, matchNames) => ({
      cat: catName,
      months: monthlyData.map(({ label, transactions: txs }) => ({
        label,
        amount: txs.filter((t) => t.type === 'expense' && matchNames.has(t.category))
                   .reduce((s, t) => s + Number(t.amount), 0),
      })),
      total: monthlyData.reduce((s, { transactions: txs }) =>
        s + txs.filter((t) => t.type === 'expense' && matchNames.has(t.category))
               .reduce((ss, t) => ss + Number(t.amount), 0), 0),
    })

    const result = []
    const sortByOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    const parents = allCategories.filter((c) => !c.parent).sort(sortByOrder)

    parents.forEach((p) => {
      const subs = allCategories.filter((c) => c.parent === p.name).sort(sortByOrder)
      const subNames = subs.map((s) => s.name)
      const allNames = new Set([p.name, ...subNames])
      const hasData = [...allNames].some((n) => catSet.has(n))
      if (!hasData) return

      if (subs.length > 0) {
        // 부모 합계 행 (자식 포함)
        result.push({ ...calcRow(p.name, allNames), isParent: true })
        // 자식 행
        subs.forEach((s) => {
          if (catSet.has(s.name)) result.push({ ...calcRow(s.name, new Set([s.name])), isChild: true, parentName: p.name })
        })
        // 부모 자체 거래도 있으면 별도 행
        if (catSet.has(p.name) && subs.length > 0)
          result.push({ ...calcRow(`${p.name} (직접)`, new Set([p.name])), isChild: true, parentName: p.name })
      } else {
        result.push(calcRow(p.name, new Set([p.name])))
      }
    })

    // 정의에 없는 카테고리
    catSet.forEach((cat) => {
      if (!allCategories.find((c) => c.name === cat)) {
        result.push(calcRow(cat, new Set([cat])))
      }
    })

    return result
  })()

  // 파이차트 데이터
  const pieData = Object.entries(
    transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc }, {})
  ).map(([name, value]) => ({ name, value }))
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

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

  // 각 월의 최대값 (히트맵 색상용 — 부모 합산 행 제외하고 개별 행 기준)
  const colMax = monthlyData.map((_, mi) =>
    Math.max(...categoryMonthly.filter((r) => !r.isParent).map((row) => row.months[mi]?.amount || 0), 1)
  )

  return (
    <div className="page">
      {/* 월 네비게이션 */}
      <div className="month-nav">
        <button onClick={handlePrev}>◀</button>
        <span>{year}년 {month}월</span>
        <button onClick={handleNext}>▶</button>
      </div>

      {/* 수입 / 지출 현황 차트 */}
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
            {pieData.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                지출 내역 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                    outerRadius={72} innerRadius={30} labelLine={false} label={renderLabel}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v.toLocaleString()}원 (${((v / pieTotal) * 100).toFixed(1)}%)`, '금액']}
                    contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 카테고리별 월별 지출 바차트 */}
      {!loadingMonthly && categoryMonthly.length > 0 && (() => {
        const activeCat = selectedCat && categoryMonthly.find((r) => r.cat === selectedCat)
          ? selectedCat
          : categoryMonthly[0].cat
        const catIdx = categoryMonthly.findIndex((r) => r.cat === activeCat)
        const barColor = PIE_COLORS[catIdx % PIE_COLORS.length]
        const barData = monthlyData.map(({ label }, mi) => ({
          label,
          amount: categoryMonthly.find((r) => r.cat === activeCat)?.months[mi]?.amount || 0,
        }))
        return (
          <div className="card card-section">
            <h2 style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--text-primary)' }}>카테고리별 월별 지출</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {categoryMonthly.map(({ cat, isChild }, i) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`btn ${activeCat === cat ? 'primary' : 'secondary'}`}
                  style={{ padding: '3px 10px', fontSize: isChild ? 11 : 12, marginLeft: isChild ? 4 : 0 }}
                >
                  {isChild ? `└ ${cat}` : cat}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(v) => v >= 10000 ? `${Math.round(v / 10000)}만` : v.toLocaleString()}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => [`${v.toLocaleString()}원`, activeCat]}
                  contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amount" fill={barColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })()}

      {/* 카테고리별 월별 사용량 비교 */}
      <div className="card card-section">
        <h2 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--text-primary)' }}>카테고리별 월별 지출 비교</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>최근 6개월 · 지출만 표시</p>
        {loadingMonthly ? (
          <div className="loading-msg">불러오는 중...</div>
        ) : categoryMonthly.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>데이터 없음</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 80 }}>카테고리</th>
                  {monthlyData.map(({ label }) => (
                    <th key={label} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>합계</th>
                </tr>
              </thead>
              <tbody>
                {categoryMonthly.map(({ cat, months, total, isParent, isChild }, ri) => (
                  <tr key={cat} style={{
                    background: isParent ? 'var(--bg)' : isChild ? 'transparent' : ri % 2 === 0 ? 'transparent' : 'var(--bg)',
                    borderTop: isParent ? '1px solid var(--border)' : undefined,
                  }}>
                    <td style={{
                      padding: '8px 12px',
                      paddingLeft: isChild ? 24 : 12,
                      fontWeight: isParent ? 700 : 500,
                      color: isParent ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      fontSize: isChild ? 11 : 12,
                    }}>
                      {isChild ? `└ ${cat}` : cat}
                    </td>
                    {months.map(({ label, amount }, mi) => {
                      const intensity = colMax[mi] > 0 ? amount / colMax[mi] : 0
                      const bg = amount > 0 && !isChild
                        ? `rgba(79, 134, 247, ${0.08 + intensity * 0.3})`
                        : 'transparent'
                      return (
                        <td key={label} style={{ padding: '8px 10px', textAlign: 'right', background: bg, color: amount > 0 ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: isChild ? 11 : 12 }}>
                          {amount > 0 ? fmt(Math.round(amount)) : '-'}
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: isParent ? 700 : 500, color: 'var(--red)', whiteSpace: 'nowrap', fontSize: isChild ? 11 : 12 }}>
                      {fmt(Math.round(total))}
                    </td>
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>합계</td>
                  {monthlyData.map(({ label, transactions: txs }) => {
                    const sum = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
                    return (
                      <td key={label} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' }}>
                        {sum > 0 ? fmt(Math.round(sum)) : '-'}
                      </td>
                    )
                  })}
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--red)', whiteSpace: 'nowrap' }}>
                    {fmt(Math.round(categoryMonthly.filter((r) => !r.isParent).reduce((s, r) => s + r.total, 0)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
