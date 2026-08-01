import puppeteer from 'puppeteer';

console.log('Testing Puppeteer launch...');
try {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('🎉 PUPPETEER LAUNCHED SUCCESSFULLY!');
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const title = await page.title();
  console.log('📄 Page Title:', title);
  await browser.close();
} catch (e: any) {
  console.error('Puppeteer launch failed:', e.message);
}
