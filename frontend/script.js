// frontend/script.js
// *** SET THIS to your Render backend URL (exact) ***
const API_BASE = "https://nexoprompt.onrender.com"; // <- replace with your Render URL
const API_PATH = API_BASE + "/api/generate";

const $ = id => document.getElementById(id);
const status = $("status");
const results = $("results");

async function generatePrompts() {
  const user_text = $("user_text").value.trim();
  const audience = $("audience").value.trim();
  const tone = $("tone").value.trim();
  const constraints = $("constraints").value.trim();

  if (!user_text) { alert("Please type what you want to generate."); return; }

  status.textContent = "Generating...";
  $("generateBtn").disabled = true;

  try {
    const res = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_text, audience, tone, constraints })
    });

    const raw = await res.text();
    let json = null;
    try { json = JSON.parse(raw); } catch (e) { json = null; }

    if (!json) throw new Error("Server sent non-JSON response: " + raw.slice(0,200));

    if (!json.success) {
      const groqStatus = json.groq_status || "unknown";
      const body = JSON.stringify(json.groq_body || json.error).slice(0,800);
      throw new Error(`Groq Error (${groqStatus}): ${body}`);
    }

    displayResults(json.data || "");
  } catch (err) {
    alert("Error: " + (err.message || err));
    console.error("Generate error:", err);
  } finally {
    $("generateBtn").disabled = false;
    status.textContent = "";
  }
}

function displayResults(text) {
  results.classList.remove("hidden");
  $("shortPrompt").textContent = extractBlock(text, 0);
  $("balancedPrompt").textContent = extractBlock(text, 1);
  $("advancedPrompt").textContent = extractBlock(text, 2);
}

function extractBlock(text, index) {
  if (!text) return "(no output)";
  // try split by headings, fallback to simple 3-part split
  const shortMatch = text.match(/SHORT[\s\-:]*\n?([\s\S]*?)(?=BALANCED|ADVANCED|$)/i);
  const balancedMatch = text.match(/BALANCED[\s\-:]*\n?([\s\S]*?)(?=ADVANCED|SHORT|$)/i);
  const advMatch = text.match(/ADVANCED[\s\-:]*\n?([\s\S]*?)(?=SHORT|BALANCED|$)/i);

  if (index === 0 && shortMatch) return shortMatch[1].trim();
  if (index === 1 && balancedMatch) return balancedMatch[1].trim();
  if (index === 2 && advMatch) return advMatch[1].trim();

  // fallback: split by double newlines
  const parts = text.split(/\n{2,}/).filter(Boolean);
  return parts[index] ? parts[index].trim() : text.trim();
}

// copy buttons
document.addEventListener("click", e => {
  if (e.target.classList.contains("copy-btn")) {
    const id = e.target.dataset.target;
    const t = $(id).textContent || "";
    navigator.clipboard.writeText(t).then(() => {
      e.target.textContent = "Copied!";
      setTimeout(()=> e.target.textContent = "Copy", 1200);
    });
  }
});

$("generateBtn").addEventListener("click", generatePrompts);
