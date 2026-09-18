import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { guestGuard } from './guest.guard';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../auth/services/auth.service';

describe('GuestGuard', () => {
  let mockStorageService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    mockUrlTree = {} as UrlTree;
    mockStorageService = {
      getRole: jasmine.createSpy('getRole')
    };
    mockAuthService = {
      isAuthenticated: jasmine.createSpy('isAuthenticated')
    };
    mockRouter = {
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(mockUrlTree)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should allow access if not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBeTrue();
  });

  it('should deny access and redirect to admin orders if authenticated as admin', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockStorageService.getRole.and.returnValue('admin');
    const result = TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/orders']);
  });

  it('should deny access and redirect to products if authenticated as customer', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockStorageService.getRole.and.returnValue('customer');
    const result = TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/products']);
  });

  it('should redirect to products if role is null', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockStorageService.getRole.and.returnValue(null);
    const result = TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/products']);
  });
});
