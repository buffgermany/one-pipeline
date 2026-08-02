<script lang="ts">
  import { onMount } from 'svelte';
  import Copy from 'lucide-svelte/icons/copy';
  import Check from 'lucide-svelte/icons/check';
  import PhoneCall from 'lucide-svelte/icons/phone-call';
  import PhoneForwarded from 'lucide-svelte/icons/phone-forwarded';
  import Star from 'lucide-svelte/icons/star';
  import Globe from 'lucide-svelte/icons/globe';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Building2 from 'lucide-svelte/icons/building-2';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import FileText from 'lucide-svelte/icons/file-text';
  import Play from 'lucide-svelte/icons/play';
  import Pause from 'lucide-svelte/icons/pause';
  import Calendar from 'lucide-svelte/icons/calendar';
  import Bell from 'lucide-svelte/icons/bell';
  import X from 'lucide-svelte/icons/x';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import Map from 'lucide-svelte/icons/map';
  import Image from 'lucide-svelte/icons/image';
  import Zap from 'lucide-svelte/icons/zap';
  import ArrowRight from 'lucide-svelte/icons/arrow-right';
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import Hammer from 'lucide-svelte/icons/hammer';
  import Utensils from 'lucide-svelte/icons/utensils';
  import HeartPulse from 'lucide-svelte/icons/heart-pulse';
  import Volume2 from 'lucide-svelte/icons/volume-2';
  import ShieldAlert from 'lucide-svelte/icons/shield-alert';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';
  import Target from 'lucide-svelte/icons/target';
  import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
  import WebsiteAuditPanel from '$lib/components/WebsiteAuditPanel.svelte';
  import BookOpen from 'lucide-svelte/icons/book-open';
  import Search from 'lucide-svelte/icons/search';
  import UserCheck from 'lucide-svelte/icons/user-check';
  import Code from 'lucide-svelte/icons/code';
  import Mail from 'lucide-svelte/icons/mail';
  import Phone from 'lucide-svelte/icons/phone';
  import Key from 'lucide-svelte/icons/key';
  import Megaphone from 'lucide-svelte/icons/megaphone';
  import Share2 from 'lucide-svelte/icons/share-2';
  import { page } from '$app/stores';
  import { getGoogleMapsSearchUrl, getGoogleMapsEmbedUrl, getGoogleStreetViewEmbedUrl, normalizeGoogleImageUrl } from '$lib/utils/images';
  import guidelinesData from '$lib/assets/guidelines.json';

  // Lead Data State
  let lead = $state<any>(null);
  let loadingLead = $state(true);
  let copySuccess = $state(false);
  let submittingOutcome = $state(false);

  // Two-Phase Cockpit Mode
  let callStarted = $state(false);
  let viewMode = $state<'maps' | 'photo'>('photo');

  // Session Skipped Leads History & Targeting Filters
  let skippedLeadIds = $state<string[]>([]);
  let filterCategory = $state('all');
  let filterAuditScore = $state<number | null>(null);
  let filterSortStrategy = $state<'priority' | 'random' | 'rating' | 'reviews' | 'audit_lowest' | 'unclaimed'>('priority');
  let filterHasDirectPhone = $state(false);
  let showFilterModal = $state(false);

  function applyFiltersAndPull() {
    showFilterModal = false;
    skippedLeadIds = [];
    pullNextLead(false);
  }

  // Call Stopwatch Timer State
  let callTimerSeconds = $state(0);
  let timerRunning = $state(false);
  let timerInterval: any = null;

  // Notes Architecture
  let callOutcomeNotes = $state('');
  let wiedervorlageNotes = $state('');

  // Wiedervorlage Modal State
  let showWiedervorlageModal = $state(false);
  let selectedCallbackOption = $state<'tomorrow_10' | 'tomorrow_14' | 'in_2_days' | 'next_monday' | 'custom'>('tomorrow_10');
  let customCallbackDate = $state('');
  let customCallbackTime = $state('10:00');

  // Script Mode: 'guide' (Master Playbook) vs 'niche'
  let scriptMode = $state<'guide' | 'niche'>('guide');
  let selectedGuideId = $state<string>('opener-zero-website');

  // Human Situational Triggers Mapping (WANN benutze ich was?)
  const situationalGuideTriggers = [
    { id: 'opener-zero-website', label: 'Keine Website', desc: 'Auf Maps ohne Homepage', icon: '🌐' },
    { id: 'opener-permissive', label: 'Standard Opener', desc: 'Kalter Einstieg mit Erlaubnis', icon: '🤝' },
    { id: 'gatekeeper-bypass', label: 'Vorzimmer / Sekräterin', desc: 'Durchstellung zur GF', icon: '🛡️' },
    { id: 'pattern-interrupt', label: 'Kennt den Spruch', desc: 'Pattern Interrupt / Ehrlich', icon: '⚡' },
    { id: 'situational-onsite', label: 'Baustelle / Küche', desc: 'Mitten im Betrieb / Lärm', icon: '🚜' },
    { id: 'qualification-booking', label: 'Termin machen', desc: 'Qualifizierung & Closing', icon: '📅' }
  ];

  // Niche Script Profile State & Auto-Detection
  type NicheType = 'handwerk' | 'gastro' | 'b2b' | 'praxis' | 'generic';
  let selectedNiche = $state<NicheType>('generic');

  function autoDetectNiche(l: any): NicheType {
    if (!l) return 'generic';
    const text = `${l.industry || ''} ${l.category || ''} ${l.name || ''}`.toLowerCase();
    if (/handwerk|bau|sanitär|elektro|tischler|maler|dachdecker|bauunternehmen/i.test(text)) return 'handwerk';
    if (/gastro|restaurant|bar|cafe|lounge|hotel|imbiss|shisha/i.test(text)) return 'gastro';
    if (/praxis|arzt|zahnarzt|physio|therapie|pflegedienst/i.test(text)) return 'praxis';
    if (/b2b|berater|consulting|agentur|software|coach|it/i.test(text)) return 'b2b';
    return 'generic';
  }

  // Smart Placeholder Resolver for Real Values
  function resolveLeadPlaceholders(text: string, l: any, htmlStyle = false): string {
    if (!text) return '';

    const companyName = l?.name || 'Ihrem Betrieb';
    const industry = `${l?.industry || ''} ${l?.category || ''}`.toLowerCase();
    
    const isCompanyName = /bar|restaurant|gmbh|e\.k\.|lounge|cafe|hotel|imbiss|shisha|bau|handwerk|elektro|sanitär|praxis|zahnarzt|agentur|consulting|service|vertrieb|sportsbar|club|studio|kneipe/i.test(companyName);
    
    let contactSalutation = 'Herr/Frau Kunde';
    let contactLastName = 'Kunde';
    let contactVollname = 'die Geschäftsführung';

    if (l?.contactName) {
      contactVollname = l.contactName;
      const parts = l.contactName.trim().split(/\s+/);
      if (parts[0].toLowerCase() === 'herr' || parts[0].toLowerCase() === 'frau') {
        contactSalutation = parts.slice(0, 2).join(' ');
        contactLastName = parts[parts.length - 1];
      } else {
        contactSalutation = `Herr/Frau ${parts[parts.length - 1]}`;
        contactLastName = parts[parts.length - 1];
      }
    } else if (l?.previousWiedervorlageNote && /Herr[n]?\s+([A-Z][a-zäöüß]+)/i.test(l.previousWiedervorlageNote)) {
      const match = l.previousWiedervorlageNote.match(/Herr[n]?\s+([A-Z][a-zäöüß]+)/i);
      contactSalutation = `Herr ${match[1]}`;
      contactLastName = match[1];
      contactVollname = `Herr ${match[1]}`;
    } else if (!isCompanyName && /^[A-Z][a-zäöüß]+\s+[A-Z][a-zäöüß]+$/.test(companyName.trim())) {
      const parts = companyName.trim().split(/\s+/);
      contactSalutation = `Herr/Frau ${parts[parts.length - 1]}`;
      contactLastName = parts[parts.length - 1];
      contactVollname = companyName.trim();
    } else {
      contactSalutation = `der Geschäftsführung von ${companyName}`;
      contactLastName = `der Geschäftsführung`;
      contactVollname = `die Geschäftsführung von ${companyName}`;
    }

    let industryAction = 'Ihr Angebot prüfen';
    if (/gastro|restaurant|bar|cafe|lounge|imbiss|shisha/i.test(industry)) {
      industryAction = 'Ihre Speisekarte & Reservierungen einsehen';
    } else if (/handwerk|bau|sanitär|elektro|tischler|maler|dachdecker/i.test(industry)) {
      industryAction = 'ein Angebot für Ihre Handwerksleistungen anfordern';
    } else if (/praxis|arzt|zahnarzt|physio|therapie|pflegedienst/i.test(industry)) {
      industryAction = 'Ihre Öffnungszeiten & Freitermine einsehen';
    } else if (/b2b|berater|consulting|agentur|software|coach|it/i.test(industry)) {
      industryAction = 'Ihr Dienstleistungsangebot einsehen';
    }

    // 1-to-1 exact token mappings:
    const replacers: Record<string, string> = {
      '{{ANRUFER_VORNAME}}': 'Felix',
      '{{ANRUFER_NACHNAME}}': 'Krone',
      '{{FIRMENNAME}}': companyName,
      '{{KUNDE_NACHNAME}}': contactLastName,
      '{{KUNDE_VOLLNAME}}': contactVollname,
      '{{KUNDE_EMAIL}}': l?.email || `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'betrieb'}.de`,
      '{{BRANCHEN_AKTION}}': industryAction,
      '{{LACHEN}}': '(schmunzelt)'
    };

    let result = text;

    // Extremely smart German greeting adjustment:
    if (!l?.contactName && isCompanyName) {
      result = result.replace(/Guten Tag {{KUNDE_ANREDE_NAME}}/g, `Guten Tag, spreche ich mit der Geschäftsführung von **${companyName}**?`);
      result = result.replace(/Hallo {{KUNDE_ANREDE_NAME}}/g, `Hallo, spreche ich mit der Betriebsleitung von **${companyName}**?`);
    }

    replacers['{{KUNDE_ANREDE_NAME}}'] = contactSalutation;

    // Perform replacement
    for (const [key, value] of Object.entries(replacers)) {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      
      if (htmlStyle) {
        // Beautiful premium glowing highlight span for visual display
        const styledValue = `<span class="px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.28)] text-[var(--color-accent-emerald)] font-semibold shadow-inner transition-colors">${value}</span>`;
        result = result.replace(regex, styledValue);
      } else {
        result = result.replace(regex, value);
      }
    }

    return result;
  }

  // Niche Teleprompter Script Profiles
  const nicheProfiles: Record<NicheType, { label: string; icon: any; stages: Array<{ stage: number; title: string; subtitle: string; wording: string; tip: string }> }> = {
    handwerk: {
      label: 'Handwerk & Bau',
      icon: Hammer,
      stages: [
        {
          stage: 1,
          title: 'STAGE 1: GATEKEEPER BYPASS',
          subtitle: 'Raffiniert & Dringlich',
          wording: '"Guten Tag, geben Sie mir bitte eben die Geschäftsleitung von **{{FIRMENNAME}}** – auf Google fehlen wichtige Angaben zu Ihrem Notdienst/Angebot, ich muss das kurz durchgeben."',
          tip: 'Klingt wie ein wichtiger Hinweis zum Google-Eintrag. Bei Rückfrage: "Nein, es geht um verloren gehende Kundenanfragen, stellen Sie mich bitte durch, danke."'
        },
        {
          stage: 2,
          title: 'STAGE 2: CHEEKY HOOK',
          subtitle: 'Frecher Einstieg bezüglich fehlendem Online-Auftritt',
          wording: '"Hallo, {{ANRUFER_VORNAME}} von Buff. Störe ich gerade oder haben Sie 60 Sekunden? Wer auf Google nach Ihrem Betrieb sucht, findet zwar Ihren Brancheneintrag – aber Sie haben bisher gar keine eigene Website hinterlegt. Ist das Absicht, um sich Kunden vom Hals zu halten, oder ist Ihnen das bisher gar nicht aufgefallen?"',
          tip: 'Provokativ fragen! Handwerker reagieren sofort, wenn man fragt ob es "Absicht ist, Kunden abzuschrecken".'
        },
        {
          stage: 3,
          title: 'STAGE 3: BEDARFSANALYSE & PITCH',
          subtitle: 'Zeitfresser aufdecken – Ziel: 10 Min. Meeting',
          wording: '"Wir stellen Handwerksbetrieben eine schlüsselfertige Website as a Service zur Verfügung – inkl. Anfragetool ohne teure Agenturkosten. Das Ziel meines Anrufs ist nicht, Ihnen am Telefon was zu verkaufen, sondern Ihnen das in 10 Minuten live online oder vor Ort zu zeigen. Wie viele Stunden verliert Ihr Büro-Team pro Woche durch unvollständige Anrufe?"',
          tip: 'Das Ziel ist NUR die Terminvereinbarung für eine kurze 10-Minuten-Demo.'
        },
        {
          stage: 4,
          title: 'STAGE 4: MEETING-CLOSING',
          subtitle: 'Voranschreiten mit fallender Tonalität',
          wording: '"Lassen Sie uns dazu kurz 10 Minuten zusammensetzen – entweder entspannt im Online-Meeting oder ich komme kurz persönlich bei Ihnen vorbei. Passt es Dienstag um 10:00 Uhr oder eher 14:00 Uhr?"',
          tip: 'Tonalität am Ende runter wie beim Friseurtermin. Wahl zwischen Online oder Vor Ort anbieten.'
        }
      ]
    },
    gastro: {
      label: 'Gastronomie & Bar',
      icon: Utensils,
      stages: [
        {
          stage: 1,
          title: 'STAGE 1: GATEKEEPER BYPASS',
          subtitle: 'Speisekarten-Trick',
          wording: '"Hallo, geben Sie mir mal eben die Betriebsleitung von **{{FIRMENNAME}}** – auf Google ist keine eigene Website hinterlegt und die Speisekarte fehlt, Gäste fragen ständig nach."',
          tip: 'Die Servicekraft spürt das Problem sofort. Direkt zur Betriebsleitung durchstellen lassen.'
        },
        {
          stage: 2,
          title: 'STAGE 2: CHEEKY HOOK',
          subtitle: 'Konkurrenz-Trigger',
          wording: '"Hallo, {{ANRUFER_VORNAME}} von Buff. Ich wollte eben mobil Ihre Speisekarte auf Google anschauen – da sind nur uralte unscharfe Fotos von Gästen drin und keine eigene Website hinterlegt. Wissen Sie, wie viele Gäste jeden Abend deshalb zum Nachbar-Lokal weitergehen?"',
          tip: 'Der Vergleich mit dem Nachbar-Lokal triggert sofortige Konkurrenzangst.'
        },
        {
          stage: 3,
          title: 'STAGE 3: BEDARFSANALYSE & PITCH',
          subtitle: 'Gastro-WaaS Minimalportal',
          wording: '"Mit unserem WaaS-System buchen Gäste in 10 Sekunden direkt auf dem Handy einen Tisch oder sehen die Karte. Ich würde Ihnen die fertige Seite gerne kurz in 10 Minuten live online zeigen. Wie genervt ist Ihr Personal von Anrufen zu Preisen während der Stoßzeit?"',
          tip: 'Auf das 10-Minuten-Meeting hinarbeiten.'
        },
        {
          stage: 4,
          title: 'STAGE 4: MEETING-CLOSING',
          subtitle: 'Terminvorschlag vor dem Abendservice',
          wording: '"Schauen wir uns das kurz in 10 Minuten an. Auf welchen Tag in Ihrem Kalender schauen Sie gerade? Passt es morgen um 15:00 Uhr vor dem Abendservice?"',
          tip: 'Nach dem WANN fragen, nicht nach dem OB!'
        }
      ]
    },
    b2b: {
      label: 'B2B & Dienstleister',
      icon: Building2,
      stages: [
        {
          stage: 1,
          title: 'STAGE 1: GATEKEEPER BYPASS',
          subtitle: 'High-Status Direktruf',
          wording: '"Guten Tag, {{ANRUFER_VORNAME}} hier von Buff. Stellen Sie mich bitte kurz zur Geschäftsleitung von **{{FIRMENNAME}}** durch. Es geht um den fehlenden Online-Auftritt auf Google."',
          tip: 'Kein Betteln um Erlaubnis. Selbstverständlich auftreten.'
        },
        {
          stage: 2,
          title: 'STAGE 2: CHEEKY HOOK',
          subtitle: 'Schmerzpunkt-Einstieg',
          wording: '"Hallo, {{ANRUFER_VORNAME}} von Buff. Störe ich gerade oder haben Sie 60 Sekunden? Mal ganz direkt gefragt: Wer bei Google nach Ihrer Dienstleistung sucht, findet zwar Ihren Maps-Eintrag – aber keinen Link zu einer eigenen Präsenz. Sind Sie mit den Anfragen wirklich zufrieden oder tut es Ihnen weh, wie viele Kunden zur Konkurrenz abwandern?"',
          tip: 'Frech fragen, ob es "weh tut". Triggert echte Emotionen.'
        },
        {
          stage: 3,
          title: 'STAGE 3: BEDARFSANALYSE & PITCH',
          subtitle: 'Qualifizierung',
          wording: '"Wir stellen lokalen B2B-Firmen eine Website as a Service bereit, die aus Google-Suchenden qualifizierte Termine macht. Ich würde Ihnen das gerne kurz in 10 Minuten im Zoom präsentieren. Wie gewinnen Sie Neukunden aktuell – eher reine Mundpropaganda oder digitales System?"',
          tip: 'Der Begriff "Mundpropaganda vs. digitales System" fordert den Kunden heraus.'
        },
        {
          stage: 4,
          title: 'STAGE 4: MEETING-CLOSING',
          subtitle: 'Termin-Fixierung',
          wording: '"Auf welchen Tag schauen Sie gerade in Ihrem Kalender? Passt Ihnen Dienstag um 10:00 Uhr oder lieber 14:00 Uhr?"',
          tip: 'Stille aushalten nach der Kalenderfrage.'
        }
      ]
    },
    praxis: {
      label: 'Praxen & Gewerbe',
      icon: HeartPulse,
      stages: [
        {
          stage: 1,
          title: 'STAGE 1: GATEKEEPER BYPASS',
          subtitle: 'Rezeptions-Trick',
          wording: '"Guten Tag, {{ANRUFER_VORNAME}} von Buff. Geben Sie mir eben das Praxismanagement – auf Google fehlen wichtige Praxishinweise für Patienten, ich muss das kurz durchgeben."',
          tip: 'Dringlicher Hinweis bezüglich der Praxisdaten.'
        },
        {
          stage: 2,
          title: 'STAGE 2: CHEEKY HOOK',
          subtitle: 'Rezeptionstelefon-Entlastung',
          wording: '"Hallo, {{ANRUFER_VORNAME}} von Buff. Auf Google ist bei Ihrer Praxis bisher keine eigene Website hinterlegt – deshalb rufen Patienten für jeden kleinen Standard-Termin ständig an der Rezeption an. Wollen Sie Ihr Empfangsteam nicht endlich um 70% entlasten?"',
          tip: 'Entlastung des Praxisalltags steht im Vordergrund.'
        },
        {
          stage: 3,
          title: 'STAGE 3: BEDARFSANALYSE & PITCH',
          subtitle: 'Digitale Patientenführung',
          wording: '"Wir bauen schlüsselfertige Praxis-Portale auf WaaS-Basis. Ich würde dem Praxismanagement das gerne in 10 Minuten live zeigen. Wie viel Zeit verliert Ihr Empfangsteam täglich durch unnötige Telefonate?"',
          tip: 'Auf das 10-Minuten-Meeting hinweisen.'
        },
        {
          stage: 4,
          title: 'STAGE 4: MEETING-CLOSING',
          subtitle: 'Termin verankern',
          wording: '"Schauen Sie bitte kurz in Ihren Kalender – auf welchen Tag schauen Sie gerade? Passt Ihnen nächsten Dienstag um 11:30 Uhr?"',
          tip: 'Direkt im Kalender verankern.'
        }
      ]
    },
    generic: {
      label: 'WaaS Allrounder',
      icon: Zap,
      stages: [
        {
          stage: 1,
          title: 'STAGE 1: GATEKEEPER BYPASS',
          subtitle: 'Direkt & High-Status',
          wording: '"Guten Tag, {{ANRUFER_VORNAME}} hier von Buff. Bitte einmal zur Geschäftsführung von **{{FIRMENNAME}}** durchstellen. Es geht um den fehlenden Online-Auftritt auf Google."',
          tip: 'Ruhig, bestimmt und selbstverständlich auftreten.'
        },
        {
          stage: 2,
          title: 'STAGE 2: CHEEKY HOOK',
          subtitle: 'Schmerzpunkt-Einstieg',
          wording: '"Hallo, {{ANRUFER_VORNAME}} von Buff. Ich habe Ihre Firma auf Google gefunden – aber Sie haben bisher gar keine eigene Website hinterlegt. Haben Sie das selbst auf dem Handy mal getestet, was Kunden sehen wenn sie nach Ihnen suchen?"',
          tip: 'Test-Frage spiegeln.'
        },
        {
          stage: 3,
          title: 'STAGE 3: BEDARFSANALYSE & PITCH',
          subtitle: 'WaaS Vorteil',
          wording: '"Statt 5.000€ upfront für eine Agentur zu verbrennen, liefern wir Website as a Service für eine kleine monatliche Service-Pauschale. Lassen Sie uns das kurz in 10 Minuten online anschauen. Wäre ein risikofreies Modell für Sie interessant?"',
          tip: 'Hohes Risiko nehmen durch WaaS-Modell.'
        },
        {
          stage: 4,
          title: 'STAGE 4: MEETING-CLOSING',
          subtitle: 'Kalender-Fixierung',
          wording: '"Auf welchen Tag schauen Sie gerade in Ihrem Kalender? Wollen wir das kurz am Dienstag um 10 Uhr besprechen?"',
          tip: 'Kalender festlegen & Termin fixieren.'
        }
      ]
    }
  };

  // Teleprompter Active Script Stage
  let activeScriptStage = $state<number>(1);

  // High-Priority Instant Objection Soundboard (Top 6 Live Triggers)
  const instantObjectionTriggers = [
    { id: 'no-time', label: 'Keine Zeit', icon: '⏱️', desc: 'Stecke im Tagesgeschäft' },
    { id: 'have-provider', label: 'Haben Agentur', icon: '🤝', desc: 'Haben schon Website' },
    { id: 'send-info', label: 'Schicken Sie Mail', icon: '✉️', desc: 'Unterlagen zusenden' },
    { id: 'too-expensive', label: 'Zu teuer', icon: '💰', desc: 'Kein Budget dafür' },
    { id: 'no-interest', label: 'Kein Interesse', icon: '🚫', desc: 'Brauchen das nicht' },
    { id: 'fully-booked', label: 'Ausgebucht', icon: '🌟', desc: 'Haben genug Kunden' }
  ];

  // Dynamic Objections Soundboard loaded directly from guidelines.json
  const objectionsList = guidelinesData.objections.map((obj, idx) => ({
    id: obj.id,
    category: obj.category,
    trigger: obj.trigger,
    tag: obj.category,
    shortcut: `⌘${idx + 1}`,
    responses: obj.responses
  }));

  let selectedObjectionId = $state<string>('no-time');
  let selectedResponseIndex = $state<number>(0);
  let activeRightTab = $state<'objections' | 'arguments' | 'audit' | 'ai'>('objections');
  let copiedSnippetId = $state<string | null>(null);



  // AI Co-Pilot State
  let aiQuery = $state('');
  let aiResponse = $state<string | null>(null);
  let aiLoading = $state(false);

  const mockFallbackLead = {
    id: 'lead-demo-01',
    name: 'No.1 Cocktail & Sportsbar',
    phoneNumber: '0173 3203681',
    industry: 'Gastronomie & Bar',
    category: 'Cocktailbar & Sportsbar',
    website: 'https://echo-lounge-demo.de',
    rating: '4.9',
    reviews: 182,
    address: 'Leipziger Str. 1a, 09113 Schloßchemnitz',
    notes: 'Willkommen in unserer einzigartigen Karaoke Lounge Bar! Geniesse bei uns entspannte Stunden mit Freunden.',
    isWiedervorlage: true,
    previousWiedervorlageNote: 'Herrn Becker (GF) persönlich verlangen. Hatte Interesse an 20% Rabatt-Aktion geäußert.'
  };

  const defaultFallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80';

  function parseSources(srcVal: any): Record<string, { url?: string; fragmentUrl?: string }> | null {
    if (!srcVal) return null;
    if (typeof srcVal === 'object') return srcVal;
    try {
      return JSON.parse(srcVal);
    } catch {
      return null;
    }
  }

  function parseTechStack(techStr: string | null | undefined): string[] {
    if (!techStr || typeof techStr !== 'string') return [];
    return techStr
      .split(/[•,;|]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  let parsedSources = $derived(parseSources(lead?.enrichmentSources));

  function getLeadBannerImage(l: any) {
    if (l?.featuredImage && typeof l.featuredImage === 'string') {
      const normalized = normalizeGoogleImageUrl(l.featuredImage);
      if (normalized) return normalized;
    }
    return '';
  }

  function handleImageError(e: Event) {
    // If a static photo URL breaks (403/expired), switch seamlessly to live Street View / Maps Embed
    viewMode = 'maps';
  }

  function renderMarkdown(text: string) {
    if (!text) return '';
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--color-ink-primary)]">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-[var(--color-accent-emerald)]">$1</em>')
      .replace(/💡\s*<strong>Taktik:<\/strong>/gi, '<div class="p-2.5 rounded bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] my-1"><span class="text-[11px] font-bold text-[var(--color-status-amber)] uppercase tracking-wider block mb-0.5">💡 Taktik für den Verkäufer:</span><p class="text-xs text-[var(--color-ink-primary)]">')
      .replace(/💬\s*<strong>Wording:<\/strong>/gi, '</p></div><div class="p-3 rounded bg-[var(--color-emerald-tint)] border border-[var(--color-emerald-border)] my-1"><span class="text-[11px] font-bold text-[var(--color-accent-emerald)] uppercase tracking-wider block mb-0.5">💬 Wording zum Vorlesen:</span><p class="text-xs italic text-white font-normal leading-relaxed">')
      .replace(/🎯\s*<strong>Next Step:<\/strong>/gi, '</p></div><div class="p-2.5 rounded bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.3)] my-1"><span class="text-[11px] font-bold text-[var(--color-status-cyan)] uppercase tracking-wider block mb-0.5">🎯 Abschlussfrage / Next Step:</span><p class="text-xs font-bold text-[var(--color-status-cyan)]">');
    
    return formatted.includes('</div>') ? formatted + '</p></div>' : formatted;
  }

  let currentAgentId = $derived($page.data.user?.id || 'agent-felix');

  async function pullNextLead(skipCurrentLead = false) {
    loadingLead = true;
    callStarted = false;
    showWiedervorlageModal = false;
    activeScriptStage = 1;
    callNotesReset();

    if (skipCurrentLead && lead?.id && !skippedLeadIds.includes(lead.id)) {
      skippedLeadIds = [...skippedLeadIds, lead.id];
    }

    const targetLeadId = $page.url.searchParams.get('leadId') || undefined;

    try {
      const res = await fetch('/api/queue/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: currentAgentId,
          targetLeadId: skipCurrentLead ? undefined : targetLeadId,
          skippedLeadIds,
          filters: {
            category: filterCategory,
            maxAuditScore: filterAuditScore,
            sortStrategy: filterSortStrategy,
            hasDirectPhone: filterHasDirectPhone
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        lead = data.lead || mockFallbackLead;
      } else {
        lead = mockFallbackLead;
      }
    } catch (e) {
      console.error('Failed to pull lead:', e);
      lead = mockFallbackLead;
    } finally {
      selectedNiche = autoDetectNiche(lead);
      loadingLead = false;
      resetTimer();
    }
  }

  function callNotesReset() {
    callOutcomeNotes = '';
    wiedervorlageNotes = '';
  }

  function startCallWorkflow() {
    if (!lead?.phoneNumber) return;
    copyToClipboard(lead.phoneNumber);
    callStarted = true;
    timerRunning = true;
    activeScriptStage = 1;
    if (!timerInterval) startTimer();
  }

  function copyToClipboard(text: string, snippetId?: string) {
    const resolved = resolveLeadPlaceholders(text, lead);
    navigator.clipboard.writeText(resolved);
    if (snippetId) {
      copiedSnippetId = snippetId;
      setTimeout(() => copiedSnippetId = null, 2000);
    } else {
      copySuccess = true;
      setTimeout(() => copySuccess = false, 2000);
    }
  }

  function computeCallbackTimestamp(): Date {
    const now = new Date();
    if (selectedCallbackOption === 'tomorrow_10') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    } else if (selectedCallbackOption === 'tomorrow_14') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(14, 0, 0, 0);
      return d;
    } else if (selectedCallbackOption === 'in_2_days') {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
      return d;
    } else if (selectedCallbackOption === 'next_monday') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() + ((7 - day + 1) % 7 || 7);
      d.setDate(diff);
      d.setHours(10, 0, 0, 0);
      return d;
    } else if (customCallbackDate) {
      const [hours, mins] = customCallbackTime.split(':').map(Number);
      const d = new Date(customCallbackDate);
      d.setHours(hours || 10, mins || 0, 0, 0);
      return d;
    }
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  async function handleWiedervorlageSubmit() {
    if (!lead || submittingOutcome) return;
    submittingOutcome = true;
    const rescheduleAt = computeCallbackTimestamp();

    try {
      await fetch('/api/leads/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          agentId: currentAgentId,
          outcome: 'Wiedervorlage',
          notes: callOutcomeNotes,
          wiedervorlageNote: wiedervorlageNotes,
          customRescheduleAt: rescheduleAt.toISOString(),
          duration: callTimerSeconds
        })
      });
    } catch (e) {
      console.error('Failed to schedule Wiedervorlage:', e);
    } finally {
      submittingOutcome = false;
      showWiedervorlageModal = false;
      pullNextLead();
    }
  }

  async function logOutcome(outcomeLabel: string) {
    if (outcomeLabel === 'Callback' || outcomeLabel === 'Wiedervorlage') {
      showWiedervorlageModal = true;
      return;
    }

    if (!lead || submittingOutcome) return;
    submittingOutcome = true;

    try {
      await fetch('/api/leads/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          agentId: currentAgentId,
          outcome: outcomeLabel,
          notes: callOutcomeNotes,
          duration: callTimerSeconds
        })
      });
    } catch (e) {
      console.error('Failed to log outcome:', e);
    } finally {
      submittingOutcome = false;
      pullNextLead();
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timerRunning) callTimerSeconds++;
    }, 1000);
  }

  function resetTimer() {
    callTimerSeconds = 0;
    timerRunning = false;
  }

  async function handleAiAsk() {
    if (!aiQuery.trim() || aiLoading) return;
    aiLoading = true;
    aiResponse = '';

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          lead
        })
      });

      if (!res.ok || !res.body) {
        aiResponse = '⚠️ AI Co-Pilot ist aktuell ausgelastet. Bitte erneut versuchen.';
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        aiResponse += text;
      }
    } catch (e) {
      console.error('AI Co-Pilot streaming failed:', e);
      aiResponse = '⚠️ Verbindungsfehler zum AI Co-Pilot.';
    } finally {
      aiLoading = false;
    }
  }

  onMount(() => {
    pullNextLead();

    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        startCallWorkflow();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        pullNextLead(true);
      } else if (e.key === '1') {
        e.preventDefault();
        logOutcome('Connected');
      } else if (e.key === '2') {
        e.preventDefault();
        logOutcome('Callback');
      } else if (e.key === '3') {
        e.preventDefault();
        logOutcome('Voicemail');
      } else if (e.key === '4') {
        e.preventDefault();
        logOutcome('Not Interested');
      } else if (e.key === 'Enter' && !showWiedervorlageModal) {
        e.preventDefault();
        pullNextLead();
      } else if (e.key === 'Tab' && callStarted) {
        e.preventDefault();
        const maxStages = currentGuideStages.length;
        if (e.shiftKey) {
          activeScriptStage = Math.max(1, activeScriptStage - 1);
        } else {
          activeScriptStage = Math.min(maxStages, activeScriptStage + 1);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  // Derived Objections State
  let selectedObjection = $derived(
    objectionsList.find(o => o.id === selectedObjectionId) || objectionsList[0]
  );

  let currentObjectionResponse = $derived(
    selectedObjection.responses[selectedResponseIndex] || selectedObjection.responses[0]
  );

  // Derived Guide Stages
  let selectedGuideData = $derived(
    guidelinesData.guides.find(g => g.id === selectedGuideId) || guidelinesData.guides[0]
  );

  let currentGuideStages = $derived(
    scriptMode === 'guide'
      ? selectedGuideData.steps.map((s, idx) => ({
          stage: idx + 1,
          title: `PHASE ${idx + 1}: ${s.phase.toUpperCase()}`,
          subtitle: selectedGuideData.title,
          wording: resolveLeadPlaceholders(s.script, lead, true),
          tip: resolveLeadPlaceholders(s.note, lead, false)
        }))
      : (nicheProfiles[selectedNiche] || nicheProfiles.generic).stages.map(st => ({
          ...st,
          wording: resolveLeadPlaceholders(st.wording, lead, true),
          tip: resolveLeadPlaceholders(st.tip, lead, false)
        }))
  );

  let currentStageData = $derived(
    currentGuideStages[activeScriptStage - 1] || currentGuideStages[0]
  );
</script>

<div class="h-[calc(100vh-53px)] flex flex-col bg-[var(--color-page-void)] text-[var(--color-ink-primary)] font-[var(--font-general-sans)] overflow-hidden select-none relative">
  
  <!-- UNIFIED SLIM COCKPIT HEADER BAR -->
  <div class="h-13 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] px-4 md:px-5 flex items-center justify-between gap-3 shrink-0 z-30 shadow-sm">
    
    <!-- Left: Status & Navigation Badge -->
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full {callStarted ? 'bg-[var(--color-accent-emerald)] animate-ping' : 'bg-[var(--color-ink-muted)]'}"></span>
        <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] tracking-wide">
          Anruf-Cockpit
        </span>
      </div>

      {#if callStarted && lead}
        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30 text-xs font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] truncate">
          <span>In Telefonat: {lead.name}</span>
        </div>
      {/if}
    </div>

    <!-- Center: Live Call Stopwatch Timer -->
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] shadow-inner">
        <div class="w-2 h-2 rounded-full {timerRunning ? 'bg-[var(--color-accent-emerald)] animate-pulse' : 'bg-[var(--color-ink-muted)]'}"></div>
        <span class="text-xs font-[var(--font-mono)] font-bold text-[var(--color-ink-primary)]">{formatTime(callTimerSeconds)}</span>
        <button 
          onclick={() => timerRunning = !timerRunning}
          class="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors ml-1 cursor-pointer"
          title={timerRunning ? 'Timer pausieren' : 'Timer starten'}
        >
          {#if timerRunning}
            <Pause size={11} />
          {:else}
            <Play size={11} />
          {/if}
        </button>
      </div>
    </div>

    <!-- Right: Primary Call Dispositions (ONLY Header Dispositions) -->
    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <button 
        onclick={() => logOutcome('Connected')}
        disabled={submittingOutcome}
        class="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-emerald-tint)] border border-[var(--color-emerald-border)] text-[var(--color-accent-emerald)] hover:bg-[var(--color-accent-emerald)] hover:text-[#052E16] text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
        title="Verbunden (1)"
      >
        <span>Verbunden</span>
        <kbd class="text-[9px] opacity-70 bg-black/20 px-1 rounded font-mono">1</kbd>
      </button>

      <button 
        onclick={() => logOutcome('Callback')}
        disabled={submittingOutcome}
        class="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] text-[var(--color-status-amber)] hover:bg-[var(--color-status-amber)] hover:text-black text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
        title="Wiedervorlage eintragen (2)"
      >
        <Calendar size={11} />
        <span>Wiedervorlage</span>
        <kbd class="text-[9px] opacity-70 bg-black/20 px-1 rounded font-mono">2</kbd>
      </button>

      <button 
        onclick={() => logOutcome('Voicemail')}
        disabled={submittingOutcome}
        class="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(6,182,212,0.12)] border border-[rgba(6,182,212,0.3)] text-[var(--color-status-cyan)] hover:bg-[var(--color-status-cyan)] hover:text-black text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
        title="Voicemail (3)"
      >
        <span>Voicemail</span>
        <kbd class="text-[9px] opacity-70 bg-black/20 px-1 rounded font-mono">3</kbd>
      </button>

      <button 
        onclick={() => logOutcome('Not Interested')}
        disabled={submittingOutcome}
        class="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.3)] text-[var(--color-status-rose)] hover:bg-[var(--color-status-rose)] hover:text-white text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
        title="Absage (4)"
      >
        <span>Absage</span>
        <kbd class="text-[9px] opacity-70 bg-black/20 px-1 rounded font-mono">4</kbd>
      </button>

      <button 
        onclick={() => showFilterModal = true}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-neutral-950 text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm"
        title="Anruf-Strategie & Ziel-Filter anpassen"
      >
        <Target size={13} class="text-emerald-400" />
        <span class="hidden md:inline">Anruf-Targeting</span>
        {#if filterCategory !== 'all' || filterAuditScore !== null || filterSortStrategy !== 'priority'}
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        {/if}
      </button>

      <div class="h-3.5 w-px bg-[var(--color-border-subtle)] mx-0.5 hidden sm:block"></div>

      <button 
        onclick={() => pullNextLead(true)}
        disabled={loadingLead}
        class="flex items-center gap-1 px-2.5 py-1 rounded bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] text-[var(--color-status-amber)] hover:bg-[var(--color-status-amber)] hover:text-black text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
        title="Vorerst überspringen (Lead bleibt in Queue) [S]"
      >
        <PhoneForwarded size={12} class="rotate-90 sm:rotate-0" />
        <span class="hidden sm:inline">Überspringen</span>
        <kbd class="text-[9px] opacity-80 bg-black/20 px-1 rounded font-mono">S</kbd>
      </button>

      <button 
        onclick={() => pullNextLead(false)}
        disabled={loadingLead}
        class="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-focus)] border border-[var(--color-border-subtle)] text-[var(--color-ink-primary)] text-xs font-[var(--font-excon)] font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
        title="Nächster Lead (Enter)"
      >
        <PhoneForwarded size={12} />
        <span class="hidden sm:inline">Nächster</span>
        <kbd class="text-[9px] bg-black/20 px-1 rounded font-mono">↵</kbd>
      </button>
    </div>
  </div>

  <!-- PRE-CALL BRIEFING MODE -->
  {#if !callStarted}
    <div class="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center">
      <div class="w-full max-w-6xl flex flex-col gap-4 pb-8 my-auto">
        
        <!-- FULL-WIDTH TOP HERO CARD: LEAD IDENTITY & HIGH-VALUE SALES OPPORTUNITY BADGES -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-3 shadow-sm">
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div class="flex flex-col gap-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap text-xs">
                <span class="font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-2 py-0.5 rounded border border-[var(--color-emerald-border)]">
                  Nächster Lead
                </span>
                <span class="text-[var(--color-ink-muted)] font-medium">{lead?.category || lead?.industry || 'B2B Lead'}</span>

                {#if lead?.isAd}
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <Megaphone size={12} class="shrink-0" />
                    <span>Google Ads aktiv</span>
                  </span>
                {/if}

                {#if lead?.isClaimed === false}
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Key size={12} class="shrink-0" />
                    <span>Unclaimed Profile</span>
                  </span>
                {/if}
              </div>

              <div class="flex items-center gap-2 flex-wrap mt-1">
                <a 
                  href={lead?.googleMapsUrl || getGoogleMapsSearchUrl(lead?.name, lead?.address)}
                  target="_blank" 
                  rel="noreferrer"
                  class="text-xl md:text-2xl font-bold font-[var(--font-excon)] text-[var(--color-ink-primary)] hover:text-[var(--color-accent-emerald)] transition-colors flex items-center gap-2 group cursor-pointer"
                  title="Auf Google Maps öffnen"
                >
                  <span>{lead?.name || 'Unternehmensname'}</span>
                  <ExternalLink size={18} class="text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent-emerald)] transition-colors shrink-0" />
                </a>

                {#if lead?.website}
                  {@const webUrl = lead.website.startsWith('http') ? lead.website : 'https://' + lead.website}
                  <a 
                    href={webUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-emerald-tint)] hover:bg-[var(--color-accent-emerald)] hover:text-[#052E16] text-[var(--color-accent-emerald)] border border-[var(--color-emerald-border)] text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                    title="Website in neuem Tab öffnen"
                  >
                    <Globe size={13} class="shrink-0" />
                    <span>Website öffnen</span>
                    <ExternalLink size={11} class="shrink-0" />
                  </a>
                {/if}
              </div>

              <div class="flex items-center gap-2.5 text-xs text-[var(--color-ink-secondary)] flex-wrap mt-0.5">
                <span class="flex items-center gap-1">
                  <Building2 size={13} class="text-[var(--color-ink-muted)]" />
                  <span>{lead?.industry}</span>
                </span>
                <span>•</span>
                <span class="flex items-center gap-1">
                  <MapPin size={13} class="text-[var(--color-accent-emerald)]" />
                  <span>{lead?.address || 'Deutschland'}</span>
                </span>
                {#if lead?.openStatus}
                  <span>•</span>
                  <span class="text-[var(--color-accent-emerald)] font-semibold">{lead.openStatus}</span>
                {/if}
              </div>
            </div>

            <!-- RATING & REVIEWS BADGE -->
            <div class="flex items-center gap-2 shrink-0">
              <div class="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center gap-2 text-xs font-bold">
                <Star size={14} class="text-yellow-400 fill-yellow-400 shrink-0" />
                <span class="text-[var(--color-ink-primary)]">{lead?.rating || '4.8'}</span>
                <span class="text-[var(--color-ink-muted)]">({lead?.reviews || 0} Bewertungen)</span>
                {#if lead?.priceLevel}
                  <span class="text-[var(--color-accent-emerald)] ml-1">{lead.priceLevel}</span>
                {/if}
              </div>
            </div>

          </div>

          {#if lead?.isWiedervorlage || lead?.previousWiedervorlageNote}
            <div class="mt-1 p-3 rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] flex items-start gap-2.5">
              <Bell size={16} class="text-[var(--color-status-amber)] shrink-0 mt-0.5" />
              <div class="flex flex-col gap-0.5 text-xs">
                <span class="font-bold text-[var(--color-status-amber)] font-[var(--font-excon)]">Wiedervorlage Notiz</span>
                <p class="text-[var(--color-ink-primary)] leading-relaxed">
                  {lead?.previousWiedervorlageNote || 'Hinweis aus vorherigem Telefonat vorhanden.'}
                </p>
              </div>
            </div>
          {/if}

        </div>

        <!-- 6 / 6 SYMMETRIC BENTO GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          <!-- LEFT COLUMN (6 COLS): DECISION MAKER, DIRECT CONTACTS, MAP PREVIEW & CALL ACTION -->
          <div class="lg:col-span-6 flex flex-col gap-4">
            
            <!-- CARD 1: TARGET CONTACT & DIRECT DIAL SELECTION -->
            <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-4 shadow-sm">
              
              <!-- Decision Maker / Inhaber -->
              <div class="flex flex-col gap-1.5 pb-3 border-b border-[var(--color-border-subtle)]">
                <span class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] flex items-center gap-1.5">
                  <UserCheck size={14} class="text-[var(--color-accent-emerald)] shrink-0" />
                  Ziel-Ansprechpartner
                </span>

                {#if lead?.decisionMaker}
                  {@const dmSource = parsedSources?.decisionMaker}
                  <div class="flex items-center justify-between gap-2 bg-[var(--color-page-void)] p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-xs font-bold text-[var(--color-ink-primary)] truncate">{lead.decisionMaker}</span>
                      <span class="text-[11px] text-[var(--color-ink-muted)]">(Inhaber / GF)</span>
                    </div>

                    {#if dmSource?.fragmentUrl || dmSource?.url}
                      <a 
                        href={dmSource.fragmentUrl || dmSource.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        class="text-xs text-[var(--color-accent-emerald)] hover:underline flex items-center gap-1 shrink-0 font-medium"
                        title="Impressum-Quelle anzeigen"
                      >
                        <span>Quelle</span>
                        <ExternalLink size={11} />
                      </a>
                    {/if}
                  </div>
                {:else}
                  <div class="bg-[var(--color-page-void)] p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-ink-muted)] italic">
                    Kein Inhaber im Impressum hinterlegt — nach Geschäftsführung fragen.
                  </div>
                {/if}
              </div>

              <!-- Phone Direct Dial Options -->
              <div class="flex flex-col gap-2">
                <span class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] flex items-center gap-1.5">
                  <Phone size={14} class="text-[var(--color-accent-emerald)] shrink-0" />
                  Rufnummer wählen
                </span>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <!-- Google Maps Phone -->
                  <button
                    onclick={() => copyToClipboard(lead?.phoneNumber, 'gmaps_phone_copy')}
                    class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5 text-left transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span class="text-[10px] text-[var(--color-ink-muted)] font-medium">Google Maps Zentrale</span>
                    <span class="font-bold text-[var(--color-ink-primary)] flex items-center justify-between">
                      <span>{lead?.phoneNumber || 'N/A'}</span>
                      <Copy size={11} class="text-[var(--color-ink-muted)]" />
                    </span>
                  </button>

                  <!-- Direct Impressum Phone -->
                  {#if lead?.directPhone || lead?.websitePhone}
                    <button
                      onclick={() => copyToClipboard(lead?.directPhone || lead?.websitePhone, 'direct_phone_copy')}
                      class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-emerald-tint)] hover:bg-[var(--color-accent-emerald)]/20 border border-[var(--color-accent-emerald)]/30 flex flex-col gap-0.5 text-left transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span class="text-[10px] text-[var(--color-accent-emerald)] font-bold">Impressum Direktwahl</span>
                      <span class="font-bold text-[var(--color-accent-emerald)] flex items-center justify-between">
                        <span class="truncate">{lead?.directPhone || lead?.websitePhone}</span>
                        <PhoneCall size={11} class="shrink-0" />
                      </span>
                    </button>
                  {:else}
                    <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-ink-muted)] flex items-center justify-center italic">
                      Keine Direktwahl vorhanden
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Secondary Email & Social Contacts -->
              {#if lead?.email || lead?.directEmail || lead?.facebook || lead?.instagram || lead?.linkedin}
                <div class="flex items-center justify-between gap-2 pt-3 border-t border-[var(--color-border-subtle)] text-xs">
                  {#if lead?.email || lead?.directEmail}
                    {@const mainEmail = (lead?.directEmail || lead?.email || '').split(/[,\s;]+/)[0]}
                    <a href={`mailto:${mainEmail}`} class="text-[var(--color-accent-emerald)] hover:underline flex items-center gap-1 font-medium truncate" title={mainEmail}>
                      <Mail size={12} class="shrink-0" />
                      <span class="truncate">{mainEmail}</span>
                    </a>
                  {/if}

                  {#if lead?.facebook || lead?.instagram || lead?.linkedin}
                    <div class="flex items-center gap-1.5 shrink-0">
                      {#if lead?.linkedin}
                        <a href={lead.linkedin} target="_blank" rel="noreferrer" class="p-1 rounded bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-emerald)] border border-[var(--color-border-subtle)] transition-all cursor-pointer" title="LinkedIn Profil">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                        </a>
                      {/if}
                      {#if lead?.instagram}
                        <a href={lead.instagram} target="_blank" rel="noreferrer" class="p-1 rounded bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-emerald)] border border-[var(--color-border-subtle)] transition-all cursor-pointer" title="Instagram Profil">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 2.156 4.919 5.406.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 5.234-4.919 5.409-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-2.199-4.919-5.409-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-5.234 4.919-5.409 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                      {/if}
                      {#if lead?.facebook}
                        <a href={lead.facebook} target="_blank" rel="noreferrer" class="p-1 rounded bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-emerald)] border border-[var(--color-border-subtle)] transition-all cursor-pointer" title="Facebook Profil">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}

            </div>

            <!-- CARD 2: INTERACTIVE LOCATION & MAP/PHOTO PREVIEW -->
            <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 shadow-sm">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] flex items-center gap-1.5">
                  <MapPin size={14} class="text-[var(--color-accent-emerald)] shrink-0" />
                  Standort & Vorschau
                </span>

                <div class="flex items-center gap-1 bg-[var(--color-page-void)] p-1 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] text-xs">
                  <button 
                    onclick={() => viewMode = 'maps'}
                    class="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer {viewMode === 'maps' ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]'}"
                  >
                    <Map size={12} />
                    <span>Maps Live</span>
                  </button>
                  <button 
                    onclick={() => viewMode = 'photo'}
                    class="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer {viewMode === 'photo' ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]'}"
                  >
                    <Image size={12} />
                    <span>Foto</span>
                  </button>
                </div>
              </div>

              <div class="w-full h-44 rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-page-void)] relative">
                {#if viewMode === 'maps'}
                  <iframe 
                    title="Google Maps Location"
                    src={getGoogleMapsEmbedUrl(lead?.name, lead?.address)}
                    class="w-full h-full border-0"
                    loading="lazy"
                  ></iframe>
                {:else}
                  {@const photoUrl = getLeadBannerImage(lead)}
                  {#if photoUrl}
                    <img 
                      src={photoUrl} 
                      alt={lead?.name || 'Standort Vorschau'} 
                      onerror={handleImageError}
                      referrerpolicy="no-referrer"
                      class="w-full h-full object-cover" 
                    />
                  {:else}
                    <iframe 
                      title="Google Street View Preview"
                      src={getGoogleStreetViewEmbedUrl(lead?.name, lead?.address)}
                      class="w-full h-full border-0"
                      loading="lazy"
                    ></iframe>
                  {/if}
                {/if}
              </div>
            </div>

            <!-- CARD 3: PRIMARY ANRUF STARTEN TRIGGER BAR -->
            <div class="flex flex-col gap-2 pt-1">
              <button 
                onclick={startCallWorkflow}
                class="w-full py-3.5 rounded-[var(--radius-lg)] bg-[var(--color-accent-emerald)] hover:bg-[#0EA5E9] text-[#052E16] hover:text-white font-[var(--font-excon)] font-bold text-base transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
              >
                <PhoneCall size={20} strokeWidth={2.5} />
                <span>NUMMER KOPIEREN & ANRUF STARTEN</span>
                <kbd class="text-xs font-mono bg-black/20 px-2 py-0.5 rounded ml-1">[C]</kbd>
              </button>

              <button 
                onclick={() => pullNextLead(true)}
                disabled={loadingLead}
                class="w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-panel)] hover:bg-[var(--color-surface-lift)] text-[var(--color-ink-secondary)] hover:text-amber-300 border border-[var(--color-border-subtle)] font-[var(--font-excon)] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <PhoneForwarded size={14} class="text-amber-400" />
                <span>Vorerst überspringen (Lead bleibt in Queue)</span>
                <kbd class="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded opacity-70">[S]</kbd>
              </button>
            </div>

          </div>

          <!-- RIGHT COLUMN (6 COLS): DEDICATED WEBSITE AUDIT & SALES PITCH PANEL -->
          <div class="lg:col-span-6">
            <WebsiteAuditPanel auditData={lead?.auditData} auditScore={lead?.auditScore} />
          </div>

        </div>

      </div>
    </div>

  <!-- ULTRA-INTUITIVE LIVE CALL COCKPIT (1-Click Situational Triggers) -->
  {:else}
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden min-h-0 relative">
      
      <!-- LEFT COLUMN 60% (7 Cols): TELEPROMPTER & SITUATIONAL LEITFADEN SWITCHER -->
      <div class="lg:col-span-7 flex flex-col gap-2.5 overflow-hidden h-full">
        
        <!-- ALWAYS-VISIBLE LIVE LEAD INTELLIGENCE CARD (High-Contrast 3-Column Bento) -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-emerald-border)] rounded-[var(--radius-md)] p-3 flex flex-col gap-2.5 shrink-0 shadow-lg">
          
          <!-- Row 1: Company, Location, Rating & Badges -->
          <div class="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <a 
                href={lead?.googleMapsUrl || getGoogleMapsSearchUrl(lead?.name, lead?.address)}
                target="_blank" 
                rel="noreferrer"
                class="font-[var(--font-excon)] font-bold text-base text-[var(--color-ink-primary)] hover:text-[var(--color-accent-emerald)] transition-colors flex items-center gap-1.5"
                title="Auf Google Maps öffnen"
              >
                <span>{lead?.name || 'Unternehmensname'}</span>
                <ExternalLink size={13} class="text-[var(--color-ink-muted)] hover:text-[var(--color-accent-emerald)]" />
              </a>

              <span class="text-xs font-mono text-[var(--color-ink-muted)]">({lead?.category || lead?.industry})</span>

              {#if lead?.isAd}
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  📢 Sponsored Ad
                </span>
              {/if}

              {#if lead?.isClaimed === false}
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Profil auf Google Maps nicht beansprucht">
                  🔑 GMB Unclaimed Opportunity
                </span>
              {/if}
            </div>

            <div class="flex items-center gap-2.5 text-xs font-mono font-bold text-[var(--color-ink-primary)]">
              <span class="flex items-center gap-1 text-[var(--color-ink-secondary)]">
                <MapPin size={12} class="text-[var(--color-accent-emerald)]" />
                {lead?.address || 'Deutschland'}
              </span>
              <span>•</span>
              <span class="flex items-center gap-1 text-yellow-400">
                <Star size={12} class="fill-yellow-400" /> {lead?.rating || '4.8'} ({lead?.reviews || 0})
              </span>
              {#if lead?.priceLevel}
                <span>•</span>
                <span class="text-[var(--color-accent-emerald)]">{lead.priceLevel}</span>
              {/if}
            </div>
          </div>

          <!-- Row 2: 3-Column Bento Grid for Enriched Intelligence -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            
            <!-- Col 1: Inhaber / Ansprechpartner -->
            <div class="bg-[var(--color-page-void)] p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] flex flex-col gap-1 min-w-0">
              <span class="text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-accent-emerald)] flex items-center gap-1">
                <UserCheck size={12} />
                Inhaber & Ansprechpartner
              </span>

              {#if lead?.decisionMaker}
                {@const dmSource = parsedSources?.decisionMaker}
                <div class="inline-flex items-center gap-1.5 font-bold text-xs text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-2 py-1 rounded border border-[var(--color-accent-emerald)]/30 w-max max-w-full truncate mt-0.5">
                  <span class="truncate">{lead.decisionMaker}</span>
                  {#if dmSource?.fragmentUrl || dmSource?.url}
                    <a href={dmSource.fragmentUrl || dmSource.url} target="_blank" rel="noreferrer" class="text-[var(--color-accent-emerald)] hover:text-white transition-colors shrink-0" title="Beweisquelle auf Impressum öffnen">
                      <ExternalLink size={11} />
                    </a>
                  {/if}
                </div>
              {:else}
                <span class="text-[11px] text-[var(--color-ink-muted)] italic mt-0.5">Kein Inhaber auf Impressum erfasst</span>
              {/if}
            </div>

            <!-- Col 2: Tech Stack & CMS Pill Badges -->
            <div class="bg-[var(--color-page-void)] p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] flex flex-col gap-1 min-w-0">
              <span class="text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-accent-emerald)] flex items-center gap-1">
                <Code size={12} />
                CMS & Tech Stack
              </span>

              {#if lead?.techStack}
                <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {#each parseTechStack(lead.techStack) as tech}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--color-surface-panel)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)] shadow-sm">
                      <span>{tech}</span>
                    </span>
                  {/each}
                </div>
              {:else}
                <span class="text-[11px] text-[var(--color-ink-muted)] italic mt-0.5">Keine CMS Signaturen erkannt</span>
              {/if}
            </div>

            <!-- Col 3: Direktdurchwahlen & E-Mails (Click-to-Copy) -->
            <div class="bg-[var(--color-page-void)] p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] flex flex-col gap-1 font-mono text-[11px] min-w-0">
              <span class="text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-accent-emerald)] flex items-center gap-1 font-sans">
                <Phone size={12} />
                Direkt-Kontakte
              </span>

              <div class="flex flex-col gap-1 mt-0.5">
                <!-- Google Maps Zentrale -->
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[var(--color-ink-secondary)] text-[10px]">Zentrale:</span>
                  <button 
                    onclick={() => copyToClipboard(lead?.phoneNumber, 'gmaps_phone_copy')}
                    class="font-bold text-[var(--color-ink-primary)] hover:text-[var(--color-accent-emerald)] flex items-center gap-1 cursor-pointer"
                    title="Kopieren"
                  >
                    <span>{lead?.phoneNumber || 'N/A'}</span>
                    <Copy size={10} class="text-[var(--color-ink-muted)]" />
                  </button>
                </div>

                <!-- Impressum Direktwahl -->
                {#if lead?.directPhone || lead?.websitePhone}
                  <div class="flex items-center justify-between gap-1 bg-[var(--color-emerald-tint)] px-1.5 py-0.5 rounded border border-[var(--color-accent-emerald)]/30 text-[var(--color-accent-emerald)] font-bold">
                    <span class="text-[10px]">Direkt:</span>
                    <button 
                      onclick={() => copyToClipboard(lead?.directPhone || lead?.websitePhone, 'direct_phone_copy')}
                      class="hover:underline flex items-center gap-1 cursor-pointer truncate"
                      title="Kopieren"
                    >
                      <span class="truncate">{lead?.directPhone || lead?.websitePhone}</span>
                      <Copy size={10} class="shrink-0" />
                    </button>
                  </div>
                {/if}

                <!-- E-Mails -->
                {#if lead?.directEmail || lead?.email}
                  {@const emails = Array.from(new Set([...(lead?.directEmail?.split(/[,\s;]+/) || []), ...(lead?.email?.split(/[,\s;]+/) || [])])).filter(Boolean)}
                  <div class="flex items-start justify-between gap-1 pt-0.5 border-t border-[var(--color-border-subtle)]">
                    <span class="text-[10px] text-[var(--color-ink-muted)]">Mail:</span>
                    <div class="flex flex-col text-right truncate">
                      {#each emails as singleEmail}
                        <a href={`mailto:${singleEmail}`} class="text-[var(--color-accent-emerald)] hover:underline truncate max-w-[140px]">
                          {singleEmail}
                        </a>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>

          </div>

        </div>
        
        <!-- SITUATIONAL QUICK TRIGGER TILES (1-Click Switcher based on "In welcher Situation bin ich gerade?") -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-2 flex flex-col gap-1.5 shrink-0 shadow-sm">
          
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1">
              <Zap size={11} class="text-[var(--color-accent-emerald)]" /> Anruf-Situation wählen (1-Klick)
            </span>
            <span class="text-[10px] font-mono text-[var(--color-accent-emerald)] font-bold">
              {selectedGuideData.title}
            </span>
          </div>

          <!-- 1-Click Situational Trigger Bar -->
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1">
            {#each situationalGuideTriggers as trig}
              {@const isSelected = selectedGuideId === trig.id}
              <button
                onclick={() => { selectedGuideId = trig.id; activeScriptStage = 1; }}
                class="p-1.5 rounded-[var(--radius-sm)] border text-left flex flex-col gap-0.5 transition-all cursor-pointer truncate active:scale-95 {isSelected ? 'bg-[var(--color-accent-emerald)] text-[#052E16] border-[var(--color-accent-emerald)] shadow-sm' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white hover:border-[var(--color-border-focus)]'}"
                title={trig.desc}
              >
                <div class="flex items-center gap-1 text-[11px] font-[var(--font-excon)] font-bold truncate">
                  <span>{trig.icon}</span>
                  <span class="truncate">{trig.label}</span>
                </div>
              </button>
            {/each}
          </div>

        </div>

        <!-- STAGE STEPPER NAVIGATION (Slim Horizontal Bar) -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-1 flex items-center justify-between gap-1 shrink-0">
          {#each currentGuideStages as st, idx}
            {@const isAct = activeScriptStage === idx + 1}
            <button 
              onclick={() => activeScriptStage = idx + 1}
              class="flex-1 py-1.5 px-2 rounded-[var(--radius-sm)] text-[11px] font-[var(--font-excon)] font-bold transition-all text-center cursor-pointer truncate {isAct ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'text-[var(--color-ink-muted)] hover:text-white'}"
            >
              {st.title.replace('STAGE ', '').replace('PHASE ', '')}
            </button>
          {/each}
        </div>

        <!-- MAIN TELEPROMPTER CARD (Massive typography & maximum breathing room!) -->
        <div class="flex-1 bg-[var(--color-surface-panel)] border border-[var(--color-border-focus)] rounded-[var(--radius-lg)] p-5 md:p-6 flex flex-col justify-between gap-4 shadow-xl overflow-hidden relative">
          
          <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <div class="flex items-center gap-2 truncate">
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-emerald)] animate-pulse shrink-0"></span>
              <span class="text-xs font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-accent-emerald)] truncate">
                {currentStageData.title}
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <button 
                onclick={() => activeScriptStage = Math.max(1, activeScriptStage - 1)}
                disabled={activeScriptStage === 1}
                class="p-1 rounded bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white disabled:opacity-30 cursor-pointer"
                title="Vorherige Stufe (Shift+Tab)"
              >
                <ArrowLeft size={13} />
              </button>

              <button 
                onclick={() => activeScriptStage = Math.min(currentGuideStages.length, activeScriptStage + 1)}
                disabled={activeScriptStage === currentGuideStages.length}
                class="p-1 rounded bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white disabled:opacity-30 cursor-pointer"
                title="Nächste Stufe (Tab)"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <!-- Ultra-readable Teleprompter Text -->
          <div class="flex-1 flex flex-col items-center justify-center p-3 text-center gap-5 my-auto">
            <p class="text-2xl md:text-3xl text-[var(--color-ink-primary)] font-light leading-relaxed tracking-wide max-w-2xl">
              {@html currentStageData.wording
                .replace(/\*\*(.*?)\*\*/g, '<mark class="bg-[rgba(16,185,129,0.18)] text-[var(--color-accent-emerald)] px-2.5 py-0.5 rounded font-bold">$1</mark>')
                .replace(/\*(.*?)\*/g, '<em class="italic text-[var(--color-status-amber)] font-medium">$1</em>')}
            </p>

            <div class="p-2.5 rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-xs text-[var(--color-status-amber)] max-w-xl font-medium">
              💡 {currentStageData.tip}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2.5 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-ink-muted)] font-mono">
            <span>Drücke <kbd class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded text-[var(--color-ink-primary)]">Tab</kbd> für nächsten Schritt</span>
            <button 
              onclick={() => activeScriptStage = Math.min(currentGuideStages.length, activeScriptStage + 1)}
              class="px-3 py-1 rounded bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] text-[var(--color-accent-emerald)] font-[var(--font-excon)] font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Weiter zu Stufe {Math.min(currentGuideStages.length, activeScriptStage + 1)}</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </div>

        <!-- CLEAN IN-CALL NOTES DOCK -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-2.5 flex flex-col gap-1.5 shrink-0">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1">
              <FileText size={12} /> Live Anruf-Notiz
            </span>
            <span class="text-[10px] text-[var(--color-ink-muted)] font-mono">
              Wird bei Disposition im Header automatisch in DB gespeichert
            </span>
          </div>

          <textarea
            bind:value={callOutcomeNotes}
            placeholder="Ergebnis eintragen (z.B. GK sehr nett, GF wünscht Angebot per Mail, Termin vereinbart)..."
            class="w-full h-12 bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)] rounded-[var(--radius-sm)] p-2 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] focus:outline-none resize-none leading-relaxed"
          ></textarea>
        </div>

      </div>

      <!-- RIGHT COLUMN 40% (5 Cols): 1-CLICK INSTANT OBJECTION SOUNDBOARD -->
      <div class="lg:col-span-5 flex flex-col bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden h-full">
        
        <!-- TOP TABS -->
        <div class="flex border-b border-[var(--color-border-subtle)] bg-[var(--color-page-void)] shrink-0">
          <button 
            onclick={() => activeRightTab = 'objections'}
            class="flex-1 py-2 px-2 text-xs font-[var(--font-excon)] font-bold transition-all flex items-center justify-center gap-1 border-b-2 cursor-pointer {activeRightTab === 'objections' ? 'border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)] bg-[var(--color-surface-panel)]' : 'border-transparent text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
          >
            <Zap size={13} />
            <span>Einwände</span>
          </button>

          <button 
            onclick={() => activeRightTab = 'arguments'}
            class="flex-1 py-2 px-2 text-xs font-[var(--font-excon)] font-bold transition-all flex items-center justify-center gap-1 border-b-2 cursor-pointer {activeRightTab === 'arguments' ? 'border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)] bg-[var(--color-surface-panel)]' : 'border-transparent text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
          >
            <Check size={13} />
            <span>WaaS Argumente</span>
          </button>

          <button 
            onclick={() => activeRightTab = 'audit'}
            class="flex-1 py-2 px-2 text-xs font-[var(--font-excon)] font-bold transition-all flex items-center justify-center gap-1 border-b-2 cursor-pointer {activeRightTab === 'audit' ? 'border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)] bg-[var(--color-surface-panel)]' : 'border-transparent text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
          >
            <ShieldAlert size={13} />
            <span>Audit</span>
          </button>

          <button 
            onclick={() => activeRightTab = 'ai'}
            class="flex-1 py-2 px-2 text-xs font-[var(--font-excon)] font-bold transition-all flex items-center justify-center gap-1 border-b-2 cursor-pointer {activeRightTab === 'ai' ? 'border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)] bg-[var(--color-surface-panel)]' : 'border-transparent text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
          >
            <Sparkles size={13} />
            <span>AI Assist</span>
          </button>
        </div>

        <!-- TAB 1: 1-CLICK INSTANT OBJECTION SOUNDBOARD -->
        {#if activeRightTab === 'objections'}
          <div class="flex-1 p-3 flex flex-col gap-2.5 overflow-hidden">
            
            <!-- 1-CLICK HIGH-PRIORITY LIVE OBJECTION SOUNDBOARD TILES -->
            <div class="flex flex-col gap-1.5 shrink-0 bg-[var(--color-page-void)] p-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]">
              <span class="text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1">
                ⚡ Einwand wählen (1-Klick)
              </span>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {#each instantObjectionTriggers as trig}
                  {@const isSelected = selectedObjectionId === trig.id}
                  <button
                    onclick={() => { selectedObjectionId = trig.id; selectedResponseIndex = 0; }}
                    class="p-1.5 rounded-[var(--radius-sm)] border text-left flex flex-col gap-0.5 transition-all cursor-pointer truncate active:scale-95 {isSelected ? 'bg-[var(--color-accent-emerald)] text-[#052E16] border-[var(--color-accent-emerald)] shadow-sm' : 'bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white hover:border-[var(--color-border-focus)]'}"
                    title={trig.desc}
                  >
                    <div class="flex items-center gap-1 text-[11px] font-[var(--font-excon)] font-bold truncate">
                      <span>{trig.icon}</span>
                      <span class="truncate">{trig.label}</span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- DOMINANT FOCUS ON THE SELECTED OBJECTION RESPONSE & FORMULA -->
            <div class="flex-1 bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-3.5 flex flex-col justify-between gap-3 overflow-y-auto shadow-inner">
              
              <div class="flex flex-col gap-2.5">
                <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] uppercase truncate">
                      {selectedObjection.category}
                    </span>
                    <span class="text-[10px] font-mono text-[var(--color-ink-muted)] truncate">
                      Trigger: "{selectedObjection.trigger}"
                    </span>
                  </div>
                  
                  <button 
                    onclick={() => copyToClipboard(`${currentObjectionResponse.airbag} ${currentObjectionResponse.reframing} ${currentObjectionResponse.cta}`, 'counter_main')}
                    class="text-[11px] text-[var(--color-ink-muted)] hover:text-white flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                  >
                    {#if copiedSnippetId === 'counter_main'}
                      <Check size={12} class="text-[var(--color-accent-emerald)]" />
                      <span class="text-[var(--color-accent-emerald)]">Kopiert!</span>
                    {:else}
                      <Copy size={12} />
                      <span>Kopieren</span>
                    {/if}
                  </button>
                </div>

                <!-- Phrasing Variant Selector Pills -->
                {#if selectedObjection.responses.length > 1}
                  <div class="flex items-center gap-1 bg-[var(--color-surface-panel)] p-1 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] overflow-x-auto no-scrollbar">
                    {#each selectedObjection.responses as resp, idx}
                      {@const isSel = selectedResponseIndex === idx}
                      <button 
                        onclick={() => selectedResponseIndex = idx}
                        class="px-2 py-0.5 text-[10px] font-[var(--font-excon)] font-bold rounded transition-all text-center cursor-pointer shrink-0 {isSel ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'text-[var(--color-ink-muted)] hover:text-white'}"
                      >
                        Var. {idx + 1}: {resp.variant}
                      </button>
                    {/each}
                  </div>
                {/if}

                <!-- Structured 3-Step Formula Card: Airbag -> Reframing -> CTA -->
                <div class="flex flex-col gap-2.5 pt-1">
                  <!-- Airbag (Entschärfen) -->
                  <div class="p-2.5 rounded bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.25)] flex flex-col gap-0.5">
                    <span class="text-[10px] font-bold text-[var(--color-status-cyan)] uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert size={11} /> 1. Entschärfen / Airbag
                    </span>
                    <p class="text-xs text-[var(--color-ink-primary)] leading-relaxed italic">
                      "{@html resolveLeadPlaceholders(currentObjectionResponse.airbag, lead, true)}"
                    </p>
                  </div>

                  <!-- Reframing (Umrahmen) -->
                  <div class="p-2.5 rounded bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] flex flex-col gap-0.5">
                    <span class="text-[10px] font-bold text-[var(--color-status-amber)] uppercase tracking-wider flex items-center gap-1">
                      <RefreshCw size={11} /> 2. Perspektivenwechsel / Reframing
                    </span>
                    <p class="text-xs text-[var(--color-ink-primary)] leading-relaxed font-light">
                      "{@html resolveLeadPlaceholders(currentObjectionResponse.reframing, lead, true)}"
                    </p>
                  </div>

                  <!-- CTA (Micro-Commitment) -->
                  <div class="p-2.5 rounded bg-[var(--color-emerald-tint)] border border-[var(--color-emerald-border)] flex flex-col gap-0.5">
                    <span class="text-[10px] font-bold text-[var(--color-accent-emerald)] uppercase tracking-wider flex items-center gap-1">
                      <Target size={11} /> 3. Niedrigschwellige CTA-Frage
                    </span>
                    <p class="text-xs text-white font-medium leading-relaxed">
                      "{@html resolveLeadPlaceholders(currentObjectionResponse.cta, lead, true)}"
                    </p>
                  </div>
                </div>

              </div>

              <div class="text-[10px] text-[var(--color-ink-muted)] font-mono flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2">
                <span>Variante: {currentObjectionResponse.variant}</span>
                <span>Airbag → Reframing → CTA</span>
              </div>
            </div>



          </div>
        {/if}

        <!-- TAB 2: VERKAUFSARGUMENTE -->
        {#if activeRightTab === 'arguments'}
          <div class="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto">
            <span class="text-xs font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Kern-Verkaufsargumente</span>
            <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1">
              <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)]">WaaS Modell (Kein Risiko)</span>
              <p class="text-xs text-[var(--color-ink-primary)] leading-relaxed font-light">Keine 5.000€+ Einmalinvestition. Kleine monatliche Service-Pauschale inkl. Hosting, Wartung & fortlaufender Optimierung.</p>
            </div>
            <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1">
              <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)]">Planbare Kunden-Pipeline</span>
              <p class="text-xs text-[var(--color-ink-primary)] leading-relaxed font-light">Wir verwandeln die Website von einer trägen Visitenkarte in eine aktive 24/7 Akquise-Maschine.</p>
            </div>
            <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1">
              <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)]">Schlüsselfertig in 48 Stunden</span>
              <p class="text-xs text-[var(--color-ink-primary)] leading-relaxed font-light">Keine monatelangen Agentur-Schleifen. Wir liefern die fertige Conversion-Seite sofort.</p>
            </div>
          </div>
        {/if}

        <!-- TAB 3: WEBSITE AUDIT -->
        {#if activeRightTab === 'audit'}
          <div class="flex-1 p-3 overflow-y-auto">
            <WebsiteAuditPanel auditData={lead?.auditData} auditScore={lead?.auditScore} />
          </div>
        {/if}

        <!-- TAB 3: AI CO-PILOT -->
        {#if activeRightTab === 'ai'}
          <div class="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
            <div class="flex items-center gap-2 text-xs font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)]">
              <Sparkles size={14} />
              <span>AI Co-Pilot Live Assist</span>
            </div>

            <div class="flex flex-col gap-2">
              <textarea
                bind:value={aiQuery}
                placeholder="z.B. 'Der Kunde sagt: Wir machen das alles inhouse'..."
                class="w-full h-16 bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-border-focus)] resize-none"
              ></textarea>
              <button 
                onclick={handleAiAsk}
                disabled={aiLoading || !aiQuery.trim()}
                class="w-full py-2 rounded-[var(--radius-md)] bg-[var(--color-accent-emerald)] text-[#052E16] text-xs font-[var(--font-excon)] font-bold hover:bg-[#0EA5E9] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {aiLoading ? 'Generiere Konter...' : 'Einwand-Konter generieren'}
              </button>
            </div>

            {#if aiResponse}
              <div class="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-emerald-border)] flex flex-col gap-2 relative">
                <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                  <span class="text-[10px] font-[var(--font-excon)] font-bold uppercase text-[var(--color-accent-emerald)] flex items-center gap-1">
                    <Sparkles size={12} /> Live KI-Antwort:
                  </span>
                  
                  <button 
                    onclick={() => copyToClipboard(aiResponse || '', 'ai_copy')}
                    class="text-[11px] text-[var(--color-ink-muted)] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {#if copiedSnippetId === 'ai_copy'}
                      <Check size={12} class="text-[var(--color-accent-emerald)]" />
                      <span class="text-[var(--color-accent-emerald)]">Kopiert!</span>
                    {:else}
                      <Copy size={12} />
                      <span>Kopieren</span>
                    {/if}
                  </button>
                </div>

                <div class="text-xs text-[var(--color-ink-primary)] leading-relaxed font-light flex flex-col gap-1">
                  {@html renderMarkdown(aiResponse)}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- WIEDERVORLAGE MODAL POPOVER -->
  {#if showWiedervorlageModal}
    <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-[var(--color-surface-panel)] border border-[var(--color-border-focus)] rounded-[var(--radius-lg)] p-6 flex flex-col gap-5 shadow-2xl">
        
        <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center text-[var(--color-status-amber)]">
              <Calendar size={18} />
            </div>
            <div>
              <h3 class="text-base font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">Wiedervorlage Terminieren</h3>
              <p class="text-xs text-[var(--color-ink-secondary)]">{lead?.name || 'Aktueller Lead'}</p>
            </div>
          </div>
          <button onclick={() => showWiedervorlageModal = false} class="text-[var(--color-ink-muted)] hover:text-white p-1 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">Schnell-Auswahl Datum & Uhrzeit</span>
          
          <div class="grid grid-cols-2 gap-2">
            <button 
              onclick={() => selectedCallbackOption = 'tomorrow_10'}
              class="p-2.5 rounded-[var(--radius-md)] border text-xs font-[var(--font-general-sans)] font-medium text-left transition-all cursor-pointer {selectedCallbackOption === 'tomorrow_10' ? 'bg-[var(--color-accent-emerald)]/15 border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white'}"
            >
              Morgen um 10:00 Uhr
            </button>

            <button 
              onclick={() => selectedCallbackOption = 'tomorrow_14'}
              class="p-2.5 rounded-[var(--radius-md)] border text-xs font-[var(--font-general-sans)] font-medium text-left transition-all cursor-pointer {selectedCallbackOption === 'tomorrow_14' ? 'bg-[var(--color-accent-emerald)]/15 border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white'}"
            >
              Morgen um 14:00 Uhr
            </button>

            <button 
              onclick={() => selectedCallbackOption = 'in_2_days'}
              class="p-2.5 rounded-[var(--radius-md)] border text-xs font-[var(--font-general-sans)] font-medium text-left transition-all cursor-pointer {selectedCallbackOption === 'in_2_days' ? 'bg-[var(--color-accent-emerald)]/15 border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white'}"
            >
              In 2 Tagen (10:00)
            </button>

            <button 
              onclick={() => selectedCallbackOption = 'next_monday'}
              class="p-2.5 rounded-[var(--radius-md)] border text-xs font-[var(--font-general-sans)] font-medium text-left transition-all cursor-pointer {selectedCallbackOption === 'next_monday' ? 'bg-[var(--color-accent-emerald)]/15 border-[var(--color-accent-emerald)] text-[var(--color-accent-emerald)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white'}"
            >
              Nächsten Montag (10:00)
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex-1 flex flex-col gap-1">
            <span class="text-[11px] font-[var(--font-mono)] text-[var(--color-ink-muted)]">Benutzerdefiniertes Datum:</span>
            <input 
              type="date" 
              bind:value={customCallbackDate}
              onfocus={() => selectedCallbackOption = 'custom'}
              class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-2 text-xs text-[var(--color-ink-primary)] focus:outline-none"
            />
          </div>
          <div class="w-32 flex flex-col gap-1">
            <span class="text-[11px] font-[var(--font-mono)] text-[var(--color-ink-muted)]">Uhrzeit:</span>
            <input 
              type="time" 
              bind:value={customCallbackTime}
              onfocus={() => selectedCallbackOption = 'custom'}
              class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-2 text-xs text-[var(--color-ink-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">Wiedervorlage-Hinweis</span>
          <textarea
            bind:value={wiedervorlageNotes}
            placeholder="z.B. Herrn Becker persönlich verlangen wegen 20% Rabatt Angebot..."
            class="w-full h-20 bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] focus:outline-none resize-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border-subtle)]">
          <button 
            onclick={() => showWiedervorlageModal = false}
            class="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-ink-secondary)] hover:text-white cursor-pointer"
          >
            Abbrechen
          </button>

          <button 
            onclick={handleWiedervorlageSubmit}
            disabled={submittingOutcome}
            class="px-5 py-2 rounded-[var(--radius-md)] bg-[var(--color-status-amber)] text-black text-xs font-[var(--font-excon)] font-bold hover:bg-yellow-400 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Calendar size={14} />
            <span>Wiedervorlage Speichern & Re-Queue</span>
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- TARGETING & STRATEGY SELECTION MODAL -->
  {#if showFilterModal}
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-6 flex flex-col gap-5 shadow-2xl relative">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div class="flex items-center gap-2">
            <Target size={18} class="text-[var(--color-accent-emerald)]" />
            <h3 class="text-sm font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">
              Anruf-Targeting & Akquise-Strategie
            </h3>
          </div>
          <button onclick={() => showFilterModal = false} class="p-1 rounded bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] text-[var(--color-ink-muted)] hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <!-- Filter Controls Grid -->
        <div class="flex flex-col gap-4 text-xs">
          
          <!-- 1. Industry / Category Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] flex items-center gap-1.5">
              <Building2 size={13} class="text-[var(--color-accent-emerald)]" />
              Ziel-Branche / Nische
            </label>
            <select 
              bind:value={filterCategory}
              class="w-full bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--color-ink-primary)] font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Alle Branchen (Ungefiltert)</option>
              <option value="gastro">Gastro, Bars & Restaurants</option>
              <option value="handwerk">Handwerk, Bau & Sanitär</option>
              <option value="praxis">Praxen, Ärzte & Gesundheit</option>
              <option value="b2b">B2B, Beratung & Dienstleister</option>
            </select>
          </div>

          <!-- 2. Website Audit Score Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] flex items-center gap-1.5">
              <ShieldAlert size={13} class="text-[var(--color-status-amber)]" />
              Website Audit-Qualität
            </label>
            <select 
              bind:value={filterAuditScore}
              class="w-full bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-status-amber)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--color-ink-primary)] font-medium focus:outline-none cursor-pointer"
            >
              <option value={null}>Alle Webseiten (Ungefiltert)</option>
              <option value={50}>Kritische Mängel (Score &lt; 50) — Perfekt für Kaltakquise</option>
              <option value={75}>Ausbaufähig (Score &lt; 75)</option>
              <option value={-1}>Ohne eigene Website (No-Site Leads)</option>
            </select>
          </div>

          <!-- 3. Sort & Order Strategy -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] flex items-center gap-1.5">
              <ArrowUpDown size={13} class="text-[var(--color-status-cyan)]" />
              Reihenfolge & Zieh-Strategie
            </label>
            <select 
              bind:value={filterSortStrategy}
              class="w-full bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-status-cyan)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--color-ink-primary)] font-medium focus:outline-none cursor-pointer"
            >
              <option value="priority">Auto-Priority (Wiedervorlagen zuerst)</option>
              <option value="random">Zufällig (Random Mixture)</option>
              <option value="rating">Höchste Google-Bewertungen</option>
              <option value="reviews">Meiste Google-Rezensionen</option>
              <option value="audit_lowest">Schlechteste Website-Score zuerst</option>
              <option value="unclaimed">Unbeanspruchte Google-Profile zuerst</option>
            </select>
          </div>

          <!-- 4. Direct Impressum Phone Only -->
          <label class="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] cursor-pointer">
            <div class="flex items-center gap-2">
              <PhoneCall size={14} class="text-[var(--color-accent-emerald)]" />
              <span class="text-xs text-[var(--color-ink-primary)] font-semibold">Nur Leads mit Impressum-Direktwahl</span>
            </div>
            <input type="checkbox" bind:checked={filterHasDirectPhone} class="rounded text-[var(--color-accent-emerald)] cursor-pointer" />
          </label>

        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-4">
          <button 
            onclick={() => showFilterModal = false}
            class="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            Abbrechen
          </button>

          <button 
            onclick={applyFiltersAndPull}
            class="px-5 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent-emerald)] hover:bg-[#0EA5E9] text-[#052E16] hover:text-white font-[var(--font-excon)] font-bold text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Strategie Anwenden & Lead Ziehen</span>
          </button>
        </div>

      </div>
    </div>
  {/if}

</div>
