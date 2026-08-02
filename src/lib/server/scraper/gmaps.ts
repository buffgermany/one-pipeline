import puppeteer, { type Browser, type Page } from 'puppeteer';

export interface RawGMapLead {
  name: string;
  category: string;
  address: string;
  phoneNumber: string;
  website: string;
  rating: string;
  reviews: number;
  featuredImage: string;
  placeId: string;

  // Expanded Google Maps Data Points
  isAd?: boolean;
  isClaimed?: boolean;
  openStatus?: string;
  priceLevel?: string;
  googleMapsUrl?: string;
  plusCode?: string;
}

export interface ScrapeOptions {
  queries: string[];
  maxScrolls?: number;
  headless?: boolean;
  signal?: AbortSignal;
  onLog?: (message: string) => void;
  onLeadScraped?: (lead: RawGMapLead) => void;
}

/**
 * Strips leading non-alphanumeric unicode icon glyphs (e.g. \uE0C8, , 📍) prepended by Google Maps DOM
 */
export function cleanAddress(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/^[\s\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF\u2000-\u3000\uE000-\uF8FF\uD800-\uDFFF\u200B-\u200D\uFEFF]+/u, '')
    .trim();
  cleaned = cleaned.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return cleaned;
}

/**
 * Generates human jitter delays to prevent server IP rate limits & CAPTCHAs
 */
function randomDelay(minMs = 1200, maxMs = 2600): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
];

/**
 * Stage 1: Google Maps Scraper using Puppeteer with Server Anti-Detection Evasion
 */
export async function scrapeGoogleMaps(options: ScrapeOptions): Promise<RawGMapLead[]> {
  const { queries, maxScrolls = 5, headless = true, signal, onLog, onLeadScraped } = options;
  const leads: RawGMapLead[] = [];
  const seenPlaceIds = new Set<string>();

  const log = (msg: string) => {
    console.log(msg);
    if (onLog) onLog(msg);
  };

  log(`[Scraper] Launching browser engine with server anti-blocking stealth...`);
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const proxyServer = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--lang=de-DE',
    '--window-size=1280,900'
  ];

  if (proxyServer) {
    log(`[Scraper] Routing traffic via proxy server: ${proxyServer}`);
    launchArgs.push(`--proxy-server=${proxyServer}`);
  }

  const browser: Browser = await puppeteer.launch({
    headless,
    executablePath,
    args: launchArgs
  });

  if (signal) {
    signal.addEventListener('abort', () => {
      log('⚠️ Abort signal received. Closing Puppeteer browser...');
      browser.close().catch(() => {});
    });
  }

  try {
    const page: Page = await browser.newPage();
    const chosenUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(chosenUA);
    await page.setViewport({ width: 1280, height: 900 });

    // Server Evasion: Inject WebGL & Navigator Overrides to bypass Datacenter Fingerprinting
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['de-DE', 'de', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

      (window as any).chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {}
      };

      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel(R) Iris(TM) Xe Graphics';
        return getParameter.apply(this, [parameter]);
      };
    });

    for (const query of queries) {
      if (signal?.aborted) break;

      log(`🔍 Searching Google Maps for: "${query}"`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Cookie Consent Banner
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const acceptBtn = buttons.find((b) =>
            b.textContent?.includes('Alle akzeptieren') ||
            b.textContent?.includes('Accept all') ||
            b.textContent?.includes('Ich stimme zu')
          );
          if (acceptBtn) acceptBtn.click();
        });
        await randomDelay(800, 1500);
      } catch {
        // Banner not present
      }

      if (signal?.aborted) break;

      log('[Scraper] Waiting for results feed container...');
      const feedSelector = 'div[role="feed"], div[aria-label*="Ergebnisse"]';
      try {
        await page.waitForSelector(feedSelector, { timeout: 15000 });
      } catch {
        log(`⚠️ Feed container not found for "${query}". Retrying search box input...`);
        const searchInput = await page.$('#searchboxinput');
        if (searchInput) {
          await searchInput.type(query);
          await page.keyboard.press('Enter');
          await randomDelay(2000, 3500);
        }
      }

      if (signal?.aborted) break;

      log(`📜 Scrolling feed panel (${maxScrolls} iterations with human jitter)...`);
      for (let s = 0; s < maxScrolls; s++) {
        if (signal?.aborted) break;
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) {
            feed.scrollBy({ top: 600 + Math.random() * 400, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: 600 + Math.random() * 400, behavior: 'smooth' });
          }
        });
        await randomDelay(1200, 2200);
      }

      if (signal?.aborted) break;

      // Extract listing links & check for Sponsored Ads
      const placeLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
        return links.map((a) => {
          const container = a.closest('div[role="article"]') || a.parentElement;
          const isAd = Boolean(
            container?.querySelector('span[class*="fontTitleBodyMedium"]')?.textContent?.includes('Anzeige') ||
            container?.textContent?.includes('Gesponsert')
          );
          return {
            href: a.getAttribute('href') || '',
            ariaLabel: a.getAttribute('aria-label') || '',
            isAd
          };
        });
      });

      const uniqueMap = new Map<string, { href: string; ariaLabel: string; isAd: boolean }>();
      for (const item of placeLinks) {
        const key = item.href.split('?')[0];
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      }
      const uniqueLinks = Array.from(uniqueMap.values());

      log(`📦 Found ${uniqueLinks.length} place cards. Processing detail cards...`);

      for (const item of uniqueLinks) {
        if (signal?.aborted) break;

        try {
          const placeUrl = item.href.startsWith('http')
            ? item.href
            : `https://www.google.com${item.href}`;

          await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await randomDelay(800, 1600);

          const details = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const name = h1?.textContent?.trim() || '';

            // Clean address (include PLZ & City Name)
            const addrBtn = document.querySelector('button[data-item-id="address"]');
            let rawAddress = addrBtn?.getAttribute('aria-label')?.replace(/^Adresse:\s*/i, '').trim() || addrBtn?.textContent?.trim() || '';
            const addrDiv = addrBtn?.querySelector('div[class*="fontBodyMedium"]');
            if (addrDiv?.textContent && addrDiv.textContent.trim().length > rawAddress.length) {
              rawAddress = addrDiv.textContent.trim();
            }

            const catBtn = document.querySelector('button[jsaction*="category"]');
            const category = catBtn?.textContent?.trim() || '';

            const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
            const phoneNumber = phoneBtn?.textContent?.trim() || '';

            const webA = document.querySelector('a[data-item-id="authority"]');
            const website = webA?.getAttribute('href') || '';

            const ratingSpan = document.querySelector('span.ceNzKf');
            const ratingText = ratingSpan?.getAttribute('aria-label') || '';
            const rating = ratingText ? ratingText.replace(/[^0-9,.]/g, '').replace(',', '.') : '';

            const reviewBtn = document.querySelector('button[jsaction*="review"]');
            const reviewsText = reviewBtn?.textContent || '0';
            const reviews = parseInt(reviewsText.replace(/[^0-9]/g, ''), 10) || 0;

            const heroImg = document.querySelector('button[jsaction*="hero"] img, button[aria-label*="Foto"] img, button[jsaction*="photo"] img, img[src*="googleusercontent"], img[src*="ggpht"]');
            let rawImg = heroImg?.getAttribute('src') || heroImg?.getAttribute('data-src') || '';
            if (rawImg.startsWith('//')) rawImg = 'https:' + rawImg;
            const featuredImage = rawImg;

            const ohBtn = document.querySelector('button[data-item-id*="oh"]');
            const openStatus = ohBtn?.getAttribute('aria-label')?.trim() || ohBtn?.textContent?.trim() || '';

            const priceSpan = document.querySelector('span[aria-label*="Preis"]');
            const priceLevel = priceSpan?.textContent?.trim() || '';

            const olocBtn = document.querySelector('button[data-item-id="oloc"]');
            const plusCode = olocBtn?.textContent?.trim() || '';

            const bodyText = document.body.innerText || '';
            const isUnclaimed = bodyText.includes('Als Inhaber eintragen') || bodyText.includes('Inhaber dieses Unternehmens?');
            const isClaimed = !isUnclaimed;

            return {
              name,
              category,
              rawAddress,
              phoneNumber,
              website,
              rating,
              reviews,
              featuredImage,
              openStatus,
              priceLevel,
              plusCode,
              isClaimed
            };
          });

          const name = details.name || item.ariaLabel;
          if (!name) continue;

          let address = cleanAddress(details.rawAddress);
          if (address && !/\b\d{5}\b/.test(address)) {
            const queryWords = query.trim().split(/\s+/);
            const possibleCity = queryWords[queryWords.length - 1];
            if (possibleCity && possibleCity.length > 2 && !address.toLowerCase().includes(possibleCity.toLowerCase())) {
              address = `${address}, ${possibleCity}`;
            }
          }
          const placeId = Bun.hash(`${name}_${address}`).toString();

          if (seenPlaceIds.has(placeId)) continue;
          seenPlaceIds.add(placeId);

          const cleanPhone = (details.phoneNumber || '').replace(/[^\d+()\s/-]/g, '').trim();

          const lead: RawGMapLead = {
            name,
            category: details.category,
            address,
            phoneNumber: cleanPhone,
            website: details.website,
            rating: details.rating,
            reviews: details.reviews,
            featuredImage: details.featuredImage,
            placeId,
            isAd: item.isAd,
            isClaimed: details.isClaimed,
            openStatus: details.openStatus,
            priceLevel: details.priceLevel,
            googleMapsUrl: placeUrl,
            plusCode: details.plusCode
          };

          leads.push(lead);
          if (onLeadScraped) onLeadScraped(lead);

          log(`  ✓ Scraped: ${name} | Addr: ${address} | Rating: ${details.rating} ⭐ (${details.reviews} reviews) | Ad: ${item.isAd ? 'Yes' : 'No'} | Claimed: ${details.isClaimed ? 'Yes' : 'No (Opportunity!)'}`);
        } catch {
          // Continue on minor item error
        }
      }
    }
  } catch (err: any) {
    if (!signal?.aborted) {
      log(`Scraper Error: ${err.message}`);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return leads;
}
