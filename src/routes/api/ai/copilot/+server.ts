import { json } from '@sveltejs/kit';

let globalKeyIndex = 0;

const keysPool = [
  process.env.NVIDIA_NIM_API_KEY || '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',
  process.env.NVIDIA_NIM_BACKUP_API_KEY || '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',
  process.env.NVIDIA_NIM_BACKUP_API_KEY_2 || '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'
].filter(Boolean);

const modelsPool = [
  process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct',
  'meta/llama-3.3-70b-instruct'
];

export async function POST({ request }) {
  if (keysPool.length === 0) {
    return json({ error: 'Kein NVIDIA NIM API-Schlüssel konfiguriert.' }, { status: 500 });
  }

  try {
    const { query, lead } = await request.json();

    if (!query || !query.trim()) {
      return json({ error: 'Keine Suchanfrage übergeben.' }, { status: 400 });
    }

    const leadContextText = lead ? `
AKTUELLER LEAD IM COCKPIT:
- Firma: ${lead.name || 'Unbekannt'}
- Branche: ${lead.industry || 'B2B'}
- Kategorie: ${lead.category || 'Allgemein'}
- Notizen: ${lead.notes || 'Keine'}
- Vorherige Wiedervorlage Notiz: ${lead.previousWiedervorlageNote || 'Keine'}
    `.trim() : 'Kein Lead-Kontext ausgewählt.';

    const systemPrompt = `Du bist "Buff AI Co-Pilot" – der ultimative, psychologisch geschulte Vertriebscoach, Top-Closer und KI-Echtzeitassistenz für Kaltakquise & Telefonvertrieb (Cold Calling Cockpit) für unser Produkt: WaaS (Website as a Service – moderne, konvertierende Websites auf monatlicher Service-Basis ohne hohes 5.000€+ Investitionsrisiko, inkl. Wartung, Pflege & Lead-Garantie).

## AKTUELLER ANRUF-KONTEXT
${leadContextText}

## REALITÄT DER LEADS & VERTRIEBS-WORKFLOW:
1. **LEADS HABEN KEINE WEBSITE!** Unsere Leads haben bisher KEINE eigene Website! Ihre Infos/Menüs sind maximal auf Google Maps als unscharfe Bilder oder auf Facebook (wenn überhaupt). Sage NIEMALS "Ich war auf Ihrer Website" oder "Ihre Website lädt langsam".
2. **VERBOTENE BUZZWORDS:** Benutze NIEMALS "Webdesign", "Homepage-Optimierung" oder "KI-Automatisierung". Das sind verbrannte Wörter! Nutze stattdessen: "digitale Kundenreise", "Google-Maps Auftritt", "schlüsselfertige WaaS-Präsenz", "automatische Qualifizierung".
3. **WORKFLOW & ZIEL DES ANRUFS:** Das Ziel des Telefonats ist AUSSCHLIESSLICH das Buchen eines Meetings (wiederum online per Zoom ODER persönlich vor Ort beim Kunden). Kein Verkauf am Telefon!
4. **USER-JOURNEY SCHMERZ-HOOK (OHNE WEBSITE):**
   - *Gastro:* "Ich wollte Ihre Speisekarte auf Google anschauen – da sind nur unscharfe Fotos von Gästen drin und keine eigene Website hinterlegt. Wissen Sie wie viele Gäste abends zum Nachbar-Lokal weitergehen?"
   - *Handwerk:* "Ich wollte bei Ihnen Preise/Notdienst über Google anfragen – aber Sie haben bisher keine eigene Website hinterlegt. Ist das Absicht um Kunden abzuschrecken?"
   - *B2B:* "Wer bei Google nach Ihnen sucht, findet Ihren Maps-Eintrag aber keine eigene Präsenz. Tut es Ihnen nicht weh wie viele Kunden zur Konkurrenz abwandern?"
5. **EDGE CASES (Ausgebucht / Sterne / Rente / Stammkneipe / Social Media):**
   - *Bei 4,8 Sternen & Ausgebucht:* Drehe das Thema auf **Mitarbeiter-Gewinnung & Durchsetzung von Premium-Preisen** ("Bei 4.8 Sternen brauchen Sie keine Neukunden, aber gute Fachkräfte googeln Sie!").
   - *Bei urigen Stammkneipen / Nischen (z.B. Marquardt's Kellerkneipe):* Drehe das Thema auf **Stammgast-Nachwuchs & Neuzugezogene** ("Ihre Stammgäste werden älter, WaaS sichert den Nachwuchs der nächsten 10 Jahre bei Google").
   - *Bei Rente / Schließung in 3 Jahren:* Drehe das Thema auf **Verkaufswert & Nachfolge** ("WaaS steigert den Übergabewert des Betriebs um 20-30%").
6. **TERMIN-CLOSING (ONLINE ODER PERSÖNLICH):** Nie fragen "Wann passt es Ihnen?", sondern mit fallender Tonalität: "Lassen Sie uns dazu kurz 10 Minuten zusammensetzen – entweder online oder ich komme persönlich vorbei. Auf welchen Tag schauen Sie gerade in Ihrem Kalender?"

## EXAKTES AUSGABE-FORMAT (STRIKT EINHALTEN)
Du DUZT den Verkäufer in der Taktik. Das Wording und der Next Step MÜSSEN in der Höflichkeitsform (Sie/Ihr) für den Endkunden formuliert sein.

💡 **Taktik:** [Maximal 1 Satz in der Du-Form an den Verkäufer: Psychologischer Hebel / Konjunktiv / Verlustangst]

💬 **Wording:** [1-2 Sätze in der Sie-Form zum direkten Vorlesen an den Kunden. Messerscharfer Vertriebs-Slang.]

🎯 **Next Step:** [Eine einzige zwingende Abschluss- oder Kalender-Frage in der Sie-Form.]`;

    let nimResponseStream: ReadableStream<Uint8Array> | null = null;
    let success = false;
    let lastErrorMsg = '';

    const startIndex = globalKeyIndex % keysPool.length;
    globalKeyIndex = (globalKeyIndex + 1) % keysPool.length;

    // Loop through model and keys with a 30s connection timeout
    for (const currentModel of modelsPool) {
      if (success) break;

      for (let attempt = 0; attempt < keysPool.length; attempt++) {
        const keyIndex = (startIndex + attempt) % keysPool.length;
        const apiKey = keysPool[keyIndex];

        try {
          console.log(`Connecting to NVIDIA NIM: model "${currentModel}" with Key ${keyIndex}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

          const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
              ],
              temperature: 0.6,
              max_tokens: 1000,
              stream: true
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (res.status === 200 && res.body) {
            nimResponseStream = res.body;
            success = true;
            console.log(`NVIDIA NIM successfully connected with model "${currentModel}"!`);
            break;
          } else {
            const errText = await res.text();
            lastErrorMsg = `HTTP ${res.status}: ${errText}`;
            console.warn(`NVIDIA NIM Model "${currentModel}" Key ${keyIndex} failed (${res.status}):`, errText);
            if (res.status === 404) break;
          }
        } catch (e: any) {
          lastErrorMsg = e?.message || String(e);
          console.warn(`NVIDIA NIM connection error for ${currentModel}:`, lastErrorMsg);
        }
      }
    }

    if (!success || !nimResponseStream) {
      return json({ error: `KI-Verbindung fehlgeschlagen (${lastErrorMsg || 'Timeout'}).` }, { status: 500 });
    }

    // Transform SSE Stream (`data: {...}`) to raw text chunks for browser
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const outputStream = new ReadableStream({
      async start(controller) {
        const reader = nimResponseStream!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ') && !trimmed.includes('[DONE]')) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const content = json.choices[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Skip partial JSON chunks
                }
              }
            }
          }

          if (buffer.trim().startsWith('data: ') && !buffer.includes('[DONE]')) {
            try {
              const json = JSON.parse(buffer.trim().slice(6));
              const content = json.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {}
          }

          controller.close();
        } catch (err) {
          console.error('Stream processing error:', err);
          controller.error(err);
        }
      }
    });

    return new Response(outputStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err: any) {
    console.error('AI Co-Pilot POST error:', err);
    return json({ error: 'AI Co-Pilot route error.' }, { status: 500 });
  }
}
