import * as cheerio from 'cheerio';

export interface AuditSubScores {
  mobileUX: number;          // 0 - 100
  performance: number;       // 0 - 100
  securityDSGVO: number;     // 0 - 100
  localSEO: number;          // 0 - 100
  conversionLeads: number;   // 0 - 100
  techModernity: number;     // 0 - 100
}

export type BookingSystemType = 'third_party' | 'custom_calendar' | 'request_form' | 'general_contact' | 'none';

export interface BookingDetection {
  hasOnlineBooking: boolean;       // True if instant calendar OR request form exists
  hasInstantCalendar: boolean;     // True ONLY if real-time interactive calendar / slot picker is present
  hasRequestForm: boolean;         // True if inquiry form with date/time or "Terminanfrage" is present
  hasGeneralContactForm: boolean;  // True if standard contact form ("Kontakt / Kontaktformular") is present
  bookingProvider?: string;
  bookingType: BookingSystemType;
  details?: string;
}

export interface IndustryDetection {
  industryKey: 'gastro' | 'medizin' | 'handwerk' | 'beauty' | 'kanzlei' | 'fitness' | 'hotel' | 'ecommerce' | 'dienstleistung';
  industryLabel: string;
}

export interface LegalDSGVOAudit {
  hasHttps: boolean;
  hasImpressum: boolean;
  hasDatenschutz: boolean;
  hasCookieBanner: boolean;
  cookieBannerType: 'third_party' | 'custom' | 'none';
  cookieBannerProvider?: string;
  hasGoogleFontsExternal: boolean;
  hasExternalMaps: boolean;
  hasExternalVideos: boolean;
  hasTrackingWithoutConsent: boolean;
  hasFormConsentCheckbox: boolean;
  hasHrbNumber: boolean;
  hasUstId: boolean;
  hasGeschaeftsfuehrer: boolean;
}

export interface LocalSEOAudit {
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  titleLength: number;
  titleHasGeoKeyword: boolean;
  metaDescLength: number;
  hasFavicon: boolean;
  hasOgTags: boolean;
  hasOgImage: boolean;
  hasH1: boolean;
  h1Text: string;
  imagesWithoutAlt: number;
}

export interface WaaSMaintenanceAudit {
  cmsName: string;
  copyrightYear?: number;
  isCopyrightOutdated: boolean;
  pageWeightKb: number;
  scriptCount: number;
  cssCount: number;
  imageCount: number;
}

export interface AuditStats extends LegalDSGVOAudit, LocalSEOAudit, WaaSMaintenanceAudit {
  hasTelLink: boolean;
  hasMailtoLink: boolean;
  hasOnlineBooking: boolean;
  hasInstantCalendar: boolean;
  hasRequestForm: boolean;
  hasGeneralContactForm: boolean;
  bookingProvider?: string;
  bookingType: BookingSystemType;
  bookingDetails?: string;
  hasLiveChat: boolean;
  chatProvider?: string;
  hasContactForm: boolean;
  hasViewport: boolean;
  hasReviewsOrTrustBadges: boolean;
  hasHeroCta: boolean;
  industryKey: string;
  industryLabel: string;
  detectedFrameworks: string[];
}

export interface WebsiteAuditResult {
  overallScore: number; // 0 - 100
  scores: AuditSubScores;
  stats: AuditStats;
  problems: string[]; // List of exact issues found
  positiveHighlights: string[]; // Good things found
  pitchPoints: string[]; // Tailored for Website Redesign + Website-as-a-Service (WaaS)
}

/**
 * Smart Industry / Domain Classifier
 */
export function detectIndustry(htmlText: string, $: cheerio.CheerioAPI): IndustryDetection {
  const textLower = ($('body').text() + ' ' + ($('title').text() || '') + ' ' + ($('meta[name="description"]').attr('content') || '')).toLowerCase();

  const gastroKeywords = ['restaurant', 'café', 'cafe', 'bar', 'bistro', 'speisekarte', 'tisch', 'gerichte', 'küche', 'lieferservice', 'speisen', 'gaststätte', 'brasserie', 'pizzeria', 'trattoria', 'burger', 'sushi'];
  const medizinKeywords = ['praxis', 'arzt', 'zahnarzt', 'therapeut', 'medizin', 'patienten', 'behandlung', 'sprechstunde', 'krankenhaus', 'physiotherapie', 'dermatologie', 'augenarzt', 'orthopädie', 'heilpraktiker'];
  const handwerkKeywords = ['handwerk', 'maler', 'dachdecker', 'elektro', 'sanitär', 'heizung', 'schreiner', 'tischler', 'bau', 'installation', 'montage', 'zimmerei', 'fliesenleger', 'klimatechnik', 'schlosser'];
  const beautyKeywords = ['salon', 'friseur', 'frisör', 'kosmetik', 'massage', 'wellness', 'spa', 'nails', 'nagelstudio', 'barbier', 'barber', 'hair', 'beauty', 'haarschnitt', 'wimpern'];
  const kanzleiKeywords = ['rechtsanwalt', 'kanzlei', 'steuerberater', 'notar', 'anwalt', 'wirtschaftsprüfer', 'fachanwalt', 'strafrecht', 'arbeitsrecht', 'familienrecht', 'consulting'];
  const fitnessKeywords = ['fitness', 'gym', 'personal trainer', 'yoga', 'pilates', 'kampfsport', 'crossfit', 'tanzschule', 'fitnessstudio', 'workout'];
  const hotelKeywords = ['hotel', 'pension', 'ferienwohnung', 'zimmer', 'gastgeber', 'hostellerie', 'suite', 'übernachtung', 'unterkunft'];
  const ecommerceKeywords = ['warenkorb', 'shop', 'artikel', 'inkl. mwst', 'kasse', 'versandkosten', 'warenkorb anzeigen', 'produkt', 'bestellen'];

  function countMatches(keywords: string[]) {
    return keywords.reduce((count, kw) => count + (textLower.includes(kw) ? 1 : 0), 0);
  }

  const scores = [
    { key: 'gastro' as const, label: 'Gastronomie & Food', score: countMatches(gastroKeywords) },
    { key: 'medizin' as const, label: 'Arzt & Medizinische Praxis', score: countMatches(medizinKeywords) },
    { key: 'handwerk' as const, label: 'Handwerk & Bau', score: countMatches(handwerkKeywords) },
    { key: 'beauty' as const, label: 'Beauty, Frisör & Wellness', score: countMatches(beautyKeywords) },
    { key: 'kanzlei' as const, label: 'Kanzlei & Beratung', score: countMatches(kanzleiKeywords) },
    { key: 'fitness' as const, label: 'Fitness & Sport', score: countMatches(fitnessKeywords) },
    { key: 'hotel' as const, label: 'Hotel & Unterkunft', score: countMatches(hotelKeywords) },
    { key: 'ecommerce' as const, label: 'E-Commerce & Shop', score: countMatches(ecommerceKeywords) },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score >= 2) {
    return {
      industryKey: scores[0].key,
      industryLabel: scores[0].label
    };
  }

  return {
    industryKey: 'dienstleistung',
    industryLabel: 'Dienstleistungen & Gewerbe'
  };
}

/**
 * Smart Multi-Tier Booking System & Form Detector
 */
export function detectBookingSystem(htmlText: string, $: cheerio.CheerioAPI): BookingDetection {
  const htmlLower = htmlText.toLowerCase();

  // 1. Comprehensive Third-Party Booking Providers by Category
  const providers: { name: string; category: string; keywords: string[] }[] = [
    { name: 'Calendly', category: 'General', keywords: ['calendly.com'] },
    { name: 'Doctolib', category: 'Praxis/Medizin', keywords: ['doctolib'] },
    { name: 'Jameda', category: 'Praxis/Medizin', keywords: ['jameda.de', 'jameda-button'] },
    { name: 'Typeform', category: 'General', keywords: ['typeform.com'] },
    { name: 'Timify', category: 'General', keywords: ['timify.com', 'timify-button'] },
    { name: 'SimplyBook', category: 'General', keywords: ['simplybook.me', 'simplybook.it'] },
    { name: 'Shore', category: 'General/Gastro', keywords: ['shore.com', 'shore-booking'] },
    { name: 'eTermin', category: 'General/DE', keywords: ['etermin.net'] },
    { name: 'Acuity Scheduling', category: 'General', keywords: ['acuityscheduling.com'] },
    { name: 'SuperSaaS', category: 'General', keywords: ['supersaas.de', 'supersaas.com'] },
    { name: 'YouCanBook.me', category: 'General', keywords: ['youcanbook.me'] },
    { name: 'Picktime', category: 'General', keywords: ['picktime.com'] },
    { name: 'Reservio', category: 'General', keywords: ['reservio.com'] },
    { name: 'Setmore', category: 'General', keywords: ['setmore.com'] },
    { name: 'Cal.com', category: 'General', keywords: ['cal.com', 'app.cal.com'] },

    { name: 'OpenTable', category: 'Gastro', keywords: ['opentable.de', 'opentable.com'] },
    { name: 'ResMio', category: 'Gastro', keywords: ['resmio.com', 'resmio-widget'] },
    { name: 'Formitable', category: 'Gastro', keywords: ['formitable.com'] },
    { name: '7Rooms', category: 'Gastro', keywords: ['sevenrooms.com'] },
    { name: 'CentralPlanner', category: 'Gastro', keywords: ['centralplanner.de'] },
    { name: 'EatBu / DISHO', category: 'Gastro', keywords: ['eatbu.com', 'dish.co'] },
    { name: 'Bookatable / TheFork', category: 'Gastro', keywords: ['bookatable.com', 'thefork.de', 'tf-booking'] },
    { name: 'CoverManager', category: 'Gastro', keywords: ['covermanager.com'] },
    { name: 'WhenIHaveTime', category: 'Gastro', keywords: ['whenihavetime.com'] },

    { name: 'Treatwell', category: 'Beauty', keywords: ['treatwell.de', 'treatwell.com'] },
    { name: 'Booksy', category: 'Beauty', keywords: ['booksy.com'] },
    { name: 'Phorest', category: 'Beauty', keywords: ['phorest.com'] },
    { name: 'Planity', category: 'Beauty', keywords: ['planity.com'] },
    { name: 'Fresha', category: 'Beauty', keywords: ['fresha.com', 'shedul.com'] },
    { name: 'Salonkee', category: 'Beauty', keywords: ['salonkee.de', 'salonkee.com'] },

    { name: 'Eversports', category: 'Fitness', keywords: ['eversports.de', 'eversports.at'] },
    { name: 'Fitogram', category: 'Fitness', keywords: ['fitogram.pro'] },
    { name: 'Mindbody', category: 'Fitness', keywords: ['mindbodyonline.com'] },
    { name: 'Urban Sports Club', category: 'Fitness', keywords: ['urbansportsclub.com'] },

    { name: 'Seekda / Dirs21', category: 'Hotel', keywords: ['seekda.com', 'dirs21.de'] },
    { name: 'SiteMinder', category: 'Hotel', keywords: ['siteminder.com'] },
    { name: 'Cloudbeds', category: 'Hotel', keywords: ['cloudbeds.com'] },
    { name: 'Smoobu', category: 'Hotel', keywords: ['smoobu.com'] },

    { name: 'Meisterabsatz / Hero', category: 'Handwerk', keywords: ['meisterabsatz.de', 'herosoftware.de'] }
  ];

  for (const p of providers) {
    if (p.keywords.some(kw => htmlLower.includes(kw))) {
      return {
        hasOnlineBooking: true,
        hasInstantCalendar: true,
        hasRequestForm: false,
        hasGeneralContactForm: false,
        bookingProvider: `${p.name} (${p.category})`,
        bookingType: 'third_party',
        details: `Integrierter Drittanbieter für Online-Termine / Reservierungen (${p.name})`
      };
    }
  }

  // 2. Custom Interactive Calendar / Datepicker
  const hasDatePickerInput = $('input[type="date"], input[name*="date"], input[name*="termin"], input[name*="booking"], input[id*="datepicker"], input[class*="datepicker"], input[class*="calendar"]').length > 0;
  const hasInteractiveCalendarWidget = $('div[class*="calendar"], div[id*="calendar"], iframe[src*="booking"], iframe[src*="termin"], iframe[src*="reservier"]').length > 0;

  const hasReservationForm = $('form').filter((_, form) => {
    const action = ($(form).attr('action') || '').toLowerCase();
    const id = ($(form).attr('id') || '').toLowerCase();
    const cls = ($(form).attr('class') || '').toLowerCase();
    const html = $(form).html()?.toLowerCase() || '';

    return action.includes('reservier') || action.includes('booking') || action.includes('tisch') ||
           id.includes('reservier') || id.includes('booking') || id.includes('tisch') ||
           cls.includes('reservier') || cls.includes('booking') || cls.includes('tisch') ||
           (html.includes('uhrzeit') && (html.includes('person') || html.includes('gäste') || html.includes('gaeste')));
  }).length > 0;

  if (hasDatePickerInput || hasInteractiveCalendarWidget || hasReservationForm) {
    return {
      hasOnlineBooking: true,
      hasInstantCalendar: true,
      hasRequestForm: false,
      hasGeneralContactForm: false,
      bookingProvider: 'Interaktives Buchungs- / Kalendermodul',
      bookingType: 'custom_calendar',
      details: 'Individuell programmiertes Online-Reservierungs- / Buchungsmodul mit Kalenderauswahl'
    };
  }

  // 3. Request Form / "Terminanfrage" vs General Contact Form
  const allForms = $('form');
  let isRequestForm = false;
  let isGeneralContact = false;

  if (allForms.length > 0) {
    allForms.each((_, form) => {
      const formHtml = $(form).html()?.toLowerCase() || '';
      const formText = $(form).text().toLowerCase();
      const formAction = ($(form).attr('action') || '').toLowerCase();
      const formId = ($(form).attr('id') || '').toLowerCase();
      const formClass = ($(form).attr('class') || '').toLowerCase();

      const isFormInquiry = formText.includes('termin') || formText.includes('anfrage') || formText.includes('wunschtermin') ||
                            formText.includes('angebot') || formText.includes('nachricht') || formText.includes('jetzt anfragen') ||
                            formAction.includes('anfrage') || formId.includes('anfrage') || formClass.includes('anfrage') ||
                            formAction.includes('contact') || formAction.includes('kontakt') ||
                            formHtml.includes('input') || formHtml.includes('textarea');

      if (isFormInquiry) {
        if (formText.includes('termin') || formText.includes('wunschtermin') || formText.includes('datum') || formText.includes('uhrzeit') || formAction.includes('termin')) {
          isRequestForm = true;
        } else {
          isGeneralContact = true;
        }
      }
    });
  }

  const hasEmbeddedForm = $('iframe[src*="form"], iframe[src*="typeform"], iframe[src*="hubspot"], iframe[src*="jotform"], div[class*="wpforms"], div[class*="cf7"], div[class*="gform"]').length > 0;
  if (hasEmbeddedForm) {
    isGeneralContact = true;
  }

  const hasContactFormMarkers = htmlLower.includes('kontaktformular') || htmlLower.includes('anfrageformular') || htmlLower.includes('schreiben sie uns') || htmlLower.includes('nachricht senden');
  if (hasContactFormMarkers && allForms.length > 0) {
    isGeneralContact = true;
  }

  if (isRequestForm) {
    return {
      hasOnlineBooking: true,
      hasInstantCalendar: false,
      hasRequestForm: true,
      hasGeneralContactForm: true,
      bookingProvider: 'Online-Terminanfrage (Formular)',
      bookingType: 'request_form',
      details: 'Website besitzt ein Formular für Terminanfragen ("Wunschtermin / Anfrage"), jedoch ohne sofortige Live-Kalender-Bestätigung'
    };
  }

  if (isGeneralContact || (allForms.length > 0 && $('input, textarea').length > 0)) {
    return {
      hasOnlineBooking: false,
      hasInstantCalendar: false,
      hasRequestForm: false,
      hasGeneralContactForm: true,
      bookingProvider: 'Standard Kontaktformular ("Kontakt")',
      bookingType: 'general_contact',
      details: 'Standard-Kontaktformular ("Kontakt / Formular") vorhanden, aber kein spezialisiertes Termin- oder Reservierungsmodul'
    };
  }

  const hasContactPageLinks = $('a[href*="kontakt"], a[href*="contact"], a[href*="anfrage"]').length > 0;
  if (hasContactPageLinks) {
    return {
      hasOnlineBooking: false,
      hasInstantCalendar: false,
      hasRequestForm: false,
      hasGeneralContactForm: true,
      bookingProvider: 'Kontaktseite vorhanden (/kontakt)',
      bookingType: 'general_contact',
      details: 'Verlinkung zu einer Kontaktseite auf der Website vorhanden'
    };
  }

  return {
    hasOnlineBooking: false,
    hasInstantCalendar: false,
    hasRequestForm: false,
    hasGeneralContactForm: false,
    bookingType: 'none',
    details: 'Weder Kontaktformular noch Online-Terminbuchung / Reservierungsmöglichkeit auf der Website gefunden'
  };
}

/**
 * Deep Legal, DSGVO & Abmahn-Risiko Auditor
 */
export function auditLegalDSGVO(htmlText: string, $: cheerio.CheerioAPI, isHttps: boolean): LegalDSGVOAudit {
  const htmlLower = htmlText.toLowerCase();

  // 1. Third-Party Cookie Consent Managers
  let cookieBannerProvider: string | undefined = undefined;
  if (htmlLower.includes('usercentrics')) cookieBannerProvider = 'Usercentrics';
  else if (htmlLower.includes('cookiebot')) cookieBannerProvider = 'Cookiebot';
  else if (htmlLower.includes('borlabs-cookie')) cookieBannerProvider = 'Borlabs Cookie';
  else if (htmlLower.includes('ccm19')) cookieBannerProvider = 'CCM19';
  else if (htmlLower.includes('real-cookie-banner')) cookieBannerProvider = 'Real Cookie Banner';
  else if (htmlLower.includes('complianz')) cookieBannerProvider = 'Complianz';
  else if (htmlLower.includes('onetrust')) cookieBannerProvider = 'OneTrust';
  else if (htmlLower.includes('cookiefirst')) cookieBannerProvider = 'CookieFirst';
  else if (htmlLower.includes('klaro')) cookieBannerProvider = 'Klaro';

  // 2. Custom Cookie Banner / Overlay Detection
  const hasCustomCookieBanner = $('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], [class*="dsgvo"], [id*="dsgvo"]').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return (text.includes('cookie') || text.includes('datenschutz') || text.includes('einwilligung')) &&
           (text.includes('akzeptieren') || text.includes('zustimmen') || text.includes('einstellungen') || text.includes('ablehnen'));
  }).length > 0;

  const hasCookieBanner = Boolean(cookieBannerProvider) || hasCustomCookieBanner;
  const cookieBannerType: 'third_party' | 'custom' | 'none' = cookieBannerProvider ? 'third_party' : (hasCustomCookieBanner ? 'custom' : 'none');

  // 3. External Third-Party Unconsented Assets
  const hasGoogleFontsExternal = htmlLower.includes('fonts.googleapis.com') || htmlLower.includes('fonts.gstatic.com');
  const hasExternalMaps = htmlLower.includes('maps.google.com') || htmlLower.includes('maps.googleapis.com');
  const hasExternalVideos = htmlLower.includes('youtube.com/embed') || htmlLower.includes('player.vimeo.com');

  // 4. Tracking Scripts without consent check
  const hasTrackingWithoutConsent = (
    htmlLower.includes('googletagmanager.com/gtag') ||
    htmlLower.includes('connect.facebook.net/de_de/fbevents.js') ||
    htmlLower.includes('static.hotjar.com') ||
    htmlLower.includes('analytics.tiktok.com')
  ) && !hasCookieBanner;

  // 5. Impressum & Datenschutz Links
  const hasImpressum = $('a[href*="impressum"]').length > 0 || htmlLower.includes('impressum');
  const hasDatenschutz = $('a[href*="datenschutz"], a[href*="privacy"]').length > 0 || htmlLower.includes('datenschutz');

  // 6. Impressum Completeness (HRB, USt-ID, Vertretung)
  const bodyText = $('body').text() || '';
  const hasHrbNumber = /hrb\s*\d+|hra\s*\d+|handelsregister/i.test(bodyText);
  const hasUstId = /ust-id|ust.-id|de\d{9}/i.test(bodyText);
  const hasGeschaeftsfuehrer = /geschäftsführer|inhaber|vorstand|vertreten durch/i.test(bodyText);

  // 7. Form Consent Opt-In Checkbox
  const hasFormConsentCheckbox = $('input[type="checkbox"]').filter((_, el) => {
    const name = ($(el).attr('name') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    const parentText = $(el).parent().text().toLowerCase();
    return name.includes('privacy') || name.includes('dsgvo') || name.includes('datenschutz') ||
           id.includes('privacy') || id.includes('dsgvo') || id.includes('datenschutz') ||
           parentText.includes('datenschutz') || parentText.includes('privatsphäre');
  }).length > 0;

  return {
    hasHttps: isHttps,
    hasImpressum,
    hasDatenschutz,
    hasCookieBanner,
    cookieBannerType,
    cookieBannerProvider: cookieBannerProvider || (hasCustomCookieBanner ? 'Custom Cookie Banner' : undefined),
    hasGoogleFontsExternal,
    hasExternalMaps,
    hasExternalVideos,
    hasTrackingWithoutConsent,
    hasFormConsentCheckbox,
    hasHrbNumber,
    hasUstId,
    hasGeschaeftsfuehrer
  };
}

/**
 * Deep Local SEO, SERP Snippet & Schema.org Auditor
 */
export function auditLocalSEO(htmlText: string, $: cheerio.CheerioAPI): LocalSEOAudit {
  const htmlLower = htmlText.toLowerCase();

  // 1. Schema.org Structured Data
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html() || '';
      if (content.includes('LocalBusiness')) schemaTypes.push('LocalBusiness');
      if (content.includes('Restaurant')) schemaTypes.push('Restaurant');
      if (content.includes('MedicalBusiness') || content.includes('Physiotherapy') || content.includes('Dentist')) schemaTypes.push('MedicalBusiness');
      if (content.includes('Organization')) schemaTypes.push('Organization');
      if (content.includes('AutomotiveBusiness')) schemaTypes.push('AutomotiveBusiness');
      if (content.includes('BeautySalon') || content.includes('HairSalon')) schemaTypes.push('BeautySalon');
      if (content.includes('LegalService')) schemaTypes.push('LegalService');
    } catch {
      // Ignore JSON parse errors
    }
  });

  const hasSchemaOrg = schemaTypes.length > 0 || htmlLower.includes('itemtype="http://schema.org');

  // 2. Title & Meta Description SERP Checks
  const titleText = $('title').text().trim();
  const titleLength = titleText.length;
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  const metaDescLength = metaDesc.length;

  const geoKeywords = ['münchen', 'berlin', 'hamburg', 'köln', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig', 'bremen', 'dresden', 'hannover', 'nürnberg', 'duisburg', 'bochum', 'wuppertal', 'bielefeld', 'bonn', 'münster'];
  const titleHasGeoKeyword = geoKeywords.some(city => titleText.toLowerCase().includes(city));

  // 3. Favicon & Apple Touch Icons
  const hasFavicon = $('link[rel*="icon"]').length > 0;

  // 4. OpenGraph Cards
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const hasOgTags = Boolean(ogTitle);
  const hasOgImage = Boolean(ogImage);

  // 5. H1 Analysis
  const h1El = $('h1').first();
  const hasH1 = $('h1').length >= 1;
  const h1Text = h1El.text().trim();

  // 6. Missing Image Alt Tags
  let imagesWithoutAlt = 0;
  $('img').each((_, img) => {
    const alt = $(img).attr('alt');
    if (!alt || !alt.trim()) imagesWithoutAlt++;
  });

  return {
    hasSchemaOrg,
    schemaTypes: Array.from(new Set(schemaTypes)),
    titleLength,
    titleHasGeoKeyword,
    metaDescLength,
    hasFavicon,
    hasOgTags,
    hasOgImage,
    hasH1,
    h1Text,
    imagesWithoutAlt
  };
}

/**
 * Flexible & Bulletproof Copyright Year Extractor
 * Focuses on footer DOM elements & visible text.
 * Correctly handles ranges (e.g. "2006-2021" -> 2021), "(C) 2026", "(C) Company 2026", etc.
 */
export function extractCopyrightYear($: cheerio.CheerioAPI, htmlText: string): number | undefined {
  // 1. Target footer elements first, or fallback to bottom body text
  let targetText = '';
  const footerEls = $('footer, [class*="footer"], [id*="footer"], [class*="copyright"], [id*="copyright"], [class*="bottom"], [id*="bottom"]');

  if (footerEls.length > 0) {
    targetText = footerEls.text();
  }

  if (!targetText || targetText.length < 10) {
    const fullBodyText = $('body').text() || '';
    targetText = fullBodyText.length > 1000 ? fullBodyText.slice(-1500) : fullBodyText;
  }

  const currentYear = new Date().getFullYear();
  const candidateYears: number[] = [];

  // Match copyright blocks in text
  const copyrightBlockRegex = /(?:©|&copy;|\(c\)|copyright|alle rechte vorbehalten|all rights reserved)[\s\S]{0,120}?(?=(?:\r?\n\r?\n|<br|<p|$))/gi;

  let match;
  while ((match = copyrightBlockRegex.exec(targetText)) !== null) {
    const block = match[0];
    const yearMatches = block.match(/\b(199\d|20[0-2]\d)\b/g);
    if (yearMatches) {
      for (const yStr of yearMatches) {
        const y = parseInt(yStr, 10);
        if (y >= 1995 && y <= currentYear + 1) {
          candidateYears.push(y);
        }
      }
    }
  }

  // Fallback: If no copyright block was found, search targetText for any 20XX years
  if (candidateYears.length === 0 && targetText) {
    const yearMatches = targetText.match(/\b(20[0-2]\d)\b/g);
    if (yearMatches) {
      for (const yStr of yearMatches) {
        const y = parseInt(yStr, 10);
        if (y >= 1995 && y <= currentYear + 1) {
          candidateYears.push(y);
        }
      }
    }
  }

  if (candidateYears.length > 0) {
    // Return the HIGHEST (most recent) year found in the copyright text!
    return Math.max(...candidateYears);
  }

  return undefined;
}

/**
 * WaaS Maintenance, Freshness & Performance Auditor
 */
export function auditWaaSMaintenance(htmlText: string, $: cheerio.CheerioAPI): WaaSMaintenanceAudit {
  const htmlLower = htmlText.toLowerCase();
  const pageWeightKb = Math.round(Buffer.byteLength(htmlText, 'utf8') / 1024);
  const scriptCount = $('script').length;
  const cssCount = $('link[rel="stylesheet"]').length;
  const imageCount = $('img').length;

  // 1. CMS & Website Builder Fingerprint
  let cmsName = 'Eigenentwicklung / Custom HTML';
  const metaGen = $('meta[name="generator"]').attr('content')?.toLowerCase() || '';

  if (htmlLower.includes('framerstatic.com') || htmlLower.includes('framerusercontent.com')) {
    cmsName = 'Framer';
  } else if (htmlLower.includes('webflow.com') || htmlLower.includes('webflow.css')) {
    cmsName = 'Webflow';
  } else if (htmlLower.includes('/wp-content/') || metaGen.includes('wordpress')) {
    cmsName = 'WordPress';
    if (htmlLower.includes('elementor')) cmsName = 'WordPress (Elementor)';
    if (htmlLower.includes('divi')) cmsName = 'WordPress (Divi)';
    if (htmlLower.includes('wpbakery') || htmlLower.includes('js_composer')) cmsName = 'WordPress (WPBakery)';
  } else if (htmlLower.includes('wix.com') || metaGen.includes('wix')) {
    cmsName = 'Wix';
  } else if (htmlLower.includes('squarespace.com')) {
    cmsName = 'Squarespace';
  } else if (htmlLower.includes('shopify')) {
    cmsName = 'Shopify';
  } else if (htmlLower.includes('shopware')) {
    cmsName = 'Shopware';
  } else if (htmlLower.includes('typo3') || metaGen.includes('typo3')) {
    cmsName = 'TYPO3 (Legacy)';
  } else if (htmlLower.includes('jimdo.com')) {
    cmsName = 'Jimdo Baukasten';
  } else if (htmlLower.includes('joomla') || metaGen.includes('joomla')) {
    cmsName = 'Joomla (Legacy)';
  } else if (htmlLower.includes('ionos') || htmlLower.includes('1and1') || htmlLower.includes('mywebsite')) {
    cmsName = 'Ionos / 1&1 MyWebsite';
  } else if (htmlLower.includes('strato')) {
    cmsName = 'Strato Homepage-Baukasten';
  }

  // 2. Flexible & Bulletproof Copyright Freshness Detection
  const copyrightYear = extractCopyrightYear($, htmlText);
  const currentYear = new Date().getFullYear();
  const isCopyrightOutdated = Boolean(copyrightYear && copyrightYear < currentYear - 1);

  return {
    cmsName,
    copyrightYear,
    isCopyrightOutdated,
    pageWeightKb,
    scriptCount,
    cssCount,
    imageCount
  };
}

/**
 * 100% Free Comprehensive Website Audit & Multi-Category Scoring Engine
 */
export function auditWebsite(
  url: string,
  htmlText: string,
  $: cheerio.CheerioAPI,
  response?: Response
): WebsiteAuditResult {
  const urlLower = url.toLowerCase();
  const canonicalHref = ($('link[rel="canonical"]').attr('href') || '').toLowerCase();
  const hasHsts = response?.headers.get('strict-transport-security') ? true : false;

  const isHttps = urlLower.startsWith('https://') || canonicalHref.startsWith('https://') || hasHsts;
  const htmlLower = htmlText.toLowerCase();

  // Run Sub-Auditors
  const industryInfo = detectIndustry(htmlText, $);
  const bookingInfo = detectBookingSystem(htmlText, $);
  const legalAudit = auditLegalDSGVO(htmlText, $, isHttps);
  const localSeoAudit = auditLocalSEO(htmlText, $);
  const waasAudit = auditWaaSMaintenance(htmlText, $);

  // Mobile UX
  const viewportAttr = $('meta[name="viewport"]').attr('content') || '';
  const hasViewport = viewportAttr.includes('width=device-width');
  const telLinks = $('a[href^="tel:"]');
  const hasTelLink = telLinks.length > 0;
  const mailtoLinks = $('a[href^="mailto:"]');
  const hasMailtoLink = mailtoLinks.length > 0;

  let mobileUXScore = 40;
  if (hasViewport) mobileUXScore += 35;
  if (hasTelLink) mobileUXScore += 25;

  // Performance
  let performanceScore = 100;
  if (waasAudit.pageWeightKb > 500) performanceScore -= 15;
  if (waasAudit.pageWeightKb > 1500) performanceScore -= 20;
  if (waasAudit.scriptCount > 20) performanceScore -= 15;
  if (waasAudit.cssCount > 10) performanceScore -= 10;
  if (localSeoAudit.imagesWithoutAlt > 5) performanceScore -= 10;
  performanceScore = Math.max(10, performanceScore);

  // Security & DSGVO
  let securityDSGVO = 10;
  if (legalAudit.hasHttps) securityDSGVO += 30;
  if (legalAudit.hasImpressum) securityDSGVO += 15;
  if (legalAudit.hasDatenschutz) securityDSGVO += 15;
  if (legalAudit.hasCookieBanner) securityDSGVO += 15;
  if (legalAudit.hasGoogleFontsExternal && !legalAudit.hasCookieBanner) securityDSGVO -= 15;
  if (legalAudit.hasTrackingWithoutConsent) securityDSGVO -= 10;
  if (legalAudit.hasHrbNumber || legalAudit.hasUstId) securityDSGVO += 15;
  securityDSGVO = Math.max(10, Math.min(100, securityDSGVO));

  // Local SEO
  let localSEO = 10;
  if (localSeoAudit.titleLength > 0) localSEO += 20;
  if (localSeoAudit.metaDescLength > 0) localSEO += 25;
  if (localSeoAudit.hasH1) localSEO += 15;
  if (localSeoAudit.hasOgTags) localSEO += 10;
  if (localSeoAudit.hasSchemaOrg) localSEO += 20;
  localSEO = Math.max(10, Math.min(100, localSEO));

  // Conversion
  let chatProvider: string | undefined = undefined;
  if (htmlLower.includes('userlike')) chatProvider = 'Userlike';
  else if (htmlLower.includes('intercom')) chatProvider = 'Intercom';
  else if (htmlLower.includes('tawk.to')) chatProvider = 'Tawk.to';
  else if (htmlLower.includes('crisp.chat')) chatProvider = 'Crisp';
  else if (htmlLower.includes('wa.me') || htmlLower.includes('api.whatsapp.com')) chatProvider = 'WhatsApp Widget';

  const hasLiveChat = Boolean(chatProvider);
  const hasReviewsOrTrustBadges = htmlLower.includes('kundenstimmen') || htmlLower.includes('bewertung') ||
                                  htmlLower.includes('testimonial') || htmlLower.includes('provenexpert') ||
                                  htmlLower.includes('trustpilot') || htmlLower.includes('google bewertung') ||
                                  htmlLower.includes('erfahrungen') || $('[class*="review"], [class*="testimonial"]').length > 0;

  const hasHeroCta = $('a[href*="kontakt"], a[href*="termin"], a[href*="anfrage"], a[href^="tel:"], button').length > 0;

  let conversionLeads = 10;
  if (hasTelLink) conversionLeads += 15;
  if (bookingInfo.bookingType === 'third_party' || bookingInfo.bookingType === 'custom_calendar') conversionLeads += 30;
  else if (bookingInfo.bookingType === 'request_form') conversionLeads += 20;
  else if (bookingInfo.bookingType === 'general_contact') conversionLeads += 10;
  if (hasLiveChat) conversionLeads += 15;
  if (hasReviewsOrTrustBadges) conversionLeads += 10;
  if (hasHeroCta) conversionLeads += 10;
  conversionLeads = Math.max(10, Math.min(100, conversionLeads));

  // Tech Modernity
  let techModernity = 70;
  const detectedFrameworks: string[] = [];
  if (htmlLower.includes('react') || htmlLower.includes('_next/')) detectedFrameworks.push('React / Next.js');
  if (htmlLower.includes('vue') || htmlLower.includes('_nuxt/')) detectedFrameworks.push('Vue / Nuxt');
  if (htmlLower.includes('tailwind')) detectedFrameworks.push('Tailwind CSS');
  if (htmlLower.includes('bootstrap')) detectedFrameworks.push('Bootstrap');

  if (waasAudit.cmsName.includes('Jimdo') || waasAudit.cmsName.includes('TYPO3') || waasAudit.cmsName.includes('Joomla') || waasAudit.cmsName.includes('Ionos') || waasAudit.cmsName.includes('Strato')) {
    techModernity -= 25;
  }
  if (waasAudit.isCopyrightOutdated) techModernity -= 15;

  techModernity = Math.max(10, Math.min(100, techModernity));

  // Overall Weighted Health Score
  const overallScore = Math.round(
    mobileUXScore * 0.20 +
    securityDSGVO * 0.20 +
    conversionLeads * 0.25 +
    localSEO * 0.15 +
    performanceScore * 0.10 +
    techModernity * 0.10
  );

  // Collect Problems, Positive Highlights & WaaS Redesign Pitch Points
  const problems: string[] = [];
  const positiveHighlights: string[] = [];
  const pitchPoints: string[] = [];

  // Security & DSGVO
  if (!isHttps) {
    problems.push('❌ Keine HTTPS-Verschlüsselung (Unverschlüsseltes HTTP — Browser zeigt "Nicht sicher")');
    pitchPoints.push('Ihre Website läuft unverschlüsselt über HTTP. Besucher sehen sofort den Hinweis "Nicht sicher", was Vertrauen zerstört.');
  } else {
    positiveHighlights.push('Sichere HTTPS-Verschlüsselung aktiv');
  }

  if (legalAudit.hasGoogleFontsExternal && !legalAudit.hasCookieBanner) {
    problems.push('⚠️ Externe Google Fonts ohne erkannte DSGVO-Einwilligung geladen');
    pitchPoints.push('Ihre Website lädt Schriften direkt von US-Google-Servern. Ohne Consent-Banner birgt das in Deutschland DSGVO-Abmahnrisiken — bei unserem Relaunch binden wir Schriften 100% DSGVO-konform lokal ein.');
  }

  if (legalAudit.hasTrackingWithoutConsent) {
    problems.push('⚠️ Tracking-Skripte (Google/Meta) laden vor der Cookie-Einwilligung');
  }

  // Mobile UX
  if (!hasTelLink) {
    problems.push('❌ Keine direkte 1-Klick Anruf-Funktion auf Smartphones (tel: Link fehlt)');
    pitchPoints.push('Auf Smartphones gibt es keinen direkten Anruf-Button. Mobile Interessenten müssen die Telefonnummer mühsam kopieren.');
  } else {
    positiveHighlights.push('1-Klick Anrufbutton für mobile Anrufe vorhanden');
  }

  // Smart Industry-Aware Booking & Form Pitch Points
  if (bookingInfo.bookingType === 'third_party' || bookingInfo.bookingType === 'custom_calendar') {
    positiveHighlights.push(`Automatisierte Live-Terminbuchung aktiv (${bookingInfo.bookingProvider})`);
  } else if (bookingInfo.bookingType === 'request_form') {
    positiveHighlights.push('Online-Terminanfrage per Formular möglich');
    problems.push('⚠️ Keine direkte Live-Kalender-Buchung (Nur manuelle Terminanfrage per Formular)');

    if (industryInfo.industryKey === 'gastro') {
      pitchPoints.push('Gäste können eine Reservierungsanfrage senden, aber Tische nicht direkt live buchen. Ein automatisierter Tisch-Kalender entlastet das Servicepersonal in Stoßzeiten.');
    } else if (industryInfo.industryKey === 'medizin') {
      pitchPoints.push('Patienten können eine Terminanfrage senden, müssen aber auf Rückruf warten. Ein Live-Kalender würde Terminabsprachen am Telefon deutlich reduzieren.');
    } else if (industryInfo.industryKey === 'beauty') {
      pitchPoints.push('Kunden können Termine nur anfragen, aber freie Zeiten nicht sofort sehen. Spontane Buchungen außerhalb der Öffnungszeiten gehen so verloren.');
    } else {
      pitchPoints.push('Es ist ein Anfrageformular vorhanden, aber keine Live-Terminbuchung. Neukunden erwarten heute eine sofortige Bestätigung im Kalender — sonst fragen sie parallel bei der Konkurrenz an.');
    }
  } else if (bookingInfo.bookingType === 'general_contact') {
    positiveHighlights.push('Kontaktformular ("Kontakt / Kontaktformular") vorhanden');
    problems.push('❌ Keine Online-Terminbuchung oder Anfrage-Funktion (Nur allgemeines Kontaktformular)');

    if (industryInfo.industryKey === 'gastro') {
      pitchPoints.push('Ihre Website hat ein einfaches Kontaktformular, aber kein spezielles Tisch-Reservierungssystem. Gäste erwarten eine schnelle digitale Tischbuchung.');
    } else if (industryInfo.industryKey === 'medizin') {
      pitchPoints.push('Ihre Website hat ein allgemeines Kontaktformular ("Kontakt"), aber kein Patienten-Terminbuchungssystem. Patienten weichen bei vollen Telefonleitungen zur Konkurrenz aus.');
    } else if (industryInfo.industryKey === 'beauty') {
      pitchPoints.push('Sie nutzen ein Standard-Kontaktformular. Für Friseur- und Beauty-Kunden ist ein interaktiver Termin-Kalender jedoch der wichtigste Erfolgsfaktor auf der Website.');
    } else {
      pitchPoints.push('Ihre Website hat ein allgemeines Kontaktformular ("Kontakt"), aber keine gezielte Terminbuchungs-Funktion. Interessenten, die abends schnell einen Termin vereinbaren wollen, springen oft ab.');
    }
  } else {
    problems.push('❌ Weder Kontaktformular noch Online-Terminbuchung vorhanden');
    pitchPoints.push('Auf der Website gibt es weder ein Kontaktformular noch ein Buchungssystem. Neukunden können nur per Anruf oder E-Mail anfragen — das führt auf Smartphones zu hohen Abbruchquoten.');
  }

  // Local SEO & Schema.org
  if (!localSeoAudit.hasSchemaOrg) {
    problems.push('⚠️ Keine strukturierten Unternehmensdaten (Schema.org / LocalBusiness fehlt)');
    pitchPoints.push('Es fehlen strukturierte Daten (Schema.org) für Google. Dadurch versteht Google Adresse und Öffnungszeiten nicht optimal, was Sie wertvolle Ranking-Plätze in den lokalen Google Maps Ergebnissen kostet.');
  } else {
    positiveHighlights.push(`Strukturierte Schema.org Unternehmensdaten vorhanden (${localSeoAudit.schemaTypes.join(', ') || 'LocalBusiness'})`);
  }

  if (!localSeoAudit.hasOgImage) {
    problems.push('⚠️ Fehlen von OpenGraph Vorschaubildern (Links werden in WhatsApp/Social Media ohne Vorschau angezeigt)');
  }

  if (!localSeoAudit.hasFavicon) {
    problems.push('⚠️ Kein Favicon vorhanden (Wird in Google Suchergebnissen mit einem grauen Standard-Icon angezeigt)');
  }

  // Social Proof
  if (!hasReviewsOrTrustBadges) {
    problems.push('⚠️ Keine sichtbar platzierten Kundenbewertungen oder Vertrauenssiegel auf der Startseite');
    pitchPoints.push('Auf der Startseite fehlen sichtbare Kundenstimmen oder Vertrauensnachweise (Testimonials). Das verringert die Umwandlungsrate von Website-Besuchern.');
  } else {
    positiveHighlights.push('Kundenbewertungen / Testimonials vorhanden');
  }

  // WaaS & Copyright Maintenance Pitch
  if (waasAudit.isCopyrightOutdated && waasAudit.copyrightYear) {
    problems.push(`⚠️ Veraltete Website-Inhalte / Copyright noch auf Stand [${waasAudit.copyrightYear}]`);
    pitchPoints.push(`Ihre Website zeigt im Copyright noch das Jahr ${waasAudit.copyrightYear}. Das wirkt auf Besucher veraltet — mit unserem Website-as-a-Service Modell bleibt Ihre Website automatisch immer auf dem neuesten Stand.`);
  }

  if (waasAudit.cmsName.includes('Jimdo') || waasAudit.cmsName.includes('TYPO3') || waasAudit.cmsName.includes('Joomla') || waasAudit.cmsName.includes('Ionos') || waasAudit.cmsName.includes('Strato')) {
    problems.push(`⚠️ Veraltetes / Unflexibles Baukasten-System (${waasAudit.cmsName})`);
    pitchPoints.push(`Ihre Website basiert auf einem unskalierbaren Baukasten-System (${waasAudit.cmsName}). Wir erstellen Ihre Seite komplett neu im All-Inclusive Paket — inklusive Design, Hosting, Pflege und allen Änderungen zum monatlichen Festpreis.`);
  }

  // Standard WaaS Pitch Argument
  pitchPoints.push('Wir bieten Websites als All-Inclusive Service (WaaS): Sie erhalten ein modernstes Redesign inklusive Hosting, laufender Wartung, DSGVO-Sicherheit und unbegrenzter Inhalts-Anpassungen zum fairen monatlichen Festpreis.');

  return {
    overallScore,
    scores: {
      mobileUX: mobileUXScore,
      performance: performanceScore,
      securityDSGVO,
      localSEO,
      conversionLeads,
      techModernity
    },
    stats: {
      ...legalAudit,
      ...localSeoAudit,
      ...waasAudit,
      hasTelLink,
      hasMailtoLink,
      hasOnlineBooking: bookingInfo.hasOnlineBooking,
      hasInstantCalendar: bookingInfo.hasInstantCalendar,
      hasRequestForm: bookingInfo.hasRequestForm,
      hasGeneralContactForm: bookingInfo.hasGeneralContactForm,
      bookingProvider: bookingInfo.bookingProvider,
      bookingType: bookingInfo.bookingType,
      bookingDetails: bookingInfo.details,
      hasLiveChat,
      chatProvider,
      hasContactForm: bookingInfo.hasGeneralContactForm || bookingInfo.hasRequestForm,
      hasViewport,
      hasReviewsOrTrustBadges,
      hasHeroCta,
      industryKey: industryInfo.industryKey,
      industryLabel: industryInfo.industryLabel,
      detectedFrameworks
    },
    problems,
    positiveHighlights,
    pitchPoints
  };
}
