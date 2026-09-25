import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { UserRole } from '@smartpos/types';

const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('@/pages/auth/VerifyEmailPage'));

const DashboardLayout = React.lazy(() => import('@/layouts/DashboardLayout'));
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const POSPage = React.lazy(() => import('@/pages/pos/POSPage'));
const ProductsPage = React.lazy(() => import('@/pages/products/ProductsPage'));
const ProductFormPage = React.lazy(() => import('@/pages/products/ProductFormPage'));
const CategoriesPage = React.lazy(() => import('@/pages/categories/CategoriesPage'));
const InventoryPage = React.lazy(() => import('@/pages/inventory/InventoryPage'));
const InventoryMovementsPage = React.lazy(() => import('@/pages/inventory/InventoryMovementsPage'));
const CustomersPage = React.lazy(() => import('@/pages/customers/CustomersPage'));
const CustomerDetailPage = React.lazy(() => import('@/pages/customers/CustomerDetailPage'));
const SuppliersPage = React.lazy(() => import('@/pages/suppliers/SuppliersPage'));
const PurchaseOrdersPage = React.lazy(() => import('@/pages/suppliers/PurchaseOrdersPage'));
const InvoicesPage = React.lazy(() => import('@/pages/invoices/InvoicesPage'));
const InvoiceDetailPage = React.lazy(() => import('@/pages/invoices/InvoiceDetailPage'));
const ReportsPage = React.lazy(() => import('@/pages/reports/ReportsPage'));
const ReportDetailPage = React.lazy(() => import('@/pages/reports/ReportDetailPage'));
const AccountingPage = React.lazy(() => import('@/pages/accounting/AccountingPage'));
const SettingsPage = React.lazy(() => import('@/pages/settings/SettingsPage'));
const BrandingSettingsPage = React.lazy(() => import('@/pages/settings/BrandingSettingsPage'));
const TaxSettingsPage = React.lazy(() => import('@/pages/settings/TaxSettingsPage'));
const UserManagementPage = React.lazy(() => import('@/pages/settings/UserManagementPage'));
const BackupSettingsPage = React.lazy(() => import('@/pages/settings/BackupSettingsPage'));
const NotificationsPage = React.lazy(() => import('@/pages/notifications/NotificationsPage'));
const SupportPage = React.lazy(() => import('@/pages/support/SupportPage'));
const AdminDashboardPage = React.lazy(() => import('@/pages/admin/AdminDashboardPage'));
const TenantsPage = React.lazy(() => import('@/pages/admin/TenantsPage'));
const PlansPage = React.lazy(() => import('@/pages/admin/PlansPage'));
const AdminTicketsPage = React.lazy(() => import('@/pages/admin/AdminTicketsPage'));
const AdminSettingsPage = React.lazy(() => import('@/pages/admin/AdminSettingsPage'));
const ProfilePage = React.lazy(() => import('@/pages/profile/ProfilePage'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'pos',
            element: <POSPage />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
          {
            path: 'products/new',
            element: <ProductFormPage />,
          },
          {
            path: 'products/:id',
            element: <ProductFormPage />,
          },
          {
            path: 'categories',
            element: <CategoriesPage />,
          },
          {
            path: 'inventory',
            element: <InventoryPage />,
          },
          {
            path: 'inventory/movements',
            element: <InventoryMovementsPage />,
          },
          {
            path: 'customers',
            element: <CustomersPage />,
          },
          {
            path: 'customers/:id',
            element: <CustomerDetailPage />,
          },
          {
            path: 'suppliers',
            element: <SuppliersPage />,
          },
          {
            path: 'purchase-orders',
            element: <PurchaseOrdersPage />,
          },
          {
            path: 'invoices',
            element: <InvoicesPage />,
          },
          {
            path: 'invoices/:id',
            element: <InvoiceDetailPage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'reports/:type',
            element: <ReportDetailPage />,
          },
          {
            path: 'accounting',
            element: <AccountingPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'settings/branding',
            element: <BrandingSettingsPage />,
          },
          {
            path: 'settings/tax',
            element: <TaxSettingsPage />,
          },
          {
            path: 'settings/users',
            element: <UserManagementPage />,
          },
          {
            path: 'settings/backup',
            element: <BackupSettingsPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'support',
            element: <SupportPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'admin',
            element: (
              <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
                <AdminDashboardPage />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/tenants',
            element: (
              <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
                <TenantsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/plans',
            element: (
              <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
                <PlansPage />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/tickets',
            element: (
              <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
                <AdminTicketsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/settings',
            element: (
              <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
                <AdminSettingsPage />
              </RoleGuard>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);