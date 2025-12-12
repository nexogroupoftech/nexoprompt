// backend/app.js — robust, automatic model fallback
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Candidate models (order = try first → last)
const CANDIDATES = [
  "mixtral-8x7b",   // good quality, often available
  "llama3-70b",     // stronger (may be rate/credit heavy)
  "llama3-8b"       // smaller (may not be granted for your key)
];

// System prompt
const SYSTEM_PROMPT = `
You are PromptAdvisor, a professional prompt engineer.
Produce SHORT, BALANCED and ADVANCED prompts.
Keep output concise.
`;

// helper: call Groq with given model
async function callGroq(model, payload) {
  const body = { ...payload, model };
  const r = await axios.post(process.env.GORQ_API_URL, body, {
    headers: {
      Authorization: `Bearer ${process.env.GORQ_KEY}`,
      "Content-Type": "application/json"
    },
    validateStatus: () => true,
    timeout: 20000
  });
  return r;
}

// health
app.get('/', (req, res) => res.json({ status: "ok", candidates: CANDIDATES }));

app.post('/api/generate', async (req, res) => {
  try {
    if (!process.env.GORQ_KEY || !process.env.GORQ_API_URL) {
      return res.status(500).json({ success: false, error: "Missing GORQ env vars" });
    }

    const { user_text, audience, tone, constraints } = req.body || {};
    const userMessage = `User text: ${user_text || ''}
Audience: ${audience || 'none'}
Tone: ${tone || 'none'}
Constraints: ${constraints || 'none'}`;

    const basePayload = {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 150
    };

    // Try candidates in order
    let lastErr = null;
    for (const model of CANDIDATES) {
      console.log("Trying model:", model);
      const r = await callGroq(model, basePayload);

      // If Groq returned 2xx -> success
      if (r.status >= 200 && r.status < 300) {
        const output = r.data?.choices?.[0]?.message?.content || r.data;
        return res.json({ success: true, model_used: model, data: String(output) });
      }

      // keep last error info to return if all fail
      lastErr = { model, status: r.status, body: r.data };
      console.warn("Model failed:", model, r.status, r.data);
      // if 401/403 probably key issue — break early
      if (r.status === 401 || r.status === 403) break;
    }

    // if we get here, none worked
    return res.status(400).json({
      success: false,
      error: "All candidate models failed or are inaccessible",
      tried: lastErr
    });

  } catch (err) {
    console.error("Server error:", err?.response?.data || err.message || err);
    return res.status(500).json({ success: false, error: err.message || "server error" });
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
