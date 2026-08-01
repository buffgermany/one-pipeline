<script lang="ts">
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import UploadCloud from 'lucide-svelte/icons/upload-cloud';
  import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
  import XCircle from 'lucide-svelte/icons/x-circle';
  import Loader2 from 'lucide-svelte/icons/loader-2';
  import FileSpreadsheet from 'lucide-svelte/icons/file-spreadsheet';
  import UserPlus from 'lucide-svelte/icons/user-plus';
  import Building2 from 'lucide-svelte/icons/building-2';
  import Phone from 'lucide-svelte/icons/phone';
  import PhoneCall from 'lucide-svelte/icons/phone-call';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Star from 'lucide-svelte/icons/star';
  import FileText from 'lucide-svelte/icons/file-text';
  import Tag from 'lucide-svelte/icons/tag';
  import Search from 'lucide-svelte/icons/search';
  import Globe from 'lucide-svelte/icons/globe';
  import Mail from 'lucide-svelte/icons/mail';
  import Download from 'lucide-svelte/icons/download';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import Square from 'lucide-svelte/icons/square';
  import Share2 from 'lucide-svelte/icons/share-2';
  import Save from 'lucide-svelte/icons/save';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Copy from 'lucide-svelte/icons/copy';
  import Check from 'lucide-svelte/icons/check';
  import Filter from 'lucide-svelte/icons/filter';
  import History from 'lucide-svelte/icons/history';
  import X from 'lucide-svelte/icons/x';
  import ArrowRight from 'lucide-svelte/icons/arrow-right';
  import Database from 'lucide-svelte/icons/database';
  import Layers from 'lucide-svelte/icons/layers';
  import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
  import UserCheck from 'lucide-svelte/icons/user-check';
  import Code from 'lucide-svelte/icons/code';
  import ExternalLink from 'lucide-svelte/icons/external-link';

  // Mode switcher: 'gmaps' | 'file' | 'manual'
  let activeTab = $state<'gmaps' | 'file' | 'manual'>('gmaps');

  // History Drawer State
  let isHistoryOpen = $state(false);

  // Top KPI Dashboard Stats
  let totalLeadsInDb = $state(0);
  let importedTodayCount = $state(0);
  let statsLoading = $state(true);

  // Local Storage Cache Key
  const CACHE_KEY = 'buff_one_scraped_cache';

  // Copy Feedback Toast State
  let copyToastMessage = $state<string | null>(null);

  function showCopyToast(msg: string) {
    copyToastMessage = msg;
    setTimeout(() => {
      copyToastMessage = null;
    }, 2500);
  }

  function copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showCopyToast(`${label} in Zwischenablage kopiert!`);
  }

  // ==========================================
  // GOOGLE MAPS LIVE SCRAPER STATE & LOGIC
  // ==========================================
  let gmapsQuery = $state('Zahnarzt 10115 Berlin');
  let gmapsMaxScrolls = $state(3);
  let gmapsEnrichWebsites = $state(true);
  let gmapsIndustry = $state('Praxen & Gewerbe');
  let gmapsStatus = $state<'idle' | 'scraping' | 'stopped' | 'success' | 'error'>('idle');
  let gmapsLeads = $state<any[]>([]);
  let gmapsError = $state<string | null>(null);
  let isSavingToQueue = $state(false);
  let saveSuccessMessage = $state<string | null>(null);

  // Scraper Progress Stages
  let progressPercent = $state(0);
  let progressStatusText = $state('');
  let currentStage = $state<1 | 2 | 3 | 4>(1);
  let stageDetails = $state({
    stage1: 'Warte auf Start...',
    stage2: 'Google Maps Suche & Scroll-Extraktion',
    stage3: 'Impressum & Direct Contact Crawling'
  });

  // Table Controls & Duplicate Map for Scraped Leads
  let selectedLeadIds = $state<string[]>([]);
  let gmapsFilter = $state<'all' | 'email' | 'phone' | 'dm' | 'cms' | 'duplicates'>('all');
  let gmapsSearchTerm = $state('');
  let gmapsDuplicates = $state<Record<string, { reason: string; matchedLead: any }>>({});
  let gmapsDuplicatesCount = $derived(Object.keys(gmapsDuplicates).length);

  let abortController = $state<AbortController | null>(null);

  // Quick Preset Queries
  const PRESET_QUERIES = [
    'Zahnarzt 10115 Berlin',
    'Sanitär Notdienst München',
    'Tischler Hamburg',
    'Steuerberater Frankfurt',
    'Physiotherapie Köln'
  ];

  async function checkScrapedDuplicates(leadsToCheck: any[]) {
    if (leadsToCheck.length === 0) {
      gmapsDuplicates = {};
      return;
    }
    try {
      const res = await fetch('/api/leads/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: leadsToCheck })
      });
      if (res.ok) {
        const data = await res.json();
        const dupMap: Record<string, { reason: string; matchedLead: any }> = {};
        const dupNames: string[] = [];

        if (data.duplicates) {
          Object.entries(data.duplicates).forEach(([idxStr, info]: [string, any]) => {
            const idx = Number(idxStr);
            if (leadsToCheck[idx]) {
              const name = leadsToCheck[idx].name;
              dupMap[name] = info;
              dupNames.push(name);
            }
          });
        }
        gmapsDuplicates = dupMap;

        // Automatically DESELECT duplicates from selectedLeadIds by default
        selectedLeadIds = leadsToCheck
          .map(l => l.name)
          .filter(name => !dupNames.includes(name));
      }
    } catch (e) {
      console.error('Failed to check scraped duplicates:', e);
    }
  }

  // Derived Filtered Scraped Leads
  let filteredGmapsLeads = $derived.by(() => {
    let list = gmapsLeads;

    // Apply Search Term
    if (gmapsSearchTerm.trim() !== '') {
      const q = gmapsSearchTerm.toLowerCase().trim();
      list = list.filter(l =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.decisionMaker && l.decisionMaker.toLowerCase().includes(q)) ||
        (l.techStack && l.techStack.toLowerCase().includes(q)) ||
        (l.phoneNumber && l.phoneNumber.toLowerCase().includes(q)) ||
        (l.websitePhone && l.websitePhone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.address && l.address.toLowerCase().includes(q))
      );
    }

    // Apply Filter Pills
    if (gmapsFilter === 'email') {
      list = list.filter(l => (l.email && l.email.trim() !== '') || (l.directEmail && l.directEmail.trim() !== ''));
    } else if (gmapsFilter === 'phone') {
      list = list.filter(l => (l.websitePhone && l.websitePhone.trim() !== '') || (l.directPhone && l.directPhone.trim() !== ''));
    } else if (gmapsFilter === 'dm') {
      list = list.filter(l => l.decisionMaker && l.decisionMaker.trim() !== '');
    } else if (gmapsFilter === 'cms') {
      list = list.filter(l => l.techStack && l.techStack.trim() !== '' && !l.techStack.includes('Other'));
    } else if (gmapsFilter === 'duplicates') {
      list = list.filter(l => Boolean(gmapsDuplicates[l.name]));
    }

    return list;
  });

  // Derived Stats for Scraped Batch
  let enrichedEmailCount = $derived(gmapsLeads.filter(l => l.email && l.email.trim() !== '').length);
  let enrichedPhoneCount = $derived(gmapsLeads.filter(l => l.websitePhone && l.websitePhone.trim() !== '').length);
  let enrichedDmCount = $derived(gmapsLeads.filter(l => l.decisionMaker && l.decisionMaker.trim() !== '').length);
  let enrichedCmsCount = $derived(gmapsLeads.filter(l => l.techStack && l.techStack.trim() !== '' && !l.techStack.includes('Other')).length);

  let isAllSelected = $derived(
    filteredGmapsLeads.length > 0 &&
    filteredGmapsLeads.every(l => selectedLeadIds.includes(l.name))
  );

  function toggleSelectAll() {
    if (isAllSelected) {
      selectedLeadIds = [];
    } else {
      selectedLeadIds = filteredGmapsLeads.map(l => l.name);
    }
  }

  function toggleSelectLead(name: string) {
    if (selectedLeadIds.includes(name)) {
      selectedLeadIds = selectedLeadIds.filter(id => id !== name);
    } else {
      selectedLeadIds = [...selectedLeadIds, name];
    }
  }

  function removeLeadFromScraped(name: string) {
    gmapsLeads = gmapsLeads.filter(l => l.name !== name);
    selectedLeadIds = selectedLeadIds.filter(id => id !== name);
    delete gmapsDuplicates[name];
    persistCache();
  }

  function persistCache() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          gmapsQuery,
          gmapsLeads,
          progressPercent,
          progressStatusText,
          gmapsStatus,
          gmapsIndustry,
          gmapsDuplicates
        }));
      }
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  }

  function loadCache() {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.gmapsLeads && Array.isArray(parsed.gmapsLeads) && parsed.gmapsLeads.length > 0) {
            gmapsQuery = parsed.gmapsQuery || gmapsQuery;
            gmapsLeads = parsed.gmapsLeads;
            progressPercent = parsed.progressPercent || 100;
            progressStatusText = parsed.progressStatusText || 'Aus Cache geladen';
            gmapsStatus = parsed.gmapsStatus === 'scraping' ? 'success' : (parsed.gmapsStatus || 'success');
            gmapsIndustry = parsed.gmapsIndustry || gmapsIndustry;
            gmapsDuplicates = parsed.gmapsDuplicates || {};
            selectedLeadIds = gmapsLeads
              .map(l => l.name)
              .filter(name => !gmapsDuplicates[name]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore from localStorage:', e);
    }
  }

  function clearScrapedCache() {
    gmapsStatus = 'idle';
    gmapsLeads = [];
    gmapsDuplicates = {};
    progressPercent = 0;
    progressStatusText = '';
    saveSuccessMessage = null;
    gmapsError = null;
    selectedLeadIds = [];
    currentStage = 1;
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {}
  }

  async function startGmapsScraper() {
    if (!gmapsQuery.trim()) return;

    gmapsStatus = 'scraping';
    gmapsError = null;
    saveSuccessMessage = null;
    gmapsLeads = [];
    gmapsDuplicates = {};
    selectedLeadIds = [];
    progressPercent = 5;
    currentStage = 1;
    progressStatusText = 'Starte Smart Scraper Engine...';
    stageDetails.stage1 = 'Suchanfrage wird initialisiert...';
    stageDetails.stage2 = 'Bereite Google Maps Extraktion vor...';
    stageDetails.stage3 = 'Impressum & Dynamic Link Parser bereit';
    persistCache();

    abortController = new AbortController();

    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [gmapsQuery.trim()],
          maxScrolls: gmapsMaxScrolls,
          enrichWebsites: gmapsEnrichWebsites,
          industry: gmapsIndustry
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response stream unavailable');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.replace(/^data: /, ''));

              if (event.type === 'progress') {
                progressPercent = event.percent;
                progressStatusText = event.statusText;

                if (event.percent < 30) {
                  currentStage = 1;
                  stageDetails.stage1 = event.statusText;
                } else if (event.percent < 75) {
                  currentStage = 2;
                  stageDetails.stage2 = event.statusText;
                } else {
                  currentStage = 3;
                  stageDetails.stage3 = event.statusText;
                }
              } else if (event.type === 'lead') {
                gmapsLeads = [...gmapsLeads, event.lead];
                persistCache();
              } else if (event.type === 'complete') {
                gmapsLeads = event.leads || gmapsLeads;
                gmapsStatus = event.aborted ? 'stopped' : 'success';
                progressPercent = 100;
                currentStage = 4;
                progressStatusText = event.aborted ? 'Manuell gestoppt' : 'Erfolgreich abgeschlossen!';
                stageDetails.stage3 = 'Smart Anreicherung abgeschlossen!';

                await checkScrapedDuplicates(gmapsLeads);

                persistCache();
                await fetchDashboardStats();
                await fetchHistory();
              } else if (event.type === 'error') {
                gmapsError = event.error;
                gmapsStatus = 'error';
                persistCache();
              }
            } catch {
              // Ignore line parse errors
            }
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        gmapsStatus = 'stopped';
        progressPercent = 100;
        progressStatusText = 'Scraper manuell gestoppt.';
        await checkScrapedDuplicates(gmapsLeads);
        persistCache();
        await fetchHistory();
      } else {
        gmapsError = err.message || 'Fehler beim Scraper-Aufruf.';
        gmapsStatus = 'error';
        persistCache();
      }
    } finally {
      abortController = null;
    }
  }

  function stopGmapsScraper() {
    if (abortController) {
      abortController.abort();
    }
  }

  async function saveGmapsLeadsToQueue() {
    const leadsToSave = gmapsLeads.filter(l => selectedLeadIds.includes(l.name));
    if (leadsToSave.length === 0) return;

    isSavingToQueue = true;
    saveSuccessMessage = null;

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importedLeads: leadsToSave.map(l => ({
            name: l.name,
            phoneNumber: l.phoneNumber || 'N/A',
            websitePhone: l.websitePhone || null,
            directPhone: l.directPhone || null,
            decisionMaker: l.decisionMaker || null,
            techStack: l.techStack || null,
            industry: gmapsIndustry,
            category: l.category || gmapsIndustry,
            website: l.website || null,
            email: l.email || null,
            directEmail: l.directEmail || null,
            facebook: l.facebook || null,
            instagram: l.instagram || null,
            linkedin: l.linkedin || null,
            address: l.address || null,
            rating: l.rating || null,
            reviews: l.reviews || null,
            placeId: l.placeId || null
          })),
          filename: `G-Maps Scraper: ${gmapsQuery}`
        })
      });

      if (res.ok) {
        saveSuccessMessage = `${leadsToSave.length} ausgewählte Leads wurden erfolgreich in der Queue gespeichert!`;
        await fetchDashboardStats();
        await fetchHistory();
      } else {
        gmapsError = 'Fehler beim Speichern in die Queue.';
      }
    } catch (e: any) {
      gmapsError = 'Fehler beim Speichern: ' + e.message;
    } finally {
      isSavingToQueue = false;
    }
  }

  function downloadScrapedJson() {
    const leadsToExport = gmapsLeads.filter(l => selectedLeadIds.includes(l.name));
    if (leadsToExport.length === 0) return;

    const exportData = leadsToExport.map(l => ({
      name: l.name,
      decisionMaker: l.decisionMaker || null,
      techStack: l.techStack || null,
      category: l.category || gmapsIndustry,
      phoneNumber: l.phoneNumber || null,
      websitePhone: l.websitePhone || null,
      directPhone: l.directPhone || null,
      email: l.email || null,
      directEmail: l.directEmail || null,
      website: l.website || null,
      address: l.address || null,
      rating: l.rating || null,
      reviews: l.reviews || 0,
      openStatus: l.openStatus || null,
      priceLevel: l.priceLevel || null,
      isAd: l.isAd ?? false,
      isClaimed: l.isClaimed ?? true,
      googleMapsUrl: l.googleMapsUrl || null,
      plusCode: l.plusCode || null,
      socials: {
        facebook: l.facebook || null,
        instagram: l.instagram || null,
        linkedin: l.linkedin || null
      },
      sources: l.sources || null
    }));

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gmaps_${gmapsQuery.trim().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showCopyToast('Formatierte JSON-Datei heruntergeladen!');
  }

  // ==========================================
  // FILE UPLOAD (CSV / JSON) STATE & LOGIC
  // ==========================================
  let file = $state<File | null>(null);
  let fileStatus = $state<'idle' | 'parsing' | 'mapping' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  let rawCsvHeaders = $state<string[]>([]);
  let rawCsvData = $state<any[]>([]);
  let isDragging = $state(false);
  let skipWithWebsite = $state(true);
  let skipDuplicates = $state(true);

  let columnMapping = $state<Record<string, string>>({
    name: '',
    phoneNumber: '',
    industry: '',
    website: '',
    email: '',
    address: '',
    rating: '',
    reviews: '',
    notes: ''
  });

  let processedValidLeads = $state<any[]>([]);
  let fileDuplicatesMap = $state<Record<number, { reason: string; matchedLead: any }>>({});
  let fileDuplicatesCount = $derived(Object.keys(fileDuplicatesMap).length);
  let fileSkippedCount = $state(0);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files.length) {
      file = e.dataTransfer.files[0];
      parseUploadedFile();
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files?.length) {
      file = target.files[0];
      parseUploadedFile();
    }
  }

  function parseUploadedFile() {
    if (!file) return;
    fileStatus = 'parsing';

    if (file.name.toLowerCase().endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (Array.isArray(json) && json.length > 0) {
            rawCsvData = json;
            rawCsvHeaders = Object.keys(json[0] || {});
            autoDetectColumns();
            fileStatus = 'mapping';
          } else {
            fileStatus = 'error';
          }
        } catch {
          fileStatus = 'error';
        }
      };
      reader.readAsText(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            rawCsvData = results.data;
            rawCsvHeaders = Object.keys(results.data[0] || {});
            autoDetectColumns();
            fileStatus = 'mapping';
          } else {
            fileStatus = 'error';
          }
        }
      });
    }
  }

  function autoDetectColumns() {
    const headersLower = rawCsvHeaders.map(h => h.toLowerCase());

    const findMatch = (keywords: string[]) => {
      for (const kw of keywords) {
        const idx = headersLower.findIndex(h => h.includes(kw));
        if (idx !== -1) return rawCsvHeaders[idx];
      }
      return '';
    };

    columnMapping.name = findMatch(['name', 'firma', 'company', 'title', 'betrieb']);
    columnMapping.phoneNumber = findMatch(['phone', 'telefon', 'tel', 'handy', 'mobil', 'number']);
    columnMapping.website = findMatch(['website', 'web', 'url', 'homepage', 'site']);
    columnMapping.email = findMatch(['email', 'e-mail', 'mail']);
    columnMapping.address = findMatch(['address', 'adresse', 'ort', 'location', 'strasse']);
    columnMapping.industry = findMatch(['industry', 'branche', 'kategorie', 'category']);
    columnMapping.rating = findMatch(['rating', 'sterne', 'score', 'bewertung']);
    columnMapping.reviews = findMatch(['reviews', 'anzahl', 'count']);
    columnMapping.notes = findMatch(['notes', 'notizen', 'beschreibung', 'desc']);
  }

  async function confirmMappingAndPreview() {
    if (!columnMapping.name || !columnMapping.phoneNumber) {
      showCopyToast('Bitte wähle mindestens Spalten für Name und Telefon aus.');
      return;
    }

    const parsed = rawCsvData.map((row: any) => ({
      name: row[columnMapping.name] || '',
      phoneNumber: row[columnMapping.phoneNumber] || '',
      industry: row[columnMapping.industry] || 'Allgemein',
      website: row[columnMapping.website] || null,
      email: row[columnMapping.email] || null,
      address: row[columnMapping.address] || null,
      rating: row[columnMapping.rating] ? String(row[columnMapping.rating]) : null,
      reviews: row[columnMapping.reviews] ? Number(row[columnMapping.reviews]) : null,
      notes: row[columnMapping.notes] || null
    }));

    try {
      const res = await fetch('/api/leads/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed })
      });

      if (res.ok) {
        const dupData = await res.json();
        fileDuplicatesMap = dupData.duplicates || {};
      }
    } catch (e) {
      console.error('File duplicate check failed:', e);
    }

    processedValidLeads = parsed.filter((l, idx) => {
      if (!l.name || !l.phoneNumber) return false;
      if (skipWithWebsite && l.website && String(l.website).trim() !== '') return false;
      if (skipDuplicates && fileDuplicatesMap[idx]) return false;
      return true;
    });

    fileSkippedCount = parsed.length - processedValidLeads.length;
    fileStatus = 'preview';
  }

  async function handleFileUpload() {
    if (processedValidLeads.length === 0) return;
    fileStatus = 'uploading';

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importedLeads: processedValidLeads,
          filename: file?.name || 'Direkter Datei-Import'
        })
      });
      if (res.ok) {
        fileStatus = 'success';
        await fetchDashboardStats();
        await fetchHistory();
        setTimeout(() => {
          fileStatus = 'idle';
          file = null;
          processedValidLeads = [];
        }, 3000);
      } else {
        fileStatus = 'error';
      }
    } catch {
      fileStatus = 'error';
    }
  }

  // ==========================================
  // MANUAL LEAD IMPORT STATE & LOGIC
  // ==========================================
  let manualLead = $state({
    name: '',
    phoneNumber: '',
    industry: 'Gastronomie & Bar',
    address: '',
    rating: '',
    reviews: '',
    website: '',
    notes: ''
  });
  let manualSubmitting = $state(false);
  let manualSuccess = $state(false);
  let manualError = $state<string | null>(null);
  let manualDuplicateMatch = $state<{ reason: string; matchedLead: any } | null>(null);
  let forceManualImport = $state(false);

  async function checkManualDuplicate() {
    manualDuplicateMatch = null;
    if (!manualLead.name.trim() && !manualLead.phoneNumber.trim()) return;

    try {
      const res = await fetch('/api/leads/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [manualLead] })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.duplicates && data.duplicates[0]) {
          manualDuplicateMatch = data.duplicates[0];
          forceManualImport = false;
        }
      }
    } catch (e) {
      console.error('Manual duplicate check failed:', e);
    }
  }

  async function handleManualSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!manualLead.name.trim() || !manualLead.phoneNumber.trim()) {
      manualError = 'Bitte Firmenname und Telefonnummer ausfüllen.';
      return;
    }

    if (manualDuplicateMatch && !forceManualImport) {
      manualError = 'Dieser Betrieb existiert bereits in der Datenbank. Aktiviere "Trotzdem Importieren" um fortzufahren.';
      return;
    }

    manualSubmitting = true;
    manualError = null;

    try {
      const singleLead = {
        name: manualLead.name.trim(),
        phoneNumber: manualLead.phoneNumber.trim(),
        industry: manualLead.industry,
        category: manualLead.industry,
        address: manualLead.address.trim() || null,
        rating: manualLead.rating.trim() || null,
        reviews: manualLead.reviews ? Number(manualLead.reviews) : null,
        website: manualLead.website.trim() || null,
        notes: manualLead.notes.trim() || null
      };

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importedLeads: [singleLead],
          filename: 'Manuelle Erfassung'
        })
      });

      if (res.ok) {
        manualSuccess = true;
        await fetchDashboardStats();
        await fetchHistory();
        manualLead = {
          name: '',
          phoneNumber: '',
          industry: 'Gastronomie & Bar',
          address: '',
          rating: '',
          reviews: '',
          website: '',
          notes: ''
        };
        manualDuplicateMatch = null;
        forceManualImport = false;
        setTimeout(() => manualSuccess = false, 3500);
      } else {
        const errData = await res.json();
        manualError = errData.error || 'Fehler beim Speichern des Leads.';
      }
    } catch {
      manualError = 'Netzwerkfehler beim Speichern.';
    } finally {
      manualSubmitting = false;
    }
  }

  // ==========================================
  // HISTORY & DASHBOARD STATS LOGIC
  // ==========================================
  let history = $state<any[]>([]);

  async function fetchDashboardStats() {
    try {
      statsLoading = true;
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        totalLeadsInDb = data.total || (data.leads ? data.leads.length : 0);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard stats:', e);
    } finally {
      statsLoading = false;
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch('/api/leads/import-history');
      if (res.ok) {
        history = await res.json();
        const todayStr = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
        importedTodayCount = history
          .filter((h: any) => h.date && h.date.includes(todayStr))
          .reduce((sum: number, h: any) => sum + (h.count || 0), 0);
      }
    } catch (e) {
      console.error('Failed to load import history:', e);
    }
  }

  onMount(() => {
    fetchDashboardStats();
    fetchHistory();
    loadCache();
  });
</script>

<div class="min-h-screen bg-[var(--color-page-void)] text-[var(--color-ink-primary)] font-[var(--font-general-sans)] p-4 md:p-8 select-none relative">
  
  <!-- COPY TOAST NOTIFICATION -->
  {#if copyToastMessage}
    <div class="fixed bottom-6 right-6 z-50 bg-[var(--color-accent-emerald)] text-[#052E16] font-[var(--font-excon)] font-bold text-xs px-4 py-2.5 rounded-[var(--radius-md)] shadow-2xl flex items-center gap-2 animate-bounce">
      <Check size={16} />
      <span>{copyToastMessage}</span>
    </div>
  {/if}

  <div class="max-w-[1600px] mx-auto flex flex-col gap-6">

    <!-- TOP KPI DASHBOARD HEADER STAT CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- CARD 1: TOTAL LEADS IN DB -->
      <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between shadow-md hover:border-[var(--color-border-focus)] transition-colors">
        <div>
          <span class="text-[11px] font-[var(--font-excon)] font-semibold uppercase tracking-wider text-[var(--color-ink-secondary)]">Gesamt Leads in Queue</span>
          <h2 class="text-2xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] mt-0.5">
            {#if statsLoading}
              <Loader2 size={20} class="animate-spin text-[var(--color-accent-emerald)]" />
            {:else}
              {totalLeadsInDb}
            {/if}
          </h2>
        </div>
        <div class="w-10 h-10 rounded-full bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] flex items-center justify-center text-[var(--color-accent-emerald)]">
          <Database size={20} />
        </div>
      </div>

      <!-- CARD 2: IMPORTED TODAY -->
      <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between shadow-md hover:border-[var(--color-border-focus)] transition-colors">
        <div>
          <span class="text-[11px] font-[var(--font-excon)] font-semibold uppercase tracking-wider text-[var(--color-ink-secondary)]">Heute Importiert</span>
          <h2 class="text-2xl font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] mt-0.5">
            +{importedTodayCount}
          </h2>
        </div>
        <div class="w-10 h-10 rounded-full bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30 flex items-center justify-center text-[var(--color-accent-emerald)]">
          <Layers size={20} />
        </div>
      </div>

      <!-- CARD 3: SCRAPED ENRICHMENT RATE -->
      <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between shadow-md hover:border-[var(--color-border-focus)] transition-colors">
        <div>
          <span class="text-[11px] font-[var(--font-excon)] font-semibold uppercase tracking-wider text-[var(--color-ink-secondary)]">Smart Anreicherung</span>
          <h2 class="text-xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] mt-0.5">
            {enrichedDmCount} Inhaber • {enrichedCmsCount} CMS
          </h2>
        </div>
        <div class="w-10 h-10 rounded-full bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] flex items-center justify-center text-[var(--color-accent-emerald)]">
          <Sparkles size={20} />
        </div>
      </div>

      <!-- CARD 4: ACTIVE BATCH / SCRAPER STATUS -->
      <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between shadow-md hover:border-[var(--color-border-focus)] transition-colors">
        <div>
          <span class="text-[11px] font-[var(--font-excon)] font-semibold uppercase tracking-wider text-[var(--color-ink-secondary)]">Scraper Engine</span>
          <h2 class="text-sm font-[var(--font-excon)] font-bold mt-1 flex items-center gap-2">
            {#if gmapsStatus === 'scraping'}
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-emerald)] animate-ping"></span>
              <span class="text-[var(--color-accent-emerald)]">Smart Scraping...</span>
            {:else if gmapsStatus === 'success'}
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-emerald)]"></span>
              <span class="text-[var(--color-ink-primary)]">{gmapsLeads.length} Leads im Cache</span>
            {:else if gmapsStatus === 'stopped'}
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-status-rose)]"></span>
              <span class="text-[var(--color-status-rose)]">Gestoppt</span>
            {:else}
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-ink-muted)]"></span>
              <span class="text-[var(--color-ink-secondary)]">Bereit</span>
            {/if}
          </h2>
        </div>
        <button
          type="button"
          onclick={() => isHistoryOpen = !isHistoryOpen}
          class="px-3 py-2 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-focus)] rounded-[var(--radius-md)] text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <History size={14} class="text-[var(--color-accent-emerald)]" />
          Verlauf ({history.length})
        </button>
      </div>

    </div>

    <!-- MAIN CONTROL BAR & TAB NAVIGATOR -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] p-3 rounded-[var(--radius-lg)] shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full bg-[var(--color-accent-emerald)] shadow-[0_0_8px_var(--color-accent-emerald)]"></div>
        <div>
          <h1 class="text-lg font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] tracking-tight">
            Lead Import & Akquise Cockpit
          </h1>
          <p class="text-xs text-[var(--color-ink-secondary)]">
            Echtzeit Live-Scraper mit Inhaber-Erkennung, CMS Tech Stack & Duplikate-Schutz
          </p>
        </div>
      </div>

      <!-- MODE TAB BUTTONS -->
      <div class="flex items-center bg-[var(--color-surface-lift)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]">
        <button
          type="button"
          onclick={() => activeTab = 'gmaps'}
          class="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-xs font-[var(--font-excon)] font-semibold transition-all cursor-pointer {activeTab === 'gmaps' ? 'bg-[var(--color-surface-panel)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)] shadow-sm' : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
        >
          <Sparkles size={14} class={activeTab === 'gmaps' ? 'text-[var(--color-accent-emerald)]' : ''} />
          Google Maps Live-Scraper
        </button>

        <button
          type="button"
          onclick={() => activeTab = 'file'}
          class="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-xs font-[var(--font-excon)] font-semibold transition-all cursor-pointer {activeTab === 'file' ? 'bg-[var(--color-surface-panel)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)] shadow-sm' : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
        >
          <UploadCloud size={14} class={activeTab === 'file' ? 'text-[var(--color-accent-emerald)]' : ''} />
          Datei-Upload (CSV/JSON)
        </button>

        <button
          type="button"
          onclick={() => activeTab = 'manual'}
          class="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-xs font-[var(--font-excon)] font-semibold transition-all cursor-pointer {activeTab === 'manual' ? 'bg-[var(--color-surface-panel)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)] shadow-sm' : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]'}"
        >
          <UserPlus size={14} class={activeTab === 'manual' ? 'text-[var(--color-accent-emerald)]' : ''} />
          Manuelle Erfassung
        </button>
      </div>
    </div>

    <!-- MAIN ACTIVE WORKBENCH CONTENT -->
    <div class="w-full">
      {#if activeTab === 'gmaps'}
        <!-- ================= MODE 0: GOOGLE MAPS LIVE SCRAPER ================= -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-6 md:p-8 flex flex-col gap-6 shadow-xl">
          
          <div class="border-b border-[var(--color-border-subtle)] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 class="text-base font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] flex items-center gap-2">
                <MapPin size={18} class="text-[var(--color-accent-emerald)]" />
                Smart Google Maps Live-Scraper Engine
              </h3>
              <p class="text-xs text-[var(--color-ink-secondary)] mt-0.5">
                Extrahiert G-Maps Kontakte & crawlt dynamisch Impressum/Team-Seiten nach Inhaber, Geschäftsführer, CMS Tech Stack, E-Mails & Direct Phones.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono font-bold bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]/30 px-2.5 py-1 rounded-full uppercase">
                Dynamic DOM Parser • Inhaber Extraction
              </span>
            </div>
          </div>

          {#if gmapsError}
            <div class="bg-[var(--color-status-rose)]/10 border border-[var(--color-status-rose)]/40 rounded-[var(--radius-md)] p-4 text-xs text-[var(--color-status-rose)] flex items-center gap-3">
              <XCircle size={18} class="shrink-0" />
              <span>{gmapsError}</span>
            </div>
          {/if}

          {#if saveSuccessMessage}
            <div class="bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/40 rounded-[var(--radius-md)] p-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <CheckCircle2 size={20} class="text-[var(--color-accent-emerald)] flex-shrink-0" />
                <span class="text-xs font-bold text-[var(--color-ink-primary)]">{saveSuccessMessage}</span>
              </div>
              <a href="/queue" class="text-xs font-bold text-[var(--color-accent-emerald)] hover:underline flex items-center gap-1">
                Zur Queue <ArrowRight size={14} />
              </a>
            </div>
          {/if}

          <!-- INPUT FORM & PRESET BADGES -->
          <div class="flex flex-col gap-5">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <!-- SEARCH QUERY -->
              <div class="md:col-span-2 flex flex-col gap-1.5">
                <label for="gmaps-query" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <Search size={13} class="text-[var(--color-accent-emerald)]" />
                  Suchbegriff & Ort <span class="text-[var(--color-status-rose)]">*</span>
                </label>
                <input
                  type="text"
                  id="gmaps-query"
                  bind:value={gmapsQuery}
                  onkeydown={(e) => { if (e.key === 'Enter') startGmapsScraper(); }}
                  placeholder="z.B. Zahnarzt 10115 Berlin, Sanitär Notdienst München"
                  disabled={gmapsStatus === 'scraping'}
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none transition-colors"
                />

                <!-- PRESET SUGGESTIONS -->
                <div class="flex items-center gap-2 flex-wrap mt-1">
                  <span class="text-[10px] text-[var(--color-ink-muted)] font-mono">Schnellsuche:</span>
                  {#each PRESET_QUERIES as preset}
                    <button
                      type="button"
                      onclick={() => { gmapsQuery = preset; }}
                      disabled={gmapsStatus === 'scraping'}
                      class="text-[10px] font-mono bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- PIPELINE INDUSTRY -->
              <div class="flex flex-col gap-1.5">
                <label for="gmaps-industry" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <Tag size={13} class="text-[var(--color-accent-emerald)]" />
                  Pipeline Branche
                </label>
                <select
                  id="gmaps-industry"
                  bind:value={gmapsIndustry}
                  disabled={gmapsStatus === 'scraping'}
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] outline-none transition-colors cursor-pointer h-[41px]"
                >
                  <option value="Praxen & Gewerbe">Praxen & Medizin (Zahnarzt, Physio)</option>
                  <option value="Handwerk & Bau">Handwerk & Sanitär (Maler, Tischler)</option>
                  <option value="Gastronomie & Bar">Gastronomie & Bar (Kneipe, Restaurant)</option>
                  <option value="B2B & Dienstleister">B2B Dienstleister (Agentur, Kanzlei)</option>
                  <option value="Allgemein">WaaS Allrounder (Generisch)</option>
                </select>
              </div>

            </div>

            <!-- OPTIONS: SEARCH DEPTH RANGE + WEBSITE ENRICHMENT -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs">
                  <label for="gmaps-scrolls" class="font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <FileText size={13} class="text-[var(--color-accent-emerald)]" />
                    Such-Tiefe (Scrolls)
                  </label>
                  <span class="font-mono font-bold text-[var(--color-accent-emerald)]">{gmapsMaxScrolls} Durchläufe (~{gmapsMaxScrolls * 15} Leads)</span>
                </div>
                <input
                  type="range"
                  id="gmaps-scrolls"
                  min="1"
                  max="10"
                  bind:value={gmapsMaxScrolls}
                  disabled={gmapsStatus === 'scraping'}
                  class="accent-[var(--color-accent-emerald)] cursor-pointer py-1"
                />
              </div>

              <div class="bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] p-3 rounded-[var(--radius-md)] flex items-center gap-3">
                <input
                  type="checkbox"
                  id="gmaps-enrich"
                  bind:checked={gmapsEnrichWebsites}
                  disabled={gmapsStatus === 'scraping'}
                  class="w-4 h-4 rounded border-[var(--color-border-focus)] bg-[var(--color-surface-panel)] text-[var(--color-accent-emerald)] focus:ring-0 cursor-pointer accent-[var(--color-accent-emerald)]"
                />
                <label for="gmaps-enrich" class="text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] cursor-pointer select-none font-medium flex items-center gap-2">
                  <Globe size={14} class="text-[var(--color-accent-emerald)]" />
                  Website Impressum & Team-Seiten nach Inhaber, CMS & Direct Phones durchsuchen
                </label>
              </div>

            </div>

            <!-- ACTION BUTTONS: START & STOP -->
            <div class="flex items-center gap-3">
              {#if gmapsStatus === 'scraping'}
                <button
                  type="button"
                  onclick={stopGmapsScraper}
                  class="flex-1 py-3.5 px-6 bg-[var(--color-status-rose)] hover:bg-rose-700 text-white font-[var(--font-excon)] font-bold text-xs uppercase tracking-wider rounded-[var(--radius-md)] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Square size={16} class="fill-current" />
                  Scraper Stoppen
                </button>
              {:else}
                <button
                  type="button"
                  onclick={startGmapsScraper}
                  class="flex-1 py-3.5 px-6 bg-[var(--color-accent-emerald)] hover:bg-[#059669] text-[#052E16] font-[var(--font-excon)] font-bold text-xs uppercase tracking-wider rounded-[var(--radius-md)] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Live-Scraping & Smart Anreicherung Starten
                </button>
              {/if}
            </div>

          </div>

          <!-- CLEAN STEP-BY-STEP PROGRESS CARDS -->
          {#if gmapsStatus === 'scraping' || gmapsLeads.length > 0}
            <div class="border-t border-[var(--color-border-subtle)] pt-6 flex flex-col gap-4">
              
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] flex items-center gap-2">
                  {#if gmapsStatus === 'scraping'}
                    <Loader2 size={16} class="animate-spin text-[var(--color-accent-emerald)]" />
                  {:else if gmapsStatus === 'stopped'}
                    <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-status-rose)]"></span>
                  {:else}
                    <CheckCircle2 size={16} class="text-[var(--color-accent-emerald)]" />
                  {/if}
                  Scraper Fortschritt: {progressStatusText || 'Aktiv'}
                </span>
                <span class="font-mono text-sm font-bold text-[var(--color-accent-emerald)]">{progressPercent}%</span>
              </div>

              <!-- PROGRESS BAR -->
              <div class="w-full bg-[var(--color-surface-lift)] rounded-full h-2.5 overflow-hidden border border-[var(--color-border-subtle)]">
                <div
                  class="h-full rounded-full transition-all duration-300 {gmapsStatus === 'stopped' ? 'bg-[var(--color-status-rose)]' : 'bg-[var(--color-accent-emerald)]'}"
                  style="width: {progressPercent}%"
                ></div>
              </div>

              <!-- 3-STAGE VISUAL PROGRESS CARDS -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                
                <div class="p-3.5 rounded-[var(--radius-md)] border transition-all flex items-center gap-3 {currentStage >= 1 ? 'bg-[var(--color-surface-lift)] border-[var(--color-border-focus)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] opacity-50'}">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs {currentStage > 1 ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : currentStage === 1 ? 'bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-muted)]'}">
                    {#if currentStage > 1}<Check size={14} />{:else}1{/if}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">Google Maps Suche</span>
                    <span class="text-[11px] text-[var(--color-ink-secondary)] truncate">{stageDetails.stage1}</span>
                  </div>
                </div>

                <div class="p-3.5 rounded-[var(--radius-md)] border transition-all flex items-center gap-3 {currentStage >= 2 ? 'bg-[var(--color-surface-lift)] border-[var(--color-border-focus)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] opacity-50'}">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs {currentStage > 2 ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : currentStage === 2 ? 'bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-muted)]'}">
                    {#if currentStage > 2}<Check size={14} />{:else}2{/if}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">Extraktion & Scroll</span>
                    <span class="text-[11px] text-[var(--color-ink-secondary)] truncate">{stageDetails.stage2}</span>
                  </div>
                </div>

                <div class="p-3.5 rounded-[var(--radius-md)] border transition-all flex items-center gap-3 {currentStage >= 3 ? 'bg-[var(--color-surface-lift)] border-[var(--color-border-focus)]' : 'bg-[var(--color-page-void)] border-[var(--color-border-subtle)] opacity-50'}">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs {currentStage === 4 ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : currentStage === 3 ? 'bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-muted)]'}">
                    {#if currentStage === 4}<Check size={14} />{:else}3{/if}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">Inhaber & CMS Parser</span>
                    <span class="text-[11px] text-[var(--color-ink-secondary)] truncate">{stageDetails.stage3}</span>
                  </div>
                </div>

              </div>

            </div>
          {/if}

          <!-- DUPLICATE WARNING BANNER -->
          {#if gmapsDuplicatesCount > 0}
            <div class="bg-[var(--color-status-amber)]/10 border border-[var(--color-status-amber)]/40 p-4 rounded-[var(--radius-md)] flex items-center justify-between text-xs text-[var(--color-status-amber)]">
              <div class="flex items-center gap-2 font-medium">
                <AlertTriangle size={18} class="shrink-0" />
                <span><strong>{gmapsDuplicatesCount} Duplikate</strong> bereits in DB gefunden und automatisch abgewählt (Name, Telefon oder Place ID existiert bereits).</span>
              </div>
              <button
                type="button"
                onclick={() => gmapsFilter = 'duplicates'}
                class="px-2.5 py-1 bg-[var(--color-status-amber)]/20 hover:bg-[var(--color-status-amber)]/30 rounded font-bold underline transition-colors cursor-pointer shrink-0"
              >
                Duplikate Anzeigen ({gmapsDuplicatesCount})
              </button>
            </div>
          {/if}

          <!-- RICH INTERACTIVE SCRAPE RESULTS TABLE & TOOLBAR -->
          {#if gmapsLeads.length > 0}
            <div class="border-t border-[var(--color-border-subtle)] pt-6 flex flex-col gap-4">
              
              <!-- TOOLBAR: FILTERS, SEARCH & BULK ACTIONS -->
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface-lift)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border-focus)]">
                
                <!-- SEARCH BAR IN SCRAPED RESULTS -->
                <div class="relative flex-1 max-w-md">
                  <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                  <input
                    type="text"
                    bind:value={gmapsSearchTerm}
                    placeholder="Suchen (Inhaber, CMS, Telefon, Ort...)..."
                    class="w-full bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] pl-9 pr-3 py-2 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none"
                  />
                </div>

                <!-- FILTER PILLS -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-mono text-[var(--color-ink-muted)] flex items-center gap-1 mr-1">
                    <Filter size={11} /> Filter:
                  </span>

                  <button
                    type="button"
                    onclick={() => gmapsFilter = 'all'}
                    class="px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer {gmapsFilter === 'all' ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-secondary)] border border-[var(--color-border-subtle)]'}"
                  >
                    Alle ({gmapsLeads.length})
                  </button>

                  <button
                    type="button"
                    onclick={() => gmapsFilter = 'dm'}
                    class="px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer {gmapsFilter === 'dm' ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-secondary)] border border-[var(--color-border-subtle)]'}"
                  >
                    👤 Inhaber ({enrichedDmCount})
                  </button>

                  <button
                    type="button"
                    onclick={() => gmapsFilter = 'cms'}
                    class="px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer {gmapsFilter === 'cms' ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-secondary)] border border-[var(--color-border-subtle)]'}"
                  >
                    🛠️ CMS ({enrichedCmsCount})
                  </button>

                  <button
                    type="button"
                    onclick={() => gmapsFilter = 'email'}
                    class="px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer {gmapsFilter === 'email' ? 'bg-[var(--color-accent-emerald)] text-[#052E16]' : 'bg-[var(--color-surface-panel)] text-[var(--color-ink-secondary)] border border-[var(--color-border-subtle)]'}"
                  >
                    E-Mail ({enrichedEmailCount})
                  </button>

                  {#if gmapsDuplicatesCount > 0}
                    <button
                      type="button"
                      onclick={() => gmapsFilter = 'duplicates'}
                      class="px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer {gmapsFilter === 'duplicates' ? 'bg-[var(--color-status-amber)] text-black font-bold' : 'bg-[var(--color-status-amber)]/20 text-[var(--color-status-amber)] border border-[var(--color-status-amber)]/30'}"
                    >
                      ⚠️ Duplikate ({gmapsDuplicatesCount})
                    </button>
                  {/if}
                </div>

                <!-- ACTION BUTTONS -->
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={saveGmapsLeadsToQueue}
                    disabled={isSavingToQueue || selectedLeadIds.length === 0}
                    class="px-4 py-2 bg-[var(--color-accent-emerald)] hover:bg-[#059669] text-[#052E16] font-[var(--font-excon)] font-bold text-xs rounded-[var(--radius-md)] transition-all cursor-pointer shadow flex items-center gap-2 disabled:opacity-50"
                  >
                    {#if isSavingToQueue}
                      <Loader2 size={14} class="animate-spin" />
                      Speichere...
                    {:else}
                      <Save size={14} />
                      {selectedLeadIds.length} in Queue Speichern
                    {/if}
                  </button>

                  <button
                    type="button"
                    onclick={downloadScrapedJson}
                    disabled={selectedLeadIds.length === 0}
                    class="px-3.5 py-2 bg-[var(--color-surface-panel)] hover:bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] rounded-[var(--radius-md)] text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Ausgewählte Leads als formatierte JSON-Datei exportieren"
                  >
                    <Download size={14} class="text-[var(--color-accent-emerald)]" />
                  </button>

                  <button
                    type="button"
                    onclick={clearScrapedCache}
                    class="px-3 py-2 bg-[var(--color-surface-panel)] hover:bg-rose-500/20 text-[var(--color-ink-secondary)] hover:text-rose-400 border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Cache leeren & Ansicht zurücksetzen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>

              <!-- TABLE DISPLAY WITH ENRICHED BADGES -->
              <div class="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-page-void)] max-h-[520px]">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-[var(--color-surface-lift)] border-b border-[var(--color-border-subtle)] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] sticky top-0 z-10">
                    <tr>
                      <th class="p-3 w-10 text-center border-r border-[var(--color-border-subtle)]">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onchange={toggleSelectAll}
                          class="w-4 h-4 rounded border-[var(--color-border-focus)] bg-[var(--color-surface-panel)] text-[var(--color-accent-emerald)] focus:ring-0 cursor-pointer accent-[var(--color-accent-emerald)]"
                        />
                      </th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Firma & Ansprechpartner</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Tech Stack / CMS</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Telefon (G-Maps / Direct)</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">E-Mails (Direct / Info)</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Socials & Web</th>
                      <th class="px-4 py-3 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--color-border-subtle)] font-[var(--font-general-sans)] text-[var(--color-ink-primary)]">
                    {#each filteredGmapsLeads as lead}
                      {@const isSelected = selectedLeadIds.includes(lead.name)}
                      {@const dupInfo = gmapsDuplicates[lead.name]}
                      <tr class="hover:bg-[var(--color-surface-lift)]/50 transition-colors {isSelected ? 'bg-[var(--color-emerald-tint)]/10' : dupInfo ? 'bg-[var(--color-status-amber)]/5' : ''}">
                        
                        <!-- SELECT CHECKBOX -->
                        <td class="p-3 text-center border-r border-[var(--color-border-subtle)]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onchange={() => toggleSelectLead(lead.name)}
                            class="w-4 h-4 rounded border-[var(--color-border-focus)] bg-[var(--color-surface-panel)] text-[var(--color-accent-emerald)] focus:ring-0 cursor-pointer accent-[var(--color-accent-emerald)]"
                          />
                        </td>

                        <!-- COMPANY NAME & DECISION MAKER -->
                        <td class="px-4 py-2.5 border-r border-[var(--color-border-subtle)]">
                          <div class="font-semibold text-[var(--color-ink-primary)] flex items-center gap-2 flex-wrap">
                            <span>{lead.name}</span>
                            {#if lead.isAd}
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0" title="Gesponserte Google Maps Anzeige">
                                📢 Ad
                              </span>
                            {/if}
                            {#if lead.isClaimed === false}
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0" title="Google Maps Profil unbeansprucht (GMB Sales Pitch Opportunity!)">
                                🔑 Unclaimed
                              </span>
                            {/if}
                            {#if dupInfo}
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-status-amber)]/20 text-[var(--color-status-amber)] border border-[var(--color-status-amber)]/40 shrink-0" title={`Duplikat: ${dupInfo.reason}`}>
                                <AlertTriangle size={11} /> Duplikat
                              </span>
                            {/if}
                          </div>

                          {#if lead.decisionMaker}
                            {@const dmSource = lead.sources?.decisionMaker}
                            <div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-2 py-0.5 rounded border border-[var(--color-accent-emerald)]/30 mt-1">
                              <UserCheck size={12} class="shrink-0" />
                              <span>{lead.decisionMaker}</span>
                              {#if dmSource?.fragmentUrl || dmSource?.url}
                                <a
                                  href={dmSource.fragmentUrl || dmSource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="ml-0.5 text-[var(--color-accent-emerald)] hover:text-white transition-colors"
                                  title={`Quelle: ${dmSource.url} (Klicken um auf der Webseite direkt zur Textstelle zu springen)`}
                                >
                                  <ExternalLink size={10} />
                                </a>
                              {/if}
                            </div>
                          {/if}

                          <div class="flex items-center gap-2 text-[10px] text-[var(--color-ink-secondary)] mt-0.5 font-mono">
                            {#if lead.rating}
                              <span class="flex items-center gap-0.5 text-[var(--color-status-amber)] font-bold">
                                <Star size={10} class="fill-current" /> {lead.rating}
                              </span>
                            {/if}
                            {#if lead.reviews}
                              <span>({lead.reviews} Reviews)</span>
                            {/if}
                            {#if lead.address}
                              <span class="truncate max-w-[140px]" title={lead.address}>• {lead.address}</span>
                            {/if}
                          </div>
                        </td>

                        <!-- TECH STACK / CMS BADGE -->
                        <td class="px-4 py-2.5 border-r border-[var(--color-border-subtle)] whitespace-nowrap">
                          {#if lead.techStack}
                            {@const stackSource = lead.sources?.techStack}
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--color-surface-lift)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)]">
                              <Code size={12} class="text-[var(--color-accent-emerald)] shrink-0" />
                              <span>{lead.techStack}</span>
                              {#if stackSource?.fragmentUrl || stackSource?.url}
                                <a
                                  href={stackSource.fragmentUrl || stackSource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="ml-0.5 text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-emerald)] transition-colors"
                                  title={`Quelle: ${stackSource.url}`}
                                >
                                  <ExternalLink size={10} />
                                </a>
                              {/if}
                            </span>
                          {:else}
                            <span class="text-[var(--color-ink-muted)]">—</span>
                          {/if}
                        </td>

                        <!-- PHONE NUMBERS (GMAPS & DIRECT) -->
                        <td class="px-4 py-2.5 font-mono border-r border-[var(--color-border-subtle)] whitespace-nowrap">
                          <div class="flex flex-col gap-1">
                            {#if lead.phoneNumber}
                              <button
                                type="button"
                                onclick={() => copyToClipboard(lead.phoneNumber, 'Zentrale Telefon')}
                                class="inline-flex items-center gap-1.5 text-[11px] hover:text-[var(--color-accent-emerald)] transition-colors cursor-pointer group"
                                title="G-Maps Telefon"
                              >
                                <Phone size={11} class="text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent-emerald)]" />
                                <span>{lead.phoneNumber}</span>
                              </button>
                            {/if}

                            {#if lead.websitePhone || lead.directPhone}
                              {@const phoneSource = lead.sources?.directPhone || lead.sources?.websitePhone}
                              <div class="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onclick={() => copyToClipboard(lead.directPhone || lead.websitePhone, 'Direct Phone')}
                                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]/30 hover:scale-105 transition-all cursor-pointer shrink-0"
                                  title="Direktwahl / Impressum Telefon"
                                >
                                  <PhoneCall size={12} /> {lead.directPhone || lead.websitePhone}
                                </button>
                                {#if phoneSource?.fragmentUrl || phoneSource?.url}
                                  <a
                                    href={phoneSource.fragmentUrl || phoneSource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-[var(--color-accent-emerald)] hover:text-white p-0.5 rounded transition-colors"
                                    title={`Quelle: ${phoneSource.url} (Klicken um direkt zur Telefonnummer auf der Webseite zu springen)`}
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                {/if}
                              </div>
                            {/if}
                          </div>
                        </td>

                        <!-- EMAILS (DIRECT & GENERAL) -->
                        <td class="px-4 py-2.5 font-mono border-r border-[var(--color-border-subtle)] max-w-[200px]">
                          <div class="flex flex-col gap-1">
                            {#if lead.directEmail}
                              {@const dEmailSource = lead.sources?.directEmail || lead.sources?.email}
                              <div class="inline-flex items-center gap-1 max-w-full">
                                <button
                                  type="button"
                                  onclick={() => copyToClipboard(lead.directEmail, 'Direkt-Email')}
                                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]/30 hover:scale-105 transition-all cursor-pointer truncate"
                                  title={`Direkt E-Mail: ${lead.directEmail}`}
                                >
                                  <Mail size={12} class="shrink-0" /> <span class="truncate">{lead.directEmail}</span>
                                </button>
                                {#if dEmailSource?.fragmentUrl || dEmailSource?.url}
                                  <a
                                    href={dEmailSource.fragmentUrl || dEmailSource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-[var(--color-accent-emerald)] hover:text-white p-0.5 rounded transition-colors shrink-0"
                                    title={`Quelle: ${dEmailSource.url} (Klicken um direkt zur E-Mail auf der Webseite zu springen)`}
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                {/if}
                              </div>
                            {/if}

                            {#if lead.email && lead.email !== lead.directEmail}
                              {@const genEmailSource = lead.sources?.email}
                              <div class="inline-flex items-center gap-1 max-w-full">
                                <button
                                  type="button"
                                  onclick={() => copyToClipboard(lead.email, 'Info Email')}
                                  class="inline-flex items-center gap-1 text-[10px] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] truncate"
                                  title={lead.email}
                                >
                                  <Mail size={10} class="shrink-0" /> <span class="truncate">{lead.email}</span>
                                </button>
                                {#if genEmailSource?.fragmentUrl || genEmailSource?.url}
                                  <a
                                    href={genEmailSource.fragmentUrl || genEmailSource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-emerald)] p-0.5 rounded transition-colors shrink-0"
                                    title={`Quelle: ${genEmailSource.url}`}
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                {/if}
                              </div>
                            {/if}

                            {#if !lead.email && !lead.directEmail}
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 w-max">
                                <XCircle size={10} /> Keine E-Mail
                              </span>
                            {/if}
                          </div>
                        </td>

                        <!-- SOCIALS & WEB -->
                        <td class="px-4 py-2.5 border-r border-[var(--color-border-subtle)] whitespace-nowrap">
                          <div class="flex items-center gap-2">
                            {#if lead.website}
                              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" class="text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-emerald)]" title={lead.website}>
                                <Globe size={14} />
                              </a>
                            {/if}
                            {#if lead.facebook || lead.instagram || lead.linkedin}
                              <span class="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                <Share2 size={10} /> Socials
                              </span>
                            {/if}
                          </div>
                        </td>

                        <!-- REMOVE ROW ACTION -->
                        <td class="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onclick={() => removeLeadFromScraped(lead.name)}
                            class="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-status-rose)] transition-colors cursor-pointer"
                            title="Entfernen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>

                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

            </div>
          {/if}

        </div>

      {:else if activeTab === 'file'}
        <!-- ================= MODE 1: FILE UPLOAD (CSV / JSON) ================= -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-6 md:p-8 flex flex-col gap-6 shadow-xl">
          
          <div class="border-b border-[var(--color-border-subtle)] pb-4 flex items-center justify-between">
            <div>
              <h3 class="text-base font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] flex items-center gap-2">
                <FileSpreadsheet size={18} class="text-[var(--color-accent-emerald)]" />
                CSV / JSON Batch Import & Smart Field Mapping
              </h3>
              <p class="text-xs text-[var(--color-ink-secondary)] mt-0.5">
                Lade eine Datei hoch, überprüfe die automatische Zuordnung der Spalten & importiere sauber in die Queue.
              </p>
            </div>
            {#if fileStatus !== 'idle'}
              <button
                type="button"
                onclick={() => { fileStatus = 'idle'; file = null; rawCsvData = []; }}
                class="px-3 py-1.5 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] text-xs font-[var(--font-excon)] font-semibold rounded-[var(--radius-md)] text-[var(--color-ink-secondary)] transition-colors cursor-pointer"
              >
                Andere Datei wählen
              </button>
            {/if}
          </div>

          {#if fileStatus === 'idle' || fileStatus === 'parsing'}
            <!-- DROPZONE AREA -->
            <div class="bg-[var(--color-surface-panel)] border-2 border-dashed {isDragging ? 'border-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)]/20 scale-[1.01]' : 'border-[var(--color-border-subtle)]'} rounded-[var(--radius-lg)] p-10 md:p-16 flex flex-col items-center justify-center min-h-[380px] relative transition-all duration-200 group">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div
                class="absolute inset-0 z-10 cursor-pointer rounded-[var(--radius-lg)]"
                ondragover={(e) => { e.preventDefault(); isDragging = true; }}
                ondragleave={() => isDragging = false}
                ondrop={handleDrop}
                onclick={() => document.getElementById('file-upload-input')?.click()}
              ></div>

              <input type="file" id="file-upload-input" accept=".csv,.json" class="hidden" onchange={handleFileSelect} />

              <div class="w-16 h-16 rounded-full bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] flex items-center justify-center text-[var(--color-accent-emerald)] mb-5 group-hover:scale-110 group-hover:border-[var(--color-accent-emerald)] transition-all duration-200">
                {#if fileStatus === 'parsing'}
                  <Loader2 size={28} class="animate-spin text-[var(--color-accent-emerald)]" />
                {:else}
                  <UploadCloud size={28} />
                {/if}
              </div>

              <h3 class="text-lg font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] mb-2 text-center">
                {fileStatus === 'parsing' ? 'Datei wird verarbeitet...' : 'CSV- oder JSON-Datei hierher ziehen'}
              </h3>
              <p class="text-xs text-[var(--color-ink-secondary)] text-center max-w-sm mb-6 leading-relaxed">
                Empfohlene Spalten: <code class="bg-[var(--color-surface-lift)] px-1.5 py-0.5 rounded text-[var(--color-ink-primary)] font-mono">Firma / Name</code>, <code class="bg-[var(--color-surface-lift)] px-1.5 py-0.5 rounded text-[var(--color-ink-primary)] font-mono">Telefon</code>, <code class="bg-[var(--color-surface-lift)] px-1.5 py-0.5 rounded text-[var(--color-ink-primary)] font-mono">Website</code>.
              </p>

              <!-- OPTION CHECKBOXES -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div class="z-20 flex flex-col gap-2 bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] p-3.5 rounded-[var(--radius-md)]" onclick={(e) => e.stopPropagation()}>
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="skip-duplicates-check"
                    bind:checked={skipDuplicates}
                    class="w-4 h-4 rounded border-[var(--color-border-focus)] bg-[var(--color-surface-panel)] text-[var(--color-accent-emerald)] focus:ring-0 cursor-pointer accent-[var(--color-accent-emerald)]"
                  />
                  <label for="skip-duplicates-check" class="text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] cursor-pointer select-none font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={13} class="text-[var(--color-status-amber)]" />
                    Duplikate in der Datenbank automatisch überspringen (Empfohlen)
                  </label>
                </div>

                <div class="flex items-center gap-3 border-t border-[var(--color-border-subtle)] pt-2 mt-0.5">
                  <input
                    type="checkbox"
                    id="skip-website-check"
                    bind:checked={skipWithWebsite}
                    class="w-4 h-4 rounded border-[var(--color-border-focus)] bg-[var(--color-surface-panel)] text-[var(--color-accent-emerald)] focus:ring-0 cursor-pointer accent-[var(--color-accent-emerald)]"
                  />
                  <label for="skip-website-check" class="text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] cursor-pointer select-none font-medium">
                    Leads mit bestehender Website automatisch überspringen
                  </label>
                </div>
              </div>
            </div>

          {:else if fileStatus === 'mapping'}
            <!-- COLUMN AUTO-MAPPING PANEL -->
            <div class="flex flex-col gap-6">
              <div class="bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] p-4 rounded-[var(--radius-md)] flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <FileText size={20} class="text-[var(--color-accent-emerald)]" />
                  <div>
                    <h4 class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">{file?.name}</h4>
                    <p class="text-[11px] text-[var(--color-ink-secondary)]">{rawCsvData.length} Zeilen in Datei erkannt. Überprüfe die Spaltenzuordnung:</p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div class="flex flex-col gap-1.5">
                  <label for="map-name" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <Building2 size={13} class="text-[var(--color-accent-emerald)]" />
                    Firmenname Spalte <span class="text-[var(--color-status-rose)]">*</span>
                  </label>
                  <select id="map-name" bind:value={columnMapping.name} class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] outline-none cursor-pointer">
                    <option value="">-- Nicht zuordnen --</option>
                    {#each rawCsvHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label for="map-phone" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <Phone size={13} class="text-[var(--color-accent-emerald)]" />
                    Telefonnummer Spalte <span class="text-[var(--color-status-rose)]">*</span>
                  </label>
                  <select id="map-phone" bind:value={columnMapping.phoneNumber} class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] outline-none cursor-pointer">
                    <option value="">-- Nicht zuordnen --</option>
                    {#each rawCsvHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label for="map-web" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <Globe size={13} class="text-[var(--color-accent-emerald)]" />
                    Website Spalte
                  </label>
                  <select id="map-web" bind:value={columnMapping.website} class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] outline-none cursor-pointer">
                    <option value="">-- Nicht zuordnen --</option>
                    {#each rawCsvHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label for="map-email" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <Mail size={13} class="text-[var(--color-accent-emerald)]" />
                    E-Mail Spalte
                  </label>
                  <select id="map-email" bind:value={columnMapping.email} class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] outline-none cursor-pointer">
                    <option value="">-- Nicht zuordnen --</option>
                    {#each rawCsvHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label for="map-addr" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <MapPin size={13} class="text-[var(--color-accent-emerald)]" />
                    Adresse / Ort Spalte
                  </label>
                  <select id="map-addr" bind:value={columnMapping.address} class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] outline-none cursor-pointer">
                    <option value="">-- Nicht zuordnen --</option>
                    {#each rawCsvHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label for="map-ind" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                    <Tag size={13} class="text-[var(--color-accent-emerald)]" />
                    Branche Spalte
                  </label>
                  <select id="map-ind" bind:value={columnMapping.industry} class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-2.5 text-xs text-[var(--color-ink-primary)] outline-none cursor-pointer">
                    <option value="">-- Nicht zuordnen --</option>
                    {#each rawCsvHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>

              </div>

              <button
                type="button"
                onclick={confirmMappingAndPreview}
                class="py-3 px-6 bg-[var(--color-accent-emerald)] hover:bg-[#059669] text-[#052E16] font-[var(--font-excon)] font-bold text-xs uppercase tracking-wider rounded-[var(--radius-md)] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 mt-2"
              >
                Zuordnung Bestätigen & Duplikate-Prüfung Starten <ArrowRight size={16} />
              </button>
            </div>

          {:else if fileStatus === 'preview' || fileStatus === 'uploading' || fileStatus === 'success'}
            <!-- PREVIEW & CONFIRMATION PANEL -->
            <div class="flex flex-col gap-6">
              
              <div class="bg-[var(--color-surface-lift)] border border-[var(--color-border-focus)] p-4 rounded-[var(--radius-md)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">{file?.name}</h4>
                  <p class="text-xs mt-1 font-medium flex items-center gap-2 flex-wrap">
                    <span class="text-[var(--color-accent-emerald)] font-bold">{processedValidLeads.length} neu bereit für Import</span>
                    {#if fileDuplicatesCount > 0 && skipDuplicates}
                      <span class="text-[var(--color-status-amber)] font-bold">• ⚠️ {fileDuplicatesCount} Duplikate in DB übersprungen</span>
                    {/if}
                    {#if fileSkippedCount > 0}
                      <span class="text-[var(--color-ink-secondary)]">• {fileSkippedCount} ungültig / übersprungen</span>
                    {/if}
                  </p>
                </div>

                <button
                  type="button"
                  onclick={() => fileStatus = 'mapping'}
                  class="px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer shrink-0"
                >
                  Zuordnung Ändern
                </button>
              </div>

              <!-- PREVIEW TABLE -->
              <div class="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-page-void)] max-h-[360px]">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-[var(--color-surface-lift)] border-b border-[var(--color-border-subtle)] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)]">
                    <tr>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Firma</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Telefon</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">Website</th>
                      <th class="px-4 py-3 border-r border-[var(--color-border-subtle)]">E-Mail</th>
                      <th class="px-4 py-3">Adresse / Branche</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--color-border-subtle)] font-[var(--font-general-sans)] text-[var(--color-ink-primary)]">
                    {#each processedValidLeads.slice(0, 15) as row}
                      <tr class="hover:bg-[var(--color-surface-lift)]/50 transition-colors">
                        <td class="px-4 py-2.5 font-semibold text-[var(--color-ink-primary)] border-r border-[var(--color-border-subtle)]">{row.name}</td>
                        <td class="px-4 py-2.5 font-mono text-[var(--color-accent-emerald)] border-r border-[var(--color-border-subtle)]">{row.phoneNumber}</td>
                        <td class="px-4 py-2.5 border-r border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)]">{row.website || '—'}</td>
                        <td class="px-4 py-2.5 border-r border-[var(--color-border-subtle)] text-[var(--color-ink-secondary)]">{row.email || '—'}</td>
                        <td class="px-4 py-2.5 text-[var(--color-ink-secondary)]">{row.address || row.industry || '—'}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

              <!-- ACTION / SUCCESS AREA -->
              {#if fileStatus === 'uploading'}
                <div class="flex flex-col gap-2">
                  <div class="w-full bg-[var(--color-surface-lift)] rounded-full h-2 overflow-hidden border border-[var(--color-border-subtle)]">
                    <div class="bg-[var(--color-accent-emerald)] h-full rounded-full animate-pulse" style="width: 85%"></div>
                  </div>
                  <p class="text-xs text-[var(--color-ink-secondary)] text-center flex items-center justify-center gap-2">
                    <Loader2 size={14} class="animate-spin text-[var(--color-accent-emerald)]" /> Leads werden in der Datenbank gespeichert...
                  </p>
                </div>
              {:else if fileStatus === 'success'}
                <div class="bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30 rounded-[var(--radius-md)] p-6 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 size={36} class="text-[var(--color-accent-emerald)]" />
                  <span class="font-[var(--font-excon)] font-bold text-base text-[var(--color-ink-primary)]">Import erfolgreich!</span>
                  <span class="text-xs text-[var(--color-accent-emerald)]">{processedValidLeads.length} Leads wurden erfolgreich zur Telefonie-Queue hinzugefügt.</span>
                </div>
              {:else}
                <button
                  type="button"
                  onclick={handleFileUpload}
                  disabled={processedValidLeads.length === 0}
                  class="w-full py-3.5 px-4 bg-[var(--color-accent-emerald)] hover:bg-[#059669] text-[#052E16] font-[var(--font-excon)] font-bold text-sm rounded-[var(--radius-md)] transition-all duration-150 cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  Bestätigen & {processedValidLeads.length} Leads in Queue Speichern
                </button>
              {/if}
            </div>
          {/if}

        </div>

      {:else}
        <!-- ================= MODE 2: MANUAL SINGLE LEAD ENTRY ================= -->
        <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-6 md:p-8 flex flex-col gap-6 shadow-xl">
          
          <div class="border-b border-[var(--color-border-subtle)] pb-4 flex items-center justify-between">
            <div>
              <h3 class="text-base font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] flex items-center gap-2">
                <UserPlus size={18} class="text-[var(--color-accent-emerald)]" />
                Einzelnes Unternehmen manuell erfassen
              </h3>
              <p class="text-xs text-[var(--color-ink-secondary)] mt-0.5">
                Füge einen Betrieb direkt aus persönlicher Recherche zur Akquise-Queue hinzu.
              </p>
            </div>
          </div>

          {#if manualSuccess}
            <div class="bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/40 rounded-[var(--radius-md)] p-4 flex items-center gap-3">
              <CheckCircle2 size={20} class="text-[var(--color-accent-emerald)] flex-shrink-0" />
              <div>
                <p class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">Lead erfolgreich angelegt!</p>
                <p class="text-xs text-[var(--color-accent-emerald)]">Der Betrieb wurde sofort in der Telefonie-Queue gespeichert.</p>
              </div>
            </div>
          {/if}

          <!-- DUPLICATE WARNING INLINE CARD FOR MANUAL IMPORT -->
          {#if manualDuplicateMatch}
            <div class="bg-[var(--color-status-amber)]/10 border-2 border-[var(--color-status-amber)]/50 rounded-[var(--radius-md)] p-4 flex flex-col gap-3">
              <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-status-amber)]">
                <AlertTriangle size={18} class="shrink-0" />
                <span>Achtung: Dieser Betrieb existiert sehr ähnlich bereits in der Datenbank!</span>
              </div>
              
              <div class="bg-[var(--color-surface-panel)] p-3 rounded border border-[var(--color-border-subtle)] text-xs flex flex-col gap-1">
                <div class="font-bold text-[var(--color-ink-primary)]">{manualDuplicateMatch.matchedLead.name}</div>
                <div class="text-[var(--color-ink-secondary)] font-mono">Tel: {manualDuplicateMatch.matchedLead.phoneNumber} | Grund: {manualDuplicateMatch.reason}</div>
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="force-manual-check"
                  bind:checked={forceManualImport}
                  class="w-4 h-4 rounded border-[var(--color-border-focus)] bg-[var(--color-surface-panel)] text-[var(--color-accent-emerald)] focus:ring-0 cursor-pointer accent-[var(--color-accent-emerald)]"
                />
                <label for="force-manual-check" class="text-xs text-[var(--color-ink-primary)] font-semibold cursor-pointer">
                  Trotzdem als Duplikat importieren
                </label>
              </div>
            </div>
          {/if}

          {#if manualError}
            <div class="bg-[var(--color-status-rose)]/10 border border-[var(--color-status-rose)]/40 rounded-[var(--radius-md)] p-4 text-xs font-medium text-[var(--color-status-rose)]">
              {manualError}
            </div>
          {/if}

          <form onsubmit={handleManualSubmit} class="flex flex-col gap-5">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div class="flex flex-col gap-1.5">
                <label for="manual-name" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <Building2 size={13} class="text-[var(--color-accent-emerald)]" />
                  Firmenname / Ansprechpartner <span class="text-[var(--color-status-rose)]">*</span>
                </label>
                <input
                  type="text"
                  id="manual-name"
                  bind:value={manualLead.name}
                  onblur={checkManualDuplicate}
                  placeholder="z.B. Marquardt's Kellerkneipe"
                  required
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none transition-colors"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="manual-phone" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <Phone size={13} class="text-[var(--color-accent-emerald)]" />
                  Telefonnummer <span class="text-[var(--color-status-rose)]">*</span>
                </label>
                <input
                  type="text"
                  id="manual-phone"
                  bind:value={manualLead.phoneNumber}
                  onblur={checkManualDuplicate}
                  placeholder="z.B. 0371 315419"
                  required
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none font-mono transition-colors"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="manual-industry" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <Tag size={13} class="text-[var(--color-accent-emerald)]" />
                  Branche / Skript-Nische
                </label>
                <select
                  id="manual-industry"
                  bind:value={manualLead.industry}
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] outline-none transition-colors cursor-pointer"
                >
                  <option value="Gastronomie & Bar">Gastronomie & Bar (Kneipe, Restaurant)</option>
                  <option value="Handwerk & Bau">Handwerk & Bau (Tischler, Maler)</option>
                  <option value="B2B & Dienstleister">B2B & Dienstleister (Agentur, Berater)</option>
                  <option value="Praxen & Gewerbe">Praxen & Gewerbe (Zahnarzt, Physio)</option>
                  <option value="Allgemein">WaaS Allrounder (Generisch)</option>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="manual-address" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <MapPin size={13} class="text-[var(--color-accent-emerald)]" />
                  Adresse / Ort
                </label>
                <input
                  type="text"
                  id="manual-address"
                  bind:value={manualLead.address}
                  placeholder="z.B. Heinrich-Beck-Straße 64, 09112 Chemnitz"
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none transition-colors"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="manual-rating" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <Star size={13} class="text-[var(--color-status-amber)]" />
                  Google Sterne (z.B. 4.7)
                </label>
                <input
                  type="text"
                  id="manual-rating"
                  bind:value={manualLead.rating}
                  placeholder="4.7"
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none font-mono transition-colors"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="manual-reviews" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                  <FileText size={13} class="text-[var(--color-accent-emerald)]" />
                  Anzahl Google Reviews
                </label>
                <input
                  type="number"
                  id="manual-reviews"
                  bind:value={manualLead.reviews}
                  placeholder="157"
                  class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none font-mono transition-colors"
                />
              </div>

            </div>

            <div class="flex flex-col gap-1.5">
              <label for="manual-notes" class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                <FileText size={13} class="text-[var(--color-accent-emerald)]" />
                Notizen & Telefon-Hinweise
              </label>
              <textarea
                id="manual-notes"
                bind:value={manualLead.notes}
                rows={3}
                placeholder="z.B. Kult-Raucherkneipe auf dem Kaßberg. Uriger Chef. Keine Website hinterlegt auf Google."
                class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-emerald)] rounded-[var(--radius-md)] p-3 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] outline-none resize-none transition-colors leading-relaxed"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={manualSubmitting || (manualDuplicateMatch !== null && !forceManualImport)}
              class="py-3 px-6 bg-[var(--color-accent-emerald)] hover:bg-[#059669] text-[#052E16] font-[var(--font-excon)] font-bold text-xs uppercase tracking-wider rounded-[var(--radius-md)] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {#if manualSubmitting}
                <Loader2 size={16} class="animate-spin" />
                Speichere Lead...
              {:else}
                <UserPlus size={16} />
                Lead zur Akquise-Queue hinzufügen
              {/if}
            </button>

          </form>
        </div>
      {/if}
    </div>

  </div>

  <!-- SLIDE-OVER IMPORT HISTORY DRAWER -->
  {#if isHistoryOpen}
    <div class="fixed inset-0 z-50 flex justify-end">
      
      <!-- BACKDROP OVERLAY -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onclick={() => isHistoryOpen = false}
      ></div>

      <!-- DRAWER CONTENT PANEL -->
      <div class="relative w-full max-w-md bg-[var(--color-surface-panel)] border-l border-[var(--color-border-subtle)] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        
        <div class="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-lift)] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <History size={16} class="text-[var(--color-accent-emerald)]" />
            <h3 class="text-xs font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-primary)]">
              Import-Verlauf ({history.length})
            </h3>
          </div>
          <button
            type="button"
            onclick={() => isHistoryOpen = false}
            class="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-panel)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div class="p-4 flex-1 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
          {#if history.length === 0}
            <div class="p-8 text-center text-xs text-[var(--color-ink-secondary)] flex flex-col items-center justify-center gap-2">
              <History size={24} class="text-[var(--color-ink-muted)] mb-1" />
              <span>Bisher noch keine Imports durchgeführt.</span>
            </div>
          {:else}
            {#each history as item}
              <div class="py-3.5 flex flex-col gap-1.5 hover:bg-[var(--color-surface-lift)]/50 px-2 rounded-[var(--radius-md)] transition-colors">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] truncate" title={item.filename}>
                    {item.filename}
                  </span>
                  <span class="text-[10px] font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30 px-2 py-0.5 rounded-[var(--radius-sm)] shrink-0">
                    +{item.count} Leads
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-[var(--color-ink-secondary)] font-mono">
                  <span>{item.date}</span>
                  <span class="text-[10px] text-[var(--color-ink-muted)]">Gespeichert</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>

      </div>

    </div>
  {/if}

</div>
