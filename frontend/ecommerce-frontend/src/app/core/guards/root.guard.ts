import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { StorageService } from '../services/storage.service';

/**
 * ============================================================
 * Enterprise Root Navigation Guard
 * ============================================================
 * Handles root URL (http://localhost:4200/) routing:
 * - Authenticated users -> Redirects to /dashboard
 * - Unauthenticated users -> Redirects to /login
 */
export const rootGuard: CanActivateFn = (): UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const storage = inject(StorageService);

  if (authService.isAuthenticated()) {
    const role = storage.getRole();
    if (role && role.toUpperCase() === 'ADMIN') {
      return router.createUrlTree(['/admin/orders']);
    }
    return router.createUrlTree(['/products']);
  }

  return router.createUrlTree(['/login']);
};
