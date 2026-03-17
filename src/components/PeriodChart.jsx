import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts'
import { getMonthlySummary, getYearlySummary } from '../api/client'

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function formatTick(value) {
  if (!value) return '0'
  return Math.round(value / 10000).toLocaleString()
}

function formatBarLabel(value) {
  if (!value) return ''
  return Math.round(value / 10000).toLocaleString()
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.fill }}>
          {p.name}: {p.value.toLocaleString()}원
        </p>
      ))}
    </div>
  )
}

export default function PeriodChart({ period, year, month, transactions }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (period === 'daily') {
      const byDay = {}
      transactions.forEach((tx) => {
        const day = parseInt(tx.date.split('-')[2], 10)
        if (!byDay[day]) byDay[day] = { income: 0, expense: 0 }
        if (tx.type === 'income') byDay[day].income += Number(tx.amount)
        else byDay[day].expense += Number(tx.amount)
      })
      setData(
        Object.entries(byDay)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, v]) => ({ label: `${day}일`, income: v.income, expense: v.expense }))
      )
    } else if (period === 'monthly') {
      setLoading(true)
      getMonthlySummary(year)
        .then((res) => {
          setData(
            res.data.map((item) => ({
              label: MONTH_LABELS[item.month - 1],
              income: item.income,
              expense: item.expense,
            }))
          )
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(true)
      getYearlySummary()
        .then((res) => {
          setData(
            res.data.map((item) => ({
              label: `${item.year}년`,
              income: item.income,
              expense: item.expense,
            }))
          )
        })
        .finally(() => setLoading(false))
    }
  }, [period, year, month, transactions])

  if (loading) return <div className="loading-msg">불러오는 중...</div>
  if (data.length === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 14 }}>데이터가 없습니다.</div>

  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', top: 0, right: 8, fontSize: 11, color: 'var(--text-muted)' }}>[만원]</span>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatTick} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
          <Bar dataKey="income" name="수입" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32}>
            <LabelList dataKey="income" position="top" formatter={formatBarLabel} style={{ fontSize: 10, fill: '#16a34a' }} />
          </Bar>
          <Bar dataKey="expense" name="지출" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32}>
            <LabelList dataKey="expense" position="top" formatter={formatBarLabel} style={{ fontSize: 10, fill: '#dc2626' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
