import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { StorageService } from '../services/storage.service';

/**
 * ============================================================
 * Enterprise Guest Guard
 * ============================================================
 * Prevents authenticated users from accessing guest routes
 * like /login and /register, redirecting them to /dashboard.
 */
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
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

  return true;
};
