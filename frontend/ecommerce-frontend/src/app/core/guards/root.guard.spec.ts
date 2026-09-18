import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { rootGuard } from './root.guard';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../auth/services/auth.service';

describe('RootGuard', () => {
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

  it('should redirect to login if not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => rootGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect admin to admin orders', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockStorageService.getRole.and.returnValue('admin');
    const result = TestBed.runInInjectionContext(() => rootGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/orders']);
  });

  it('should redirect non-admin (customer) to products list', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockStorageService.getRole.and.returnValue('customer');
    const result = TestBed.runInInjectionContext(() => rootGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/products']);
  });

  it('should redirect to products if role is null', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockStorageService.getRole.and.returnValue(null);
    const result = TestBed.runInInjectionContext(() => rootGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/products']);
  });
});
