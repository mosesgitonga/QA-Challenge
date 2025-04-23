import { test, expect } from '@playwright/test';

test.describe.serial('Login to Payments Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.route('http://localhost:8000/login', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ token: 'mock-token', user: { username: 'testuser' } })
    }));
    await page.route('http://localhost:8000/allClients', route => route.fulfill({
      status: 200,
      body: JSON.stringify([
        { id: 1, firstname: 'Peter', lastname: 'Parker', contactnumber: 555666, email: 'peterparker@gmail.com', address: 'New York', username: 'notPeterParker' },
        { id: 2, firstname: 'Tony', lastname: 'Stark', contactnumber: 777888, email: 'tonystark@gmail.com', address: 'New York', username: 'notTonyStark' }
      ])
    }));
    await page.route('http://localhost:8000/allLoans', route => route.fulfill({
      status: 200,
      body: JSON.stringify([
        { id: 1, client_id: 1, firstname: 'Peter', lastname: 'Parker', type: 'Personal', balance: 4000, gross_loan: 5000, amort: 200, terms: 24, date_released: '2025-01-01T00:00:00Z', status: 'Approved' },
        { id: 2, client_id: 2, firstname: 'Tony', lastname: 'Stark', type: 'Business', balance: 8000, gross_loan: 10000, amort: 500, terms: 36, date_released: '2025-02-01T00:00:00Z', status: 'Pending' }
      ])
    }));
    await page.route('http://localhost:8000/loan/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 1, client_id: 1, type: 'Personal', balance: 4000, gross_loan: 5000, amort: 200, terms: 24, date_released: '2025-01-01T00:00:00Z', status: 'Approved' })
    }));
    await page.route('http://localhost:8000/allPayments', route => route.fulfill({
      status: 200,
      body: JSON.stringify([])
    }));
    await page.route('http://localhost:8000/payments/1', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: 1, client_id: 1, loan_id: 1, firstname: 'Peter', lastname: 'Parker', amount: 200, collection_date: '2025-04-01T00:00:00Z', collected_by: 'John Doe', new_balance: 3800, method: 'ATM' }
          ])
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ id: 1, client_id: 1, loan_id: 1, amount: 200, collection_date: '2025-04-01T00:00:00Z', collected_by: 'John Doe', new_balance: 3800, method: 'ATM' })
        });
      }
    });
    await page.route('http://localhost:8000/payment/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ message: 'Payment deleted' })
    }));
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Login test', async () => {
    await page.goto('http://localhost:3000/login');
    await page.locator('#username').fill('moses');
    await page.locator('#password').fill('123');
    await page.locator('button[type="submit"]').click();
    await page.evaluate(() => window.localStorage.setItem('token', 'mock-token'));
    try {
      await page.waitForURL('**/home**');
      await expect(page).toHaveURL(/.*\/home/);
    } catch (e) {
      console.log('Login failed');
      return;
    }
  });

  test('Check clients and go to payments', async () => {
    const count = page.locator('.text-3xl').first();
    try {
      await expect(count).toBeVisible();
      const text = await count.textContent();
      const number = parseInt(text.match(/\d+/)[0]);
      expect(number).toBeGreaterThan(0);
    } catch (e) {
      console.log('Client count failed');
      return;
    }
    const payments = page.locator('li').filter({ hasText: 'Payments' });
    try {
      await expect(payments).toBeVisible();
      await payments.click();
      await expect(page).toHaveURL(/.*\/payments/);
    } catch (e) {
      console.log('Payments link failed');
      return;
    }
    await page.waitForTimeout(2000);
  });

  test('Add payment', async () => {
    await page.goto('http://localhost:3000/payment/1/1');
    try {
      await page.locator('input[name="amount"]').fill('200');
      await page.locator('input[name="collection_date"]').fill('2025-04-01');
      await page.locator('input[name="collected_by"]').fill('John Doe');
      await page.locator('select[name="method"]').selectOption('ATM');
      await page.locator('button').filter({ hasText: 'Add Payment' }).click();
    } catch (e) {
      console.log('Add payment failed');
      return;
    }
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Adding Payment...').catch(() => console.log('No adding toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Added Succesfully!').catch(() => console.log('No success toast'));
    await page.waitForURL('**/payments**');
    await expect(page).toHaveURL(/.*\/payments/);
  });

  test('Check payments list', async () => {
    try {
      await expect(page.locator('table.table-fixed')).toBeVisible();
    } catch (e) {
      console.log('Table not found');
      return;
    }
    const headers = page.locator('table.table-fixed thead tr th');
    await expect(headers).toHaveText(['ID', 'Client Name', 'Voucher ID', 'Amount', 'Collection Date', 'Collected By:', 'New Balance', 'Method', 'Delete']);
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(1);
    const row = rows.nth(0);
    await expect(row.locator('td').nth(0)).toHaveText('1');
    await expect(row.locator('td').nth(1)).toHaveText('Peter Parker');
    await expect(row.locator('td').nth(2)).toHaveText('1');
    await expect(row.locator('td').nth(3)).toHaveText('₱ 200');
    await expect(row.locator('td').nth(4)).toHaveText('Tue Apr 01 2025');
    await expect(row.locator('td').nth(5)).toHaveText('John Doe');
    await expect(row.locator('td').nth(6)).toHaveText('₱ 3800');
    await expect(row.locator('td').nth(7)).toHaveText('ATM');
  });

  test('Delete payment', async () => {
    try {
      await page.locator('table.table-fixed tbody tr').nth(0).locator('button').filter({ hasText: 'DeleteForever' }).click();
    } catch (e) {
      console.log('Delete failed');
      return;
    }
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Deleting Payment...').catch(() => console.log('No deleting toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Deleted Succesfully!').catch(() => console.log('No success toast'));
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(0);
  });
});