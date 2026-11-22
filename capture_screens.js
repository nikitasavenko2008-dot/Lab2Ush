import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('report_screens');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, '01_catalog.png') });
  console.log('01_catalog.png captured');

  // Login as user
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, '02_login.png') });
  console.log('02_login.png captured');

  await page.type('input[type="email"]', 'ivan@mail.ru');
  await page.type('input[type="password"]', 'client');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  // Dashboard
  await page.screenshot({ path: path.join(outDir, '03_dashboard.png') });
  console.log('03_dashboard.png captured');

  // Cart
  await page.goto('http://localhost:5173/cart', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '04_cart.png') });
  console.log('04_cart.png captured');

  // Register page
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '05_register.png') });
  console.log('05_register.png captured');

  // Login as admin
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'admin@restaurant.ru');
  await page.type('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  // Admin panel
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '06_admin_services.png') });
  console.log('06_admin_services.png captured');

  await browser.close();
  console.log('All basic screenshots captured successfully!');
}

capture().catch(err => console.error('Error during capture:', err));
