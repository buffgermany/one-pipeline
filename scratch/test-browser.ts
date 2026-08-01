import { chromium } from 'playwright';

console.log('Spawning Chromium with remote debugging port 9222...');
const chromePath = 'C:\\Users\\Felix\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const proc = Bun.spawn([
  chromePath,
  '--remote-debugging-port=9222',
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu'
]);

await Bun.sleep(2000);

try {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  console.log('🎉 CONNECTED OVER CDP WEBSOCKET SUCCESSFULLY!');
  
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const title = await page.title();
  console.log('📄 Page Title:', title);

  await browser.close();
  proc.kill();
} catch (e: any) {
  console.error('CDP Connection error:', e.message);
  proc.kill();
}
