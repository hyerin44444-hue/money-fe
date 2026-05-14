import { useState, useEffect } from 'react'
import { getCategories, createCategory, deleteCategory, reorderCategories } from '../api/client'
import Select from '../components/Select'

export default function SettingsPage() {
  const [categories, setCategories] = useState([])
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' })
  const [catError, setCatError] = useState('')
  const [submittingCat, setSubmittingCat] = useState(false)

  const fetchAll = async () => {
    const catRes = await getCategories()
    setCategories(catRes.data)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddCat = async (e) => {
    e.preventDefault()
    if (!catForm.name.trim()) return
    setCatError('')
    setSubmittingCat(true)
    try {
      await createCategory({ name: catForm.name.trim(), type: catForm.type })
      setCatForm({ name: '', type: 'expense' })
      await fetchAll()
    } catch (e) {
      setCatError(e.response?.data?.detail || '추가 실패')
    } finally { setSubmittingCat(false) }
  }

  const handleDeleteCat = async (name) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return
    await deleteCategory(name)
    await fetchAll()
  }

  const handleMove = async (type, index, direction) => {
    const sameType = categories
      .filter((c) => c.type === type)
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sameType.length) return

    const reordered = [...sameType]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    const updated = reordered.map((c, i) => ({ name: c.name, type: c.type, sort_order: i }))

    // 즉시 UI 반영
    const otherType = categories.filter((c) => c.type !== type)
    const merged = [...otherType, ...updated].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'income' ? -1 : 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
    setCategories(merged)

    try {
      await reorderCategories(updated)
      // 서버 저장 확인용 재조회
      await fetchAll()
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || '순서 저장 실패'
      alert(`카테고리 순서 저장 실패: ${msg}\n\n` +
        `1) Supabase categories 테이블에 sort_order(int4) 컬럼이 있는지 확인\n` +
        `2) 백엔드가 최신 코드로 배포됐는지 확인 (PUT /api/categories/reorder)`)
      await fetchAll()
    }
  }

  const sortByOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  const income = categories.filter((c) => c.type === 'income').slice().sort(sortByOrder)
  const expense = categories.filter((c) => c.type === 'expense').slice().sort(sortByOrder)

  const renderCategoryList = (list, type, label, badgeClass) => (
    <div className="settings-card">
      <h2 className="settings-section-title">
        {label} 카테고리 <span className="category-count">{list.length}개</span>
      </h2>
      <div className="category-list">
        {list.map((c, i) => (
          <div key={c.name} className={`category-item ${type}`}>
            <div className="category-order-buttons">
              <button
                className="btn-order"
                disabled={i === 0}
                onClick={() => handleMove(type, i, -1)}
                title="위로"
              >
                ▲
              </button>
              <button
                className="btn-order"
                disabled={i === list.length - 1}
                onClick={() => handleMove(type, i, 1)}
                title="아래로"
              >
                ▼
              </button>
            </div>
            <span className="category-name">{c.name}</span>
            <span className={`category-type-badge ${badgeClass}`}>{label}</span>
            <button className="btn-icon danger" onClick={() => handleDeleteCat(c.name)}>🗑️</button>
          </div>
        ))}
        {list.length === 0 && <p className="empty-small">{label} 카테고리가 없습니다.</p>}
      </div>
    </div>
  )

  return (
    <div className="page">

      {/* ── 카테고리 추가 ── */}
      <div className="settings-card">
        <h2 className="settings-section-title">카테고리 추가</h2>
        <form className="category-form" onSubmit={handleAddCat}>
          <div style={{ width: 110 }}>
            <Select
              value={catForm.type}
              onChange={(v) => setCatForm((p) => ({ ...p, type: v }))}
              options={[{ value: 'income', label: '수입' }, { value: 'expense', label: '지출' }]}
            />
          </div>
          <input
            type="text"
            placeholder="카테고리 이름"
            value={catForm.name}
            onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))}
            maxLength={20}
            style={{ width: 120 }}
          />
          <button type="submit" className="btn primary" disabled={submittingCat}>
            {submittingCat ? '...' : '+'}
          </button>
        </form>
        {catError && <p className="settings-error">{catError}</p>}
      </div>

      {/* ── 수입 카테고리 ── */}
      {renderCategoryList(income, 'income', '수입', 'income')}

      {/* ── 지출 카테고리 ── */}
      {renderCategoryList(expense, 'expense', '지출', 'expense')}
    </div>
  )
}
