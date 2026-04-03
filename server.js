const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 API KEYS (from Render environment variables)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// 🧠 TEMP STORAGE (will move to MongoDB later)
let users = {};

// 🔹 Helper: calculate credits
function calculateCredits(minutes) {
  return Math.ceil(minutes / 30) * 0.5;
}

// 🔹 Sync user
app.post("/user/sync", (req, res) => {
  const { email } = req.body;

  if (!users[email]) {
    users[email] = {
      credits: 10,
      sessionStart: null
    };
  }

  res.json({ credits: users[email].credits });
});

// 🔹 Get credits
app.get("/credits/:email", (req, res) => {
  const { email } = req.params;

  if (!users[email]) {
    return res.json({ credits: 0 });
  }

  res.json({ credits: users[email].credits });
});

// 🔹 Start session
app.post("/session/start", (req, res) => {
  const { email } = req.body;

  if (!users[email] || users[email].credits <= 0) {
    return res.status(400).json({ error: "No credits" });
  }

  users[email].sessionStart = Date.now();

  res.json({ message: "Session started" });
});

// 🔹 End session
app.post("/session/end", (req, res) => {
  const { email } = req.body;

  const user = users[email];

  if (!user || !user.sessionStart) {
    return res.status(400).json({ error: "No active session" });
  }

  const elapsedMs = Date.now() - user.sessionStart;
  const minutes = elapsedMs / (1000 * 60);

  const used = calculateCredits(minutes);

  user.credits -= used;
  if (user.credits < 0) user.credits = 0;

  user.sessionStart = null;

  res.json({
    used,
    remaining: user.credits
  });
});


// 🤖 CLAUDE API ENDPOINT
app.post("/generate", async (req, res) => {
  try {
    const { jd, resume, customPrompt } = req.body;

    const prompt = customPrompt && customPrompt.length > 10
      ? customPrompt
      : "Act as an interview copilot and give smart answers.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nJob Description:\n${jd}\n\nResume:\n${resume}`
          }
        ]
      })
    });

    const data = await response.json();

    res.json(data);
  } catch (err) {
    console.error("Claude API error:", err);
    res.status(500).json({ error: "Claude request failed" });
  }
});


// 🧪 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("VicksAI backend running");
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
