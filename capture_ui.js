import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('report_screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // 1. Catalog main
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, 'fig_catalog.png') });
  console.log('fig_catalog.png captured');

  // 2. Open review modal on first service
  const reviewBtn = await page.$('.service-card-btn-secondary');
  if (reviewBtn) {
    await reviewBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, 'fig_review_modal.png') });
    console.log('fig_review_modal.png captured');
    // close modal
    const closeBtn = await page.$('.modal-close');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // 3. User Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, 'fig_login.png') });
  console.log('fig_login.png captured');

  await page.type('input[type="email"]', 'ivan@mail.ru');
  await page.type('input[type="password"]', 'client');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  // 4. Dashboard with orders
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'fig_dashboard.png') });
  console.log('fig_dashboard.png captured');

  // 5. Add item to cart and show cart
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const addBtn = await page.$('.service-card-btn-primary');
  if (addBtn) {
    await addBtn.click();
    await new Promise(r => setTimeout(r, 600));
  }
  await page.goto('http://localhost:5173/cart', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'fig_cart.png') });
  console.log('fig_cart.png captured');

  // 6. Admin Login & Panels
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'admin@restaurant.ru');
  await page.type('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  // Admin main
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'fig_admin_main.png') });
  console.log('fig_admin_main.png captured');

  // Admin open modal for edit service
  const editSvcBtn = await page.$('.admin-table-btn.edit');
  if (editSvcBtn) {
    await editSvcBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, 'fig_admin_edit_modal.png') });
    console.log('fig_admin_edit_modal.png captured');
    const closeBtn = await page.$('.modal-close');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // Admin coupons tab
  const tabs = await page.$$('.admin-tab-btn');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text.includes('Промокоды')) {
      await tab.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, 'fig_admin_coupons.png') });
      console.log('fig_admin_coupons.png captured');
      break;
    }
  }

  // Admin orders tab
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text.includes('Заказы')) {
      await tab.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, 'fig_admin_orders.png') });
      console.log('fig_admin_orders.png captured');
      break;
    }
  }

  await browser.close();
  console.log('All UI screenshots captured successfully!');
}

run().catch(e => console.error(e));
