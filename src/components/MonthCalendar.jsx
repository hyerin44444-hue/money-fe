import dayjs from 'dayjs'

export default function MonthCalendar({ year, month, transactions }) {
  const firstDay = dayjs(`${year}-${month}-01`)
  const daysInMonth = firstDay.daysInMonth()
  const startWeekday = firstDay.day() // 0=일, 6=토

  // 날짜별 수입/지출 집계
  const byDate = {}
  transactions.forEach((t) => {
    const d = dayjs(t.date).date()
    if (!byDate[d]) byDate[d] = { income: 0, expense: 0 }
    if (t.type === 'income') byDate[d].income += Number(t.amount)
    else if (t.type === 'expense') byDate[d].expense += Number(t.amount)
  })

  const fmt = (n) => {
    if (n >= 10000) return (n / 10000).toFixed(0) + '만'
    return n.toLocaleString('ko-KR')
  }

  const today = dayjs()
  const isCurrentMonth = today.year() === year && today.month() + 1 === month

  // 6주 그리드 (빈 칸 포함)
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <span className="calendar-title">{year}년 {month}월 달력</span>
      </div>

      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`cal-weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{d}</div>
        ))}

        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const isToday = isCurrentMonth && day === today.date()
            const data = day ? byDate[day] : null
            const isSun = di === 0
            const isSat = di === 6

            return (
              <div
                key={`${wi}-${di}`}
                className={`cal-cell ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSun ? 'sun' : ''} ${isSat ? 'sat' : ''}`}
              >
                {day && (
                  <>
                    <span className="cal-day">{day}</span>
                    {data?.income > 0 && (
                      <span className="cal-income">+{fmt(data.income)}</span>
                    )}
                    {data?.expense > 0 && (
                      <span className="cal-expense">-{fmt(data.expense)}</span>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
