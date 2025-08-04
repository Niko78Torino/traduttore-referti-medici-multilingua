// File: netlify/functions/analyze.js

// Import 'node-fetch' per effettuare richieste HTTP in un ambiente Node.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    // Controlla se il metodo della richiesta è POST. Altrimenti, restituisce un errore.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        // Estrae i dati (immagine e lingua) dal corpo della richiesta inviata dal frontend.
        const { imageData, imageType, language } = JSON.parse(event.body);
        
        // Recupera la chiave API di Gemini dalle variabili d'ambiente di Netlify.
        // Questa è la parte sicura: la chiave non è mai esposta al frontend.
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("La chiave API di Gemini non è stata configurata sul server.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // Prepara il prompt per l'API di Gemini, includendo la lingua richiesta.
        const prompt = `
            Analizza l'immagine di questo referto medico o ricetta in modo approfondito. Il tuo obiettivo è spiegare le problematiche riscontrate al paziente.
            1. **Trascrizione del Contenuto:** Prima di tutto, trascrivi il testo essenziale del documento per dare contesto.
            2. **Identificazione delle Problematiche:** Analizza i valori, le diagnosi o le prescrizioni. Identifica quali sono i punti critici o le problematiche principali (es. valori fuori norma, diagnosi di una patologia, interazioni tra farmaci prescritti).
            3. **Spiegazione Semplice:** Spiega ogni problematica identificata in un linguaggio chiaro, semplice e diretto, come se parlassi a un paziente che non ha conoscenze mediche. Evita il gergo tecnico il più possibile.
            4. **Organizzazione:** Struttura la risposta in formato Markdown con le seguenti sezioni:
               - ### Riepilogo del Contenuto
               - ### Analisi delle Problematiche
               - ### Spiegazione dei Termini Chiave
            Non includere avvisi o disclaimer nella tua risposta, verranno aggiunti dall'applicazione. Se l'immagine non è un documento medico o non è leggibile, rispondi con un messaggio che lo segnali. Usa h3 (###) per i titoli delle sezioni.
            Rispondi esclusivamente nella seguente lingua: ${language}.
        `;

        // Prepara il payload per la richiesta all'API di Gemini.
        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: imageType, data: imageData } }
                ]
            }],
        };

        // Effettua la chiamata all'API di Gemini.
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error("Errore API Gemini:", errorBody);
            throw new Error(`Errore dalla API di Gemini: ${apiResponse.statusText}`);
        }

        const result = await apiResponse.json();

        // Restituisce la risposta dell'API al frontend.
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('Errore nella Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
