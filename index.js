const TogetherClient = require("./client.js");
const express = require("express");
const rateLimit = require("express-rate-limit");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const max_tokens = 1024;
const ai = new TogetherClient();
const modelConfig = [
  {
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "rateLimit": 100
  },
  {
    "model": "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    "rateLimit": 20
  }
];
const PASSWORD = process.env["PASSWORD"];

// Rate limiters for each model
const rateLimiters = modelConfig.reduce((acc, config) => {
  acc[config.model] = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: config.rateLimit, // Rate limit from the model configuration
    message: {
      error: `Rate limit exceeded for model ${config.model}. Please wait before making more requests.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  return acc;
}, {});

// Main chat processing route with dynamic rate limiter
app.post("/api/chat", (req, res, next) => {
  const { model, key } = req.body;

  // Validate key (password)
  if (key !== PASSWORD) {
    return res.status(400).json({ error: "Invalid password" });
  }

  // Validate model
  if (!modelConfig.some((config) => config.model === model)) {
    return res.status(400).json({
      error: `Model not found (${model}), available models: ${modelConfig.map((m) => m.model).join(" | ")}`,
    });
  }

  // Attach rate limiter for the specified model
  const rateLimiter = rateLimiters[model];
  if (rateLimiter) {
    rateLimiter(req, res, next); // Call the rate limiter middleware
  } else {
    res.status(500).json({ error: "Unexpected error with rate limiter." });
  }
}, async (req, res) => {
  const { chatMessages, model } = req.body;

  // Validate chat messages
  if (!chatMessages || chatMessages.length === 0) {
    return res.status(400).json({ error: "Chat messages are required" });
  }

  try {
    // Process the chat request using TogetherClient
    const response = await ai.chat(model, chatMessages, max_tokens);
    res.json(response);
  } catch (error) {
    console.error("Error during chat processing:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
