import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { I, Ic } from './icons'
import { SAMPLE, YIELD_CURVE, TYPES, value, summarize, allocation, upcoming, daysUntil, exportCSV } from './data'
import BondForm from './BondForm'

const KEY = 'bond-holdings'
const tip = { background: 'rgba(20,20,20,.85)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12 }
const baht = n => n >= 1e6 ? `฿${(n / 1e6).toFixed(2)}M` : `฿${Math.round(n).toLocaleString()}`
const fdate = d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
const when = d => { const n = daysUntil(d); return n <= 0 ? 'วันนี้' : n === 1 ? 'พรุ่งนี้' : `อีก ${n} วัน` }
const greet = h => h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'
const COLS = [['symbol', 'Symbol'], ['issuer', 'ผู้ออก'], ['coupon', 'Coupon'], ['ytm', 'YTM'], ['rating', 'Rating'], ['maturity', 'ครบกำหนด'], ['value', 'มูลค่า']]
const maxY = Math.max(...YIELD_CURVE.map(d => d.y))

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? SAMPLE } catch { return SAMPLE }
}

export default function App() {
  const [list, setList] = useState(load)
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ k: 'value', dir: -1 })
  const [now, setNow] = useState(new Date())

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(list)), [list])
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])

  const s = useMemo(() => summarize(list), [list])
  const alloc = useMemo(() => allocation(list), [list])
  const events = useMemo(() => upcoming(list), [list])
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    const get = b => sort.k === 'value' ? value(b) : b[sort.k]
    return list
      .filter(b => !t || `${b.symbol} ${b.issuer}`.toLowerCase().includes(t))
      .sort((a, b) => (get(a) > get(b) ? 1 : get(a) < get(b) ? -1 : 0) * sort.dir)
  }, [list, q, sort])

  const save = b => { setList(l => l.some(x => x.id === b.id) ? l.map(x => x.id === b.id ? b : x) : [...l, b]); setEdit(null) }
  const del = b => confirm(`ลบ ${b.symbol} ออกจากพอร์ต?`) && setList(l => l.filter(x => x.id !== b.id))
  const reset = () => confirm('รีเซ็ตเป็นข้อมูลตัวอย่าง? ข้อมูลที่แก้ไว้จะหายทั้งหมด') && setList(SAMPLE)
  const sortBy = k => setSort(p => ({ k, dir: p.k === k ? -p.dir : 1 }))
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const stats = [
    { l: 'มูลค่าพอร์ต', v: baht(s.total), sub: `${list.length} ตราสาร`, ic: I.wallet, col: '#ffd28a' },
    { l: 'Yield to Maturity', v: `${s.ytm.toFixed(2)}%`, sub: 'ถ่วงน้ำหนักตามมูลค่า', ic: I.pct, col: '#7ef0ad' },
    { l: 'Modified Duration', v: s.dur.toFixed(2), sub: `ดอกเบี้ย +1% ≈ -${baht(s.total * s.dur / 100)}`, ic: I.clock, col: '#7fb2ff' },
    { l: 'Avg. Credit Rating', v: s.rating, sub: `ต่ำสุดในพอร์ต: ${s.worst}`, ic: I.shield, col: '#e0b3ff' },
  ]

  return (
    <>
      <div className="side glass">
        {[[I.home, 'top'], [I.chart, 'curve'], [I.cal, 'events'], [I.wallet, 'holdings']].map(([d, id]) => (
          <button key={id} className="ib" title={id} onClick={() => go(id)}><Ic d={d} /></button>
        ))}
        <button className="ib" title="รีเซ็ตข้อมูล" onClick={reset}><Ic d={I.reset} /></button>
      </div>
      <div className="app" id="top">
        <div className="head">
          <div><h1>{greet(now.getHours())}</h1>
            <p>ภาพรวมพอร์ตตราสารหนี้ · {now.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
          <div className="seg glass">
            <button className="pill" onClick={() => exportCSV(list)}><Ic d={I.download} s={14} />Export CSV</button>
            <button className="pill on" onClick={() => setEdit({})}><Ic d={I.plus} s={14} />เพิ่มตราสาร</button>
          </div>
        </div>

        <div className="stats">
          {stats.map(x => (
            <div key={x.l} className="stat glass">
              <div className="lbl"><span className="dot" style={{ color: x.col }}><Ic d={x.ic} s={16} /></span>{x.l}</div>
              <div className="val">{x.v}</div>
              <span className="chip">{x.sub}</span>
            </div>
          ))}
        </div>

        <div className="grid">
          <div className="card glass" id="curve">
            <h3>Thai Government Yield Curve</h3>
            <div className="sub">อัตราผลตอบแทนอ้างอิง (%) · ค่าตัวอย่าง แก้ได้ใน data.js</div>
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={YIELD_CURVE}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity=".05" /></linearGradient>
                    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fa8ff" /><stop offset="1" stopColor="#2f6fe0" stopOpacity=".4" /></linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke="#c9ced8" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis stroke="#c9ced8" tickLine={false} axisLine={false} fontSize={12} domain={[1.5, 3.5]} width={32} />
                  <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={v => [`${v}%`, 'Yield']} />
                  <Bar dataKey="y" radius={14} maxBarSize={34} isAnimationActive={false}>
                    {YIELD_CURVE.map(d => <Cell key={d.t} fill={d.y === maxY ? 'url(#b)' : 'url(#g)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card glass" id="events">
            <h3>ปฏิทินกระแสเงินสด</h3><div className="sub">ดอกเบี้ยและเงินต้นใน 120 วันข้างหน้า</div>
            <div className="list">
              {events.length ? events.map(e => (
                <div key={e.title + e.date} className="item row">
                  <div><b>{e.title}</b><br /><small>{when(e.date)} · {fdate(e.date)} · {baht(e.amount)}</small></div>
                  <span className="led" style={{ background: e.color, boxShadow: `0 0 10px ${e.color}` }} />
                </div>
              )) : <small className="muted">ไม่มีกระแสเงินสดในช่วงนี้</small>}
            </div>
          </div>
        </div>

        <div className="bottom">
          <div className="card glass" id="holdings">
            <div className="row"><div><h3>ตราสารหนี้ในพอร์ต</h3><div className="sub">คลิกหัวคอลัมน์เพื่อเรียง</div></div>
              <label className="search glass"><Ic d={I.search} s={15} /><input placeholder="ค้นหา symbol / ผู้ออก" value={q} onChange={e => setQ(e.target.value)} /></label></div>
            <div className="scroll"><table>
              <thead><tr>{COLS.map(([k, t]) => (
                <th key={k} className="sortable" onClick={() => sortBy(k)}>{t}{sort.k === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>
              ))}<th /></tr></thead>
              <tbody>{rows.map(b => (
                <tr key={b.id}><td><b>{b.symbol}</b></td><td>{b.issuer}</td><td>{(+b.coupon).toFixed(2)}%</td><td>{(+b.ytm).toFixed(2)}%</td>
                  <td><span className="rating" style={{ color: TYPES[b.type]?.color }}>{b.rating}</span></td><td>{fdate(b.maturity)}</td><td>{baht(value(b))}</td>
                  <td className="acts"><button className="ib sm" onClick={() => setEdit(b)}><Ic d={I.edit} s={15} /></button>
                    <button className="ib sm" onClick={() => del(b)}><Ic d={I.trash} s={15} /></button></td></tr>
              ))}</tbody>
            </table>{!rows.length && <p className="muted center">ไม่พบตราสาร</p>}</div>
          </div>
          <div className="card glass">
            <h3>สัดส่วนสินทรัพย์</h3><div className="sub">ตามมูลค่าตลาด</div>
            <div className="pie">
              <ResponsiveContainer><PieChart><Pie data={alloc} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={4} stroke="none" cornerRadius={8} isAnimationActive={false} /><Tooltip contentStyle={tip} itemStyle={{ color: '#fff' }} formatter={v => `${v}%`} /></PieChart></ResponsiveContainer>
            </div>
            <div className="list">{alloc.map(a => (
              <div key={a.name} className="row legend"><span><i style={{ background: a.fill }} />{a.name}</span><b>{a.value}%</b></div>
            ))}</div>
          </div>
        </div>
      </div>
      {edit && <BondForm bond={edit} onSave={save} onClose={() => setEdit(null)} />}
    </>
  )
}
