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
  return new Date(date).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
