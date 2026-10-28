import { useEffect, useState } from 'react'
import { TYPES, RATINGS } from './data'
import { I, Ic } from './icons'

const EMPTY = { symbol: '', issuer: '', type: 'gov', rating: 'Gov', coupon: '', ytm: '', maturity: '', price: 100, face: 1000000 }
const NUMS = ['coupon', 'ytm', 'price', 'face']

export default function BondForm({ bond, onSave, onClose }) {
  const [f, setF] = useState({ ...EMPTY, ...bond })
  const [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const submit = e => {
    e.preventDefault()
    const b = { ...f, symbol: f.symbol.trim().toUpperCase(), issuer: f.issuer.trim() }
    for (const k of NUMS) b[k] = Number(b[k])
    if (!b.symbol) return setErr('กรุณากรอก Symbol')
    if (NUMS.some(k => !Number.isFinite(b[k]) || b[k] < 0)) return setErr('ตัวเลขต้องไม่ติดลบ')
    if (b.price <= 0 || b.face <= 0) return setErr('ราคาและมูลค่าหน้าตั๋วต้องมากกว่า 0')
    if (!b.maturity || new Date(b.maturity) <= new Date()) return setErr('วันครบกำหนดต้องเป็นวันในอนาคต')
    onSave({ ...b, id: bond?.id ?? Date.now() })
  }

  const field = (k, label, props = {}) => (
    <label>{label}<input value={f[k]} onChange={set(k)} {...props} /></label>
  )

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="modal glass" onSubmit={submit}>
        <div className="row"><h3>{bond?.id ? 'แก้ไขตราสาร' : 'เพิ่มตราสาร'}</h3>
          <button type="button" className="ib" onClick={onClose}><Ic d={I.x} /></button></div>
        <div className="form">
          {field('symbol', 'Symbol', { autoFocus: true, placeholder: 'LB346A' })}
          {field('issuer', 'ผู้ออก', { placeholder: 'กระทรวงการคลัง' })}
          <label>ประเภท<select value={f.type} onChange={set('type')}>
            {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></label>
          <label>Rating<select value={f.rating} onChange={set('rating')}>
            {RATINGS.map(r => <option key={r}>{r}</option>)}</select></label>
          {field('coupon', 'Coupon (%/ปี)', { type: 'number', step: '0.01' })}
          {field('ytm', 'YTM (%)', { type: 'number', step: '0.01' })}
          {field('maturity', 'วันครบกำหนด', { type: 'date' })}
          {field('price', 'ราคา (ต่อ 100)', { type: 'number', step: '0.01' })}
          {field('face', 'มูลค่าหน้าตั๋ว (บาท)', { type: 'number', step: '1000' })}
        </div>
        {err && <div className="err">{err}</div>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn primary">บันทึก</button>
        </div>
      </form>
    </div>
  )
}
