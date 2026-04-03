const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (temporary)
let users = {};

// Helper: calculate credits
function calculateCredits(minutes) {
  return Math.ceil(minutes / 30) * 0.5;
}

// Sync user (create if not exists)
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

// Get credits
app.get("/credits/:email", (req, res) => {
  const { email } = req.params;

  if (!users[email]) {
    return res.json({ credits: 0 });
  }

  res.json({ credits: users[email].credits });
});

// Start session
app.post("/session/start", (req, res) => {
  const { email } = req.body;

  if (!users[email] || users[email].credits <= 0) {
    return res.status(400).json({ error: "No credits" });
  }

  users[email].sessionStart = Date.now();

  res.json({ message: "Session started" });
});

// End session
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

// Health check
app.get("/", (req, res) => {
  res.send("VicksAI backend running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
