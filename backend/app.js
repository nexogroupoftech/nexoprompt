// backend/app.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// set the model once here (change if needed)
const MODEL = "llama3-8b";

console.log("Starting backend. MODEL =", MODEL);

const SYSTEM_PROMPT = `
You are PromptAdvisor, a professional prompt engineer.
Produce three prompts: SHORT (1-2 lines), BALANCED (3-5 lines), ADVANCED (5-8 lines).
Be concise and structured.
`;

// health
app.get('/', (req, res) => res.json({ status: "ok", model: MODEL }));

// main route
app.post('/api/generate', async (req, res) => {
  try {
    const { user_text, audience, tone, constraints } = req.body || {};
    const userMessage = `User text: ${user_text || ''}
Audience: ${audience || 'none'}
Tone: ${tone || 'none'}
Constraints: ${constraints || 'none'}`;

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 150
    };

    if (!process.env.GORQ_KEY || !process.env.GORQ_API_URL) {
      console.error("Missing GORQ env vars");
      return res.status(500).json({ success: false, error: "Server not configured (missing GORQ env vars)" });
    }

    const r = await axios.post(process.env.GORQ_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.GORQ_KEY}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true, // allow non-2xx to inspect body
      timeout: 20000
    });

    if (r.status < 200 || r.status >= 300) {
      console.error("Groq returned error:", r.status, r.data);
      return res.status(r.status).json({ success: false, groq_status: r.status, groq_body: r.data });
    }

    const output = r.data?.choices?.[0]?.message?.content || "";
    return res.json({ success: true, data: String(output) });
  } catch (err) {
    console.error("Server error:", err?.response?.data || err.message || err);
    return res.status(500).json({ success: false, error: err.message || "server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT} — MODEL=${MODEL}`);
});
