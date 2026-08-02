/**
 * Dynamic Lead Image Resolution Utility
 * Resolves authentic Google Maps imagery, handling protocol normalization,
 * high-resolution quality parameters, and CORS/Referrer workarounds.
 */

export function normalizeGoogleImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  
  if (!url.startsWith('http')) return '';

  // Upgrade Googleusercontent thumbnail resolution to crisp HD
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    url = url
      .replace(/=w\d+-h\d+-[a-z0-9-]+/i, '=w1200-h800-k-no')
      .replace(/=s\d+-[a-z0-9-]+/i, '=s1200')
      .replace(/=s\d+$/i, '=s1200');
  }

  return url;
}

export function getLeadImage(lead: any): string {
  if (!lead) return '';

  // 1. If lead has a featuredImage from Google Maps scraping or CSV
  if (lead.featuredImage && typeof lead.featuredImage === 'string') {
    const normalized = normalizeGoogleImageUrl(lead.featuredImage);
    if (normalized) return normalized;
  }

  return '';
}

export function getGoogleMapsSearchUrl(name?: string, address?: string): string {
  if (!name) return '#';
  const query = `${name} ${address || ''}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getGoogleMapsEmbedUrl(name?: string, address?: string): string {
  const query = `${name || ''} ${address || ''}`.trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}

export function getGoogleStreetViewEmbedUrl(name?: string, address?: string): string {
  const query = `${name || ''} ${address || ''}`.trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&layer=c&output=embed`;
}
