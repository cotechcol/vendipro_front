import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue') },
        { path: 'pos', name: 'pos', component: () => import('@/views/pos/PosView.vue') },
        { path: 'tables', name: 'tables', component: () => import('@/views/tables/TablesView.vue') },
        { path: 'tables/:orderId', name: 'table-order', component: () => import('@/views/tables/TableOrderView.vue') },
        { path: 'products', name: 'products', component: () => import('@/views/products/ProductsView.vue') },
        { path: 'categories', name: 'categories', component: () => import('@/views/categories/CategoriesView.vue'), meta: { adminOnly: true } },
        { path: 'inventory', name: 'inventory', component: () => import('@/views/inventory/InventoryView.vue'), meta: { adminOnly: true } },
        { path: 'customers', name: 'customers', component: () => import('@/views/customers/CustomersView.vue') },
        { path: 'suppliers', name: 'suppliers', component: () => import('@/views/suppliers/SuppliersView.vue'), meta: { adminOnly: true } },
        { path: 'purchases', name: 'purchases', component: () => import('@/views/purchases/PurchasesView.vue'), meta: { adminOnly: true } },
        { path: 'cash', name: 'cash', component: () => import('@/views/cash/CashSessionView.vue') },
        { path: 'reports', name: 'reports', component: () => import('@/views/reports/ReportsView.vue') },
        { path: 'stores', name: 'stores', component: () => import('@/views/stores/StoresView.vue'), meta: { superAdminOnly: true } },
        { path: 'users', name: 'users', component: () => import('@/views/users/UsersView.vue'), meta: { adminOnly: true } },
        { path: 'settings', name: 'settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { adminOnly: true } },
        { path: 'account', name: 'account', component: () => import('@/views/account/AccountView.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.superAdminOnly && !auth.isSuperAdmin) {
    return { name: 'dashboard' }
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
