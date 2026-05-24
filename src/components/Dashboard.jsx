import { useMemo } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import '../styles/Dashboard.css'

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

function KPICard({ title, value, color, sub, badge }) {
  return (
    <div className="card" style={{ borderColor: color + '30' }}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
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

  const totalRenda = useMemo(() => {
    const sal = parseFloat(data.salary) || 0
    const ben = Object.values(data.benefits).reduce(
      (s, b) => s + (b.enabled ? (parseFloat(b.value) || 0) : 0), 0
    )
    return sal + ben
  }, [data.salary, data.benefits])

  const monthTx = useMemo(() =>
    data.transactions.filter(t => t.date?.startsWith(currentMonth)),
    [data.transactions, currentMonth]
  )

  const gastosVariaveis = useMemo(() =>
    monthTx.reduce((s, t) => s + (parseFloat(t.value) || 0), 0),
    [monthTx]
  )

  const gastosFixos = useMemo(() =>
    data.fixedExpenses.reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses]
  )

  const gastosMes   = gastosVariaveis + gastosFixos
  const saldoLivre  = totalRenda - gastosMes
  const pctGuardado = totalRenda > 0 ? ((saldoLivre / totalRenda) * 100).toFixed(0) : 0

  const totalGuardando = useMemo(() =>
    (data.goals || []).reduce((s, g) => s + (parseFloat(g.monthlySavings) || 0), 0),
    [data.goals]
  )

  const chartData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' })
      const gastos = data.transactions
        .filter(t => t.date?.startsWith(key))
        .reduce((s, t) => s + (parseFloat(t.value) || 0), 0) + gastosFixos
      return { name: label, Renda: totalRenda, Gastos: gastos }
    }),
    [data.transactions, totalRenda, gastosFixos]
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

  const enabledBenefits = Object.entries(data.benefits).filter(([, b]) => b.enabled && b.value)

  return (
    <div className="dashboard-grid">
      {/* KPIs */}
      <div className="kpis-row">
        <KPICard title="Renda Total"   value={fmt(totalRenda)}  color="#c8f500" />
        <KPICard title="Gastos do Mês" value={fmt(gastosMes)}   color="#ff4757" />
        <KPICard
          title="Saldo Livre"
          value={fmt(saldoLivre)}
          color={saldoLivre >= 0 ? '#c8f500' : '#ff4757'}
          badge={`${pctGuardado}% guardado`}
        />
        <KPICard
          title="Guardando/mês" value={fmt(totalGuardando)} color="#00f5c8"
          sub={(data.goals || []).length > 0 ? `${(data.goals || []).length} objetivo${(data.goals || []).length > 1 ? 's' : ''}` : undefined}
        />
      </div>

      {/* Composição da renda */}
      {(data.salary || enabledBenefits.length > 0) && (
        <div className="card">
          <div className="section-title">Composição da Renda</div>
          <div className="income-row">
            {data.salary && (
              <div
                className="income-item"
                style={{ background: '#c8f50010', border: '1px solid #c8f50025' }}
              >
                <div className="income-item-label">Salário</div>
                <div className="income-item-value" style={{ color: '#c8f500' }}>
                  {fmt(parseFloat(data.salary))}
                </div>
              </div>
            )}
            {enabledBenefits.map(([key, b]) => (
              <div
                key={key}
                className="income-item"
                style={{ background: b.color + '10', border: `1px solid ${b.color}25` }}
              >
                <div className="income-item-label">{b.icon} {b.label}</div>
                <div className="income-item-value" style={{ color: b.color }}>
                  {fmt(parseFloat(b.value))}
                </div>
              </div>
            ))}
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

      {/* Objetivos resumo */}
      {(data.goals || []).length > 0 && (
        <div className="card card-accent">
          <div className="section-title">🎯 Objetivos</div>
          <div className="caixinhas-preview-row">
            {(data.goals || []).map(g => {
              const pct = g.targetValue > 0 ? Math.min((g.currentSaved / g.targetValue) * 100, 100) : 0
              const color = g.priority === 'primary' ? '#c8f500' : '#00f5c8'
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
