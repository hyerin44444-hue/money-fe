import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSavings } from '../api/client'

export default function SummaryCard({ summary }) {
  const [savings, setSavings] = useState([])

  useEffect(() => {
    getSavings().then((res) => setSavings(res.data))
  }, [])

  if (!summary) return <div className="summary-card"><div className="summary-item loading">불러오는 중...</div></div>

  const fmt = (n) => Number(n).toLocaleString('ko-KR') + '원'

  const monthSavings = savings.reduce((sum, group) => {
    const monthTotal = group.records
      .filter((r) => {
        const d = dayjs(r.date)
        return d.year() === summary.year && d.month() + 1 === summary.month
      })
      .reduce((s, r) => s + Number(r.amount), 0)
    return sum + monthTotal
  }, 0)

  const balance = summary.income - summary.expense - monthSavings
  const savingRate = summary.income > 0 ? Math.round((balance / summary.income) * 100) : 0

  return (
    <div className="summary-card">
      <div className="summary-item income">
        <span className="label">총 수입</span>
        <span className="amount">+{fmt(summary.income)}</span>
        <span className="badge up">↑ 수입</span>
      </div>
      <div className="summary-item expense">
        <span className="label">총 지출</span>
        <span className="amount">-{fmt(summary.expense)}</span>
        <span className="badge down">↓ 지출</span>
      </div>
      <div className="summary-item savings">
        <span className="label">적금</span>
        <span className="amount">-{fmt(monthSavings)}</span>
        <span className="badge savings">💰 적금</span>
      </div>
      <div className="summary-item balance">
        <span className="label">잔액</span>
        <span className="amount">{fmt(balance)}</span>
        <span className={`badge ${savingRate >= 0 ? 'up' : 'down'}`}>
          저축률 {savingRate}%
        </span>
      </div>
    </div>
  )
}
