import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getMonthlySummary, getSavings } from '../api/client'

const fmt = (n) => {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`
  return n.toLocaleString()
}

export default function MonthlyOverview({ year, currentMonth }) {
  const [rows, setRows] = useState([])
  const today = dayjs()

  useEffect(() => {
    Promise.all([getMonthlySummary(year), getSavings()]).then(([summaryRes, savingsRes]) => {
      // 월별 적금 합산
      const savingsByMonth = {}
      savingsRes.data.forEach((group) => {
        group.records.forEach((r) => {
          const m = parseInt(r.date.split('-')[1], 10)
          const y = parseInt(r.date.split('-')[0], 10)
          if (y === year) savingsByMonth[m] = (savingsByMonth[m] || 0) + Number(r.amount)
        })
      })

      setRows(
        summaryRes.data.map((item) => ({
          month: item.month,
          income: item.income,
          expense: item.expense,
          savings: savingsByMonth[item.month] || 0,
        }))
      )
    })
  }, [year])

  return (
    <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, color: 'var(--text-primary)' }}>{year}년 월별 현황</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[rows.slice(0, 6), rows.slice(6)].map((half, hi) => (
        <div key={hi} style={{ display: 'flex', gap: 8 }}>
        {half.map((r) => {
          const isCurrentMonth = r.month === currentMonth && year === today.year()
          const hasData = r.income > 0 || r.expense > 0 || r.savings > 0
          return (
            <div
              key={r.month}
              style={{
                flex: 1,
                border: `1.5px solid ${isCurrentMonth ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '12px 14px',
                background: isCurrentMonth ? '#fff5f2' : hasData ? '#fff' : '#fafafa',
              }}
            >
              <p style={{
                margin: '0 0 10px',
                fontSize: 13,
                fontWeight: 700,
                color: isCurrentMonth ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
                {r.month}월
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>수입</span>
                  <span style={{ fontWeight: 600, color: r.income > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                    {fmt(r.income)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>지출</span>
                  <span style={{ fontWeight: 600, color: r.expense > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                    {fmt(r.expense)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>적금</span>
                  <span style={{ fontWeight: 600, color: r.savings > 0 ? '#4f86f7' : 'var(--text-muted)' }}>
                    {fmt(r.savings)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      ))}
      </div>
    </div>
  )
}
