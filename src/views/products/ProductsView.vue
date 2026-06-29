<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { Product, Category, ProductType, StockUnit, ProductRecipe } from '@/types'
import { formatMoney, formatStock, productTypeLabel, parseDecimalInput, formatCostInput } from '@/utils/format'

type OptionRow = {
  name: string
  ingredientProductId: number
  unitCost: number
  costManual: boolean
}

type AddonRow = {
  name: string
  ingredientProductId: number
  unitCost: number
  unitPrice: number
  costManual: boolean
}

const auth = useAuthStore()
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const bulkProducts = ref<Product[]>([])
const loading = ref(true)
const search = ref('')
const categoryFilter = ref<number | ''>('')
const typeFilter = ref<ProductType | ''>('')
const showModal = ref(false)
const editing = ref<Product | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const editingImageUrl = ref<string | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)

const displayedImageUrl = computed(() => imagePreviewUrl.value || editingImageUrl.value)

const form = ref({
  sku: '',
  name: '',
  description: '',
  productType: 'simple' as ProductType,
  stockUnit: 'unit' as StockUnit,
  baseProductId: undefined as number | undefined,
  portionSize: 90,
  scoopCount: 3,
  variableScoops: false,
  scoopPrices: [0, 0, 0] as number[],
  useOptions: false,
  flavorOptions: [{ name: '', ingredientProductId: 0, unitCost: 0, costManual: false }] as OptionRow[],
  containerOptions: [
    { name: 'Galleta', ingredientProductId: 0, unitCost: 0, costManual: false },
    { name: 'Vaso', ingredientProductId: 0, unitCost: 0, costManual: false },
  ] as OptionRow[],
  salePrice: 0,
  costPrice: 0,
  stock: 0,
  minStock: 5,
  categoryId: undefined as number | undefined,
  visibleInPos: true,
  recipe: [] as ProductRecipe[],
  addonOptions: [] as AddonRow[],
})

const simpleProducts = computed(() =>
  products.value.filter((p) => p.productType === 'simple'),
)

const productTypeOptions: { value: ProductType; label: string }[] = [
  { value: 'simple', label: 'Unidad' },
  { value: 'bulk', label: 'Insumo base' },
  { value: 'portion', label: 'Porción de venta' },
  { value: 'composite', label: 'Compuesto (receta)' },
]

const portionSizeLabel = computed(() => {
  if (form.value.stockUnit === 'ml') return 'Mililitros por bola'
  if (form.value.stockUnit === 'unit') return 'Unidades por bola'
  return 'Gramos por bola'
})

const bulkStockHint = computed(() => {
  if (form.value.stockUnit === 'unit') return 'Ej: 50 uds = 50 panes o envases'
  if (form.value.stockUnit === 'ml') return 'Ej: 5000 ml = 5 litros'
  return 'Ej: 10000 g = 10 kg de helado'
})

const bulkMinStockHint = computed(() => {
  if (form.value.stockUnit === 'unit') return 'Ej: 5 uds — te avisa cuando llegue'
  return 'Ej: 1 g — te avisa cuando llegue'
})

const filtered = computed(() => {
  let list = products.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }
  if (typeFilter.value) list = list.filter((p) => p.productType === typeFilter.value)
  if (categoryFilter.value) list = list.filter((p) => p.categoryId === categoryFilter.value)
  return list
})

const ingredientOptions = computed(() =>
  products.value.filter((p) => p.productType === 'bulk' || p.productType === 'simple'),
)

const addonIngredientOptions = computed(() =>
  products.value.filter((p) => {
    if (editing.value && p.id === editing.value.id) return false
    return p.productType === 'bulk' || p.productType === 'simple' || p.productType === 'composite'
  }),
)

function validateAddonOptions(): string | null {
  const incomplete = form.value.addonOptions.filter(
    (o) => (o.name.trim() && !o.ingredientProductId) || (!o.name.trim() && o.ingredientProductId),
  )
  if (incomplete.length) {
    return 'Cada adicional necesita nombre y producto/insumo vinculado.'
  }
  return null
}

function buildAddonOptionGroups() {
  const addons = form.value.addonOptions.filter((o) => o.name.trim() && o.ingredientProductId)
  if (!addons.length) return []
  return [{
    name: 'Adicionales',
    kind: 'addon',
    options: addons.map((o) => ({
      name: o.name.trim(),
      ingredientProductId: Number(o.ingredientProductId),
      unitCost: Number(o.unitCost) || 0,
      unitPrice: Number(o.unitPrice) || 0,
    })),
  }]
}

function flavorCostFromBulk(bulkId: number): number {
  const bulk = bulkProducts.value.find((b) => b.id === bulkId)
  if (!bulk) return 0
  return Number((Number(bulk.costPrice) * Number(form.value.portionSize)).toFixed(2))
}

function containerCostFromProduct(productId: number): number {
  const p = simpleProducts.value.find((s) => s.id === productId)
  return p ? Number(p.costPrice) : 0
}

function addonCostFromProduct(productId: number): number {
  const p = products.value.find((x) => x.id === productId)
  return p ? Number(p.costPrice) : 0
}

function onFlavorIngredientChange(idx: number) {
  const row = form.value.flavorOptions[idx]
  if (row.ingredientProductId) {
    row.unitCost = flavorCostFromBulk(row.ingredientProductId)
    row.costManual = false
  }
}

function setFlavorCost(idx: number, raw: string) {
  const row = form.value.flavorOptions[idx]
  row.unitCost = parseDecimalInput(raw)
  row.costManual = true
}

function onContainerIngredientChange(idx: number) {
  const row = form.value.containerOptions[idx]
  if (row.ingredientProductId) {
    row.unitCost = containerCostFromProduct(row.ingredientProductId)
    row.costManual = false
  }
}

function setContainerCost(idx: number, raw: string) {
  const row = form.value.containerOptions[idx]
  row.unitCost = parseDecimalInput(raw)
  row.costManual = true
}

const portionCostBreakdown = computed(() => {
  if (!form.value.useOptions || form.value.productType !== 'portion') return null

  const flavorCosts = form.value.flavorOptions
    .map((f) => Number(f.unitCost) || 0)
    .filter((n) => n > 0)
  const containerCosts = form.value.containerOptions
    .map((c) => Number(c.unitCost) || 0)
    .filter((n) => n > 0)

  if (!flavorCosts.length) return null

  const scoops = form.value.scoopCount
  const avgFlavor = flavorCosts.reduce((a, b) => a + b, 0) / flavorCosts.length
  const minFlavor = Math.min(...flavorCosts)
  const maxFlavor = Math.max(...flavorCosts)
  const scoopsCost = Number((avgFlavor * scoops).toFixed(2))
  const minScoops = Number((minFlavor * scoops).toFixed(2))
  const maxScoops = Number((maxFlavor * scoops).toFixed(2))

  const avgContainer = containerCosts.length
    ? containerCosts.reduce((a, b) => a + b, 0) / containerCosts.length
    : 0
  const minContainer = containerCosts.length ? Math.min(...containerCosts) : 0
  const maxContainer = containerCosts.length ? Math.max(...containerCosts) : 0

  return {
    scoops,
    scoopsCost,
    avgContainer: Number(avgContainer.toFixed(2)),
    referenceTotal: Number((scoopsCost + avgContainer).toFixed(2)),
    minTotal: Number((minScoops + minContainer).toFixed(2)),
    maxTotal: Number((maxScoops + maxContainer).toFixed(2)),
  }
})

function stockDisplay(p: Product): string {
  if (p.productType === 'bulk') return formatStock(p.stock, p.stockUnit)
  if (p.productType === 'portion' || p.productType === 'composite') {
    const avail = p.sellableUnits ?? 0
    return `${avail} disp.`
  }
  return formatStock(p.stock, p.stockUnit)
}

function isLow(p: Product): boolean {
  if (p.productType === 'bulk' || p.productType === 'simple') {
    return Number(p.stock) <= Number(p.minStock)
  }
  return (p.sellableUnits ?? 0) <= 0
}

async function load() {
  loading.value = true
  try {
    const [prodRes, catRes, bulkRes] = await Promise.all([
      api.get('/products', { params: { limit: 200 } }),
      api.get('/categories/active'),
      api.get('/products/bulk'),
    ])
    products.value = prodRes.data.data
    categories.value = catRes.data
    bulkProducts.value = bulkRes.data
  } finally {
    loading.value = false
  }
}

function clearImageState() {
  if (imagePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
  imageFile.value = null
  imagePreviewUrl.value = null
  editingImageUrl.value = null
}

function openImagePicker() {
  imageInputRef.value?.click()
}

function onImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    toast.value = { show: true, message: 'Solo imágenes JPG, PNG, WEBP o GIF', type: 'error' }
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.value = { show: true, message: 'La imagen no puede superar 5 MB', type: 'error' }
    return
  }
  if (imagePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
  imageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
}

async function removeProductImage() {
  if (!editing.value?.id) {
    clearImageState()
    return
  }
  try {
    await api.delete(`/products/${editing.value.id}/image`)
    clearImageState()
    toast.value = { show: true, message: 'Imagen eliminada', type: 'success' }
    await load()
  } catch {
    toast.value = { show: true, message: 'No se pudo eliminar la imagen', type: 'error' }
  }
}

async function uploadProductImage(productId: number) {
  if (!imageFile.value) return
  const fd = new FormData()
  fd.append('image', imageFile.value)
  await api.post(`/products/${productId}/image`, fd)
}

function resetForm() {
  form.value = {
    sku: '', name: '', description: '',
    productType: 'simple', stockUnit: 'unit',
    baseProductId: undefined, portionSize: 90,
    scoopCount: 3, variableScoops: false, scoopPrices: [0, 0, 0],
    useOptions: false,
    flavorOptions: [{ name: '', ingredientProductId: 0, unitCost: 0, costManual: false }],
    containerOptions: [
      { name: 'Galleta', ingredientProductId: 0, unitCost: 0, costManual: false },
      { name: 'Vaso', ingredientProductId: 0, unitCost: 0, costManual: false },
    ],
    salePrice: 0, costPrice: 0, stock: 0, minStock: 5,
    categoryId: undefined, visibleInPos: true, recipe: [], addonOptions: [],
  }
  clearImageState()
}

function openCreate() {
  editing.value = null
  resetForm()
  if (form.value.productType === 'simple' || form.value.productType === 'composite') {
    addAddonOption()
  }
  showModal.value = true
}

async function openEdit(p: Product) {
  editing.value = p
  clearImageState()
  editingImageUrl.value = p.imageUrl ?? null

  let product = p
  try {
    const { data } = await api.get<Product>(`/products/${p.id}`)
    product = data
  } catch {
    // Usar datos del listado si falla la carga detallada
  }

  const flavorGroup = product.optionGroups?.find((g) => g.kind === 'flavor')
  const containerGroup = product.optionGroups?.find((g) => g.kind === 'container')
  const addonGroup = product.optionGroups?.find((g) => g.kind === 'addon')
  const hasOptions = !!flavorGroup || !!containerGroup

  form.value = {
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    productType: product.productType,
    stockUnit: product.productType === 'portion' && !['g', 'ml', 'unit'].includes(product.stockUnit)
      ? 'g'
      : product.stockUnit,
    baseProductId: product.baseProductId ?? undefined,
    portionSize: Number(product.portionSize) || 90,
    scoopCount: Number(product.scoopCount) || 3,
    variableScoops: product.variableScoops ?? false,
    scoopPrices: product.scoopPrices?.length
      ? [...product.scoopPrices, 0, 0, 0].slice(0, 3)
      : [Number(product.salePrice), Number(product.salePrice), Number(product.salePrice)],
    useOptions: hasOptions,
    flavorOptions: flavorGroup?.options.map((o) => ({
      name: o.name,
      ingredientProductId: o.ingredientProductId,
      unitCost: Number(o.unitCost) || flavorCostFromBulk(o.ingredientProductId),
      costManual: Number(o.unitCost) > 0,
    })) ?? [{ name: '', ingredientProductId: 0, unitCost: 0, costManual: false }],
    containerOptions: containerGroup?.options.map((o) => ({
      name: o.name,
      ingredientProductId: o.ingredientProductId,
      unitCost: Number(o.unitCost) || containerCostFromProduct(o.ingredientProductId),
      costManual: Number(o.unitCost) > 0,
    })) ?? [
      { name: 'Galleta', ingredientProductId: 0, unitCost: 0, costManual: false },
      { name: 'Vaso', ingredientProductId: 0, unitCost: 0, costManual: false },
    ],
    salePrice: Number(product.salePrice),
    costPrice: Number(product.costPrice),
    stock: Number(product.stock),
    minStock: Number(product.minStock),
    categoryId: product.categoryId,
    visibleInPos: product.visibleInPos !== false,
    recipe: (product.recipe ?? []).map((r) => ({
      ingredientProductId: r.ingredientProductId,
      quantity: Number(r.quantity),
      unit: r.unit,
    })),
    addonOptions: addonGroup?.options.map((o) => ({
      name: o.name,
      ingredientProductId: o.ingredientProductId,
      unitCost: Number(o.unitCost) || addonCostFromProduct(o.ingredientProductId),
      unitPrice: Number(o.unitPrice) || 0,
      costManual: Number(o.unitCost) > 0,
    })) ?? [],
  }
  if ((product.productType === 'simple' || product.productType === 'composite') && form.value.addonOptions.length === 0) {
    addAddonOption()
  }
  showModal.value = true
}

function addFlavorOption() {
  form.value.flavorOptions.push({ name: '', ingredientProductId: 0, unitCost: 0, costManual: false })
}

function removeFlavorOption(idx: number) {
  form.value.flavorOptions.splice(idx, 1)
  if (form.value.flavorOptions.length === 0) {
    form.value.flavorOptions.push({ name: '', ingredientProductId: 0, unitCost: 0, costManual: false })
  }
}

function addContainerOption() {
  form.value.containerOptions.push({ name: '', ingredientProductId: 0, unitCost: 0, costManual: false })
}

function removeContainerOption(idx: number) {
  form.value.containerOptions.splice(idx, 1)
  if (form.value.containerOptions.length === 0) {
    form.value.containerOptions.push({ name: '', ingredientProductId: 0, unitCost: 0, costManual: false })
  }
}

function addRecipeLine() {
  form.value.recipe.push({ ingredientProductId: 0, quantity: 0, unit: 'g' })
}

function removeRecipeLine(idx: number) {
  form.value.recipe.splice(idx, 1)
}

function addAddonOption() {
  form.value.addonOptions.push({
    name: '', ingredientProductId: 0, unitCost: 0, unitPrice: 0, costManual: false,
  })
}

function removeAddonOption(idx: number) {
  form.value.addonOptions.splice(idx, 1)
}

function onAddonIngredientChange(idx: number) {
  const row = form.value.addonOptions[idx]
  row.ingredientProductId = Number(row.ingredientProductId) || 0
  if (row.ingredientProductId && !row.costManual) {
    row.unitCost = addonCostFromProduct(row.ingredientProductId)
  }
}

function setAddonCost(idx: number, raw: string) {
  const row = form.value.addonOptions[idx]
  row.unitCost = parseDecimalInput(raw)
  row.costManual = true
}

watch(() => form.value.productType, (type) => {
  if (type === 'bulk') {
    form.value.stockUnit = 'g'
    form.value.salePrice = 0
    form.value.visibleInPos = false
  } else if (!editing.value) {
    form.value.visibleInPos = true
  }
  if (type === 'portion') {
    if (!['g', 'ml', 'unit'].includes(form.value.stockUnit)) {
      form.value.stockUnit = 'g'
    }
    if (!form.value.portionSize) form.value.portionSize = 90
    if (!editing.value) {
      form.value.useOptions = true
      form.value.variableScoops = true
    }
  }
  if (type === 'composite' && form.value.recipe.length === 0) addRecipeLine()
  if (type === 'composite' && form.value.addonOptions.length === 0 && !editing.value) addAddonOption()
  if (type === 'simple' && form.value.addonOptions.length === 0 && !editing.value) addAddonOption()
})

watch(() => [form.value.portionSize, form.value.stockUnit] as const, () => {
  if (!form.value.useOptions) return
  form.value.flavorOptions.forEach((row, idx) => {
    if (row.ingredientProductId && !row.costManual) onFlavorIngredientChange(idx)
  })
})

watch(
  portionCostBreakdown,
  (b) => {
    if (form.value.useOptions && form.value.productType === 'portion' && b) {
      form.value.costPrice = b.referenceTotal
    }
  },
  { deep: true },
)

async function save() {
  try {
    if (form.value.productType === 'simple' || form.value.productType === 'composite') {
      const addonError = validateAddonOptions()
      if (addonError) {
        toast.value = { show: true, message: addonError, type: 'error' }
        return
      }
    }

    const payload: Record<string, unknown> = { ...form.value }
    if (form.value.productType === 'bulk') {
      payload.salePrice = 0
      payload.visibleInPos = false
      delete payload.baseProductId
      delete payload.portionSize
      delete payload.recipe
    } else if (form.value.productType === 'portion') {
      delete payload.recipe
      payload.stock = 0
      if (!['g', 'ml', 'unit'].includes(form.value.stockUnit)) {
        payload.stockUnit = 'g'
      }
      if (form.value.useOptions) {
        delete payload.baseProductId
        payload.scoopCount = form.value.scoopCount
        payload.variableScoops = form.value.variableScoops
        if (form.value.variableScoops) {
          const prices = form.value.scoopPrices
            .slice(0, form.value.scoopCount)
            .map((p) => Number(p) || 0)
          payload.scoopPrices = prices
          payload.salePrice = prices[0] ?? form.value.salePrice
        } else {
          payload.variableScoops = false
          delete payload.scoopPrices
        }
        payload.optionGroups = [
          {
            name: 'Sabor',
            kind: 'flavor',
            options: form.value.flavorOptions
              .filter((o) => o.name && o.ingredientProductId)
              .map((o) => ({
                name: o.name,
                ingredientProductId: o.ingredientProductId,
                unitCost: Number(o.unitCost) || 0,
              })),
          },
          {
            name: 'Envase',
            kind: 'container',
            options: form.value.containerOptions
              .filter((o) => o.name && o.ingredientProductId)
              .map((o) => ({
                name: o.name,
                ingredientProductId: o.ingredientProductId,
                unitCost: Number(o.unitCost) || 0,
              })),
          },
        ]
      } else {
        delete payload.scoopCount
        delete payload.optionGroups
      }
      delete payload.useOptions
      delete payload.flavorOptions
      delete payload.containerOptions
      delete payload.addonOptions
    } else if (form.value.productType === 'composite') {
      delete payload.baseProductId
      delete payload.portionSize
      payload.stock = 0
      payload.recipe = form.value.recipe.filter((r) => r.ingredientProductId && r.quantity > 0)
      payload.optionGroups = buildAddonOptionGroups()
      delete payload.addonOptions
    } else {
      delete payload.baseProductId
      delete payload.portionSize
      delete payload.recipe
      delete payload.variableScoops
      delete payload.scoopPrices
      delete payload.scoopCount
      delete payload.useOptions
      delete payload.flavorOptions
      delete payload.containerOptions
      payload.stockUnit = 'unit'
      payload.optionGroups = buildAddonOptionGroups()
      delete payload.addonOptions
    }

    if (editing.value) {
      await api.patch(`/products/${editing.value.id}`, payload)
    } else {
      const res = await api.post('/products', payload)
      editing.value = { ...res.data, id: res.data.id } as Product
    }

    const productId = editing.value!.id
    if (imageFile.value) {
      await uploadProductImage(productId)
    }

    showModal.value = false
    clearImageState()
    toast.value = { show: true, message: 'Producto guardado', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function remove(id: number) {
  if (!confirm('¿Eliminar producto?')) return
  try {
    await api.delete(`/products/${id}`)
    toast.value = { show: true, message: 'Producto eliminado', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo eliminar el producto'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function toggleVisibleInPos(p: Product) {
  if (p.productType === 'bulk') return
  const next = !(p.visibleInPos !== false)
  try {
    await api.patch(`/products/${p.id}`, { visibleInPos: next })
    p.visibleInPos = next
    toast.value = {
      show: true,
      message: next ? 'Visible en punto de venta' : 'Oculto del punto de venta',
      type: 'success',
    }
  } catch {
    toast.value = { show: true, message: 'No se pudo actualizar', type: 'error' }
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Productos" subtitle="Unidades, insumos base, porciones y compuestos">
      <template #actions>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openCreate">+ Nuevo producto</button>
      </template>
    </PageHeader>

    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <input v-model="search" placeholder="Buscar por nombre o SKU..." class="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
      <select v-model="typeFilter" class="px-4 py-2 border border-slate-300 rounded-lg sm:min-w-[180px]">
        <option value="">Todos los tipos</option>
        <option v-for="opt in productTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model="categoryFilter" class="px-4 py-2 border border-slate-300 rounded-lg sm:min-w-[180px]">
        <option value="">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-4 py-3 w-14"></th>
              <th class="text-left px-4 py-3">SKU</th>
              <th class="text-left px-4 py-3">Nombre</th>
              <th class="text-left px-4 py-3">Tipo</th>
              <th class="text-left px-4 py-3">Categoría</th>
              <th class="text-right px-4 py-3">Precio</th>
              <th class="text-right px-4 py-3">Stock / Disp.</th>
              <th class="text-center px-4 py-3">POS</th>
              <th v-if="auth.isAdmin" class="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="9" class="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            <tr v-else-if="filtered.length === 0"><td colspan="9" class="px-4 py-8 text-center text-slate-400">Sin productos</td></tr>
            <tr v-for="p in filtered" :key="p.id" class="border-t border-slate-100 hover:bg-slate-50">
              <td class="px-4 py-3">
                <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.name" class="w-full h-full object-cover" />
                  <span v-else class="text-slate-300 text-lg">📦</span>
                </div>
              </td>
              <td class="px-4 py-3 font-mono text-xs">{{ p.sku }}</td>
              <td class="px-4 py-3 font-medium">{{ p.name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ productTypeLabel(p.productType) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ p.category?.name || '-' }}</td>
              <td class="px-4 py-3 text-right">
                {{ p.productType === 'bulk' ? '—' : formatMoney(Number(p.salePrice)) }}
              </td>
              <td class="px-4 py-3 text-right" :class="isLow(p) ? 'text-red-600 font-semibold' : ''">
                {{ stockDisplay(p) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span v-if="p.productType === 'bulk'" class="text-xs text-slate-400" title="Los insumos no se venden en caja">—</span>
                <label v-else-if="auth.isAdmin" class="inline-flex items-center justify-center cursor-pointer" :title="p.visibleInPos !== false ? 'Visible en POS' : 'Oculto del POS'">
                  <input
                    type="checkbox"
                    class="rounded text-primary-600"
                    :checked="p.visibleInPos !== false"
                    @change="toggleVisibleInPos(p)"
                  />
                </label>
                <span v-else :class="p.visibleInPos !== false ? 'text-emerald-600' : 'text-slate-400'">
                  {{ p.visibleInPos !== false ? 'Sí' : 'No' }}
                </span>
              </td>
              <td v-if="auth.isAdmin" class="px-4 py-3 text-right space-x-2">
                <button class="text-primary-600 hover:underline" @click="openEdit(p)">Editar</button>
                <button class="text-red-500 hover:underline" @click="remove(p.id)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" :title="editing ? 'Editar producto' : 'Nuevo producto'" size="lg" @close="showModal = false">
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium">Tipo de producto</label>
            <select v-model="form.productType" class="w-full mt-1 px-3 py-2 border rounded-lg" :disabled="!!editing">
              <option value="simple">Unidad (botella, paquete…)</option>
              <option value="bulk">Insumo base (helado, pan, envase… en g/ml/uds)</option>
              <option value="portion">Porción de venta (bola 90 g…)</option>
              <option value="composite">Compuesto / receta (hamburguesa…)</option>
            </select>
          </div>
          <div><label class="text-sm font-medium">SKU</label><input v-model="form.sku" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          <div class="sm:col-span-2"><label class="text-sm font-medium">Nombre</label><input v-model="form.name" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          <div class="sm:col-span-2"><label class="text-sm font-medium">Descripción</label><input v-model="form.description" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          <div v-if="form.productType !== 'bulk'" class="sm:col-span-2">
            <label class="text-sm font-medium">Foto del producto</label>
            <div class="mt-2 flex flex-wrap items-start gap-4">
              <div class="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                <img v-if="displayedImageUrl" :src="displayedImageUrl" alt="Vista previa" class="w-full h-full object-cover" />
                <span v-else class="text-3xl text-slate-300">📷</span>
              </div>
              <div class="flex flex-col gap-2 min-w-0 flex-1">
                <input
                  ref="imageInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden"
                  @change="onImageChange"
                />
                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" class="btn-secondary !py-2 !px-4 text-sm" @click="openImagePicker">
                    {{ displayedImageUrl ? 'Cambiar foto' : 'Seleccionar imagen' }}
                  </button>
                  <button
                    v-if="displayedImageUrl"
                    type="button"
                    class="text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50"
                    @click="removeProductImage"
                  >
                    Quitar
                  </button>
                </div>
                <p v-if="imageFile" class="text-xs text-slate-600 truncate">
                  Archivo: {{ imageFile.name }}
                </p>
                <p class="text-xs text-slate-500">JPG, PNG, WEBP o GIF. Máx. 5 MB. Se guarda al pulsar «Guardar producto».</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Insumo base -->
        <template v-if="form.productType === 'bulk'">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50 rounded-xl">
            <div>
              <label class="text-sm font-medium">Unidad de stock</label>
              <select v-model="form.stockUnit" class="w-full mt-1 px-3 py-2 border rounded-lg">
                <option value="g">Gramos (g)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="unit">Unidades (uds)</option>
              </select>
            </div>
            <div v-if="!editing">
              <label class="text-sm font-medium">Stock inicial</label>
              <input v-model.number="form.stock" type="number" :step="form.stockUnit === 'unit' ? 1 : 0.001" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              <p class="text-xs text-slate-500 mt-1">{{ bulkStockHint }}</p>
            </div>
            <div>
              <label class="text-sm font-medium">Alerta mínima</label>
              <input v-model.number="form.minStock" type="number" :step="form.stockUnit === 'unit' ? 1 : 0.001" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              <p class="text-xs text-slate-500 mt-1">{{ bulkMinStockHint }}</p>
            </div>
            <div>
              <label class="text-sm font-medium">Costo por {{ form.stockUnit === 'unit' ? 'ud' : form.stockUnit }}</label>
              <input v-model.number="form.costPrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </template>

        <!-- Porción -->
        <template v-if="form.productType === 'portion'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl">
            <div class="sm:col-span-2">
              <label class="flex items-center gap-2 text-sm font-medium">
                <input v-model="form.useOptions" type="checkbox" class="rounded" />
                Con sabores y envase (elige al vender en POS)
              </label>
            </div>

            <template v-if="form.useOptions">
              <div class="sm:col-span-2">
                <label class="flex items-center gap-2 text-sm font-medium">
                  <input v-model="form.variableScoops" type="checkbox" class="rounded" />
                  Un solo producto en POS: el cliente elige 1, 2 o 3 bolas al vender
                </label>
              </div>

              <div v-if="form.variableScoops">
                <label class="text-sm font-medium">Máximo de bolas</label>
                <select v-model.number="form.scoopCount" class="w-full mt-1 px-3 py-2 border rounded-lg">
                  <option :value="1">Hasta 1 bola</option>
                  <option :value="2">Hasta 2 bolas</option>
                  <option :value="3">Hasta 3 bolas</option>
                </select>
              </div>
              <div v-else>
                <label class="text-sm font-medium">Cantidad fija de bolas</label>
                <select v-model.number="form.scoopCount" class="w-full mt-1 px-3 py-2 border rounded-lg">
                  <option :value="1">1 bola</option>
                  <option :value="2">2 bolas</option>
                  <option :value="3">3 bolas</option>
                </select>
              </div>

              <div v-if="form.variableScoops" class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div v-for="n in form.scoopCount" :key="n">
                  <label class="text-sm font-medium">Precio {{ n }} bola{{ n > 1 ? 's' : '' }}</label>
                  <input
                    v-model.number="form.scoopPrices[n - 1]"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full mt-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div v-else>
                <label class="text-sm font-medium">Precio venta</label>
                <input v-model.number="form.salePrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label class="text-sm font-medium">{{ portionSizeLabel }}</label>
                <div class="flex gap-2 mt-1">
                  <input
                    v-model.number="form.portionSize"
                    type="number"
                    step="0.001"
                    min="0.001"
                    class="flex-1 min-w-0 px-3 py-2 border rounded-lg"
                  />
                  <select v-model="form.stockUnit" class="w-20 shrink-0 px-2 py-2 border rounded-lg">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="unit">uds</option>
                  </select>
                </div>
              </div>

              <div class="sm:col-span-2 space-y-2">
                <div class="flex justify-between items-center">
                  <label class="text-sm font-medium">Sabores disponibles</label>
                  <button type="button" class="text-sm text-brand-600 hover:underline" @click="addFlavorOption">+ Sabor</button>
                </div>
                <div class="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
                  <div class="col-span-4">Nombre</div>
                  <div class="col-span-5">Insumo</div>
                  <div class="col-span-2">Costo/bola</div>
                </div>
                <div v-for="(flavor, idx) in form.flavorOptions" :key="idx" class="grid grid-cols-12 gap-2 items-end">
                  <div class="col-span-4">
                    <input v-model="flavor.name" placeholder="Nombre (Fresa…)" class="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div class="col-span-5">
                    <select
                      v-model="flavor.ingredientProductId"
                      class="w-full px-3 py-2 border rounded-lg text-sm"
                      @change="onFlavorIngredientChange(idx)"
                    >
                      <option :value="0">Insumo bulk…</option>
                      <option v-for="b in bulkProducts" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ formatStock(b.stock, b.stockUnit) }})
                      </option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      :value="formatCostInput(flavor.unitCost)"
                      placeholder="0"
                      title="Costo por bola — editable"
                      class="w-full px-2 py-2 border rounded-lg text-sm"
                      @input="setFlavorCost(idx, ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="col-span-1">
                    <button type="button" class="text-red-500 text-sm" @click="removeFlavorOption(idx)">✕</button>
                  </div>
                </div>
              </div>

              <div class="sm:col-span-2 space-y-2">
                <div class="flex justify-between items-center">
                  <label class="text-sm font-medium">Envases (no cambian el precio)</label>
                  <button type="button" class="text-sm text-brand-600 hover:underline" @click="addContainerOption">+ Envase</button>
                </div>
                <div v-for="(container, idx) in form.containerOptions" :key="idx" class="grid grid-cols-12 gap-2 items-end">
                  <div class="col-span-4">
                    <input v-model="container.name" placeholder="Nombre (Cono, vaso…)" class="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div class="col-span-5">
                    <select
                      v-model="container.ingredientProductId"
                      class="w-full px-3 py-2 border rounded-lg text-sm"
                      @change="onContainerIngredientChange(idx)"
                    >
                      <option :value="0">Producto en unidades…</option>
                      <option v-for="s in simpleProducts" :key="s.id" :value="s.id">
                        {{ s.name }} ({{ formatStock(s.stock, s.stockUnit) }})
                      </option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      :value="formatCostInput(container.unitCost)"
                      placeholder="0"
                      title="Costo del envase — editable"
                      class="w-full px-2 py-2 border rounded-lg text-sm"
                      @input="setContainerCost(idx, ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="col-span-1">
                    <button type="button" class="text-red-500 text-sm" @click="removeContainerOption(idx)">✕</button>
                  </div>
                </div>
              </div>

              <div v-if="portionCostBreakdown" class="sm:col-span-2 p-4 bg-white border border-blue-200 rounded-xl space-y-1 text-sm">
                <p class="font-medium text-slate-700">Costo de fabricación (referencia)</p>
                <p class="text-slate-600">
                  {{ portionCostBreakdown.scoops }} bola(s) (prom. sabores):
                  <span class="font-medium">{{ formatMoney(portionCostBreakdown.scoopsCost) }}</span>
                </p>
                <p class="text-slate-600">
                  Envase (promedio):
                  <span class="font-medium">{{ formatMoney(portionCostBreakdown.avgContainer) }}</span>
                </p>
                <p class="text-base font-semibold text-slate-900 pt-1 border-t border-slate-100">
                  Total estimado: {{ formatMoney(portionCostBreakdown.referenceTotal) }}
                </p>
                <p class="text-xs text-slate-500">
                  Rango según sabores y envase elegidos:
                  {{ formatMoney(portionCostBreakdown.minTotal) }} – {{ formatMoney(portionCostBreakdown.maxTotal) }}
                </p>
              </div>
            </template>

            <template v-else>
              <div>
                <label class="text-sm font-medium">Insumo base</label>
                <select v-model="form.baseProductId" class="w-full mt-1 px-3 py-2 border rounded-lg">
                  <option :value="undefined">Seleccionar insumo…</option>
                  <option v-for="b in bulkProducts" :key="b.id" :value="b.id">
                    {{ b.name }} ({{ formatStock(b.stock, b.stockUnit) }})
                  </option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium">{{ portionSizeLabel.replace(' por bola', ' por venta') }}</label>
                <div class="flex gap-2 mt-1">
                  <input
                    v-model.number="form.portionSize"
                    type="number"
                    step="0.001"
                    min="0.001"
                    class="flex-1 min-w-0 px-3 py-2 border rounded-lg"
                  />
                  <select v-model="form.stockUnit" class="w-20 shrink-0 px-2 py-2 border rounded-lg">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="unit">uds</option>
                  </select>
                </div>
              </div>
            </template>

            <div>
              <label class="text-sm font-medium">Precio venta</label>
              <input v-model.number="form.salePrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label class="text-sm font-medium">Costo estimado</label>
              <input
                v-model.number="form.costPrice"
                type="number"
                step="0.01"
                min="0"
                class="w-full mt-1 px-3 py-2 border rounded-lg"
                :readonly="form.useOptions"
                :class="form.useOptions ? 'bg-slate-50 text-slate-700' : ''"
              />
              <p v-if="form.useOptions" class="text-xs text-slate-500 mt-1">
                Se calcula automáticamente según sabores y envases.
              </p>
            </div>
          </div>
        </template>

        <!-- Compuesto -->
        <template v-if="form.productType === 'composite'">
          <div class="p-4 bg-purple-50 rounded-xl space-y-3">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium">Ingredientes de la receta</label>
              <button type="button" class="text-sm text-brand-600 hover:underline" @click="addRecipeLine">+ Ingrediente</button>
            </div>
            <div v-for="(line, idx) in form.recipe" :key="idx" class="grid grid-cols-12 gap-2 items-end">
              <div class="col-span-6">
                <select v-model="line.ingredientProductId" class="w-full px-3 py-2 border rounded-lg text-sm">
                  <option :value="0">Ingrediente…</option>
                  <option v-for="ing in ingredientOptions" :key="ing.id" :value="ing.id">
                    {{ ing.name }} ({{ formatStock(ing.stock, ing.stockUnit) }})
                  </option>
                </select>
              </div>
              <div class="col-span-3">
                <input v-model.number="line.quantity" type="number" step="0.001" min="0.001" placeholder="Cant." class="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div class="col-span-2">
                <select v-model="line.unit" class="w-full px-2 py-2 border rounded-lg text-sm">
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="unit">uds</option>
                </select>
              </div>
              <div class="col-span-1">
                <button type="button" class="text-red-500 text-sm" @click="removeRecipeLine(idx)">✕</button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label class="text-sm font-medium">Precio venta base</label>
                <input v-model.number="form.salePrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label class="text-sm font-medium">Costo estimado base</label>
                <input v-model.number="form.costPrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div class="pt-4 border-t border-purple-200 space-y-2">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium">Adicionales (opcionales en POS)</label>
                <button type="button" class="text-sm text-brand-600 hover:underline" @click="addAddonOption">+ Adicional</button>
              </div>
              <p class="text-xs text-slate-500">
                Ej: papas (+$3.000 al cliente, te cuestan $2.000). El precio base no cambia si no los eligen.
              </p>
              <div class="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
                <div class="col-span-3">Nombre</div>
                <div class="col-span-4">Producto / insumo</div>
                <div class="col-span-2">Tu costo</div>
                <div class="col-span-2">Precio extra</div>
              </div>
              <div v-for="(addon, idx) in form.addonOptions" :key="idx" class="grid grid-cols-12 gap-2 items-end">
                <div class="col-span-3">
                  <input v-model="addon.name" placeholder="Papas, bebida…" class="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div class="col-span-4">
                  <select
                    v-model.number="addon.ingredientProductId"
                    class="w-full px-3 py-2 border rounded-lg text-sm"
                    @change="onAddonIngredientChange(idx)"
                  >
                    <option :value="0">Producto…</option>
                    <option v-for="ing in addonIngredientOptions" :key="ing.id" :value="ing.id">
                      {{ ing.name }} ({{ formatStock(ing.stock, ing.stockUnit) }})
                    </option>
                  </select>
                </div>
                <div class="col-span-2">
                  <input
                    type="text"
                    inputmode="decimal"
                    :value="formatCostInput(addon.unitCost)"
                    placeholder="0"
                    title="Tu costo por adicional"
                    class="w-full px-2 py-2 border rounded-lg text-sm"
                    @input="setAddonCost(idx, ($event.target as HTMLInputElement).value)"
                  />
                </div>
                <div class="col-span-2">
                  <input
                    v-model.number="addon.unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    title="Precio extra al cliente"
                    class="w-full px-2 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div class="col-span-1">
                  <button type="button" class="text-red-500 text-sm" @click="removeAddonOption(idx)">✕</button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Simple -->
        <template v-if="form.productType === 'simple'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="text-sm font-medium">Precio venta</label><input v-model.number="form.salePrice" type="number" step="0.01" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
            <div><label class="text-sm font-medium">Precio costo</label><input v-model.number="form.costPrice" type="number" step="0.01" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
            <div v-if="!editing"><label class="text-sm font-medium">Stock inicial</label><input v-model.number="form.stock" type="number" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
            <div><label class="text-sm font-medium">Stock mínimo</label><input v-model.number="form.minStock" type="number" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          </div>

          <div class="mt-4 p-4 bg-slate-50 rounded-xl space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium">Adicionales (opcionales en POS)</label>
              <button type="button" class="text-sm text-brand-600 hover:underline" @click="addAddonOption">+ Adicional</button>
            </div>
            <p class="text-xs text-slate-500">
              Ej: bebida, papas extra. El precio base del producto no cambia si no los eligen.
              Debes elegir el producto o insumo que se descuenta del inventario (ej. la Michelada como producto).
            </p>
            <div class="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
              <div class="col-span-3">Nombre</div>
              <div class="col-span-4">Producto / insumo</div>
              <div class="col-span-2">Tu costo</div>
              <div class="col-span-2">Precio extra</div>
            </div>
            <div v-for="(addon, idx) in form.addonOptions" :key="idx" class="grid grid-cols-12 gap-2 items-end">
              <div class="col-span-3">
                <input v-model="addon.name" placeholder="Bebida, papas…" class="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div class="col-span-4">
                <select
                  v-model.number="addon.ingredientProductId"
                  class="w-full px-3 py-2 border rounded-lg text-sm"
                  @change="onAddonIngredientChange(idx)"
                >
                  <option :value="0">Producto…</option>
                  <option v-for="ing in addonIngredientOptions" :key="ing.id" :value="ing.id">
                    {{ ing.name }}
                  </option>
                </select>
              </div>
              <div class="col-span-2">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="formatCostInput(addon.unitCost)"
                  placeholder="0"
                  class="w-full px-2 py-2 border rounded-lg text-sm"
                  @input="setAddonCost(idx, ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="col-span-2">
                <input
                  v-model.number="addon.unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  class="w-full px-2 py-2 border rounded-lg text-sm"
                />
              </div>
              <div class="col-span-1">
                <button type="button" class="text-red-500 text-sm" @click="removeAddonOption(idx)">✕</button>
              </div>
            </div>
          </div>
        </template>

        <div>
          <label class="text-sm font-medium">Categoría</label>
          <select v-model="form.categoryId" class="w-full mt-1 px-3 py-2 border rounded-lg">
            <option :value="undefined">Sin categoría</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div v-if="form.productType !== 'bulk'" class="p-4 bg-slate-50 rounded-xl">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="form.visibleInPos" type="checkbox" class="rounded text-primary-600" />
            <span class="text-sm font-medium">Mostrar en punto de venta</span>
          </label>
          <p class="text-xs text-slate-500 mt-1 ml-6">
            Si está desactivado, el producto no aparece en caja aunque tenga stock.
          </p>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-slate-600" @click="showModal = false">Cancelar</button>
        <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="save">Guardar</button>
      </template>
    </AppModal>
    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
