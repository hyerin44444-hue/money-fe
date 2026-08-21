import { useState, useEffect } from 'react'
import { getCategories, createCategory, deleteCategory, reorderCategories } from '../api/client'
import Select from '../components/Select'

export default function SettingsPage() {
  const [categories, setCategories] = useState([])
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', parent: '' })
  const [catError, setCatError] = useState('')
  const [submittingCat, setSubmittingCat] = useState(false)
  const [addingSubFor, setAddingSubFor] = useState(null) // 하위카테고리 추가 중인 부모 이름
  const [subName, setSubName] = useState('')

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
      await createCategory({
        name: catForm.name.trim(),
        type: catForm.type,
        parent: catForm.parent || null,
      })
      setCatForm((p) => ({ ...p, name: '', parent: '' }))
      await fetchAll()
    } catch (e) {
      setCatError(e.response?.data?.detail || '추가 실패')
    } finally { setSubmittingCat(false) }
  }

  const handleDeleteCat = async (name, type) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return
    await deleteCategory(name, type)
    await fetchAll()
  }

  const handleMove = async (type, index, direction, parentFilter) => {
    const sameGroup = categories
      .filter((c) => c.type === type && (c.parent || null) === (parentFilter || null))
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sameGroup.length) return

    const reordered = [...sameGroup]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    const updated = reordered.map((c, i) => ({ name: c.name, type: c.type, sort_order: i }))

    const otherCats = categories.filter(
      (c) => !(c.type === type && (c.parent || null) === (parentFilter || null))
    )
    const merged = [...otherCats, ...reordered.map((c, i) => ({ ...c, sort_order: i }))]
      .sort((a, b) => (a.type !== b.type ? (a.type === 'income' ? -1 : 1) : (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    setCategories(merged)

    try {
      await reorderCategories(updated)
      await fetchAll()
    } catch (e) {
      alert('순서 저장 실패')
      await fetchAll()
    }
  }

  const sortByOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)

  const handleAddSub = async (parentName, type) => {
    if (!subName.trim()) return
    try {
      await createCategory({ name: subName.trim(), type, parent: parentName })
      setSubName('')
      setAddingSubFor(null)
      await fetchAll()
    } catch (e) {
      alert(e.response?.data?.detail || '추가 실패')
    }
  }

  const renderCategoryGroup = (type, label, badgeClass) => {
    const parents = categories
      .filter((c) => c.type === type && !c.parent)
      .slice().sort(sortByOrder)

    return (
      <div className="settings-card">
        <h2 className="settings-section-title">
          {label} 카테고리 <span className="category-count">{categories.filter((c) => c.type === type).length}개</span>
        </h2>
        <div className="category-list">
          {parents.map((c, i) => {
            const subs = categories
              .filter((s) => s.type === type && s.parent === c.name)
              .slice().sort(sortByOrder)
            return (
              <div key={c.name}>
                {/* 상위 카테고리 */}
                <div className={`category-item ${type}`}>
                  <div className="category-order-buttons">
                    <button className="btn-order" disabled={i === 0} onClick={() => handleMove(type, i, -1, null)}>▲</button>
                    <button className="btn-order" disabled={i === parents.length - 1} onClick={() => handleMove(type, i, 1, null)}>▼</button>
                  </div>
                  <span className="category-name">{c.name}</span>
                  <span className={`category-type-badge ${badgeClass}`}>{label}</span>
                  <button
                    className="btn-icon"
                    title="하위 카테고리 추가"
                    onClick={() => { setAddingSubFor(c.name); setSubName('') }}
                    style={{ fontSize: 13, color: 'var(--accent)' }}
                  >＋</button>
                  <button className="btn-icon danger" onClick={() => handleDeleteCat(c.name, type)}>🗑️</button>
                </div>
                {/* 인라인 하위 카테고리 추가 입력 */}
                {addingSubFor === c.name && (
                  <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'var(--bg)', borderLeft: '2px solid var(--accent)', borderRadius: '0 6px 6px 0', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>└</span>
                    <input
                      autoFocus
                      type="text"
                      placeholder="하위 카테고리 이름"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(c.name, type); if (e.key === 'Escape') setAddingSubFor(null) }}
                      style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6 }}
                    />
                    <button className="btn primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleAddSub(c.name, type)}>추가</button>
                    <button className="btn secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setAddingSubFor(null)}>취소</button>
                  </div>
                )}
                {/* 하위 카테고리 */}
                {subs.map((s, si) => (
                  <div key={s.name} className={`category-item ${type}`} style={{ marginLeft: 24, background: 'var(--bg)', borderLeft: '2px solid var(--border)' }}>
                    <div className="category-order-buttons">
                      <button className="btn-order" disabled={si === 0} onClick={() => handleMove(type, si, -1, c.name)}>▲</button>
                      <button className="btn-order" disabled={si === subs.length - 1} onClick={() => handleMove(type, si, 1, c.name)}>▼</button>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>└</span>
                    <span className="category-name" style={{ fontSize: 13 }}>{s.name}</span>
                    <span className={`category-type-badge ${badgeClass}`} style={{ fontSize: 10 }}>하위</span>
                    <button className="btn-icon danger" onClick={() => handleDeleteCat(s.name, type)}>🗑️</button>
                  </div>
                ))}
              </div>
            )
          })}
          {parents.length === 0 && <p className="empty-small">{label} 카테고리가 없습니다.</p>}
        </div>
      </div>
    )
  }

  // 상위 카테고리 옵션 (선택한 type의 parent 없는 것들)
  const parentOptions = [
    { value: '', label: '없음 (최상위)' },
    ...categories
      .filter((c) => c.type === catForm.type && !c.parent)
      .slice().sort(sortByOrder)
      .map((c) => ({ value: c.name, label: c.name })),
  ]

  return (
    <div className="page">
      {/* 카테고리 추가 */}
      <div className="settings-card">
        <h2 className="settings-section-title">카테고리 추가</h2>
        <form className="category-form" onSubmit={handleAddCat}>
          <div style={{ width: 110 }}>
            <Select
              value={catForm.type}
              onChange={(v) => setCatForm((p) => ({ ...p, type: v, parent: '' }))}
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
          <div style={{ width: 130 }}>
            <Select
              value={catForm.parent}
              onChange={(v) => setCatForm((p) => ({ ...p, parent: v }))}
              options={parentOptions}
              placeholder="상위 카테고리"
            />
          </div>
          <button type="submit" className="btn primary" disabled={submittingCat}>
            {submittingCat ? '...' : '+'}
          </button>
        </form>
        {catError && <p className="settings-error">{catError}</p>}
      </div>

      {renderCategoryGroup('income', '수입', 'income')}
      {renderCategoryGroup('expense', '지출', 'expense')}
    </div>
  )
}
