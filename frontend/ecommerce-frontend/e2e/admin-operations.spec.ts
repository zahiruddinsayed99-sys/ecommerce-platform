import { test, expect } from '@playwright/test';

test.describe('Admin Operations Flow', () => {
  test('should login as admin, view dashboard, and update order status', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Go to login page if not already there
    const loginLink = page.getByRole('link', { name: /login/i });
    if (await loginLink.isVisible()) {
        await loginLink.click();
    }

    // Login as an Admin
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByLabel(/password/i).fill('password123'); // Adjust password if needed based on seed data
    await page.getByRole('button', { name: /login/i }).click();

    // Verify the Admin Dashboard loads live KPI metrics
    await page.getByRole('link', { name: /dashboard/i }).click();
    // Assuming the KPI cards contain titles like "Total Revenue", "Total Orders", etc.
    await expect(page.locator('mat-card-title').filter({ hasText: /Revenue|Orders|Customers/i }).first()).toBeVisible({ timeout: 10000 });

    // Navigate to the Customer Directory and verify the table renders
    await page.getByRole('link', { name: /customers/i }).click();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tr').nth(1)).toBeVisible(); // At least one row should be present

    // Navigate to Admin Operations (Order Management)
    await page.getByRole('link', { name: /orders/i }).click();

    // Locate a Processing order
    const processingOrderRow = page.locator('tr').filter({ hasText: /processing/i }).first();
    await expect(processingOrderRow).toBeVisible();

    // Click view/edit to go to order details
    await processingOrderRow.getByRole('button', { name: /view|edit/i }).click();

    // Transition status to Shipped
    const shipButton = page.getByRole('button', { name: /mark as shipped|ship/i });
    if (await shipButton.isVisible()) {
      await shipButton.click();
      // Assert the UI reflects the updated status
      await expect(page.locator('.status-chip').filter({ hasText: /shipped/i }).first()).toBeVisible();
    }

    // Transition status to Delivered
    const deliverButton = page.getByRole('button', { name: /mark as delivered|deliver/i });
    if (await deliverButton.isVisible()) {
      await deliverButton.click();
      // Assert the UI reflects the updated status
      await expect(page.locator('.status-chip').filter({ hasText: /delivered/i }).first()).toBeVisible();
    }
  });
});
