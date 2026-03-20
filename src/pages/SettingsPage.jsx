import { useState, useEffect } from 'react'
import { getCategories, createCategory, deleteCategory } from '../api/client'
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

  const income = categories.filter((c) => c.type === 'income')
  const expense = categories.filter((c) => c.type === 'expense')

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
      <div className="settings-card">
        <h2 className="settings-section-title">
          수입 카테고리 <span className="category-count">{income.length}개</span>
        </h2>
        <div className="category-list">
          {income.map((c) => (
            <div key={c.name} className="category-item income">
              <span className="category-name">{c.name}</span>
              <span className="category-type-badge income">수입</span>
              <button className="btn-icon danger" onClick={() => handleDeleteCat(c.name)}>🗑️</button>
            </div>
          ))}
          {income.length === 0 && <p className="empty-small">수입 카테고리가 없습니다.</p>}
        </div>
      </div>

      {/* ── 지출 카테고리 ── */}
      <div className="settings-card">
        <h2 className="settings-section-title">
          지출 카테고리 <span className="category-count">{expense.length}개</span>
        </h2>
        <div className="category-list">
          {expense.map((c) => (
            <div key={c.name} className="category-item expense">
              <span className="category-name">{c.name}</span>
              <span className="category-type-badge expense">지출</span>
              <button className="btn-icon danger" onClick={() => handleDeleteCat(c.name)}>🗑️</button>
            </div>
          ))}
          {expense.length === 0 && <p className="empty-small">지출 카테고리가 없습니다.</p>}
        </div>
      </div>
    </div>
  )
}
