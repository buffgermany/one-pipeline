import { scrapeGoogleMaps, type RawGMapLead } from './gmaps';
import { enrichWebsiteBatch, type EnrichedContacts } from './enricher';
import { db } from '../db';
import { leads } from '../db/schema';
import Papa from 'papaparse';

export interface PipelineOptions {
  queries: string[];
  maxScrolls?: number;
  headless?: boolean;
  enrichWebsites?: boolean;
  outputCsvPath?: string;
  industry?: string;
  signal?: AbortSignal;
  onLog?: (message: string) => void;
  onLeadScraped?: (lead: RawGMapLead) => void;
  onProgress?: (progressPercent: number, statusText: string) => void;
}

export interface EnrichedLead extends RawGMapLead, EnrichedContacts {
  id: string;
}

export async function runScraperPipeline(options: PipelineOptions) {
  const {
    queries,
    maxScrolls = 5,
    headless = true,
    enrichWebsites = true,
    outputCsvPath = 'contacts.csv',
    industry = 'Google Maps Scraping',
    signal,
    onLog,
    onLeadScraped,
    onProgress
  } = options;

  const log = (msg: string) => {
    console.log(msg);
    if (onLog) onLog(msg);
  };

  log('🚀 Starting Google Maps & Contact Scraping Pipeline...');
  log(`📌 Queries: ${queries.join(', ')}`);
  if (onProgress) onProgress(10, 'Google Maps wird gestartet...');

  // Stage 1: Scrape Google Maps
  const rawLeads = await scrapeGoogleMaps({
    queries,
    maxScrolls,
    headless,
    signal,
    onLog: (m) => log(m),
    onLeadScraped: (l) => {
      if (onLeadScraped) onLeadScraped(l);
    }
  });

  if (signal?.aborted) {
    log('⚠️ Scraper durch Benutzer-Stopp abgebrochen.');
  } else {
    log(`✅ Stage 1 abgeschlossen! ${rawLeads.length} Betriebe auf Google Maps gefunden.`);
  }

  if (onProgress) onProgress(50, 'Stage 1 abgeschlossen. Starte Stage 2...');

  // Stage 2: Enrich website contacts
  let enrichedLeads: EnrichedLead[] = [];

  if (enrichWebsites && rawLeads.length > 0 && !signal?.aborted) {
    log('🌐 Stage 2: Starte parallele Bun-Anreicherung (Inhaber, Tech Stack, E-Mails & Direct Phones)...');
    const startTime = Date.now();

    const enrichedResults = await enrichWebsiteBatch(
      rawLeads,
      25,
      signal,
      (completed, total, emailFound, phoneFound, dmFound) => {
        const percent = 50 + Math.round((completed / total) * 40);
        if (dmFound) {
          log(`  👤 Ansprechpartner: ${dmFound}`);
        }
        if (emailFound) {
          log(`  ✉️ E-Mail: ${emailFound}`);
        }
        if (phoneFound) {
          log(`  📞 Impressum Tel: ${phoneFound}`);
        }
        if (onProgress) onProgress(percent, `Anreicherung: ${completed}/${total} Websites analysiert...`);
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Stage 2 abgeschlossen in ${duration}s!`);

    enrichedLeads = enrichedResults.map((lead) => ({
      ...lead,
      id: crypto.randomUUID()
    }));
  } else {
    enrichedLeads = rawLeads.map((lead) => ({
      ...lead,
      email: '',
      directEmail: '',
      websitePhone: '',
      directPhone: '',
      decisionMaker: '',
      techStack: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      id: crypto.randomUUID()
    }));
  }

  if (onProgress) onProgress(90, 'Speichere Leads in der Datenbank...');

  // Save to SQLite DB using Drizzle
  log('💾 Speichere Leads in SQLite-Datenbank...');
  let savedCount = 0;

  for (const lead of enrichedLeads) {
    try {
      await db
        .insert(leads)
        .values({
          id: lead.id,
          name: lead.name,
          phoneNumber: lead.phoneNumber || 'N/A',
          websitePhone: lead.websitePhone || null,
          directPhone: lead.directPhone || null,
          decisionMaker: lead.decisionMaker || null,
          techStack: lead.techStack || null,
          industry: lead.category || industry,
          website: lead.website,
          email: lead.email,
          directEmail: lead.directEmail || null,
          facebook: lead.facebook,
          instagram: lead.instagram,
          linkedin: lead.linkedin,
          placeId: lead.placeId,
          address: lead.address,
          category: lead.category,
          rating: lead.rating,
          reviews: lead.reviews,
          featuredImage: lead.featuredImage,
          importFilename: `gmaps_${Date.now()}`,
          enrichmentSources: lead.sources ? JSON.stringify(lead.sources) : null,
          openStatus: lead.openStatus || null,
          priceLevel: lead.priceLevel || null,
          googleMapsUrl: lead.googleMapsUrl || null,
          isAd: lead.isAd ?? false,
          isClaimed: lead.isClaimed ?? true,
          status: 'new'
        })
        .onConflictDoNothing();

      savedCount++;
    } catch {
      // Ignore database duplicates
    }
  }

  log(`✅ ${savedCount} neue Leads in der lokalen SQLite-Datenbank gespeichert.`);

  // Export CSV using Bun.write
  if (outputCsvPath && enrichedLeads.length > 0) {
    const csvContent = Papa.unparse(
      enrichedLeads.map((l) => ({
        Name: l.name,
        Ansprechpartner_Inhaber: l.decisionMaker,
        TechStack_CMS: l.techStack,
        Category: l.category,
        Phone_GMaps: l.phoneNumber,
        Phone_Impressum: l.websitePhone,
        Phone_DirectMobile: l.directPhone,
        Email_General: l.email,
        Email_Direct: l.directEmail,
        Website: l.website,
        Address: l.address,
        Rating: l.rating,
        Reviews: l.reviews,
        Facebook: l.facebook,
        Instagram: l.instagram,
        LinkedIn: l.linkedin,
        PlaceID: l.placeId
      }))
    );

    await Bun.write(outputCsvPath, csvContent);
    log(`📄 CSV-Datei generiert: "${outputCsvPath}".`);
  }

  if (onProgress) onProgress(100, signal?.aborted ? 'Gestoppt' : 'Fertig!');

  return enrichedLeads;
}
