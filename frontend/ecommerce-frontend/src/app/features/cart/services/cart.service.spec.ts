import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { StorageService } from '../../../core/services/storage.service';
import { LoggerService } from '../../../core/services/logger.service';
import { NotificationService } from '../../../core/services/notification.service';
import { STORAGE_KEYS } from '../../../core/constants/storage.constants';

describe('CartService', () => {
  let service: CartService;
  let mockStorageService: any;
  let mockLogger: any;
  let mockNotification: any;

  beforeEach(() => {
    mockStorageService = {
      getItem: jasmine.createSpy('getItem').and.returnValue(null),
      setItem: jasmine.createSpy('setItem')
    };
    mockLogger = {
      info: jasmine.createSpy('info')
    };
    mockNotification = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning')
    };

    TestBed.configureTestingModule({
      providers: [
        CartService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotification }
      ]
    });
    service = TestBed.inject(CartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add to cart', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].productId).toBe('1');
    expect(service.itemCount()).toBe(1);
    expect(service.uniqueItemCount()).toBe(1);
    expect(service.subtotal()).toBe(10);
    expect(mockNotification.success).toHaveBeenCalledWith('Product 1 added to cart');
    expect(mockStorageService.setItem).toHaveBeenCalledWith(STORAGE_KEYS.CART.ITEMS, jasmine.any(Array));
  });

  it('should increment quantity when adding existing product', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);
    service.addToCart(product);

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].quantity).toBe(2);
    expect(service.subtotal()).toBe(20);
  });

  it('should not exceed stock quantity when adding', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 1 };
    service.addToCart(product);
    service.addToCart(product);

    expect(service.cartItems()[0].quantity).toBe(1);
    expect(mockNotification.warning).toHaveBeenCalledWith('Only 1 item(s) available in stock.');
  });

  it('should remove from cart', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);
    service.removeFromCart('1');

    expect(service.cartItems().length).toBe(0);
    expect(service.isEmpty()).toBeTrue();
    expect(mockNotification.success).toHaveBeenCalledWith('Item removed from cart');
  });

  it('should update quantity', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);
    service.updateQuantity('1', 3);

    expect(service.cartItems()[0].quantity).toBe(3);
  });

  it('should prevent quantity less than 1', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);
    service.updateQuantity('1', 0);

    expect(service.cartItems()[0].quantity).toBe(1);
    expect(mockNotification.warning).toHaveBeenCalledWith('Quantity cannot be less than 1.');
  });

  it('should prevent quantity greater than stock', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);
    service.updateQuantity('1', 10);

    expect(service.cartItems()[0].quantity).toBe(5);
    expect(mockNotification.warning).toHaveBeenCalledWith('Only 5 item(s) available in stock.');
  });

  it('should clear cart', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);
    service.clearCart();

    expect(service.cartItems().length).toBe(0);
    expect(mockNotification.success).toHaveBeenCalledWith('Cart cleared');
  });

  it('should check if in cart and get quantity', () => {
    const product: any = { id: '1', name: 'Product 1', price: 10, stock_quantity: 5 };
    service.addToCart(product);

    expect(service.isInCart('1')).toBeTrue();
    expect(service.isInCart('2')).toBeFalse();
    expect(service.getQuantity('1')).toBe(1);
    expect(service.getQuantity('2')).toBe(0);
  });

  it('should restore cart from storage manually', () => {
    const savedCart = [{ productId: '1', quantity: 2, unitPrice: 10, addedAt: new Date().toISOString() }];
    mockStorageService.getItem.and.returnValue(savedCart);

    service.restoreCart();

    expect(service.cartItems().length).toBe(1);
    expect(service.cartItems()[0].productId).toBe('1');
    expect(service.cartItems()[0].quantity).toBe(2);
  });
});
