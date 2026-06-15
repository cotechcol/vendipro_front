export interface User {
  id: number
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'cashier'
  storeId?: number | null
  storeName?: string | null
}

export interface Store {
  id: number
  name: string
  code: string
  address?: string
  phone?: string
  active: boolean
  createdAt?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface Category {
  id: number
  name: string
  description?: string
  active: boolean
}

export type ProductType = 'simple' | 'bulk' | 'portion' | 'composite'
export type StockUnit = 'unit' | 'g' | 'ml'
export type OptionGroupKind = 'flavor' | 'container'

export interface ProductRecipe {
  id?: number
  ingredientProductId: number
  quantity: number
  unit: StockUnit
  ingredient?: Product
}

export interface ProductOption {
  id: number
  name: string
  ingredientProductId: number
  quantity: number
  unit: StockUnit
  ingredient?: Product
}

export interface ProductOptionGroup {
  id: number
  name: string
  kind: OptionGroupKind
  minSelect: number
  maxSelect: number
  options: ProductOption[]
}

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  productType: ProductType
  stockUnit: StockUnit
  baseProductId?: number | null
  baseProduct?: Product | null
  portionSize?: number | null
  scoopCount?: number | null
  optionGroups?: ProductOptionGroup[]
  recipe?: ProductRecipe[]
  salePrice: number
  costPrice: number
  stock: number
  minStock: number
  sellableUnits?: number
  lowStock?: boolean
  categoryId?: number
  category?: Category
  active: boolean
}

export interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  active: boolean
}

export interface Supplier {
  id: number
  name?: string | null
  nit?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  contact?: string | null
  active: boolean
}

export interface Setting {
  id: number
  businessName: string
  address?: string
  phone?: string
  taxRate: number
  logoUrl?: string
  currency: string
}

export interface CashSessionSummary {
  totalSales: number
  totalRevenue: number
  totalProfit: number
  cashTotal: number
  cardTotal: number
}

export interface CashSession {
  id: number
  openingAmount: number
  closingAmount?: number
  expectedAmount?: number
  difference?: number
  status: 'open' | 'closed'
  openedAt: string
  closedAt?: string
  notes?: string
  user?: { name: string }
  summary?: CashSessionSummary
}

export interface SaleItem {
  id?: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  unitCost?: number
  subtotal: number
}

export interface Sale {
  id: number
  ticketNumber: string
  subtotal: number
  taxAmount: number
  total: number
  profit: number
  paymentMethod: 'cash' | 'card' | 'mixed'
  amountPaid?: number
  change?: number
  customerId?: number
  customer?: Customer
  user?: User
  items: SaleItem[]
  createdAt: string
}

export interface CartItem {
  product: Product
  quantity: number
  selectedOptionIds?: number[]
  optionLabel?: string
  cartKey: string
}

export interface DashboardData {
  totalSales: number
  revenue: number
  profit: number
  topProducts: { name: string; quantity: string; revenue: string }[]
  lowStockCount: number
}
