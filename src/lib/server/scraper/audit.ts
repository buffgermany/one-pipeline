import * as cheerio from 'cheerio';

export interface AuditSubScores {
  mobileUX: number;       // 0 - 100
  performance: number;    // 0 - 100
  security: number;       // 0 - 100
  seo: number;            // 0 - 100
  conversion: number;     // 0 - 100
  techModernity: number;  // 0 - 100
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
  hasOnlineBooking: boolean;
  bookingProvider?: string;
  hasLiveChat: boolean;
  chatProvider?: string;
  hasContactForm: boolean;
  hasImpressum: boolean;
  hasDatenschutz: boolean;
  hasMetaDescription: boolean;
  hasOgTags: boolean;
  hasH1: boolean;
  cmsName: string;
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
 * 100% Free Comprehensive Website Audit & Multi-Category Scoring Engine
 */
export function auditWebsite(
  url: string,
  htmlText: string,
  $: cheerio.CheerioAPI
): WebsiteAuditResult {
  const isHttps = url.toLowerCase().startsWith('https://');
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

  // 3. Security & Trust
  const hasImpressum = $('a[href*="impressum"]').length > 0 || htmlLower.includes('impressum');
  const hasDatenschutz = $('a[href*="datenschutz"], a[href*="privacy"]').length > 0 || htmlLower.includes('datenschutz');
  
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

  // 5. Conversion & Lead Generation
  let bookingProvider: string | undefined = undefined;
  if (htmlLower.includes('calendly.com')) bookingProvider = 'Calendly';
  else if (htmlLower.includes('doctolib')) bookingProvider = 'Doctolib';
  else if (htmlLower.includes('typeform.com')) bookingProvider = 'Typeform';
  else if (htmlLower.includes('jameda')) bookingProvider = 'Jameda';
  else if (htmlLower.includes('timify')) bookingProvider = 'Timify';
  else if (htmlLower.includes('simplybook')) bookingProvider = 'SimplyBook';
  else if (htmlLower.includes('shore.com')) bookingProvider = 'Shore';

  const hasOnlineBooking = Boolean(bookingProvider);

  let chatProvider: string | undefined = undefined;
  if (htmlLower.includes('userlike')) chatProvider = 'Userlike';
  else if (htmlLower.includes('intercom')) chatProvider = 'Intercom';
  else if (htmlLower.includes('tawk.to')) chatProvider = 'Tawk.to';
  else if (htmlLower.includes('crisp.chat')) chatProvider = 'Crisp';
  else if (htmlLower.includes('whatsapp') || htmlLower.includes('wa.me')) chatProvider = 'WhatsApp Widget';

  const hasLiveChat = Boolean(chatProvider);
  const hasContactForm = $('form').length > 0 && $('input[type="email"], input[type="tel"], textarea').length > 0;

  let conversionScore = 20;
  if (hasTelLink) conversionScore += 20;
  if (hasContactForm) conversionScore += 20;
  if (hasOnlineBooking) conversionScore += 25;
  if (hasLiveChat) conversionScore += 15;

  // 6. Tech Modernity & CMS Score
  let cmsName = 'Custom / Eigenentwicklung';
  let techModernityScore = 70;

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
  } else if (htmlLower.includes('typo3') || metaGen.includes('typo3')) {
    cmsName = 'TYPO3';
    techModernityScore = 50;
  } else if (htmlLower.includes('jimdo.com')) {
    cmsName = 'Jimdo';
    techModernityScore = 45;
  } else if (htmlLower.includes('joomla') || metaGen.includes('joomla')) {
    cmsName = 'Joomla';
    techModernityScore = 40;
  }

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
    pitchPoints.push('Auf Smartphones gibt es keinen direkten Anruf-Button. Mobile Interessenten müssen die Telefonnummer manuell kopieren.');
  } else {
    positiveHighlights.push('1-Klick Anrufbutton für mobile Anrufe vorhanden');
  }

  if (!hasOnlineBooking) {
    problems.push('❌ Keine automatische Online-Terminbuchung (Calendly / Doctolib) integriert');
    pitchPoints.push('Kunden können Termine nur telefonisch buchen. Dadurch gehen Buchungen außerhalb Ihrer Öffnungszeiten verloren.');
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

  if (cmsName.includes('Jimdo') || cmsName.includes('TYPO3') || cmsName.includes('Joomla')) {
    problems.push(`⚠️ Veraltetes / Unflexibles CMS System (${cmsName})`);
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
      hasOnlineBooking,
      bookingProvider,
      hasLiveChat,
      chatProvider,
      hasContactForm,
      hasImpressum,
      hasDatenschutz,
      hasMetaDescription,
      hasOgTags,
      hasH1,
      cmsName
    },
    problems,
    positiveHighlights,
    pitchPoints
  };
}
