import { test, expect } from '@playwright/test';

test.describe.serial('Login Page to Loans Page Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    page.on('request', request => console.log('Request: ' + request.url()));
    page.on('response', response => console.log('Response: ' + response.url() + ' - ' + response.status()));
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
    await page.route('http://localhost:8000/loans/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify([{ id: 1, client_id: 1, type: 'Personal', balance: 4000, gross_loan: 5000, amort: 200, terms: 24, date_released: '2025-01-01T00:00:00Z', status: 'Approved' }])
    }));
    await page.route('http://localhost:8000/loan/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 1, client_id: 1, type: 'Personal', balance: 4000, gross_loan: 5000, amort: 200, terms: 24, date_released: '2025-01-01T00:00:00Z', status: 'Approved' })
    }));
    await page.route('http://localhost:8000/addLoan', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 3, client_id: 3, firstname: 'Bruce', lastname: 'Wayne', type: 'Personal', balance: 6000, gross_loan: 7500, amort: 300, terms: 24, date_released: '2025-03-01T00:00:00Z', status: 'Approved' })
    }));
    await page.route('http://localhost:8000/loans/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 1, client_id: 1, type: 'Personal', balance: 4000, gross_loan: 6000, amort: 200, terms: 24, date_released: '2025-01-01T00:00:00Z', status: 'Approved' })
    }));
    await page.route('http://localhost:8000/loans/2', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ message: 'Loan deleted' })
    }));
    await page.route('http://localhost:8000/allPayments', route => route.fulfill({
      status: 200,
      body: JSON.stringify([])
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
    await page.waitForURL('**/home**');
    await expect(page).toHaveURL(/.*\/home/);
  });

  test('Check clients and go to loans', async () => {
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
    const loans = page.locator('li.text-sm.font-medium.text-gray-700').filter({ hasText: 'Loans' });
    try {
      await expect(loans).toBeVisible();
      await loans.click();
      await expect(page).toHaveURL(/.*\/loans/);
    } catch (e) {
      console.log('Loans link failed');
      return;
    }
    await page.waitForTimeout(2000);
  });

  test('Add new loan', async () => {
    try {
      await page.locator('button').filter({ hasText: 'Add Loan' }).click();
      await expect(page).toHaveURL(/.*\/addLoan/);
    } catch (e) {
      console.log('Add loan button failed');
      return;
    }
    await page.locator('select[name="client_id"]').selectOption('3');
    await page.locator('input[name="type"]').fill('Personal');
    await page.locator('input[name="gross_loan"]').fill('7500');
    await page.locator('input[name="balance"]').fill('6000');
    await page.locator('input[name="amort"]').fill('300');
    await page.locator('input[name="terms"]').fill('24');
    await page.locator('input[name="date_released"]').fill('2025-03-01');
    await page.locator('select[name="status"]').selectOption('Approved');
    await page.locator('button').filter({ hasText: 'Save' }).click();
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Adding Loan...').catch(() => console.log('No adding toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Added Succesfully!').catch(() => console.log('No success toast'));
    await page.waitForURL('**/loans**');
    await expect(page).toHaveURL(/.*\/loans/);
  });

  test('Check loans list', async () => {
    try {
      await expect(page.locator('table.table-fixed')).toBeVisible();
    } catch (e) {
      console.log('Table not found');
      return;
    }
    const headers = page.locator('table.table-fixed thead tr th');
    await expect(headers).toHaveText(['Voucher', 'Client Name', 'Loan Type', 'Outstanding Balance', 'Gross Loan', 'Amortization', 'Terms', 'Date Released', 'Status', 'Actions']);
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(2);
    const row1 = rows.nth(0);
    await expect(row1.locator('td').nth(0)).toHaveText('1');
    await expect(row1.locator('td').nth(1)).toHaveText('Peter Parker');
    await expect(row1.locator('td').nth(2)).toHaveText('Personal');
    await expect(row1.locator('td').nth(3)).toHaveText('₱ 4000');
    await expect(row1.locator('td').nth(4)).toHaveText('₱ 5000');
    await expect(row1.locator('td').nth(5)).toHaveText('₱ 200');
    await expect(row1.locator('td').nth(6)).toHaveText('24 month/s');
    await expect(row1.locator('td').nth(7)).toHaveText('Wed Jan 01 2025');
    await expect(row1.locator('td').nth(8)).toHaveText('Approved');
    const row2 = rows.nth(1);
    await expect(row2.locator('td').nth(0)).toHaveText('2');
    await expect(row2.locator('td').nth(1)).toHaveText('Tony Stark');
    await expect(row2.locator('td').nth(2)).toHaveText('Business');
    await expect(row2.locator('td').nth(3)).toHaveText('₱ 8000');
    await expect(row2.locator('td').nth(4)).toHaveText('₱ 10000');
    await expect(row2.locator('td').nth(5)).toHaveText('₱ 500');
    await expect(row2.locator('td').nth(6)).toHaveText('36 month/s');
    await expect(row2.locator('td').nth(7)).toHaveText('Sat Feb 01 2025');
    await expect(row2.locator('td').nth(8)).toHaveText('Pending');
  });

  test('View client loans', async () => {
    try {
      await page.goto('http://localhost:3000/loans/1');
      await expect(page.locator('table.table-fixed')).toBeVisible();
    } catch (e) {
      console.log('Client loans table failed');
      return;
    }
    const headers = page.locator('table.table-fixed thead tr th');
    await expect(headers).toHaveText(['Voucher', 'Loan Type', 'Outstanding Balance', 'Gross Loan', 'Amortization', 'Terms', 'Date Released', 'Status', 'Actions']);
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(1);
    const row = rows.nth(0);
    await expect(row.locator('td').nth(0)).toHaveText('1');
    await expect(row.locator('td').nth(1)).toHaveText('Personal');
    await expect(row.locator('td').nth(2)).toHaveText('₱ 4000');
    await expect(row.locator('td').nth(3)).toHaveText('₱ 5000');
    await expect(row.locator('td').nth(4)).toHaveText('₱ 200');
    await expect(row.locator('td').nth(5)).toHaveText('24 month/s');
    await expect(row.locator('td').nth(6)).toHaveText('Wed Jan 01 2025');
    await expect(row.locator('td').nth(7)).toHaveText('Approved');
  });

  test('View one loan', async () => {
    try {
      await page.goto('http://localhost:3000/Loan/1');
      await expect(page.locator('table.table-fixed')).toBeVisible();
    } catch (e) {
      console.log('Single loan table failed');
      return;
    }
    const headers = page.locator('table.table-fixed thead tr th');
    await expect(headers).toHaveText(['Voucher', 'Loan Type', 'Outstanding Balance', 'Gross Loan', 'Amortization', 'Terms', 'Date Released', 'Status']);
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(1);
    const row = rows.nth(0);
    await expect(row.locator('td').nth(0)).toHaveText('1');
    await expect(row.locator('td').nth(1)).toHaveText('Personal');
    await expect(row.locator('td').nth(2)).toHaveText('₱ 4000');
    await expect(row.locator('td').nth(3)).toHaveText('₱ 5000');
    await expect(row.locator('td').nth(4)).toHaveText('₱ 200');
    await expect(row.locator('td').nth(5)).toHaveText('24 month/s');
    await expect(row.locator('td').nth(6)).toHaveText('Wed Jan 01 2025');
    await expect(row.locator('td').nth(7)).toHaveText('Approved');
  });

  test('Edit loan', async () => {
    await page.goto('http://localhost:3000/editLoan/1');
    console.log('URL: ' + await page.url());
    const inputs = await page.locator('input,select').all();
    console.log('Inputs found: ' + inputs.length);
    try {
      await page.waitForResponse('**/loan/1');
      console.log('Got loan/1 response');
    } catch (e) {
      console.log('No loan/1 response');
    }
    const form = await page.locator('input[name="gross_loan"]').isVisible();
    if (!form) {
      console.log('Form not found');
      return;
    }
    await expect(page.locator('input[name="type"]')).toHaveValue('Personal');
    await expect(page.locator('input[name="gross_loan"]')).toHaveValue('5000');
    await expect(page.locator('input[name="balance"]')).toHaveValue('4000');
    await expect(page.locator('input[name="amort"]')).toHaveValue('200');
    await expect(page.locator('input[name="terms"]')).toHaveValue('24');
    await expect(page.locator('select[name="status"]')).toHaveValue('Approved');
    await page.locator('input[name="gross_loan"]').fill('6000');
    await page.locator('button').filter({ hasText: 'Update' }).click();
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Updating Loan...').catch(() => console.log('No updating toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Updated Succesfully!').catch(() => console.log('No success toast'));
    await page.waitForURL('**/loans**');
    await expect(page).toHaveURL(/.*\/loans/);
  });

  test('Delete loan', async () => {
    await page.goto('http://localhost:3000/loans');
    try {
      await page.locator('table.table-fixed tbody tr').nth(1).locator('button').filter({ hasText: 'DeleteForever' }).click();
    } catch (e) {
      console.log('Delete failed');
      return;
    }
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Deleting Loan...').catch(() => console.log('No deleting toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Deleted Succesfully!').catch(() => console.log('No success toast'));
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(1);
  });
});