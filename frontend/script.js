// UPDATE THIS TO YOUR RENDER URL:
const API_BASE = "https://nexoprompt.onrender.com"; 

// FINAL API PATH
const API_PATH = API_BASE + "/api/generate";

const $ = (x) => document.getElementById(x);
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

    const raw = await res.text();
    let json;

    try { json = JSON.parse(raw); }
    catch { json = null; }

    if (!json) {
      throw new Error("Server sent invalid JSON: " + raw.slice(0, 200));
    }

    if (!json.success) {
      const groqStatus = json.groq_status || "unknown";
      const body = JSON.stringify(json.groq_body || json.error).slice(0, 600);
      throw new Error(`Groq Error (${groqStatus}): ${body}`);
    }

    displayResults(json.data);

  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);

  } finally {
    $("generateBtn").disabled = false;
    status.textContent = "";
  }
}

function displayResults(text) {
  $("results").classList.remove("hidden");

  $("shortPrompt").textContent = extract(text, "short");
  $("balancedPrompt").textContent = extract(text, "balanced");
  $("advancedPrompt").textContent = extract(text, "advanced");
}

function extract(text, key) {
  const match = new RegExp(key + "[\\s\\S]*?(?=short|balanced|advanced|$)", "i").exec(text);
  return match ? match[0].trim() : "(not found)";
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("copy-btn")) {
    const id = e.target.dataset.target;
    navigator.clipboard.writeText($(id).textContent);
    e.target.textContent = "Copied!";
    setTimeout(() => (e.target.textContent = "Copy"), 1000);
  }
});

$("generateBtn").addEventListener("click", generatePrompts);
