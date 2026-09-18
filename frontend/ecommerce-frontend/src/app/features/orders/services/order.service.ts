import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONSTANTS } from '../../../core/constants/api.constants';
import {
    CreateOrderRequest,
    OrderResponse,
    OrderSummary
} from '../../../core/models/order.model';

interface OrderSummaryApi {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
}

interface OrderItemApi {
    product_id: string;
    quantity: number;
    unit_price: number;
}

interface OrderResponseApi {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    items: OrderItemApi[];
}

@Injectable({
    providedIn: 'root'
})
export class OrderService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl = API_CONSTANTS.ORDERS.BASE;


    createOrder(
        request: CreateOrderRequest
    ): Observable<OrderResponse> {
        return this.http.post<OrderResponse>(
            this.apiUrl,
            request
        );
    }

    getMyOrders(): Observable<OrderSummary[]> {

        return this.http
            .get<OrderSummaryApi[]>(this.apiUrl)
            .pipe(
                map((response: OrderSummaryApi[]) =>
                    response.map(order => this.mapOrderSummary(order))
                )
            );

    }

    createCheckoutSession(orderId: string): Observable<{ token: string }> {
        return this.http.post<{ token: string }>(
            `${this.apiUrl}/${orderId}/checkout-session`,
            {}
        );
    }

    confirmPayment(orderId: string, payload: { razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string }): Observable<OrderResponseApi> {
        return this.http.post<OrderResponseApi>(
            `${this.apiUrl}/${orderId}/confirm-payment`,
            payload
        );
    }

    getOrderById(
        orderId: string
    ): Observable<OrderResponse> {

        return this.http
            .get<OrderResponseApi>(
                `${this.apiUrl}/${orderId}`
            )
            .pipe(
                map(api => ({
                    id: api.id,
                    userId: '',
                    status: api.status as OrderResponse['status'],
                    totalAmount: api.total_amount,
                    createdAt: api.created_at,
                    items: api.items.map(item => ({
                        productId: item.product_id,
                        productName: '',
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                        subtotal: item.quantity * item.unit_price
                    }))
                }))
            );

    }

    private mapOrderSummary(api: OrderSummaryApi): OrderSummary {

        return {
            id: api.id,
            totalAmount: api.total_amount,
            status: api.status as OrderSummary['status'],
            createdAt: api.created_at
        };

    }
}