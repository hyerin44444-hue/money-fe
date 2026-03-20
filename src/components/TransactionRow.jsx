import dayjs from 'dayjs'

export default function TransactionRow({ transaction, onEdit, onDelete, isFixed = false }) {
  const { id, date, type, category, amount, note } = transaction
  const isIncome = type === 'income'

  return (
    <tr className="tx-row">
      <td>{dayjs(date).format('MM.DD')}</td>
      <td>
        <span className={`type-badge ${type}`}>
          {isIncome ? '수입' : '지출'}
        </span>
        {isFixed && (
          <span style={{ marginLeft: 5, fontSize: 11, padding: '2px 6px', borderRadius: 99, background: '#f0f4ff', color: '#4f86f7', fontWeight: 600 }}>
            고정비
          </span>
        )}
      </td>
      <td>{category}</td>
      <td className="note">{note || '-'}</td>
      <td className={`amount ${type}`}>
        {isIncome ? '+' : '-'}{Number(amount).toLocaleString('ko-KR')}원
      </td>
      <td className="actions">
        <button className="btn-icon" onClick={() => onEdit(transaction)}>✏️</button>
        <button className="btn-icon danger" onClick={() => onDelete(id)}>🗑️</button>
      </td>
    </tr>
  )
}
