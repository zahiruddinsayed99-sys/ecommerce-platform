import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutComponent } from './checkout.component';
import { CartService } from '../../../cart/services/cart.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { OrderService } from '../../../orders/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  let mockCartService: any;
  let mockLogger: any;
  let mockOrderService: any;
  let mockNotification: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockCartService = {
      cartItems: signal([{ productId: '1', quantity: 2, price: 50, name: 'Prod1', image: '', inStock: true }]),
      itemCount: signal(2),
      subtotal: signal(100),
      estimatedTax: signal(10),
      grandTotal: signal(110),
      isEmpty: signal(false),
      clearCart: jasmine.createSpy('clearCart')
    };

    mockLogger = {
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error')
    };

    mockOrderService = {
      createOrder: jasmine.createSpy('createOrder').and.returnValue(of({ id: 'order-123' }))
    };

    mockNotification = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning')
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent, ReactiveFormsModule, BrowserAnimationsModule],
      providers: [
        { provide: CartService, useValue: mockCartService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: OrderService, useValue: mockOrderService },
        { provide: NotificationService, useValue: mockNotification },
        { provide: Router, useValue: mockRouter },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track items by product id', () => {
    expect(component.trackByProductId(0, { productId: 'test-123' })).toBe('test-123');
  });

  it('should prevent order if form is invalid', () => {
    component.checkoutForm.controls.shipping.patchValue({ addressLine1: '' });
    component.placeOrder();

    expect(mockNotification.warning).toHaveBeenCalledWith('Please fill in all required shipping address fields.');
    expect(mockOrderService.createOrder).not.toHaveBeenCalled();
  });

  it('should prevent order if cart is empty', () => {
    mockCartService.isEmpty.set(true);
    component.checkoutForm.controls.shipping.patchValue({
      addressLine1: '123 St',
      city: 'City',
      state: 'State',
      pinCode: '123456'
    });

    component.placeOrder();

    expect(mockNotification.warning).toHaveBeenCalledWith('Your cart is empty.');
    expect(mockOrderService.createOrder).not.toHaveBeenCalled();
  });

  it('should successfully place order and navigate', () => {
    component.checkoutForm.controls.shipping.patchValue({
      addressLine1: '123 St',
      city: 'City',
      state: 'State',
      pinCode: '123456'
    });

    component.placeOrder();

    expect(mockOrderService.createOrder).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
    expect(mockNotification.success).toHaveBeenCalledWith('Order placed successfully.');
    expect(mockCartService.clearCart).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders', 'order-123']);
  });

  it('should handle order creation error', () => {
    mockOrderService.createOrder.and.returnValue(throwError(() => new Error('Failed')));

    component.checkoutForm.controls.shipping.patchValue({
      addressLine1: '123 St',
      city: 'City',
      state: 'State',
      pinCode: '123456'
    });

    component.placeOrder();

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockNotification.error).toHaveBeenCalledWith('Unable to place your order. Please try again.');
  });
});
