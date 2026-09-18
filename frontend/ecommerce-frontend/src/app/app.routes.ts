import { Routes } from '@angular/router';

import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { customerGuard } from './core/guards/customer.guard';

export const routes: Routes = [
  //-------------------------------------------------------
  // Root URL Redirect (http://localhost:4200/ -> /login)
  //-------------------------------------------------------
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },

  //-------------------------------------------------------
  // Authentication Area (/login, /register)
  //-------------------------------------------------------
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
      },
    ],
  },

  //-------------------------------------------------------
  // Protected Area (Auth Guard Protected)
  //-------------------------------------------------------
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [customerGuard],
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      {
        path: 'products',
        canActivate: [customerGuard],
        loadChildren: () =>
          import('./features/products/product.routes').then(m => m.PRODUCT_ROUTES),
      },
      {
        path: 'cart',
        canActivate: [customerGuard],
        loadChildren: () => import('./features/cart/cart.routes').then(m => m.CART_ROUTES),
      },
      {
        path: 'orders',
        canActivate: [customerGuard],
        loadChildren: () =>
          import('./features/orders/orders.routes').then(m => m.ORDERS_ROUTES),
      },
      {
        path: 'checkout',
        canActivate: [customerGuard],
        loadChildren: () =>
          import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES),
      },
      {
        path: 'profile',
        canActivate: [customerGuard],
        loadChildren: () =>
          import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
      },
      {
        path: 'customers',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/customers/customers.routes').then(m => m.CUSTOMERS_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES),
      },
    ],
  },

  //-------------------------------------------------------
  // Wildcard Fallback
  //-------------------------------------------------------
  {
    path: '**',
    redirectTo: 'login',
  },
];
