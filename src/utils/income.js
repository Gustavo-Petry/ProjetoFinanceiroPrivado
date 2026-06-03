// Helpers para salário e benefícios com suporte a valores variáveis por mês

/** Salário efetivo de um mês: usa o histórico se variável, cai no base se não definido */
export function effectiveSalary(data, month) {
  if (data.salaryFixed !== false) return parseFloat(data.salary) || 0
  const hist = data.salaryHistory || {}
  const val  = hist[month] !== undefined && hist[month] !== '' ? hist[month] : data.salary
  return parseFloat(val) || 0
}

/** Valor efetivo de um benefício em um mês */
export function effectiveBenefitValue(b, month) {
  if (!b || !b.enabled) return 0
  if (b.fixed !== false) return parseFloat(b.value) || 0
  const hist = b.valueByMonth || {}
  const val  = hist[month] !== undefined && hist[month] !== '' ? hist[month] : b.value
  return parseFloat(val) || 0
}

/** Renda total efetiva de um mês (salário + todos os benefícios ativos) */
export function effectiveTotalRenda(data, month) {
  return effectiveSalary(data, month) +
    Object.values(data.benefits).reduce((s, b) => s + effectiveBenefitValue(b, month), 0)
}

/** Últimos N meses no formato { key, label, isCurrent } */
export function recentMonthsList(n = 4) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return {
      key:       `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label:     d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      isCurrent: i === n - 1,
    }
  })
}
