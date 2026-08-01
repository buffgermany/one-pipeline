import * as cheerio from 'cheerio';
import { auditWebsite, type WebsiteAuditResult } from './audit';

export interface SourceLocation {
  url: string;
  targetText?: string;
  fragmentUrl?: string; // W3C Text Fragment Link: https://example.com/page#:~:text=ExactText
}

export interface EnrichmentSourcesMap {
  email?: SourceLocation;
  directEmail?: SourceLocation;
  websitePhone?: SourceLocation;
  directPhone?: SourceLocation;
  decisionMaker?: SourceLocation;
  techStack?: SourceLocation;
  facebook?: SourceLocation;
  instagram?: SourceLocation;
  linkedin?: SourceLocation;
}

export interface EnrichedContacts {
  email: string;
  directEmail: string;
  websitePhone: string;
  directPhone: string;
  decisionMaker: string;
  techStack: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  auditScore?: number;
  auditData?: string;
  auditResult?: WebsiteAuditResult;
  sources?: EnrichmentSourcesMap;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:(?:\+49|0049|0)\s?\(?0?\)?\s?[\d\s\/-]{6,20})/g;

const GENERAL_EMAIL_PREFIXES = [
  'info@', 'kontakt@', 'contact@', 'office@', 'mail@', 'post@',
  'service@', 'hallo@', 'empfang@', 'praxis@', 'anfrage@', 'kanzlei@',
  'support@', 'admin@', 'hilfe@', 'hello@', 'zentrale@'
];

/**
 * Creates W3C Chrome/Edge/Safari/Firefox Text Fragment URL for direct jump & highlight
 */
export function createTextFragmentUrl(pageUrl: string, targetText?: string): string {
  if (!targetText || !targetText.trim()) return pageUrl;

  const cleanSnippet = targetText.trim().replace(/\s+/g, ' ');
  const encodedText = encodeURIComponent(cleanSnippet);

  const [baseWithoutHash] = pageUrl.split('#');
  return `${baseWithoutHash}#:~:text=${encodedText}`;
}

/**
 * Advanced Multi-Category Tech Stack, CMS, Framework, Analytics & Booking Detector
 */
export function detectTechStack(htmlText: string, $: cheerio.CheerioAPI): string {
  const metaGenerator = $('meta[name="generator"]').attr('content')?.toLowerCase() || '';
  const htmlLower = htmlText.toLowerCase();

  const cms: string[] = [];
  const frameworks: string[] = [];
  const tools: string[] = [];

  // 1. CMS & Website Builders
  if (metaGenerator.includes('wordpress') || htmlLower.includes('/wp-content/') || htmlLower.includes('/wp-includes/')) {
    cms.push('WordPress');
    if (htmlLower.includes('elementor')) cms.push('Elementor');
    if (htmlLower.includes('divi')) cms.push('Divi');
    if (htmlLower.includes('wpbakery') || htmlLower.includes('js_composer')) cms.push('WPBakery');
    if (htmlLower.includes('avada')) cms.push('Avada');
    if (htmlLower.includes('oxygen')) cms.push('Oxygen');
  } else if (htmlLower.includes('framerstatic.com') || htmlLower.includes('framerusercontent.com') || htmlLower.includes('framer.com')) {
    cms.push('Framer');
  } else if (htmlLower.includes('wix.com') || htmlLower.includes('static.wixstatic.com') || metaGenerator.includes('wix')) {
    cms.push('Wix');
  } else if (htmlLower.includes('squarespace.com') || metaGenerator.includes('squarespace')) {
    cms.push('Squarespace');
  } else if (htmlLower.includes('webflow.com') || htmlLower.includes('webflow.css')) {
    cms.push('Webflow');
  } else if (htmlLower.includes('shopware')) {
    cms.push('Shopware');
  } else if (htmlLower.includes('shopify')) {
    cms.push('Shopify');
  } else if (htmlLower.includes('typo3') || metaGenerator.includes('typo3')) {
    cms.push('TYPO3');
  } else if (htmlLower.includes('jimdo.com') || htmlLower.includes('jimdo-storage')) {
    cms.push('Jimdo');
  } else if (htmlLower.includes('weebly.com')) {
    cms.push('Weebly');
  } else if (htmlLower.includes('joomla') || metaGenerator.includes('joomla')) {
    cms.push('Joomla');
  } else if (htmlLower.includes('drupal') || metaGenerator.includes('drupal')) {
    cms.push('Drupal');
  } else if (htmlLower.includes('contao')) {
    cms.push('Contao');
  }

  // 2. Frameworks & UI Libraries
  if (htmlLower.includes('_next/static') || htmlLower.includes('__next')) {
    frameworks.push('Next.js');
  } else if (htmlLower.includes('__nuxt') || htmlLower.includes('nuxt')) {
    frameworks.push('Nuxt.js');
  } else if (htmlLower.includes('svelte-') || htmlLower.includes('__svelte')) {
    frameworks.push('Svelte');
  } else if (htmlLower.includes('react')) {
    frameworks.push('React');
  }

  if (htmlLower.includes('tailwindcss') || htmlLower.includes('tw-')) {
    frameworks.push('Tailwind CSS');
  } else if (htmlLower.includes('bootstrap')) {
    frameworks.push('Bootstrap');
  }

  // 3. E-Commerce & Booking Widgets
  if (htmlLower.includes('woocommerce')) tools.push('WooCommerce');
  if (htmlLower.includes('calendly.com')) tools.push('Calendly');
  if (htmlLower.includes('doctolib')) tools.push('Doctolib');
  if (htmlLower.includes('shore.com')) tools.push('Shore');
  if (htmlLower.includes('jameda')) tools.push('Jameda');
  if (htmlLower.includes('treatwell')) tools.push('Treatwell');
  if (htmlLower.includes('booksy')) tools.push('Booksy');

  // 4. Analytics & GDPR & Chat
  if (htmlLower.includes('googletagmanager.com') || htmlLower.includes('google-analytics')) tools.push('Google Analytics');
  if (htmlLower.includes('connect.facebook.net') || htmlLower.includes('fbevents.js')) tools.push('FB Pixel');
  if (htmlLower.includes('matomo') || htmlLower.includes('piwik')) tools.push('Matomo');
  if (htmlLower.includes('borlabs-cookie')) tools.push('Borlabs GDPR');
  if (htmlLower.includes('usercentrics')) tools.push('Usercentrics');
  if (htmlLower.includes('cookiebot')) tools.push('Cookiebot');
  if (htmlLower.includes('wa.me/') || htmlLower.includes('api.whatsapp.com')) tools.push('WhatsApp Widget');

  const allDetected = [...cms, ...frameworks, ...tools];

  if (allDetected.length === 0) {
    return 'Custom HTML / Standard';
  }

  return Array.from(new Set(allDetected)).slice(0, 4).join(' • ');
}

/**
 * Parses ALL Decision Makers (Inhaber / Geschäftsführer / Vorstand) from German Impressum HTML
 * Handles comma-separated, 'und', 'sowie', and multi-line director lists
 */
export function extractDecisionMaker(htmlText: string, $: cheerio.CheerioAPI): string {
  const textContent = $('body').text() || htmlText;

  // Regex pattern matching common German Impressum leadership blocks
  const prefixRegex = /(?:Vertreten durch(?:\s+die\s+Geschäftsführer|\s+die\s+Inhaber|\s+den\s+Vorstand)?|Geschäftsführer(?:in)?(?:en)?|Geschäftsführung|Inhaber(?:in)?(?:en)?|Inh\.|Vorstand|Praxisleitung|Inhaber & Leiter|Gesellschafter)\s*[:\s–-]+([\s\S]{5,300}?)(?=(?:\r?\n\r?\n|Amtsgericht|HRB|USt|Sitz|Telefon|Tel\.|Fax|E-Mail|Register|Steuer|Haftung|Aufsichtsbehörde|Umsatzsteuer|\n[A-Z][a-z]+:|$))/gi;

  const foundNames = new Set<string>();

  let match;
  while ((match = prefixRegex.exec(textContent)) !== null) {
    if (match[1]) {
      const block = match[1].trim();

      // Split block by comma, 'und', 'sowie', '&', or line break
      const tokens = block.split(/(?:,|\s+und\s+|\s+sowie\s+|\s+&\s+|\n|\r)/gi);

      for (let token of tokens) {
        // Strip titles & legal forms
        token = token.replace(/\b(Dr\.|Prof\.|Dipl\.-[A-Za-z]+|M\.Sc\.|B\.Sc\.|GmbH|AG|KG|UG|HRB|Amtsgericht)\b/gi, '').trim();
        token = token.replace(/[^\w\sÄÖÜäöüß-]/g, '').trim();

        // Check if token looks like a clean person name (2 to 4 capitalized German words)
        if (token.length >= 5 && token.length <= 40) {
          const words = token.split(/\s+/).filter(Boolean);
          if (words.length >= 2 && words.length <= 4) {
            const isValidName = words.every(w => /^[A-ZÄÖÜ][a-zäöüß-]+$/.test(w));
            const isForbidden = /Datenschutz|Impressum|Haftung|Inhalt|Kontakt|Telefon|Telefax|Sitz|Register|Umsatzsteuer|Amtsgericht|Deutschland|Strasse|Straße/i.test(token);

            if (isValidName && !isForbidden) {
              foundNames.add(words.join(' '));
            }
          }
        }
      }
    }
  }

  // Fallback pattern if block regex found nothing
  if (foundNames.size === 0) {
    const fallbackRegex = /(?:Dr\.|Prof\.\s*Dr\.|Dipl\.-[A-Za-z]+)\s+([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)/g;
    let fbMatch;
    while ((fbMatch = fallbackRegex.exec(textContent)) !== null) {
      if (fbMatch[1]) {
        const name = fbMatch[1].trim();
        if (!/Datenschutz|Impressum|Haftung/i.test(name)) {
          foundNames.add(name);
        }
      }
    }
  }

  if (foundNames.size > 0) {
    return Array.from(foundNames).join(', ');
  }

  return '';
}

/**
 * Discovers internal contact/impressum/team links dynamically from homepage DOM
 */
export function discoverInternalLinks(baseUrl: string, $: cheerio.CheerioAPI): string[] {
  const discovered = new Set<string>();

  const targetKeywords = ['impressum', 'kontakt', 'contact', 'about', 'team', 'ueber-uns', 'über-uns', 'ansprechpartner'];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    const text = $(el).text().toLowerCase().trim();

    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) {
      return;
    }

    const hrefLower = href.toLowerCase();
    const matchesKeyword = targetKeywords.some(kw => hrefLower.includes(kw) || text.includes(kw));

    if (matchesKeyword) {
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        if (new URL(fullUrl).host === new URL(baseUrl).host) {
          discovered.add(fullUrl);
        }
      } catch {
        // Ignore invalid URLs
      }
    }
  });

  return Array.from(discovered).slice(0, 5);
}

/**
 * Enriches a single website URL with dynamic link discovery, decision-maker extraction & tech stack + source links
 */
export async function enrichWebsite(
  websiteUrl: string,
  gmapsPhone?: string,
  signal?: AbortSignal
): Promise<EnrichedContacts> {
  const sourcesMap: EnrichmentSourcesMap = {};

  const contacts: EnrichedContacts = {
    email: '',
    directEmail: '',
    websitePhone: '',
    directPhone: '',
    decisionMaker: '',
    techStack: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    sources: sourcesMap
  };

  if (!websiteUrl || !websiteUrl.startsWith('http') || signal?.aborted) {
    return contacts;
  }

  let baseUrl = websiteUrl;
  try {
    const urlObj = new URL(websiteUrl);
    baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return contacts;
  }

  const emailsSet = new Set<string>();
  const directEmailsSet = new Set<string>();
  const phonesSet = new Set<string>();
  const directPhonesSet = new Set<string>();
  const decisionMakersSet = new Set<string>();

  const normPhone = (p: string) => p.replace(/\D/g, '');
  const cleanGmapsNorm = gmapsPhone ? normPhone(gmapsPhone) : '';

  async function fetchAndParsePage(targetUrl: string) {
    if (signal?.aborted) return null;

    try {
      const response = await Bun.fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return null;

      const htmlText = await response.text();
      const $ = cheerio.load(htmlText);

      // Perform 100% Free Deep Website Audit & Multi-Category Scoring
      if (targetUrl === baseUrl || !contacts.auditScore) {
        try {
          const finalUrl = response.url || targetUrl;
          const audit = auditWebsite(finalUrl, htmlText, $, response);
          contacts.auditScore = audit.overallScore;
          contacts.auditData = JSON.stringify(audit);
          contacts.auditResult = audit;
        } catch (e) {
          console.error('Audit failed for:', targetUrl, e);
        }
      }

      // 1. Tech Stack Detection
      const detectedStack = detectTechStack(htmlText, $);
      if (detectedStack && detectedStack !== 'Custom HTML / Standard') {
        if (!contacts.techStack || contacts.techStack === 'Custom HTML / Standard') {
          contacts.techStack = detectedStack;
          sourcesMap.techStack = {
            url: targetUrl,
            targetText: detectedStack,
            fragmentUrl: createTextFragmentUrl(targetUrl, detectedStack.split(' • ')[0])
          };
        }
      }

      // 2. Decision Maker Extraction
      const dm = extractDecisionMaker(htmlText, $);
      if (dm) {
        dm.split(', ').forEach(name => decisionMakersSet.add(name));
        if (!sourcesMap.decisionMaker) {
          sourcesMap.decisionMaker = {
            url: targetUrl,
            targetText: dm,
            fragmentUrl: createTextFragmentUrl(targetUrl, dm.split(', ')[0])
          };
        }
      }

      // 3. Email Extraction & Classification
      const matches = htmlText.match(EMAIL_REGEX) || [];
      for (const match of matches) {
        const cleanEmail = match.toLowerCase().trim();
        if (
          !cleanEmail.endsWith('.png') &&
          !cleanEmail.endsWith('.jpg') &&
          !cleanEmail.endsWith('.jpeg') &&
          !cleanEmail.endsWith('.svg') &&
          !cleanEmail.endsWith('.webp') &&
          !cleanEmail.includes('wixpress') &&
          !cleanEmail.includes('sentry') &&
          !cleanEmail.includes('example') &&
          !cleanEmail.includes('schema.org')
        ) {
          emailsSet.add(cleanEmail);
          if (!sourcesMap.email) {
            sourcesMap.email = {
              url: targetUrl,
              targetText: cleanEmail,
              fragmentUrl: createTextFragmentUrl(targetUrl, cleanEmail)
            };
          }

          const isGeneral = GENERAL_EMAIL_PREFIXES.some(prefix => cleanEmail.startsWith(prefix));
          if (!isGeneral) {
            directEmailsSet.add(cleanEmail);
            if (!sourcesMap.directEmail) {
              sourcesMap.directEmail = {
                url: targetUrl,
                targetText: cleanEmail,
                fragmentUrl: createTextFragmentUrl(targetUrl, cleanEmail)
              };
            }
          }
        }
      }

      // Check mailto: links
      $('a[href^="mailto:"]').each((_, el) => {
        const mailto = $(el).attr('href')?.replace(/^mailto:/i, '').split('?')[0].trim();
        if (mailto && mailto.includes('@')) {
          const cleanEmail = mailto.toLowerCase();
          emailsSet.add(cleanEmail);
          if (!sourcesMap.email) {
            sourcesMap.email = {
              url: targetUrl,
              targetText: cleanEmail,
              fragmentUrl: createTextFragmentUrl(targetUrl, cleanEmail)
            };
          }

          const isGeneral = GENERAL_EMAIL_PREFIXES.some(prefix => cleanEmail.startsWith(prefix));
          if (!isGeneral) {
            directEmailsSet.add(cleanEmail);
            if (!sourcesMap.directEmail) {
              sourcesMap.directEmail = {
                url: targetUrl,
                targetText: cleanEmail,
                fragmentUrl: createTextFragmentUrl(targetUrl, cleanEmail)
              };
            }
          }
        }
      });

      // 4. Phone Extraction & Mobile Direct Detection
      $('a[href^="tel:"]').each((_, el) => {
        const rawTel = $(el).attr('href')?.replace(/^tel:/i, '').split('?')[0].trim();
        if (rawTel) {
          const clean = rawTel.replace(/[^\d+()\s/-]/g, '').trim();
          const digits = clean.replace(/\D/g, '');
          if (digits.length >= 6) {
            phonesSet.add(clean);
            if (!sourcesMap.websitePhone) {
              sourcesMap.websitePhone = {
                url: targetUrl,
                targetText: clean,
                fragmentUrl: createTextFragmentUrl(targetUrl, clean)
              };
            }

            if (digits.startsWith('015') || digits.startsWith('016') || digits.startsWith('017') || digits.startsWith('4915') || digits.startsWith('4916') || digits.startsWith('4917')) {
              directPhonesSet.add(clean);
              if (!sourcesMap.directPhone) {
                sourcesMap.directPhone = {
                  url: targetUrl,
                  targetText: clean,
                  fragmentUrl: createTextFragmentUrl(targetUrl, clean)
                };
              }
            }
          }
        }
      });

      // Regex Phone Search on Text
      const textContent = $('body').text() || '';
      const phoneMatches = textContent.match(PHONE_REGEX) || [];
      for (const pMatch of phoneMatches) {
        const clean = pMatch.replace(/[^\d+()\s/-]/g, '').trim();
        const digits = clean.replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 16) {
          if (!cleanGmapsNorm || digits !== cleanGmapsNorm) {
            phonesSet.add(clean);
            if (!sourcesMap.websitePhone) {
              sourcesMap.websitePhone = {
                url: targetUrl,
                targetText: clean,
                fragmentUrl: createTextFragmentUrl(targetUrl, clean)
              };
            }

            if (digits.startsWith('015') || digits.startsWith('016') || digits.startsWith('017') || digits.startsWith('4915') || digits.startsWith('4916') || digits.startsWith('4917')) {
              directPhonesSet.add(clean);
              if (!sourcesMap.directPhone) {
                sourcesMap.directPhone = {
                  url: targetUrl,
                  targetText: clean,
                  fragmentUrl: createTextFragmentUrl(targetUrl, clean)
                };
              }
            }
          }
        }
      }

      // 5. Social Links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('facebook.com/') && !contacts.facebook) {
          contacts.facebook = href;
          sourcesMap.facebook = { url: targetUrl, targetText: href };
        }
        if (href.includes('instagram.com/') && !contacts.instagram) {
          contacts.instagram = href;
          sourcesMap.instagram = { url: targetUrl, targetText: href };
        }
        if ((href.includes('linkedin.com/company/') || href.includes('linkedin.com/in/')) && !contacts.linkedin) {
          contacts.linkedin = href;
          sourcesMap.linkedin = { url: targetUrl, targetText: href };
        }
      });

      return $;
    } catch {
      return null;
    }
  }

  // Step 1: Fetch Homepage First
  const homepage$ = await fetchAndParsePage(baseUrl);

  // Step 2: Dynamic Link Discovery from Homepage DOM
  if (homepage$ && !signal?.aborted) {
    const internalLinks = discoverInternalLinks(baseUrl, homepage$);

    if (internalLinks.length === 0) {
      internalLinks.push(`${baseUrl}/impressum`, `${baseUrl}/kontakt`);
    }

    await Promise.all(internalLinks.map(url => fetchAndParsePage(url)));
  }

  if (!contacts.techStack) {
    contacts.techStack = 'Custom HTML / Standard';
  }

  contacts.email = Array.from(emailsSet).slice(0, 3).join(', ');
  contacts.directEmail = Array.from(directEmailsSet).slice(0, 2).join(', ');
  contacts.websitePhone = Array.from(phonesSet).slice(0, 3).join(', ');
  contacts.directPhone = Array.from(directPhonesSet).slice(0, 2).join(', ');
  contacts.decisionMaker = Array.from(decisionMakersSet).join(', ');

  return contacts;
}

/**
 * Batched concurrent enrichment with dynamic worker pool
 */
export async function enrichWebsiteBatch<T extends { website?: string | null; phoneNumber?: string }>(
  items: T[],
  concurrency = 25,
  signal?: AbortSignal,
  onProgress?: (completed: number, total: number, latestEmail?: string, latestPhone?: string, latestDm?: string) => void,
  onEnrichedItem?: (enrichedItem: T & EnrichedContacts) => void
): Promise<(T & EnrichedContacts)[]> {
  const results: (T & EnrichedContacts)[] = [];
  let completed = 0;

  for (let i = 0; i < items.length; i += concurrency) {
    if (signal?.aborted) {
      console.log('⚠️ Enrichment aborted by user signal.');
      break;
    }

    const chunk = items.slice(i, i + concurrency);
    const enrichedChunk = await Promise.all(
      chunk.map(async (item) => {
        const contacts = item.website
          ? await enrichWebsite(item.website, item.phoneNumber, signal)
          : {
              email: '',
              directEmail: '',
              websitePhone: '',
              directPhone: '',
              decisionMaker: '',
              techStack: 'N/A (No Website)',
              facebook: '',
              instagram: '',
              linkedin: '',
              sources: {}
            };

        completed++;
        const enrichedItem = { ...item, ...contacts };

        if (onEnrichedItem) {
          onEnrichedItem(enrichedItem);
        }

        if (onProgress) {
          onProgress(
            completed,
            items.length,
            contacts.email || undefined,
            contacts.websitePhone || undefined,
            contacts.decisionMaker || undefined
          );
        }
        return enrichedItem;
      })
    );
    results.push(...enrichedChunk);
  }

  return results;
}
