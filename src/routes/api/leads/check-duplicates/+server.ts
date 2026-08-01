import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('49') && digits.length > 9) digits = '0' + digits.slice(2);
  if (digits.startsWith('0049') && digits.length > 11) digits = '0' + digits.slice(4);
  return digits;
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(gmbh|ag|kg|e\.k\.|ug|haftungsbeschränkt|inc|llc|co|und|&)\b/g, '')
    .replace(/[^\w\säöüß]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const cleaned = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const items: any[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return json({ duplicates: {} });
    }

    // Fetch existing leads from DB for fast matching
    const existingLeads = await db.select({
      id: leads.id,
      name: leads.name,
      phoneNumber: leads.phoneNumber,
      websitePhone: leads.websitePhone,
      placeId: leads.placeId,
      website: leads.website
    }).from(leads);

    const dbNormalized = existingLeads.map(l => ({
      original: l,
      normName: normalizeName(l.name),
      normPhone: normalizePhone(l.phoneNumber),
      normWebPhone: normalizePhone(l.websitePhone),
      normWebDomain: extractDomain(l.website),
      placeId: l.placeId ? l.placeId.trim() : ''
    }));

    const duplicates: Record<number, { reason: string; matchedLead: any }> = {};

    items.forEach((item, index) => {
      const itemPlaceId = item.placeId ? String(item.placeId).trim() : '';
      const itemNormPhone = normalizePhone(item.phoneNumber);
      const itemNormWebPhone = normalizePhone(item.websitePhone);
      const itemNormName = normalizeName(item.name);
      const itemNormDomain = extractDomain(item.website);

      for (const dbLead of dbNormalized) {
        // 1. Check Place ID match
        if (itemPlaceId && dbLead.placeId && itemPlaceId === dbLead.placeId) {
          duplicates[index] = {
            reason: 'Identische Google Place ID',
            matchedLead: dbLead.original
          };
          break;
        }

        // 2. Check Phone number match
        if (itemNormPhone && itemNormPhone.length >= 6) {
          if (itemNormPhone === dbLead.normPhone || itemNormPhone === dbLead.normWebPhone) {
            duplicates[index] = {
              reason: `Identische Telefonnummer (${dbLead.original.phoneNumber})`,
              matchedLead: dbLead.original
            };
            break;
          }
        }
        if (itemNormWebPhone && itemNormWebPhone.length >= 6) {
          if (itemNormWebPhone === dbLead.normPhone || itemNormWebPhone === dbLead.normWebPhone) {
            duplicates[index] = {
              reason: `Identische Direktwahl (${dbLead.original.websitePhone || dbLead.original.phoneNumber})`,
              matchedLead: dbLead.original
            };
            break;
          }
        }

        // 3. Check Name similarity
        if (itemNormName && itemNormName.length >= 4 && dbLead.normName && dbLead.normName.length >= 4) {
          if (itemNormName === dbLead.normName) {
            duplicates[index] = {
              reason: `Namensgleichheit ("${dbLead.original.name}")`,
              matchedLead: dbLead.original
            };
            break;
          }

          if (
            (itemNormName.length > 6 && dbLead.normName.includes(itemNormName)) ||
            (dbLead.normName.length > 6 && itemNormName.includes(dbLead.normName))
          ) {
            duplicates[index] = {
              reason: `Sehr ähnlicher Firmenname ("${dbLead.original.name}")`,
              matchedLead: dbLead.original
            };
            break;
          }
        }

        // 4. Check Website domain match
        if (itemNormDomain && itemNormDomain.length >= 4 && dbLead.normWebDomain && dbLead.normWebDomain.length >= 4) {
          if (itemNormDomain === dbLead.normWebDomain) {
            duplicates[index] = {
              reason: `Identische Website Domain (${dbLead.original.website})`,
              matchedLead: dbLead.original
            };
            break;
          }
        }
      }
    });

    return json({ duplicates });
  } catch (err: any) {
    console.error('Duplicate check error:', err);
    return json({ error: err.message || 'Duplicate check failed' }, { status: 500 });
  }
}
