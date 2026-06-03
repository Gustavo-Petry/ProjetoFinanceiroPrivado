import { useMemo } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import '../styles/Dashboard.css'
import { effectiveSalary, effectiveBenefitValue, effectiveTotalRenda } from '../utils/income'

const CATEGORY_COLORS = {
  Alimentação: '#ffa502',
  Transporte:  '#4a9eff',
  Saúde:       '#ff6b81',
  Lazer:       '#a78bfa',
  Moradia:     '#ffd700',
  Educação:    '#00f5c8',
  Outros:      '#8888aa',
}

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const tooltipStyle = {
  contentStyle: {
    background: '#1a1a26', border: '1px solid #ffffff12',
    borderRadius: 10, fontFamily: 'Syne',
  },
  labelStyle: { color: '#8888aa' },
}

function KPICard({ title, value, color, sub, badge, trend }) {
  return (
    <div className="card" style={{ borderColor: color + '30' }}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {trend != null && (
        <span className="kpi-badge" style={{
          background: (trend >= 0 ? '#ff475718' : '#c8f50018'),
          color: trend >= 0 ? '#ff4757' : '#c8f500',
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mês ant.
        </span>
      )}
      {badge && (
        <span className="kpi-badge" style={{ background: color + '18', color }}>{badge}</span>
      )}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ data }) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const totalRenda = useMemo(() =>
    effectiveTotalRenda(data, currentMonth),
    [data.salary, data.salaryFixed, data.salaryHistory, data.benefits, currentMonth]
  )

  const monthTx = useMemo(() =>
    data.transactions.filter(t => t.date?.startsWith(currentMonth)),
    [data.transactions, currentMonth]
  )

  const prevTx = useMemo(() =>
    data.transactions.filter(t => t.date?.startsWith(prevMonth)),
    [data.transactions, prevMonth]
  )

  const gastosVariaveis = useMemo(() =>
    monthTx.reduce((s, t) => s + (parseFloat(t.value) || 0), 0),
    [monthTx]
  )

  const prevGastosVariaveis = useMemo(() =>
    prevTx.reduce((s, t) => s + (parseFloat(t.value) || 0), 0),
    [prevTx]
  )

  // Fixos NÃO pagos no mês atual (os pagos viram transações com isFixedExpense:true)
  const gastosFixos = useMemo(() =>
    data.fixedExpenses
      .filter(f => !(f.paidMonths || []).includes(currentMonth))
      .reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses, currentMonth]
  )

  // Total de fixos (todos) — usado como proxy em prevGastos e no gráfico
  const gastosFixosTotal = useMemo(() =>
    data.fixedExpenses.reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses]
  )

  const depositosCofrinhos = useMemo(() =>
    (data.cofrinhos || []).reduce((s, c) =>
      s + c.deposits.filter(d => d.month === currentMonth).reduce((ss, d) => ss + d.amount, 0),
    0), [data.cofrinhos, currentMonth]
  )

  const gastosMes = gastosVariaveis + gastosFixos  // variáveis + fixos não pagos (pagos já em transações)

  // Mesmo cálculo mas para o mês anterior — evita contar fixos pagos duas vezes
  const prevGastosFixos = data.fixedExpenses
    .filter(f => !(f.paidMonths || []).includes(prevMonth))
    .reduce((s, f) => s + (parseFloat(f.value) || 0), 0)
  const prevGastos = prevGastosVariaveis + prevGastosFixos

  const saldoLivre  = totalRenda - gastosMes - depositosCofrinhos
  const pctSobra    = totalRenda > 0 ? ((saldoLivre / totalRenda) * 100).toFixed(0) : 0

  const gastosTrend = prevGastos > 0
    ? parseInt(((gastosMes - prevGastos) / prevGastos * 100).toFixed(0))
    : null

  const totalGuardando = useMemo(() =>
    (data.goals || []).reduce((s, g) => s + (parseFloat(g.monthlySavings) || 0), 0),
    [data.goals]
  )

  const chartData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' })
      const cofMes = (data.cofrinhos || []).reduce((s, c) =>
        s + c.deposits.filter(d2 => d2.month === key).reduce((ss, d2) => ss + d2.amount, 0), 0)
      const gastos = data.transactions
        .filter(t => t.date?.startsWith(key) && !t.isFixedExpense)
        .reduce((s, t) => s + (parseFloat(t.value) || 0), 0) + gastosFixosTotal + cofMes
      const renda = effectiveSalary(data, key) +
        Object.values(data.benefits).reduce((s, b) => s + effectiveBenefitValue(b, key), 0)
      return { name: label, Renda: renda, Gastos: gastos }
    }),
    [data.transactions, data.salary, data.salaryFixed, data.salaryHistory, data.benefits, gastosFixosTotal, data.cofrinhos]
  )

  const pieData = useMemo(() => {
    const cats = {}
    monthTx.forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + (parseFloat(t.value) || 0)
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [monthTx])

  const media = useMemo(() => {
    let total = 0
    for (let i = 0; i < 6; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      total += data.transactions
        .filter(t => t.date?.startsWith(key))
        .reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
    }
    return total / 6
  }, [data.transactions])

  // Depósitos em cofrinhos do mês atual com paidFrom definido
  const allCurrentDeposits = useMemo(() =>
    (data.cofrinhos || []).flatMap(c =>
      c.deposits.filter(d => d.month === currentMonth && d.paidFrom)
    ), [data.cofrinhos, currentMonth]
  )

  // Dynamic income: each source minus transactions + goal deposits allocated to it this month
  const incomeSources = useMemo(() => {
    const sources = []
    const salTotal = effectiveSalary(data, currentMonth)
    if (salTotal > 0 || data.salary) {
      const usedTx  = monthTx.filter(t => t.paidFrom === 'salary').reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
      const usedDep = allCurrentDeposits.filter(d => d.paidFrom === 'salary').reduce((s, d) => s + d.amount, 0)
      const used    = usedTx + usedDep
      sources.push({ key: 'salary', label: 'Salário', icon: '💵', color: '#c8f500', total: salTotal, used, remaining: salTotal - used })
    }
    Object.entries(data.benefits).forEach(([key, b]) => {
      if (!b.enabled) return
      const total   = effectiveBenefitValue(b, currentMonth)
      if (!total && !b.value) return
      const usedTx  = monthTx.filter(t => t.paidFrom === key).reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
      const usedDep = allCurrentDeposits.filter(d => d.paidFrom === key).reduce((s, d) => s + d.amount, 0)
      const used    = usedTx + usedDep
      sources.push({ key, label: b.label, icon: b.icon, color: b.color, total, used, remaining: total - used })
    })
    return sources
  }, [data.salary, data.salaryFixed, data.salaryHistory, data.benefits, monthTx, allCurrentDeposits, currentMonth])

  // Apenas gastos variáveis (não fixos) para distribution bar
  const avulsos = useMemo(() =>
    monthTx.filter(t => !t.isFixedExpense).reduce((s, t) => s + (parseFloat(t.value) || 0), 0),
    [monthTx]
  )

  // Top 5 transações do mês por valor
  const top5 = useMemo(() =>
    [...monthTx]
      .sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0))
      .slice(0, 5),
    [monthTx]
  )

  // Distribution bar percentages
  const distBase    = totalRenda || 1
  const pctDistFixos  = Math.min((gastosFixosTotal / distBase) * 100, 100)
  const pctDistAvulso = Math.min((avulsos / distBase) * 100, Math.max(100 - pctDistFixos, 0))
  const pctDistGuard  = Math.min((depositosCofrinhos / distBase) * 100, Math.max(100 - pctDistFixos - pctDistAvulso, 0))
  const pctDistSobra  = Math.max(100 - pctDistFixos - pctDistAvulso - pctDistGuard, 0)

  const budgets = data.budgets || {}
  const hasBudgets = Object.values(budgets).some(v => parseFloat(v) > 0)
  const monthSpendByCategory = useMemo(() => {
    const cats = {}
    monthTx.filter(t => !t.isFixedExpense).forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + (parseFloat(t.value) || 0)
    })
    return cats
  }, [monthTx])

  return (
    <div className="dashboard-grid">
      {/* KPIs */}
      <div className="kpis-row">
        <KPICard title="Renda Total"   value={fmt(totalRenda)}  color="#c8f500" />
        <KPICard
          title="Gastos do Mês"
          value={fmt(gastosMes)}
          color="#ff4757"
          trend={gastosTrend}
        />
        <KPICard
          title="Saldo Livre"
          value={fmt(saldoLivre)}
          color={saldoLivre >= 0 ? '#c8f500' : '#ff4757'}
          badge={`${pctSobra}% da renda`}
        />
        <KPICard
          title="Cofrinhos este mês"
          value={fmt(depositosCofrinhos)}
          color="#00f5c8"
          sub={(data.cofrinhos || []).length > 0 ? `${(data.cofrinhos || []).length} cofrinho${(data.cofrinhos || []).length > 1 ? 's' : ''}` : 'Nenhum cofrinho'}
        />
      </div>

      {/* Renda por fonte — dinâmica */}
      {incomeSources.length > 0 && (
        <div className="card">
          <div className="section-title">Renda por Fonte — disponível este mês</div>
          <div className="income-sources-grid">
            {incomeSources.map(src => {
              const pct  = src.total > 0 ? Math.min((src.used / src.total) * 100, 100) : 0
              const over = src.used > src.total
              return (
                <div key={src.key} className="income-source-card" style={{ borderColor: src.color + '30' }}>
                  <div className="income-source-header">
                    <span className="income-source-icon">{src.icon}</span>
                    <span className="income-source-label">{src.label}</span>
                  </div>
                  <div className="income-source-remaining" style={{ color: over ? '#ff4757' : src.color }}>
                    {fmt(src.remaining)}
                  </div>
                  <div className="income-source-total">de {fmt(src.total)}</div>
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <div style={{
                      background: over ? '#ff4757' : src.color,
                      height: '100%', borderRadius: 10,
                      width: `${pct}%`, transition: 'width 0.5s',
                    }} />
                  </div>
                  <div className="income-source-meta">
                    {fmt(src.used)} usado · {pct.toFixed(0)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="charts-row">
        <div className="card">
          <div className="section-title">Renda vs Gastos — 6 meses</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dRenda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c8f500" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#c8f500" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="dGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff4757" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff4757" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'Syne' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
              <Area type="monotone" dataKey="Renda"  stroke="#c8f500" fill="url(#dRenda)"  strokeWidth={2} />
              <Area type="monotone" dataKey="Gastos" stroke="#ff4757" fill="url(#dGastos)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Gastos por Categoria</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData} cx="42%" cy="50%" outerRadius={85} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map(e => <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || '#8888aa'} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={v => [fmt(v), 'Gasto']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">Nenhum gasto lançado este mês</div>
          )}
        </div>
      </div>

      {/* Distribuição da renda */}
      {totalRenda > 0 && (
        <div className="card">
          <div className="section-title">Distribuição da Renda — este mês</div>
          <div className="dist-bar">
            <div className="dist-segment dist-fixos"    style={{ width: `${pctDistFixos}%`  }} title={`Fixos: ${fmt(gastosFixosTotal)}`} />
            <div className="dist-segment dist-variaveis" style={{ width: `${pctDistAvulso}%` }} title={`Avulsos: ${fmt(avulsos)}`} />
            <div className="dist-segment dist-cof"      style={{ width: `${pctDistGuard}%`  }} title={`Guardados: ${fmt(depositosCofrinhos)}`} />
            <div className="dist-segment dist-sobra"    style={{ width: `${pctDistSobra}%`  }} title={`Sobra: ${fmt(saldoLivre)}`} />
          </div>
          <div className="dist-legend">
            {[
              { label: 'Fixos',    color: '#ff4757', value: gastosFixosTotal,    pct: pctDistFixos   },
              { label: 'Avulsos',  color: '#ffa502', value: avulsos,             pct: pctDistAvulso  },
              { label: 'Guardados',color: '#00f5c8', value: depositosCofrinhos,  pct: pctDistGuard   },
              { label: 'Sobra',    color: '#c8f500', value: Math.max(saldoLivre, 0), pct: pctDistSobra },
            ].map(item => (
              <div key={item.label} className="dist-legend-item">
                <div className="dist-dot" style={{ background: item.color }} />
                <span className="dist-legend-label">{item.label}</span>
                <span className="dist-legend-value" style={{ color: item.color }}>{fmt(item.value)}</span>
                <span className="dist-legend-pct">{item.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 transações do mês */}
      {top5.length > 0 && (
        <div className="card">
          <div className="section-title">Top 5 Transações — este mês</div>
          <div className="top5-list">
            {top5.map((tx, i) => (
              <div key={tx.id} className="top5-item">
                <span className="top5-rank">#{i + 1}</span>
                <span className="top5-name">
                  {tx.isFixedExpense && '📌 '}{tx.description || '—'}
                </span>
                <span className="top5-cat" style={{ color: CATEGORY_COLORS[tx.category] || '#8888aa' }}>
                  {tx.category || ''}
                </span>
                <span className="top5-value">{fmt(parseFloat(tx.value) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orçamento por Categoria */}
      {hasBudgets && (
        <div className="card">
          <div className="section-title">Orçamento por Categoria — este mês</div>
          <div className="budget-bars-grid">
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
              const budget = parseFloat(budgets[cat]) || 0
              if (!budget) return null
              const spent = monthSpendByCategory[cat] || 0
              const pct   = Math.min((spent / budget) * 100, 100)
              const over  = spent > budget
              return (
                <div key={cat} className="budget-bar-item">
                  <div className="budget-bar-header">
                    <span className="budget-bar-label">{cat}</span>
                    <span className="budget-bar-value" style={{ color: over ? '#ff4757' : color }}>
                      {fmt(spent)} / {fmt(budget)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div style={{
                      background: over ? '#ff4757' : color,
                      height: '100%', borderRadius: 10,
                      width: `${pct}%`, transition: 'width 0.5s',
                    }} />
                  </div>
                  {over && (
                    <div style={{ color: '#ff4757', fontSize: 11, marginTop: 3, fontWeight: 600 }}>
                      Ultrapassado em {fmt(spent - budget)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Objetivos resumo */}
      {(data.cofrinhos || []).filter(c => c.isGoal).length > 0 && (
        <div className="card card-accent">
          <div className="section-title">🎯 Objetivos</div>
          <div className="caixinhas-preview-row">
            {(data.cofrinhos || []).filter(c => c.isGoal).map(g => {
              const saved  = (g.initialValue || 0) + g.deposits.reduce((s, d) => s + d.amount, 0)
              const target = parseFloat(g.targetValue) || 0
              const pct    = target > 0 ? Math.min((saved / target) * 100, 100) : 0
              const color  = g.priority === 'primary' ? '#c8f500' : '#00f5c8'
              return (
                <div key={g.id} className="caixinha-mini">
                  <div className="caixinha-mini-icon">{g.icon}</div>
                  <div className="caixinha-mini-name">{g.name}</div>
                  <div className="caixinha-mini-value" style={{ color }}>{pct.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cofrinhos preview */}
      {(data.cofrinhos || []).length > 0 && (
        <div className="card" style={{ borderColor: '#00f5c830' }}>
          <div className="section-title">🐷 Cofrinhos</div>
          <div className="caixinhas-preview-row">
            {(data.cofrinhos || []).map(c => {
              const total = (c.initialValue || 0) + c.deposits.reduce((s, d) => s + d.amount, 0)
              const hasTarget = parseFloat(c.targetValue) > 0
              const pct = hasTarget ? Math.min((total / parseFloat(c.targetValue)) * 100, 100) : null
              return (
                <div key={c.id} className="caixinha-mini" style={{ borderLeft: `3px solid ${c.color}` }}>
                  <div className="caixinha-mini-icon">{c.icon}</div>
                  <div className="caixinha-mini-name">{c.name}</div>
                  <div className="caixinha-mini-value" style={{ color: c.color }}>{fmt(total)}</div>
                  {pct != null && (
                    <div style={{ fontSize: 11, color: '#8888aa', marginTop: 2 }}>{pct.toFixed(0)}% da meta</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Projeção */}
      <div className="card">
        <div className="section-title">Gasto Médio & Projeção</div>
        <div className="projection-row">
          <div>
            <div className="projection-label">Média últimos 6 meses</div>
            <div className="projection-value" style={{ color: '#ffa502' }}>{fmt(media)}</div>
          </div>
          <div>
            <div className="projection-label">Projeção próximo mês (+3%)</div>
            <div className="projection-value" style={{ color: '#00f5c8' }}>{fmt(media * 1.03)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
