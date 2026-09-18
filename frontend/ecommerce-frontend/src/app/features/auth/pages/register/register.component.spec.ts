import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../../../../../environments/environment';
import { provideRouter } from '@angular/router';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockAuthService = {
      register: jasmine.createSpy('register').and.returnValue(of({}))
    };
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule, BrowserAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit if form is invalid', () => {
    component.registerForm.controls['email'].setValue('');
    component.onSubmit();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('should call register and navigate to login', () => {
    component.registerForm.controls['email'].setValue('test@test.com');
    component.registerForm.controls['password'].setValue('password');
    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password', role_id: environment.customerRoleId });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle register error with err.message', () => {
    mockAuthService.register.and.returnValue(throwError(() => ({ message: 'Email taken' })));
    component.registerForm.controls['email'].setValue('test@test.com');
    component.registerForm.controls['password'].setValue('password');
    component.onSubmit();

    expect(component.error()).toBe('Email taken');
    expect(component.loading()).toBeFalse();
  });

  it('should handle register error with err.error.message', () => {
    mockAuthService.register.and.returnValue(throwError(() => ({ error: { message: 'Invalid format' } })));
    component.registerForm.controls['email'].setValue('test@test.com');
    component.registerForm.controls['password'].setValue('password');
    component.onSubmit();

    expect(component.error()).toBe('Invalid format');
    expect(component.loading()).toBeFalse();
  });

  it('should handle register default error', () => {
    mockAuthService.register.and.returnValue(throwError(() => new Error()));
    component.registerForm.controls['email'].setValue('test@test.com');
    component.registerForm.controls['password'].setValue('password');
    component.onSubmit();

    mockAuthService.register.and.returnValue(throwError(() => null));
    component.onSubmit();
    expect(component.error()).toBe('Registration failed. Please try again.');
  });
});
