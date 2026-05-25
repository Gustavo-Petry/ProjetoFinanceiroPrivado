import { useState, useMemo } from 'react'
import '../styles/Combustivel.css'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const todayISO = () => new Date().toISOString().split('T')[0]

function fmtMonth(key) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function Combustivel({ data, updateData, showToast }) {
  const [form, setForm] = useState({ amount: '', date: todayISO(), description: '' })
  const [expandedMonth, setExpandedMonth] = useState(null)

  const vtValue = useMemo(() => {
    const vt = data.benefits?.vt
    return vt?.enabled ? (parseFloat(vt.value) || 0) : 0
  }, [data.benefits])

  const expenses = data.fuelExpenses || []
  const currentMonthKey = new Date().toISOString().slice(0, 7)

  const byMonth = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const key = e.date?.slice(0, 7)
      if (!key) return
      if (!map[key]) map[key] = { key, total: 0, items: [] }
      map[key].total += parseFloat(e.amount) || 0
      map[key].items.push(e)
    })
    return Object.values(map)
      .sort((a, b) => b.key.localeCompare(a.key))
      .map(m => ({
        ...m,
        items:      [...m.items].sort((a, b) => b.date.localeCompare(a.date)),
        vtCovered:  Math.min(m.total, vtValue),
        fromSalary: Math.max(m.total - vtValue, 0),
      }))
  }, [expenses, vtValue])

  // Mês atual
  const currentMonth = byMonth.find(m => m.key === currentMonthKey)
  const monthTotal   = currentMonth?.total      || 0
  const vtUsed       = currentMonth?.vtCovered  || 0
  const fromSalary   = currentMonth?.fromSalary || 0
  const vtRemaining  = Math.max(vtValue - vtUsed, 0)
  const vtPct        = vtValue > 0 ? Math.min((vtUsed / vtValue) * 100, 100) : 0

  // Médias
  const n            = byMonth.length
  const avgMonthly   = n > 0 ? byMonth.reduce((s, m) => s + m.total,      0) / n : 0
  const avgFromSal   = n > 0 ? byMonth.reduce((s, m) => s + m.fromSalary, 0) / n : 0
  const avgVtCovered = n > 0 ? byMonth.reduce((s, m) => s + m.vtCovered,  0) / n : 0

  const addExpense = () => {
    if (!form.amount) { showToast('Preencha o valor'); return }
    const amount = parseFloat(form.amount) || 0
    const desc   = form.description.trim() || 'Combustível'
    const now    = Date.now()

    const newExpense = { id: now, amount, date: form.date, description: desc }
    const newFuelExpenses = [...expenses, newExpense]
    const newTransactions = [...data.transactions]

    // Calcula quanto do VT ainda resta neste mês (baseado nos lançamentos existentes)
    const isCurrentMonth = form.date.startsWith(currentMonthKey)
    if (isCurrentMonth && vtValue > 0) {
      const prevFuelTotal = expenses
        .filter(e => e.date?.startsWith(currentMonthKey))
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

      const vtRemainingBefore = Math.max(vtValue - prevFuelTotal, 0)
      const vtPortion         = Math.min(amount, vtRemainingBefore)
      const salaryPortion     = amount - vtPortion

      if (vtPortion > 0) {
        newTransactions.push({
          id:          now + 1,
          fuelId:      now,
          description: salaryPortion > 0 ? `${desc} (VT)` : desc,
          value:       vtPortion,
          category:    'Transporte',
          date:        form.date,
          paidFrom:    'vt',
        })
      }
      if (salaryPortion > 0) {
        newTransactions.push({
          id:          now + 2,
          fuelId:      now,
          description: `${desc} (excede VT)`,
          value:       salaryPortion,
          category:    'Transporte',
          date:        form.date,
          paidFrom:    'salary',
        })
      }

      if (vtRemainingBefore === 0) {
        showToast(`${fmt(amount)} saindo do salário — VT já esgotado`)
      } else if (salaryPortion > 0) {
        showToast(`VT cobriu ${fmt(vtPortion)} · ${fmt(salaryPortion)} debitado do salário`)
      } else {
        showToast(`Adicionado! VT restante: ${fmt(vtRemainingBefore - vtPortion)}`)
      }
    } else {
      // Fora do mês atual ou sem VT → lança direto no salário
      newTransactions.push({
        id:          now + 1,
        fuelId:      now,
        description: desc,
        value:       amount,
        category:    'Transporte',
        date:        form.date,
        paidFrom:    'salary',
      })
      showToast('Gasto registrado!')
    }

    updateData({ fuelExpenses: newFuelExpenses, transactions: newTransactions })
    setForm({ amount: '', date: todayISO(), description: '' })
  }

  const removeExpense = (id) =>
    updateData({
      fuelExpenses: expenses.filter(e => e.id !== id),
      transactions: data.transactions.filter(t => t.fuelId !== id),
    })

  return (
    <div className="combustivel-grid">

      {/* ── Status do mês atual ── */}
      <div className="card">
        <div className="section-title">
          ⛽ Este Mês — {fmtMonth(currentMonthKey)}
        </div>

        <div className="comb-kpi-row">
          <CKpi label="Gasto no Mês"    value={fmt(monthTotal)}  color="#f0f0f8" />
          <CKpi label="VT Cobriu"       value={fmt(vtUsed)}      color="#00f5c8" />
          <CKpi label="Saiu do Salário" value={fmt(fromSalary)}  color={fromSalary > 0 ? '#ff4757' : '#8888aa'} />
          <CKpi label="VT Restante"     value={fmt(vtRemaining)} color={vtRemaining > 0 ? '#c8f500' : '#8888aa'} />
        </div>

        {vtValue > 0 ? (
          <>
            <div className="comb-vt-label">
              <span>Vale Transporte ({fmt(vtValue)}/mês)</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: vtPct >= 100 ? '#ff4757' : '#00f5c8' }}>
                {vtPct.toFixed(0)}% usado
              </span>
            </div>
            <div className="progress-bar" style={{ height: 10 }}>
              <div style={{
                background:   vtPct >= 100 ? '#ff4757' : '#00f5c8',
                height:       '100%',
                borderRadius: 10,
                width:        `${vtPct}%`,
                transition:   'width 0.5s',
              }} />
            </div>
            {vtPct >= 100 && (
              <div className="comb-vt-alert">
                ⚠️ VT esgotado — {fmt(fromSalary)} saindo do salário este mês
              </div>
            )}
          </>
        ) : (
          <div className="comb-hint">
            Configure o Vale Transporte em Lançamentos para ver o desconto automático.
          </div>
        )}
      </div>

      {/* ── Médias históricas ── */}
      {n > 0 && (
        <div className="card">
          <div className="section-title">
            Média Mensal — {n} {n === 1 ? 'mês' : 'meses'} registrados
          </div>
          <div className="comb-kpi-row comb-kpi-row--3">
            <CKpi label="Combustível/mês"  value={fmt(avgMonthly)}   color="#ffa502" />
            <CKpi label="Coberto pelo VT"  value={fmt(avgVtCovered)} color="#00f5c8" />
            <CKpi label="Médio do Salário" value={fmt(avgFromSal)}   color={avgFromSal > 0 ? '#ff4757' : '#8888aa'} />
          </div>
          {avgFromSal > 0 && (
            <div className="comb-salary-note">
              Em média você tira <strong>{fmt(avgFromSal)}/mês</strong> do salário com combustível,
              além do vale transporte.
            </div>
          )}
        </div>
      )}

      {/* ── Lançar abastecimento ── */}
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Lançar Abastecimento</h3>
        <div className="form-grid">
          <div>
            <label className="form-label">Valor (R$)</label>
            <input type="number" placeholder="0,00" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
              style={{ fontFamily: 'JetBrains Mono', color: '#ffa502' }} />
          </div>
          <div>
            <label className="form-label">Data</label>
            <input type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="comb-desc-col">
            <label className="form-label">Descrição — opcional</label>
            <input placeholder="Ex: Posto Shell, Ipiranga..." value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addExpense()} />
          </div>
        </div>
        <button className="btn btn-green btn-full" onClick={addExpense}>+ Registrar</button>
      </div>

      {/* ── Histórico por mês ── */}
      {byMonth.length > 0 && (
        <div className="combustivel-history">
          <div className="section-title" style={{ paddingLeft: 4 }}>Histórico</div>
          {byMonth.map(m => (
            <div key={m.key} className="card comb-month-card">
              <div className="comb-month-header"
                onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)}>
                <div className="comb-month-left">
                  <span className="comb-month-icon">⛽</span>
                  <div>
                    <div className="comb-month-name">{fmtMonth(m.key)}</div>
                    <div className="comb-month-sub">
                      {m.items.length} {m.items.length === 1 ? 'lançamento' : 'lançamentos'}
                    </div>
                  </div>
                </div>
                <div className="comb-month-right">
                  <div className="comb-month-total">{fmt(m.total)}</div>
                  <div className="comb-month-breakdown">
                    {m.vtCovered  > 0 && <span style={{ color: '#00f5c8' }}>VT {fmt(m.vtCovered)}</span>}
                    {m.fromSalary > 0 && <span style={{ color: '#ff4757' }}>Sal. {fmt(m.fromSalary)}</span>}
                  </div>
                </div>
                <span className="comb-chevron">{expandedMonth === m.key ? '▲' : '▼'}</span>
              </div>

              {expandedMonth === m.key && (
                <div className="comb-month-items">
                  {m.items.map(e => (
                    <div key={e.id} className="comb-item">
                      <span className="comb-item-desc">{e.description}</span>
                      <span className="comb-item-date">
                        {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="comb-item-value">{fmt(e.amount)}</span>
                      <button className="remove-btn" onClick={() => removeExpense(e.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

function CKpi({ label, value, color }) {
  return (
    <div className="comb-kpi">
      <div className="comb-kpi-label">{label}</div>
      <div className="comb-kpi-value" style={{ color }}>{value}</div>
    </div>
  )
}
