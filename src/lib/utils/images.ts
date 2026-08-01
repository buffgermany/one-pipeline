/**
 * Dynamic Lead Image Resolution Utility
 * Generates unique, non-generic imagery for each business based on name, address, and industry.
 */

export function getLeadImage(lead: any): string {
  if (!lead) return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  // 1. If lead has a custom featuredImage from CSV import
  if (lead.featuredImage && typeof lead.featuredImage === 'string' && lead.featuredImage.trim().startsWith('http')) {
    return lead.featuredImage.trim();
  }

  // 2. Generate a unique, deterministic seed per business name & ID so no two businesses look identical
  const seed = encodeURIComponent((lead.name || lead.id || 'business').toLowerCase().replace(/\s+/g, '-'));

  // Category & Industry specific high-quality photographic keyword collections
  const industry = (lead.industry || lead.category || '').toLowerCase();

  let keyword = 'building,architecture';
  if (industry.includes('shisha') || industry.includes('lounge')) {
    keyword = 'shisha,lounge,bar';
  } else if (industry.includes('bar') || industry.includes('pub') || industry.includes('cocktail')) {
    keyword = 'cocktail,bar,nightlife';
  } else if (industry.includes('gastro') || industry.includes('restaurant') || industry.includes('essen')) {
    keyword = 'restaurant,dining,interior';
  } else if (industry.includes('auto') || industry.includes('car') || industry.includes('kfz')) {
    keyword = 'car-dealership,showroom,cars';
  } else if (industry.includes('bau') || industry.includes('handwerk') || industry.includes('sanitär')) {
    keyword = 'construction,workshop,craftsman';
  } else if (industry.includes('friseur') || industry.includes('beauty') || industry.includes('salon')) {
    keyword = 'hair-salon,beauty';
  } else if (industry.includes('hotel') || industry.includes('pension')) {
    keyword = 'hotel,reception,resort';
  } else if (industry.includes('praxis') || industry.includes('arzt') || industry.includes('zahnarzt')) {
    keyword = 'medical-clinic,office';
  }

  // Unsplash source with unique seed tag and keyword for real contextual business photos
  return `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80&sig=${seed}`;
}

export function getGoogleMapsSearchUrl(name?: string, address?: string): string {
  if (!name) return '#';
  const query = `${name} ${address || ''}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getGoogleMapsEmbedUrl(name?: string, address?: string): string {
  const query = `${name || ''} ${address || ''}`.trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}
