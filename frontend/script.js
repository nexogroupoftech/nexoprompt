// If backend and frontend are hosted together on Vercel, keep this empty:
const API_BASE = ""; 

// If backend runs local, change to:  "http://localhost:3001"
// Example: const API_BASE = "http://localhost:3001";

const API_PATH = (API_BASE || "") + "/api/generate";

const $ = id => document.getElementById(id);
const status = $("status");
const results = $("results");

async function generatePrompts() {
  const user_text = $("user_text").value.trim();
  const audience = $("audience").value.trim();
  const tone = $("tone").value.trim();
  const constraints = $("constraints").value.trim();

  if (!user_text) {
    alert("Please type what you want to generate.");
    return;
  }

  status.textContent = "Generating...";
  $("generateBtn").disabled = true;

  try {
    const res = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_text, audience, tone, constraints })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const text = json.data || "";
    displayResults(text);
  } catch (err) {
    alert("Error: " + err.message);
  }

  $("generateBtn").disabled = false;
  status.textContent = "";
}

function displayResults(text) {
  // try to split text by headings
  const short = text.match(/short[\s\S]*?(?=balanced|advanced|$)/i);
  const balanced = text.match(/balanced[\s\S]*?(?=advanced|short|$)/i);
  const advanced = text.match(/advanced[\s\S]*/i);

  $("shortPrompt").textContent = short ? short[0].trim() : "(not found)";
  $("balancedPrompt").textContent = balanced ? balanced[0].trim() : "(not found)";
  $("advancedPrompt").textContent = advanced ? advanced[0].trim() : "(not found)";

  results.classList.remove("hidden");
}

// copy buttons
document.addEventListener("click", e => {
  if (e.target.classList.contains("copy-btn")) {
    const target = $(e.target.dataset.target);
    navigator.clipboard.writeText(target.textContent).then(() => {
      e.target.textContent = "Copied!";
      setTimeout(() => (e.target.textContent = "Copy"), 1200);
    });
  }
});

// bind button
$("generateBtn").addEventListener("click", generatePrompts);
