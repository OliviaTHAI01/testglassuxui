export const TYPES = {
  gov: { label: 'พันธบัตรรัฐบาล', color: '#7fb2ff' },
  hi: { label: 'หุ้นกู้ AAA-AA', color: '#a8e6cf' },
  lo: { label: 'หุ้นกู้ A-BBB', color: '#ffd28a' },
  tb: { label: 'ตั๋วเงินคลัง', color: '#e0b3ff' },
}
export const RATINGS = ['Gov', 'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-']

export const SAMPLE = [
  { id: 1, symbol: 'LB346A', issuer: 'กระทรวงการคลัง', type: 'gov', rating: 'Gov', coupon: 3.39, ytm: 2.71, maturity: '2034-06-17', price: 105.42, face: 25000000 },
  { id: 2, symbol: 'PTTC29DA', issuer: 'ปตท. จำกัด (มหาชน)', type: 'hi', rating: 'AAA', coupon: 3.15, ytm: 2.89, maturity: '2029-12-05', price: 101.18, face: 8000000 },
  { id: 3, symbol: 'CPALL27NA', issuer: 'ซีพี ออลล์', type: 'lo', rating: 'A+', coupon: 3.6, ytm: 3.24, maturity: '2027-11-10', price: 100.76, face: 5000000 },
  { id: 4, symbol: 'SCC285A', issuer: 'ปูนซิเมนต์ไทย', type: 'lo', rating: 'A', coupon: 3.3, ytm: 3.02, maturity: '2028-05-01', price: 100.84, face: 4000000 },
  { id: 5, symbol: 'BBL31OA', issuer: 'ธนาคารกรุงเทพ', type: 'hi', rating: 'AA+', coupon: 3.05, ytm: 2.95, maturity: '2031-10-20', price: 100.52, face: 3000000 },
  { id: 6, symbol: 'TB26D23A', issuer: 'กระทรวงการคลัง', type: 'tb', rating: 'Gov', coupon: 0, ytm: 2.08, maturity: '2026-12-23', price: 99.52, face: 2000000 },
]

// Reference curve (sample values) — edit to match the latest ThaiBMA curve
export const YIELD_CURVE = [
  { t: '1M', y: 2.05 }, { t: '3M', y: 2.12 }, { t: '6M', y: 2.18 }, { t: '1Y', y: 2.25 }, { t: '2Y', y: 2.31 },
  { t: '5Y', y: 2.48 }, { t: '7Y', y: 2.62 }, { t: '10Y', y: 2.74 }, { t: '20Y', y: 3.02 }, { t: '30Y', y: 3.15 },
]

const DAY = 864e5
const score = r => Math.max(0, RATINGS.indexOf(r) - 1)
export const value = b => (b.face * b.price) / 100
export const yearsLeft = (b, now = new Date()) => (new Date(b.maturity) - now) / DAY / 365.25

// Semi-annual coupon dates between now and `to`, derived backward from maturity
export function couponDates(b, now, to) {
  if (!b.coupon) return []
  const out = []
  const d = new Date(b.maturity)
  while (d > now) {
    if (d <= to) out.push(new Date(d))
    d.setMonth(d.getMonth() - 6)
  }
  return out
}

export function modDuration(b, now = new Date()) {
  const yrs = yearsLeft(b, now)
  if (yrs <= 0) return 0
  const n = Math.max(1, Math.ceil(yrs * 2))
  const y = b.ytm / 100 / 2
  let pv = 0, w = 0
  for (let k = 1; k <= n; k++) {
    const t = yrs - (n - k) / 2
    const df = (1 + y) ** (-2 * t)
    const cf = b.coupon / 2 + (k === n ? 100 : 0)
    pv += cf * df
    w += t * cf * df
  }
  return w / pv / (1 + y)
}

export function summarize(list) {
  const total = list.reduce((s, b) => s + value(b), 0)
  if (!total) return { total: 0, ytm: 0, dur: 0, rating: '-', worst: '-' }
  const avg = f => list.reduce((s, b) => s + f(b) * value(b), 0) / total
  const worst = Math.max(...list.map(b => score(b.rating)))
  return { total, ytm: avg(b => b.ytm), dur: avg(b => modDuration(b)), rating: RATINGS[Math.round(avg(b => score(b.rating))) + 1], worst: RATINGS[worst + 1] }
}

export function allocation(list) {
  const total = list.reduce((s, b) => s + value(b), 0) || 1
  return Object.entries(TYPES)
    .map(([k, t]) => ({ name: t.label, fill: t.color, value: +(list.filter(b => b.type === k).reduce((s, b) => s + value(b), 0) / total * 100).toFixed(1) }))
    .filter(a => a.value > 0)
}

export function upcoming(list, days = 120, limit = 6) {
  const now = new Date(), to = new Date(+now + days * DAY)
  const ev = []
  for (const b of list) {
    for (const d of couponDates(b, now, to)) ev.push({ date: d, title: `รับดอกเบี้ย ${b.symbol}`, amount: (b.face * b.coupon) / 200, color: '#7ef0ad' })
    const m = new Date(b.maturity)
    if (m > now && m <= to) ev.push({ date: m, title: `ครบกำหนด ${b.symbol}`, amount: b.face, color: '#ffd28a' })
  }
  return ev.sort((a, b) => a.date - b.date).slice(0, limit)
}

export const daysUntil = d => Math.ceil((d - new Date()) / DAY)

export function exportCSV(list) {
  const cols = ['symbol', 'issuer', 'type', 'rating', 'coupon', 'ytm', 'maturity', 'price', 'face']
  const rows = [cols.join(','), ...list.map(b => cols.map(c => `"${String(b[c]).replace(/"/g, '""')}"`).join(','))]
  const url = URL.createObjectURL(new Blob(['﻿' + rows.join('\n')], { type: 'text/csv' }))
  Object.assign(document.createElement('a'), { href: url, download: 'bond-portfolio.csv' }).click()
  URL.revokeObjectURL(url)
}
