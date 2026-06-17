import type { ProductOption } from '@/types'

function ingredientStock(opt: ProductOption): number {
  return Number(opt.ingredient?.stock ?? 0)
}

function optionQty(opt: ProductOption): number {
  return Number(opt.quantity)
}

/** Unidades vendibles de esta opción con el stock actual del insumo */
export function optionAvailableUnits(opt: ProductOption): number {
  const qty = optionQty(opt)
  if (qty <= 0) return 0
  return Math.floor(ingredientStock(opt) / qty)
}

/** ¿Hay stock para usar esta opción al menos una vez? */
export function optionHasStock(opt: ProductOption): boolean {
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
