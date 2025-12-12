// backend/app.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// MAP your UI model names → REAL Groq models
function mapModel(uiModel) {
  if (uiModel === "llama3-8b-8192") return "mixtral-8x7b";  
  if (uiModel === "llama3-70b-8192") return "llama3-70b";  
  return "mixtral-8x7b";  // default fallback
}

const SYSTEM_PROMPT = `
You are PromptAdvisor, an expert prompt engineer.
Generate high-quality SHORT, BALANCED, and ADVANCED prompts.
Keep responses clean and structured.
`;

app.get("/", (req, res) => res.json({ status: "ok" }));

app.post("/api/generate", async (req, res) => {
  try {
    const { user_text, audience, tone, constraints, model } = req.body;

    const REAL_MODEL = mapModel(model);  // 🔥 Use your model name → real Groq model
    console.log("UI model:", model, "→ Using Groq model:", REAL_MODEL);

    const userMessage = `
User: ${user_text}
Audience: ${audience}
Tone: ${tone}
Constraints: ${constraints}
    `;

    const payload = {
      model: REAL_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 200
    };

    const r = await axios.post(process.env.GORQ_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.GORQ_KEY}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true
    });

    if (r.status < 200 || r.status >= 300) {
      return res.json({
        success: false,
        groq_status: r.status,
        groq_body: r.data
      });
    }

    const output = r.data.choices?.[0]?.message?.content || "";
    res.json({
      success: true,
      model_used: REAL_MODEL,
      data: output
    });

  } catch (err) {
    console.error("SERVER ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log("Backend running on port", PORT));
