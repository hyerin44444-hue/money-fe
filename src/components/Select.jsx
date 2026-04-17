import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * props:
 *  value, onChange, options: [{value, label}], placeholder
 */
export default function Select({ value, onChange, options = [], placeholder = '선택' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef(null)
  const menuRef = useRef(null)

  const selected = options.find((o) => o.value === value)

  const updatePos = () => {
    if (!wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  useLayoutEffect(() => { if (open) updatePos() }, [open])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updatePos()
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <div className={`custom-select ${open ? 'open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((p) => !p)}
      >
        <span className={selected ? '' : 'placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="select-chevron" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && createPortal(
        <ul
          ref={menuRef}
          className="custom-select-menu custom-select-menu-portal"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {placeholder && !value && (
            <li className="select-option placeholder-opt" onClick={() => { onChange(''); setOpen(false) }}>
              {placeholder}
            </li>
          )}
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.label}
              {opt.value === value && (
                <svg className="select-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
