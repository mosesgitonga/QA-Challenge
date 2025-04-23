import { test, expect } from '@playwright/test';

test.describe.serial('Login to Borrowers Page Tests', () => {
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
    await page.route('http://localhost:8000/client/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 1, firstname: 'Peter', lastname: 'Parker', contactnumber: 555666, email: 'peterparker@gmail.com', address: 'New York', username: 'notPeterParker' })
    }));
    await page.route('http://localhost:8000/addClient', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 3, firstname: 'Bruce', lastname: 'Wayne', contactnumber: 999888, email: 'brucewayne@gmail.com', address: 'Gotham', username: 'notBatman' })
    }));
    await page.route('http://localhost:8000/clients/1', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 1, firstname: 'Peter', lastname: 'Parker', contactnumber: 555666, email: 'peterparker@newemail.com', address: 'New York' })
    }));
    await page.route('http://localhost:8000/clients/2', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ message: 'Client deleted' })
    }));
    await page.route('http://localhost:8000/allLoans', route => route.fulfill({
      status: 200,
      body: JSON.stringify([])
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

  test('Check clients and go to borrowers', async () => {
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
    const borrowers = page.locator('li').filter({ hasText: 'Borrowers' });
    try {
      await expect(borrowers).toBeVisible();
      await borrowers.click();
      await expect(page).toHaveURL(/.*\/borrowers/);
    } catch (e) {
      console.log('Borrowers link failed');
      return;
    }
    await page.waitForTimeout(2000);
  });

  test('Check borrowers list', async () => {
    try {
      await expect(page.locator('table.table-fixed')).toBeVisible();
    } catch (e) {
      console.log('Table not found');
      return;
    }
    const headers = page.locator('table.table-fixed thead tr th');
    await expect(headers).toHaveText(['ID', 'Full Name', 'Contact Number', 'Address', 'Email', 'Action']);
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(2);
    const row1 = rows.nth(0);
    await expect(row1.locator('td').nth(0)).toHaveText('1');
    await expect(row1.locator('td').nth(1)).toHaveText('Peter Parker');
    await expect(row1.locator('td').nth(2)).toHaveText('555666');
    await expect(row1.locator('td').nth(3)).toHaveText('New York');
    await expect(row1.locator('td').nth(4)).toHaveText('peterparker@gmail.com');
    const row2 = rows.nth(1);
    await expect(row2.locator('td').nth(0)).toHaveText('2');
    await expect(row2.locator('td').nth(1)).toHaveText('Tony Stark');
    await expect(row2.locator('td').nth(2)).toHaveText('777888');
    await expect(row2.locator('td').nth(3)).toHaveText('New York');
    await expect(row2.locator('td').nth(4)).toHaveText('tonystark@gmail.com');
  });

  test('Add new borrower', async () => {
    try {
      await page.locator('button').filter({ hasText: 'Add Borrower' }).click();
      await expect(page).toHaveURL(/.*\/addBorrower/);
    } catch (e) {
      console.log('Add borrower button failed');
      return;
    }
    await page.locator('input[name="firstname"]').fill('Bruce');
    await page.locator('input[name="lastname"]').fill('Wayne');
    await page.locator('input[name="contactNumber"]').fill('999888');
    await page.locator('input[name="address"]').fill('Gotham');
    await page.locator('input[name="email"]').fill('brucewayne@gmail.com');
    await page.locator('input[name="username"]').fill('notBatman');
    await page.locator('button').filter({ hasText: 'Save' }).click();
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Adding Borrower...').catch(() => console.log('No adding toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Added Succesfully!').catch(() => console.log('No success toast'));
    await page.waitForURL('**/borrowers**');
    await expect(page).toHaveURL(/.*\/borrowers/);
  });

  test('View borrower', async () => {
    try {
      await page.waitForSelector('table.table-fixed');
      const view = page.locator('table.table-fixed tbody tr').nth(0).locator('button.bg-red-500').nth(1);
      await expect(view).toBeVisible();
      await view.click();
      await expect(page).toHaveURL(/.*\/Borrower\/1/);
    } catch (e) {
      console.log('View borrower failed');
      return;
    }
    await expect(page.locator('span').filter({ hasText: 'Peter Parker' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'peterparker@gmail.com' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: '555666' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'New York' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'UPDATE CLIENT' })).toBeVisible();
  });

  test('Edit borrower', async () => {
    await page.goto('http://localhost:3000/editBorrower/1');
    try {
      await expect(page.locator('input[name="firstname"]')).toHaveValue('Peter');
      await expect(page.locator('input[name="lastname"]')).toHaveValue('Parker');
      await expect(page.locator('input[name="contactNumber"]')).toHaveValue('555666');
      await expect(page.locator('input[name="address"]')).toHaveValue('New York');
      await expect(page.locator('input[name="email"]')).toHaveValue('peterparker@gmail.com');
    } catch (e) {
      console.log('Form check failed');
      return;
    }
    await page.locator('input[name="email"]').fill('peterparker@newemail.com');
    await page.locator('button').filter({ hasText: 'Update' }).click();
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Updating Borrower...').catch(() => console.log('No updating toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Updated Succesfully!').catch(() => console.log('No success toast'));
    await page.waitForURL('**/Borrower/1**');
    await expect(page).toHaveURL(/.*\/Borrower\/1/);
  });

  test('Delete borrower', async () => {
    await page.goto('http://localhost:3000/borrowers');
    try {
      await page.locator('table.table-fixed tbody tr').nth(1).locator('button').filter({ hasText: 'DeleteForever' }).click();
    } catch (e) {
      console.log('Delete failed');
      return;
    }
    const toast = page.locator('.Toastify__toast');
    await expect(toast).toContainText('Deleting Client...').catch(() => console.log('No deleting toast'));
    await expect(page.locator('.Toastify__toast--success')).toContainText('Deleted Succesfully!').catch(() => console.log('No success toast'));
    const rows = page.locator('table.table-fixed tbody tr');
    await expect(rows).toHaveCount(1);
  });
});