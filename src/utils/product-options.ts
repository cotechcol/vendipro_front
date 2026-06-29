import type { ProductOption } from '@/types'

function ingredientStock(opt: ProductOption): number {
  return Number(opt.ingredient?.stock ?? 0)
}

function optionQty(opt: ProductOption): number {
  return Number(opt.quantity)
}

/** Unidades vendibles de esta opción con el stock actual del insumo */
export function optionAvailableUnits(opt: ProductOption): number {
  if (!opt.ingredientProductId) return 9999
  const qty = optionQty(opt)
  if (qty <= 0) return 0
  return Math.floor(ingredientStock(opt) / qty)
}

/** ¿Hay stock para usar esta opción al menos una vez? */
export function optionHasStock(opt: ProductOption): boolean {
  if (!opt.ingredientProductId) return true
  return optionAvailableUnits(opt) > 0
}

/**
 * ¿Se puede elegir este sabor en la bola `scoopIndex`?
 * Considera cuántas veces ya está seleccionado en las otras bolas.
 */
export function canSelectFlavorOption(
  opt: ProductOption,
  scoopIndex: number,
  flavorSelections: number[],
): boolean {
  if (!opt.ingredientProductId) return true
  const qty = optionQty(opt)
  if (qty <= 0) return false

  let count = 0
  for (let i = 0; i < flavorSelections.length; i++) {
    if (flavorSelections[i] === opt.id) count++
  }
  if (flavorSelections[scoopIndex] !== opt.id) count++

  return ingredientStock(opt) >= qty * count
}

/** Máximo de bolas vendibles de este sabor con el stock actual */
export function maxScoopsForFlavor(opt: ProductOption): number {
  const qty = optionQty(opt)
  if (qty <= 0) return 0
  return Math.floor(ingredientStock(opt) / qty)
}

function countSelectedByKind(
  product: { optionGroups?: { kind: string; options: ProductOption[] }[] },
  selectedOptionIds: number[] | undefined,
  kind: string,
): number {
  if (!selectedOptionIds?.length || !product.optionGroups?.length) return 0
  const ids = new Set<number>()
  for (const group of product.optionGroups) {
    if (group.kind !== kind) continue
    for (const option of group.options ?? []) {
      ids.add(option.id)
    }
  }
  return selectedOptionIds.filter((id) => ids.has(id)).length
}

/** Precio unitario de venta incluyendo bolas variables y adicionales */
export function calculateItemUnitPrice(
  product: {
    productType?: string
    salePrice: number
    variableScoops?: boolean
    scoopPrices?: number[] | null
    optionGroups?: { kind: string; options: ProductOption[] }[]
  },
  selectedOptionIds?: number[],
  portionScoopCount?: number,
): number {
  let price = Number(product.salePrice)

  if (
    product.productType === 'portion'
    && product.variableScoops
    && product.scoopPrices?.length
  ) {
    const flavorCount = countSelectedByKind(product, selectedOptionIds, 'flavor')
    const scoops = portionScoopCount ?? (flavorCount > 0 ? flavorCount : 0)
    if (scoops > 0) {
      price = Number(product.scoopPrices[scoops - 1] ?? product.salePrice)
    }
  }

  if (!selectedOptionIds?.length || !product.optionGroups?.length) return price

  const optionMap = new Map<number, ProductOption>()
  const groupKindByOption = new Map<number, string>()
  for (const group of product.optionGroups) {
    for (const option of group.options ?? []) {
      optionMap.set(option.id, option)
      groupKindByOption.set(option.id, group.kind)
    }
  }

  for (const optionId of selectedOptionIds) {
    const option = optionMap.get(optionId)
    if (option && groupKindByOption.get(optionId) === 'addon') {
      price += Number(option.unitPrice ?? 0)
    }
  }

  return Number(price.toFixed(2))
}

export function productHasConfigurableOptions(p: {
  productType?: string
  scoopCount?: number | null
  optionGroups?: unknown[]
}): boolean {
  return (p.optionGroups?.length ?? 0) > 0
    || (p.productType === 'portion' && (p.scoopCount ?? 0) > 0)
}
