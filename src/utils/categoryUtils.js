/**
 * allCats: API에서 온 category 배열 [{name, type, parent, sort_order}]
 * txCatSet: 현재 거래내역에 등장하는 카테고리명 Set
 * 반환: [{value, label, isParent, isChild}] — 부모→자식 순서로 정렬
 */
export function buildCatOptions(allCats, txCatSet) {
  const sortByOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  const parents = allCats.filter((c) => !c.parent).sort(sortByOrder)
  const result = []

  parents.forEach((p) => {
    const subs = allCats.filter((c) => c.parent === p.name).sort(sortByOrder)
    const parentInTx = txCatSet.has(p.name)
    const subsInTx = subs.filter((s) => txCatSet.has(s.name))

    if (parentInTx || subsInTx.length > 0) {
      result.push({ value: p.name, label: p.name, isParent: true, hasChildren: subs.length > 0 })
      subsInTx.forEach((s) => result.push({ value: s.name, label: `└ ${s.name}`, isChild: true }))
    }
  })

  // 카테고리 정의에 없는 거래내역 카테고리도 추가
  const known = new Set(allCats.map((c) => c.name))
  txCatSet.forEach((cat) => {
    if (!known.has(cat)) result.push({ value: cat, label: cat })
  })

  return result
}

/**
 * 선택한 카테고리와 매칭되는 이름 집합 반환 (부모 선택 시 자식도 포함)
 * '전체' 선택 시 null 반환
 */
export function getMatchSet(selectedCat, allCats) {
  if (selectedCat === '전체') return null
  const children = allCats.filter((c) => c.parent === selectedCat).map((c) => c.name)
  return new Set([selectedCat, ...children])
}
