require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// SYSTEM PROMPT
const SYSTEM_PROMPT = `
You are PromptAdvisor, a professional prompt engineer.
Create SHORT, BALANCED, and ADVANCED prompts based on user input.
Keep output clear and structured.
`;

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "Backend running correctly!" });
});

// MAIN AI ROUTE
app.post("/api/generate", async (req, res) => {
  try {
    const { user_text, audience, tone, constraints } = req.body || {};

    const userMessage = `
User text: ${user_text}
Audience: ${audience}
Tone: ${tone}
Constraints: ${constraints}
    `;

    const payload = {
      model: "llama3-8b",   // WORKING MODEL ✔
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 200
    };

    // Validate environment variables
    if (!process.env.GORQ_KEY || !process.env.GORQ_API_URL) {
      return res.status(500).json({
        success: false,
        error: "Missing GROQ_API_URL or GORQ_KEY in environment."
      });
    }

    // AXIOS REQUEST
    const r = await axios.post(process.env.GORQ_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.GORQ_KEY}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true, // allow 400/500 for error forwarding
      timeout: 20000
    });

    // If Groq returns 4xx/5xx → forward error
    if (r.status < 200 || r.status >= 300) {
      console.error("Groq Error:", r.status, r.data);
      return res.status(400).json({
        success: false,
        groq_status: r.status,
        groq_body: r.data
      });
    }

    // Extract model response
    const output = r.data?.choices?.[0]?.message?.content || "";

    res.json({
      success: true,
      data: String(output)
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Server crashed"
    });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Backend running on PORT ${PORT}`);
});
