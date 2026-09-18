import { test, expect } from '@playwright/test';

test.describe('Customer Checkout Flow', () => {
  test('should login, add to cart, and checkout', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Go to login page
    const loginLink = page.getByRole('link', { name: /login/i });
    if (await loginLink.isVisible()) {
        await loginLink.click();
    }

    // Login as a Customer
    // Assuming there's a seeded customer or we can use a standard one.
    // If not, we might need to register, but the task says "Login as a Customer (or register a test account)".
    // Let's try to register to be safe, but we'll click the register link from login
    const registerLink = page.getByRole('link', { name: /register now|register/i });
    if (await registerLink.isVisible()) {
        await registerLink.click();
    }

    const email = `testcustomer_${Date.now()}@test.com`;
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('password123');

    // Check if there is a name selector
    const nameInput = page.getByLabel(/full name|name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Customer');
    }

    // Check if there is a role selector
    const roleSelect = page.getByRole('combobox', { name: /role/i });
    if (await roleSelect.isVisible()) {
        await roleSelect.click();
        await page.getByRole('option', { name: /customer/i }).click();
    }

    await page.getByRole('button', { name: /register/i }).click();

    // After registration it probably goes to login
    await expect(page.getByRole('heading', { name: /login/i }).first()).toBeVisible({ timeout: 10000 });

    // Login
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to the Catalog
    await page.getByRole('link', { name: /products|catalog/i }).click();

    // Add a product to the cart
    const addToCartButton = page.locator('app-product-list .app-card').first().getByRole('button', { name: /add to cart/i });
    await addToCartButton.waitFor();
    await addToCartButton.click();

    // Proceed to Checkout
    const cartIcon = page.getByRole('button', { name: /cart/i });
    if (await cartIcon.isVisible()) {
      await cartIcon.click();
    }
    await page.getByRole('button', { name: /checkout/i }).click();

    // Submit the shipping address form
    await page.getByLabel(/address line 1|address/i).fill('123 Test St');
    await page.getByLabel(/city/i).fill('Testville');
    await page.getByLabel(/state/i).fill('TS');
    await page.getByLabel(/pin code|zip/i).fill('12345');
    await page.getByRole('button', { name: /place order|submit/i }).click();

    // On the Order Details page, click "Proceed to Payment" to trigger the sandbox payment simulation
    const paymentButton = page.getByRole('button', { name: /proceed to payment/i });
    await expect(paymentButton).toBeVisible();
    await paymentButton.click();

    // Assert that the final order status updates to Processing
    await expect(page.locator('.status-chip').filter({ hasText: /processing/i }).first()).toBeVisible();
  });
});
