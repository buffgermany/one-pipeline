import * as cheerio from 'cheerio';

export interface AuditSubScores {
  mobileUX: number;       // 0 - 100
  performance: number;    // 0 - 100
  security: number;       // 0 - 100
  seo: number;            // 0 - 100
  conversion: number;     // 0 - 100
  techModernity: number;  // 0 - 100
}

export interface BookingDetection {
  hasOnlineBooking: boolean;
  bookingProvider?: string;
  bookingType?: 'third_party' | 'custom' | 'none';
  details?: string;
}

export interface AuditStats {
  pageWeightKb: number;
  scriptCount: number;
  cssCount: number;
  imageCount: number;
  imagesWithoutAlt: number;
  hasHttps: boolean;
  hasViewport: boolean;
  hasTelLink: boolean;
  hasMailtoLink: boolean;
  hasOnlineBooking: boolean;
  bookingProvider?: string;
  bookingType?: 'third_party' | 'custom' | 'none';
  hasLiveChat: boolean;
  chatProvider?: string;
  hasContactForm: boolean;
  hasCookieBanner: boolean;
  cookieBannerProvider?: string;
  hasImpressum: boolean;
  hasDatenschutz: boolean;
  hasMetaDescription: boolean;
  hasOgTags: boolean;
  hasH1: boolean;
  cmsName: string;
  detectedFrameworks: string[];
}

export interface WebsiteAuditResult {
  overallScore: number; // 0 - 100
  scores: AuditSubScores;
  stats: AuditStats;
  problems: string[]; // List of exact issues found
  positiveHighlights: string[]; // Good things found
  pitchPoints: string[]; // Custom cold call sales talking points
}

/**
 * Smart Industry-Specific & Custom Booking System Detector
 */
export function detectBookingSystem(htmlText: string, $: cheerio.CheerioAPI): BookingDetection {
  const htmlLower = htmlText.toLowerCase();

  // 1. Comprehensive Third-Party Booking Providers by Category
  const providers: { name: string; category: string; keywords: string[] }[] = [
    // Multi-Industry / General
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

    // Gastro / Restaurant / Bars
    { name: 'OpenTable', category: 'Gastro', keywords: ['opentable.de', 'opentable.com'] },
    { name: 'ResMio', category: 'Gastro', keywords: ['resmio.com', 'resmio-widget'] },
    { name: 'Formitable', category: 'Gastro', keywords: ['formitable.com'] },
    { name: '7Rooms', category: 'Gastro', keywords: ['sevenrooms.com'] },
    { name: 'CentralPlanner', category: 'Gastro', keywords: ['centralplanner.de'] },
    { name: 'EatBu / DISHO', category: 'Gastro', keywords: ['eatbu.com', 'dish.co'] },
    { name: 'Bookatable / TheFork', category: 'Gastro', keywords: ['bookatable.com', 'thefork.de', 'tf-booking'] },
    { name: 'CoverManager', category: 'Gastro', keywords: ['covermanager.com'] },
    { name: 'WhenIHaveTime', category: 'Gastro', keywords: ['whenihavetime.com'] },

    // Salons / Beauty / Barbers
    { name: 'Treatwell', category: 'Beauty', keywords: ['treatwell.de', 'treatwell.com'] },
    { name: 'Booksy', category: 'Beauty', keywords: ['booksy.com'] },
    { name: 'Phorest', category: 'Beauty', keywords: ['phorest.com'] },
    { name: 'Planity', category: 'Beauty', keywords: ['planity.com'] },
    { name: 'Fresha', category: 'Beauty', keywords: ['fresha.com', 'shedul.com'] },
    { name: 'Salonkee', category: 'Beauty', keywords: ['salonkee.de', 'salonkee.com'] },

    // Fitness / Courses
    { name: 'Eversports', category: 'Fitness', keywords: ['eversports.de', 'eversports.at'] },
    { name: 'Fitogram', category: 'Fitness', keywords: ['fitogram.pro'] },
    { name: 'Mindbody', category: 'Fitness', keywords: ['mindbodyonline.com'] },
    { name: 'Urban Sports Club', category: 'Fitness', keywords: ['urbansportsclub.com'] },

    // Hotel / Accommodation
    { name: 'Seekda / Dirs21', category: 'Hotel', keywords: ['seekda.com', 'dirs21.de'] },
    { name: 'SiteMinder', category: 'Hotel', keywords: ['siteminder.com'] },
    { name: 'Cloudbeds', category: 'Hotel', keywords: ['cloudbeds.com'] },
    { name: 'Smoobu', category: 'Hotel', keywords: ['smoobu.com'] },

    // Craftsmen / Handwerk
    { name: 'Meisterabsatz / Hero', category: 'Handwerk', keywords: ['meisterabsatz.de', 'herosoftware.de'] }
  ];

  for (const p of providers) {
    if (p.keywords.some(kw => htmlLower.includes(kw))) {
      return {
        hasOnlineBooking: true,
        bookingProvider: `${p.name} (${p.category})`,
        bookingType: 'third_party',
        details: `Integrierter Drittanbieter für Online-Termine / Reservierungen (${p.name})`
      };
    }
  }

  // 2. Custom / Self-Programmed Booking System Detection
  const hasDatePickerInput = $('input[type="date"], input[name*="date"], input[name*="termin"], input[name*="booking"], input[id*="datepicker"], input[class*="datepicker"], input[class*="calendar"]').length > 0;
  
  const hasReservationForm = $('form').filter((_, form) => {
    const action = ($(form).attr('action') || '').toLowerCase();
    const id = ($(form).attr('id') || '').toLowerCase();
    const cls = ($(form).attr('class') || '').toLowerCase();
    const html = $(form).html()?.toLowerCase() || '';
    
    return action.includes('reservier') || action.includes('booking') || action.includes('termin') ||
           id.includes('reservier') || id.includes('booking') || id.includes('termin') ||
           cls.includes('reservier') || cls.includes('booking') || cls.includes('termin') ||
           (html.includes('uhrzeit') && html.includes('person'));
  }).length > 0;

  const hasBookingLinks = $('a[href]').filter((_, a) => {
    const href = ($(a).attr('href') || '').toLowerCase();
    const text = $(a).text().toLowerCase();
    return (href.includes('/reservierung') || href.includes('/booking') || href.includes('/terminbuchen') || href.includes('/tisch-reservieren')) &&
           (text.includes('reservieren') || text.includes('buchen') || text.includes('termin'));
  }).length > 0;

  if (hasDatePickerInput || hasReservationForm || hasBookingLinks) {
    return {
      hasOnlineBooking: true,
      bookingProvider: 'Eigenes Reservierungs- / Buchungsformular',
      bookingType: 'custom',
      details: 'Individuell programmiertes Online-Reservierungsformular auf der Website vorhanden'
    };
  }

  return {
    hasOnlineBooking: false,
    bookingType: 'none',
    details: 'Keine Online-Terminbuchung oder Reservierungsmöglichkeit vorhanden'
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
  
  // Smart HTTPS detection: check final URL, canonical tag, or HSTS header
  const isHttps = urlLower.startsWith('https://') || 
                  canonicalHref.startsWith('https://') || 
                  hasHsts;

  const htmlLower = htmlText.toLowerCase();

  const pageWeightKb = Math.round(Buffer.byteLength(htmlText, 'utf8') / 1024);
  const scriptCount = $('script').length;
  const cssCount = $('link[rel="stylesheet"]').length;
  const images = $('img');
  const imageCount = images.length;
  
  let imagesWithoutAlt = 0;
  images.each((_, img) => {
    const alt = $(img).attr('alt');
    if (!alt || !alt.trim()) imagesWithoutAlt++;
  });

  // 1. Mobile & UX
  const viewportAttr = $('meta[name="viewport"]').attr('content') || '';
  const hasViewport = viewportAttr.includes('width=device-width');
  const telLinks = $('a[href^="tel:"]');
  const hasTelLink = telLinks.length > 0;
  const mailtoLinks = $('a[href^="mailto:"]');
  const hasMailtoLink = mailtoLinks.length > 0;

  let mobileUXScore = 50;
  if (hasViewport) mobileUXScore += 30;
  if (hasTelLink) mobileUXScore += 20;

  // 2. Performance & Speed
  let performanceScore = 100;
  if (pageWeightKb > 500) performanceScore -= 20;
  if (pageWeightKb > 1500) performanceScore -= 20;
  if (scriptCount > 20) performanceScore -= 15;
  if (scriptCount > 40) performanceScore -= 15;
  if (cssCount > 10) performanceScore -= 10;
  if (imagesWithoutAlt > 5) performanceScore -= 10;
  performanceScore = Math.max(10, performanceScore);

  // 3. Security & Legal Compliance
  const hasImpressum = $('a[href*="impressum"]').length > 0 || htmlLower.includes('impressum');
  const hasDatenschutz = $('a[href*="datenschutz"], a[href*="privacy"]').length > 0 || htmlLower.includes('datenschutz');
  
  // Cookie Banner / GDPR Detection
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

  const hasCookieBanner = Boolean(cookieBannerProvider);

  let securityScore = 20;
  if (isHttps) securityScore += 40;
  if (hasImpressum) securityScore += 20;
  if (hasDatenschutz) securityScore += 20;

  // 4. SEO & Search Visibility
  const titleText = $('title').text().trim();
  const hasTitle = titleText.length > 0;
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  const hasMetaDescription = metaDesc.length > 0;
  const h1Count = $('h1').length;
  const hasH1 = h1Count >= 1;
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const hasOgTags = Boolean(ogTitle);

  let seoScore = 10;
  if (hasTitle) seoScore += 25;
  if (hasMetaDescription) seoScore += 30;
  if (hasH1) seoScore += 20;
  if (hasOgTags) seoScore += 15;

  // 5. Conversion & Lead Generation (Smart Booking & Chat Detection)
  const bookingInfo = detectBookingSystem(htmlText, $);
  const hasOnlineBooking = bookingInfo.hasOnlineBooking;
  const bookingProvider = bookingInfo.bookingProvider;

  let chatProvider: string | undefined = undefined;
  if (htmlLower.includes('userlike')) chatProvider = 'Userlike';
  else if (htmlLower.includes('intercom')) chatProvider = 'Intercom';
  else if (htmlLower.includes('tawk.to')) chatProvider = 'Tawk.to';
  else if (htmlLower.includes('crisp.chat')) chatProvider = 'Crisp';
  else if (htmlLower.includes('wa.me') || htmlLower.includes('api.whatsapp.com')) chatProvider = 'WhatsApp Widget';
  else if (htmlLower.includes('livezilla')) chatProvider = 'LiveZilla';
  else if (htmlLower.includes('zendesk')) chatProvider = 'Zendesk Chat';
  else if (htmlLower.includes('hubspot')) chatProvider = 'HubSpot LiveChat';

  const hasLiveChat = Boolean(chatProvider);
  const hasContactForm = $('form').length > 0 && $('input[type="email"], input[type="tel"], textarea').length > 0;

  let conversionScore = 20;
  if (hasTelLink) conversionScore += 20;
  if (hasContactForm) conversionScore += 20;
  if (hasOnlineBooking) conversionScore += 25;
  if (hasLiveChat) conversionScore += 15;

  // 6. Tech Modernity & Framework Audit
  let cmsName = 'Custom / Eigenentwicklung';
  let techModernityScore = 70;
  const detectedFrameworks: string[] = [];

  const metaGen = $('meta[name="generator"]').attr('content')?.toLowerCase() || '';

  if (htmlLower.includes('framerstatic.com') || htmlLower.includes('framerusercontent.com')) {
    cmsName = 'Framer';
    techModernityScore = 95;
  } else if (htmlLower.includes('webflow.com') || htmlLower.includes('webflow.css')) {
    cmsName = 'Webflow';
    techModernityScore = 90;
  } else if (htmlLower.includes('/wp-content/') || metaGen.includes('wordpress')) {
    cmsName = 'WordPress';
    techModernityScore = 75;
    if (htmlLower.includes('elementor')) cmsName = 'WordPress (Elementor)';
    if (htmlLower.includes('divi')) cmsName = 'WordPress (Divi)';
  } else if (htmlLower.includes('wix.com') || metaGen.includes('wix')) {
    cmsName = 'Wix';
    techModernityScore = 65;
  } else if (htmlLower.includes('squarespace.com')) {
    cmsName = 'Squarespace';
    techModernityScore = 70;
  } else if (htmlLower.includes('shopify')) {
    cmsName = 'Shopify';
    techModernityScore = 85;
  } else if (htmlLower.includes('shopware')) {
    cmsName = 'Shopware';
    techModernityScore = 85;
  } else if (htmlLower.includes('typo3') || metaGen.includes('typo3')) {
    cmsName = 'TYPO3';
    techModernityScore = 50;
  } else if (htmlLower.includes('jimdo.com')) {
    cmsName = 'Jimdo';
    techModernityScore = 45;
  } else if (htmlLower.includes('joomla') || metaGen.includes('joomla')) {
    cmsName = 'Joomla';
    techModernityScore = 40;
  } else if (htmlLower.includes('ionos') || htmlLower.includes('1and1') || htmlLower.includes('mywebsite')) {
    cmsName = 'Ionos / 1&1 MyWebsite';
    techModernityScore = 40;
  } else if (htmlLower.includes('strato')) {
    cmsName = 'Strato Homepage-Baukasten';
    techModernityScore = 40;
  }

  // Detect Modern Frontend Frameworks
  if (htmlLower.includes('react') || htmlLower.includes('_next/')) detectedFrameworks.push('React / Next.js');
  if (htmlLower.includes('vue') || htmlLower.includes('_nuxt/')) detectedFrameworks.push('Vue / Nuxt');
  if (htmlLower.includes('tailwind')) detectedFrameworks.push('Tailwind CSS');
  if (htmlLower.includes('bootstrap')) detectedFrameworks.push('Bootstrap');

  // Check for obsolete HTML artifacts
  const hasTables = $('table[border], table[cellpadding]').length > 0;
  const hasJqueryOld = htmlLower.includes('jquery-1.') || htmlLower.includes('jquery/1.');
  if (hasTables || hasJqueryOld) techModernityScore -= 25;

  techModernityScore = Math.max(10, Math.min(100, techModernityScore));

  // Overall Weighted Score
  const overallScore = Math.round(
    mobileUXScore * 0.20 +
    securityScore * 0.20 +
    conversionScore * 0.25 +
    seoScore * 0.15 +
    performanceScore * 0.10 +
    techModernityScore * 0.10
  );

  // Collect Exact Problems & Pitch Arguments
  const problems: string[] = [];
  const positiveHighlights: string[] = [];
  const pitchPoints: string[] = [];

  if (!isHttps) {
    problems.push('❌ Keine HTTPS-Verschlüsselung (Unverschlüsseltes HTTP — Browser warnt "Nicht sicher")');
    pitchPoints.push('Ihre Website läuft unverschlüsselt über HTTP. Besucher sehen sofort den Hinweis "Nicht sicher", was das Vertrauen zerstört.');
  } else {
    positiveHighlights.push('Sichere HTTPS-Verschlüsselung aktiv');
  }

  if (!hasTelLink) {
    problems.push('❌ Keine direkte 1-Klick Anruf-Funktion auf Smartphones (tel: Link fehlt)');
    pitchPoints.push('Auf Smartphones gibt es keinen direkten Anruf-Button. Mobile Interessenten müssen die Telefonnummer mühsam kopieren.');
  } else {
    positiveHighlights.push('1-Klick Anrufbutton für mobile Anrufe vorhanden');
  }

  if (!hasOnlineBooking) {
    problems.push('❌ Keine automatische Online-Terminbuchung / Reservierung integriert');
    pitchPoints.push('Kunden können Termine nur telefonisch buchen. Dadurch gehen wertvolle Buchungen außerhalb der Öffnungszeiten verloren.');
  } else {
    positiveHighlights.push(`Online-Terminbuchung aktiv (${bookingProvider})`);
  }

  if (!hasLiveChat) {
    problems.push('❌ Kein Live-Chat oder WhatsApp-Kontaktbutton vorhanden');
  } else {
    positiveHighlights.push(`Live-Chat / WhatsApp Kontakt aktiv (${chatProvider})`);
  }

  if (!hasMetaDescription) {
    problems.push('❌ Meta-Description fehlt (Schlechte Google Suchergebnis-Vorschau)');
    pitchPoints.push('Auf Google wird kein ansprechender Vorschautext angezeigt. Das senkt Ihre Klickrate in der Google-Suche.');
  }

  if (!hasViewport) {
    problems.push('❌ Fehlendes Mobile Viewport-Tag (Website wird auf Handys verzerrt/winzig dargestellt)');
  }

  if (pageWeightKb > 1500) {
    problems.push(`⚠️ Sehr hohe Seitengröße (${(pageWeightKb / 1024).toFixed(1)} MB — verlangsamt das Laden)`);
  }

  if (cmsName.includes('Jimdo') || cmsName.includes('TYPO3') || cmsName.includes('Joomla') || cmsName.includes('Ionos') || cmsName.includes('Strato')) {
    problems.push(`⚠️ Veraltetes / Unflexibles Baukasten-System (${cmsName})`);
    pitchPoints.push(`Ihre Website basiert auf ${cmsName}, was Änderungen erschwert und im Vergleich zu modernen Systemen verlangsamt.`);
  }

  return {
    overallScore,
    scores: {
      mobileUX: mobileUXScore,
      performance: performanceScore,
      security: securityScore,
      seo: seoScore,
      conversion: conversionScore,
      techModernity: techModernityScore
    },
    stats: {
      pageWeightKb,
      scriptCount,
      cssCount,
      imageCount,
      imagesWithoutAlt,
      hasHttps: isHttps,
      hasViewport,
      hasTelLink,
      hasMailtoLink,
      hasOnlineBooking,
      bookingProvider,
      bookingType: bookingInfo.bookingType,
      hasLiveChat,
      chatProvider,
      hasContactForm,
      hasCookieBanner,
      cookieBannerProvider,
      hasImpressum,
      hasDatenschutz,
      hasMetaDescription,
      hasOgTags,
      hasH1,
      cmsName,
      detectedFrameworks
    },
    problems,
    positiveHighlights,
    pitchPoints
  };
}
