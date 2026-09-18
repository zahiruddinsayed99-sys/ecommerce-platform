import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { LoggerService } from '../../../core/services/logger.service';
import { environment } from '../../../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ProductService,
        { provide: LoggerService, useValue: mockLogger }
      ]
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get products and set state', () => {
    const mockProducts: any = [{ id: '1', name: 'Product 1', imageUrl: 'url1' }];

    service.getProducts().subscribe(products => {
      expect(products.length).toBe(1);
      expect(products[0].imageUrl).toBe('url1');
      expect(service.productsQuery().data.length).toBe(1);
      expect(service.productsQuery().loading).toBeFalse();
    });

    const req = httpMock.expectOne(`${environment.api.baseUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);

    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should get product by id', () => {
    const mockProduct: any = { id: '1', name: 'Product 1', image_url: 'url1' };

    service.getProductById('1').subscribe(product => {
      expect(product.imageUrl).toBe('url1');
    });

    const req = httpMock.expectOne(`${environment.api.baseUrl}/products/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  it('should create product', () => {
    const mockProduct: any = { name: 'Product 1' };

    service.createProduct(mockProduct).subscribe();

    const req = httpMock.expectOne(`${environment.api.baseUrl}/products`);
    expect(req.request.method).toBe('POST');
    req.flush(mockProduct);
  });

  it('should update product', () => {
    const mockProduct: any = { name: 'Product 1' };

    service.updateProduct('1', mockProduct).subscribe();

    const req = httpMock.expectOne(`${environment.api.baseUrl}/products/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockProduct);
  });

  it('should delete product', () => {
    service.deleteProduct('1').subscribe();

    const req = httpMock.expectOne(`${environment.api.baseUrl}/products/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
