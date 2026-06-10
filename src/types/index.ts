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

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  salePrice: number
  costPrice: number
  stock: number
  minStock: number
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
  name: string
  email?: string
  phone?: string
  address?: string
  contact?: string
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
}

export interface DashboardData {
  totalSales: number
  revenue: number
  profit: number
  topProducts: { name: string; quantity: string; revenue: string }[]
  lowStockCount: number
}
