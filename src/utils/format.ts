const COLOMBIA_TZ = 'America/Bogota'

/** Parsea fechas del API (MySQL/Vercel envía UTC sin indicador Z) */
export function parseApiDate(date: string | Date): Date {
  if (date instanceof Date) return date
  const normalized = date.trim().replace(' ', 'T')
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized)
  }
  return new Date(`${normalized}Z`)
}

/** Convierte string/number a número seguro (MySQL devuelve decimales como string) */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(n) ? 0 : n
}

/** Formato numérico colombiano: 1.234.567 */
export function formatNumber(value: number | string, decimals = 0): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toNumber(value))
}

/** Moneda COP con separador de miles: $ 1.234.567 */
export function formatMoney(amount: number | string, currency = 'COP'): string {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNumber(amount))
  return formatted
}

/** Cantidades enteras sin formato de moneda (sin decimales) */
export function formatQuantity(value: number | string): string {
  return formatNumber(value, 0)
}

export function formatDate(date: string | Date): string {
  return parseApiDate(date).toLocaleString('es-CO', {
    timeZone: COLOMBIA_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(date: string | Date): string {
  return parseApiDate(date).toLocaleDateString('es-CO', {
    timeZone: COLOMBIA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Formatea stock según unidad (g, ml, uds) */
export function formatStock(stock: number | string, unit: string = 'unit'): string {
  const n = toNumber(stock)
  if (unit === 'g') return `${formatNumber(n, n % 1 ? 1 : 0)} g`
  if (unit === 'ml') return `${formatNumber(n, n % 1 ? 1 : 0)} ml`
  return `${formatNumber(n, 0)} uds`
}

const unitLabels: Record<string, string> = {
  g: 'Gramos',
  ml: 'Mililitros',
  unit: 'Unidades',
}

export function stockUnitLabel(unit: string = 'unit'): string {
  return unitLabels[unit] ?? unit
}

/** Cantidad de un movimiento con signo y unidad correcta */
export function formatMovementQty(
  quantity: number | string,
  unit: string = 'unit',
  outflow = false,
): string {
  const n = toNumber(quantity)
  const sign = outflow ? '−' : '+'
  if (unit === 'g') return `${sign}${formatNumber(n, n % 1 ? 1 : 0)} g`
  if (unit === 'ml') return `${sign}${formatNumber(n, n % 1 ? 1 : 0)} ml`
  return `${sign}${formatNumber(n, 0)} uds`
}

/** Rango de stock antes → después con unidad */
export function formatMovementStock(
  before: number | string,
  after: number | string,
  unit: string = 'unit',
): string {
  return `${formatStock(before, unit)} → ${formatStock(after, unit)}`
}

export function productTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    simple: 'Unidad',
    bulk: 'Insumo base',
    portion: 'Porción de venta',
    composite: 'Compuesto (receta)',
  }
  return labels[type] ?? type
}
export function todayColombia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBIA_TZ }).format(new Date())
}

/** Fecha N días atrás en Colombia (YYYY-MM-DD) */
export function daysAgoColombia(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBIA_TZ }).format(d)
}
