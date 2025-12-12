require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const SYSTEM_PROMPT = `
You are PromptAdvisor, a professional AI prompt engineer.
You generate SHORT, BALANCED, and ADVANCED prompts.
Keep output concise.
`;

// health check
app.get('/', (req, res) => res.json({ status: "Backend is running" }));

// MAIN AI ROUTE
app.post('/api/generate', async (req, res) => {
  try {
    const { user_text, audience, tone, constraints } = req.body || {};

    const userMessage = `User text: ${user_text}
Audience: ${audience}
Tone: ${tone}
Constraints: ${constraints}`;

    const payload = {
      model: "llama3-8b-8192",   // <-- Change if Groq says "model not found"
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 150
    };

    // Ensure env vars exist
    if (!process.env.GORQ_KEY || !process.env.GORQ_API_URL) {
      return res.status(500).json({
        success: false,
        error: "Missing API key or URL in server environment."
      });
    }

    // AXIOS call — DO NOT THROW ON 400
    const r = await axios.post(process.env.GORQ_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.GORQ_KEY}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true, // allow 400, 401, 500
      timeout: 20000
    });

    // If Groq returns an error
    if (r.status < 200 || r.status >= 300) {
      return res.status(r.status).json({
        success: false,
        groq_status: r.status,
        groq_body: r.data
      });
    }

    const output = r.data.choices?.[0]?.message?.content || "";

    res.json({
      success: true,
      data: String(output)
    });

  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Unknown server error"
    });
  }
});

// start server
app.listen(PORT, () => {
  console.log("Backend running on PORT:", PORT);
});
