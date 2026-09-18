import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Router } from '@angular/router';
import { StorageService } from '../../../../core/services/storage.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: any;
  let mockRouter: any;
  let mockStorageService: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockAuthService = {
      login: jasmine.createSpy('login').and.returnValue(of({})),
      fetchProfile: jasmine.createSpy('fetchProfile').and.returnValue(of({})),
      isAuthenticated$: of(false)
    };
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };
    mockStorageService = {
      getRole: jasmine.createSpy('getRole').and.returnValue('admin'),
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false)
    };
    mockLogger = {
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error')
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, BrowserAnimationsModule, RouterTestingModule],
      declarations: [],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: StorageService, useValue: mockStorageService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ActivatedRoute, useValue: { snapshot: {} } }
      ],
      schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
    }).overrideComponent(LoginComponent, {
      set: {
        imports: [ReactiveFormsModule],
        schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit if form is invalid', () => {
    component.loginForm.controls['email'].setValue('');
    component.login();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('should call login and navigate to admin dashboard for admin', fakeAsync(() => {
    component.loginForm.controls['email'].setValue('test@test.com');
    component.loginForm.controls['password'].setValue('password123');
    component.login();
    tick();

    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
    expect(mockAuthService.fetchProfile).toHaveBeenCalled();
    expect(mockStorageService.getRole).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/orders']);
  }));

  it('should call login and navigate to products for customer', fakeAsync(() => {
    mockStorageService.getRole.and.returnValue('customer');
    component.loginForm.controls['email'].setValue('test@test.com');
    component.loginForm.controls['password'].setValue('password123');
    component.login();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
  }));

  it('should handle login error', () => {
    mockAuthService.login.and.returnValue(throwError(() => ({ message: 'Invalid credentials' })));
    component.loginForm.controls['email'].setValue('test@test.com');
    component.loginForm.controls['password'].setValue('password123');
    component.login();

    expect(component.error()).toBe('Invalid credentials');
    expect(component.loading()).toBeFalse();
  });

  it('should handle profile fetch error', fakeAsync(() => {
    mockAuthService.fetchProfile.and.returnValue(throwError(() => new Error('Profile error')));
    component.loginForm.controls['email'].setValue('test@test.com');
    component.loginForm.controls['password'].setValue('password123');
    component.login();
    tick();

    expect(component.error()).toBe('Could not fetch user profile.');
    expect(component.loading()).toBeFalse();
  }));
});
