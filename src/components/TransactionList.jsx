import TransactionRow from './TransactionRow'

export default function TransactionList({ transactions, onEdit, onDelete, fixedNames = new Set() }) {
  if (!transactions.length) {
    return (
      <div className="card">
        <p className="empty">내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="tx-table-wrap">
      <table className="tx-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>구분</th>
            <th>카테고리</th>
            <th>메모</th>
            <th>금액</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} isFixed={fixedNames.has(t.note)} />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
