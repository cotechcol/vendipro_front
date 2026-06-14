<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { Product, Category, ProductType, StockUnit, ProductRecipe } from '@/types'
import { formatMoney, formatStock, productTypeLabel } from '@/utils/format'

const auth = useAuthStore()
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const bulkProducts = ref<Product[]>([])
const loading = ref(true)
const search = ref('')
const categoryFilter = ref<number | ''>('')
const showModal = ref(false)
const editing = ref<Product | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const form = ref({
  sku: '',
  name: '',
  description: '',
  productType: 'simple' as ProductType,
  stockUnit: 'unit' as StockUnit,
  baseProductId: undefined as number | undefined,
  portionSize: 90,
  scoopCount: 1,
  useOptions: false,
  flavorOptions: [{ name: '', ingredientProductId: 0 }],
  containerOptions: [
    { name: 'Galleta', ingredientProductId: 0 },
    { name: 'Vaso', ingredientProductId: 0 },
  ],
  salePrice: 0,
  costPrice: 0,
  stock: 0,
  minStock: 5,
  categoryId: undefined as number | undefined,
  recipe: [] as ProductRecipe[],
})

const simpleProducts = computed(() =>
  products.value.filter((p) => p.productType === 'simple'),
)

const filtered = computed(() => {
  let list = products.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }
  if (categoryFilter.value) list = list.filter((p) => p.categoryId === categoryFilter.value)
  return list
})

const ingredientOptions = computed(() =>
  products.value.filter((p) => p.productType === 'bulk' || p.productType === 'simple'),
)

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

function resetForm() {
  form.value = {
    sku: '', name: '', description: '',
    productType: 'simple', stockUnit: 'unit',
    baseProductId: undefined, portionSize: 90,
    scoopCount: 1, useOptions: false,
    flavorOptions: [{ name: '', ingredientProductId: 0 }],
    containerOptions: [
      { name: 'Galleta', ingredientProductId: 0 },
      { name: 'Vaso', ingredientProductId: 0 },
    ],
    salePrice: 0, costPrice: 0, stock: 0, minStock: 5,
    categoryId: undefined, recipe: [],
  }
}

function openCreate() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(p: Product) {
  editing.value = p
  const flavorGroup = p.optionGroups?.find((g) => g.kind === 'flavor')
  const containerGroup = p.optionGroups?.find((g) => g.kind === 'container')
  const hasOptions = !!p.optionGroups?.length

  form.value = {
    sku: p.sku,
    name: p.name,
    description: p.description || '',
    productType: p.productType,
    stockUnit: p.stockUnit,
    baseProductId: p.baseProductId ?? undefined,
    portionSize: Number(p.portionSize) || 90,
    scoopCount: Number(p.scoopCount) || 1,
    useOptions: hasOptions,
    flavorOptions: flavorGroup?.options.map((o) => ({
      name: o.name,
      ingredientProductId: o.ingredientProductId,
    })) ?? [{ name: '', ingredientProductId: 0 }],
    containerOptions: containerGroup?.options.map((o) => ({
      name: o.name,
      ingredientProductId: o.ingredientProductId,
    })) ?? [
      { name: 'Galleta', ingredientProductId: 0 },
      { name: 'Vaso', ingredientProductId: 0 },
    ],
    salePrice: Number(p.salePrice),
    costPrice: Number(p.costPrice),
    stock: Number(p.stock),
    minStock: Number(p.minStock),
    categoryId: p.categoryId,
    recipe: (p.recipe ?? []).map((r) => ({
      ingredientProductId: r.ingredientProductId,
      quantity: Number(r.quantity),
      unit: r.unit,
    })),
  }
  showModal.value = true
}

function addFlavorOption() {
  form.value.flavorOptions.push({ name: '', ingredientProductId: 0 })
}

function removeFlavorOption(idx: number) {
  if (form.value.flavorOptions.length > 1) form.value.flavorOptions.splice(idx, 1)
}

function addRecipeLine() {
  form.value.recipe.push({ ingredientProductId: 0, quantity: 0, unit: 'g' })
}

function removeRecipeLine(idx: number) {
  form.value.recipe.splice(idx, 1)
}

watch(() => form.value.productType, (type) => {
  if (type === 'bulk') {
    form.value.stockUnit = 'g'
    form.value.salePrice = 0
  }
  if (type === 'portion') {
    if (!form.value.portionSize) form.value.portionSize = 90
    if (!editing.value) form.value.useOptions = true
  }
  if (type === 'composite' && form.value.recipe.length === 0) addRecipeLine()
})

async function save() {
  try {
    const payload: Record<string, unknown> = { ...form.value }
    if (form.value.productType === 'bulk') {
      payload.salePrice = 0
      delete payload.baseProductId
      delete payload.portionSize
      delete payload.recipe
    } else if (form.value.productType === 'portion') {
      delete payload.recipe
      payload.stock = 0
      if (form.value.useOptions) {
        delete payload.baseProductId
        payload.scoopCount = form.value.scoopCount
        payload.optionGroups = [
          {
            name: 'Sabor',
            kind: 'flavor',
            options: form.value.flavorOptions
              .filter((o) => o.name && o.ingredientProductId)
              .map((o) => ({ name: o.name, ingredientProductId: o.ingredientProductId })),
          },
          {
            name: 'Envase',
            kind: 'container',
            options: form.value.containerOptions
              .filter((o) => o.name && o.ingredientProductId)
              .map((o) => ({ name: o.name, ingredientProductId: o.ingredientProductId })),
          },
        ]
      } else {
        delete payload.scoopCount
        delete payload.optionGroups
      }
      delete payload.useOptions
      delete payload.flavorOptions
      delete payload.containerOptions
    } else if (form.value.productType === 'composite') {
      delete payload.baseProductId
      delete payload.portionSize
      payload.stock = 0
      payload.recipe = form.value.recipe.filter((r) => r.ingredientProductId && r.quantity > 0)
    } else {
      delete payload.baseProductId
      delete payload.portionSize
      delete payload.recipe
      payload.stockUnit = 'unit'
    }

    if (editing.value) {
      await api.patch(`/products/${editing.value.id}`, payload)
    } else {
      await api.post('/products', payload)
    }
    showModal.value = false
    toast.value = { show: true, message: 'Producto guardado', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function remove(id: number) {
  if (!confirm('¿Eliminar producto?')) return
  await api.delete(`/products/${id}`)
  toast.value = { show: true, message: 'Producto eliminado', type: 'success' }
  await load()
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
      <select v-model="categoryFilter" class="px-4 py-2 border border-slate-300 rounded-lg">
        <option value="">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-4 py-3">SKU</th>
              <th class="text-left px-4 py-3">Nombre</th>
              <th class="text-left px-4 py-3">Tipo</th>
              <th class="text-left px-4 py-3">Categoría</th>
              <th class="text-right px-4 py-3">Precio</th>
              <th class="text-right px-4 py-3">Stock / Disp.</th>
              <th v-if="auth.isAdmin" class="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7" class="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            <tr v-else-if="filtered.length === 0"><td colspan="7" class="px-4 py-8 text-center text-slate-400">Sin productos</td></tr>
            <tr v-for="p in filtered" :key="p.id" class="border-t border-slate-100 hover:bg-slate-50">
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
              <option value="bulk">Insumo base (helado, piña… en g/ml)</option>
              <option value="portion">Porción de venta (bola 90 g…)</option>
              <option value="composite">Compuesto / receta (hamburguesa…)</option>
            </select>
          </div>
          <div><label class="text-sm font-medium">SKU</label><input v-model="form.sku" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          <div class="sm:col-span-2"><label class="text-sm font-medium">Nombre</label><input v-model="form.name" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          <div class="sm:col-span-2"><label class="text-sm font-medium">Descripción</label><input v-model="form.description" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        </div>

        <!-- Insumo base -->
        <template v-if="form.productType === 'bulk'">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50 rounded-xl">
            <div>
              <label class="text-sm font-medium">Unidad de stock</label>
              <select v-model="form.stockUnit" class="w-full mt-1 px-3 py-2 border rounded-lg">
                <option value="g">Gramos (g)</option>
                <option value="ml">Mililitros (ml)</option>
              </select>
            </div>
            <div v-if="!editing">
              <label class="text-sm font-medium">Stock inicial</label>
              <input v-model.number="form.stock" type="number" step="0.001" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              <p class="text-xs text-slate-500 mt-1">Ej: 10000 g = 10 kg de helado</p>
            </div>
            <div>
              <label class="text-sm font-medium">Alerta mínima</label>
              <input v-model.number="form.minStock" type="number" step="0.001" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              <p class="text-xs text-slate-500 mt-1">Ej: 1 g — te avisa cuando llegue</p>
            </div>
            <div>
              <label class="text-sm font-medium">Costo por {{ form.stockUnit }}</label>
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
              <div>
                <label class="text-sm font-medium">Cantidad de bolas</label>
                <select v-model.number="form.scoopCount" class="w-full mt-1 px-3 py-2 border rounded-lg">
                  <option :value="1">1 bola</option>
                  <option :value="2">2 bolas</option>
                  <option :value="3">3 bolas</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium">Gramos por bola</label>
                <input v-model.number="form.portionSize" type="number" step="0.001" min="0.001" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              </div>

              <div class="sm:col-span-2 space-y-2">
                <div class="flex justify-between items-center">
                  <label class="text-sm font-medium">Sabores disponibles</label>
                  <button type="button" class="text-sm text-brand-600 hover:underline" @click="addFlavorOption">+ Sabor</button>
                </div>
                <div v-for="(flavor, idx) in form.flavorOptions" :key="idx" class="grid grid-cols-12 gap-2 items-end">
                  <div class="col-span-5">
                    <input v-model="flavor.name" placeholder="Nombre (Fresa…)" class="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div class="col-span-6">
                    <select v-model="flavor.ingredientProductId" class="w-full px-3 py-2 border rounded-lg text-sm">
                      <option :value="0">Insumo bulk…</option>
                      <option v-for="b in bulkProducts" :key="b.id" :value="b.id">{{ b.name }}</option>
                    </select>
                  </div>
                  <div class="col-span-1">
                    <button type="button" class="text-red-500 text-sm" @click="removeFlavorOption(idx)">✕</button>
                  </div>
                </div>
              </div>

              <div class="sm:col-span-2 space-y-2">
                <label class="text-sm font-medium">Envases (no cambian el precio)</label>
                <div v-for="(container, idx) in form.containerOptions" :key="idx" class="grid grid-cols-12 gap-2 items-end">
                  <div class="col-span-5">
                    <input v-model="container.name" class="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div class="col-span-7">
                    <select v-model="container.ingredientProductId" class="w-full px-3 py-2 border rounded-lg text-sm">
                      <option :value="0">Producto en unidades…</option>
                      <option v-for="s in simpleProducts" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                  </div>
                </div>
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
                <label class="text-sm font-medium">Gramos/ml por venta</label>
                <input v-model.number="form.portionSize" type="number" step="0.001" min="0.001" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              </div>
            </template>

            <div>
              <label class="text-sm font-medium">Precio venta</label>
              <input v-model.number="form.salePrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label class="text-sm font-medium">Costo estimado</label>
              <input v-model.number="form.costPrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
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
                <label class="text-sm font-medium">Precio venta</label>
                <input v-model.number="form.salePrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label class="text-sm font-medium">Costo estimado</label>
                <input v-model.number="form.costPrice" type="number" step="0.01" min="0" class="w-full mt-1 px-3 py-2 border rounded-lg" />
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
        </template>

        <div>
          <label class="text-sm font-medium">Categoría</label>
          <select v-model="form.categoryId" class="w-full mt-1 px-3 py-2 border rounded-lg">
            <option :value="undefined">Sin categoría</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
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
