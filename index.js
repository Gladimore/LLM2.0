import Together from "together-ai";
import express from "express";
import rateLimit from "express-rate-limit";

// Environment variables
const TOGETHER_API_KEY = process.env["TOGETHER_API_KEY"];
const API_PASSWORD = process.env["API_PASSWORD"];

// Initialize Together AI client
const together = new Together({ apiKey: TOGETHER_API_KEY });

// Express app
const app = express();

// Middleware
//app.use(express.static("public"));
app.use(express.json());

// Model configurations
const modelConfig = [
  {
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    rateLimit: 100,
  },
  {
    model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    rateLimit: 50,
  },
  {
    model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    rateLimit: 10,
  },
];

// Rate limiters for each model
const rateLimiters = modelConfig.reduce((acc, config) => {
  acc[config.model] = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: config.rateLimit,
    message: {
      error: `Rate limit exceeded for model ${config.model}. Please wait before making more requests.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  return acc;
}, {});

// Authentication rate limiter
const authLimiter = async (req, res, next) => {
  const ip = req.ip;
  const authCounts = authLimiter.authCounts || (authLimiter.authCounts = new Map());
  const now = Date.now();
  const max = 5; // Allow 5 incorrect attempts within 5 minutes
  const windowMs = 5 * 60 * 1000;

  let count = authCounts.get(ip);
  if (!count) {
    count = { requests: 0, timestamp: now };
  }

  if (now - count.timestamp > windowMs) {
    count.requests = 0;
    count.timestamp = now;
  }

  if (count.requests >= max) {
    const retryAfter = Math.ceil((count.timestamp + windowMs - now) / 1000);
    res.set("Retry-After", retryAfter);
    res.status(429).json({ error: "Too many incorrect password attempts. Please try again later." });
    return;
  }

  count.requests++;
  authCounts.set(ip, count);

  next();
};

// Reset authentication rate limiter
authLimiter.reset = (ip) => {
  const authCounts = authLimiter.authCounts;
  if (authCounts) {
    authCounts.delete(ip);
  }
};

// API endpoints
app.get("/api/models", (_, res) => {
  try {
    res.json(modelConfig);
  } catch (error) {
    console.error("Error reading models:", error);
    res.status(500).json({ error: "Failed to read the file" });
  }
});

app.post("/api/chat", authLimiter, async (req, res) => {
  const { REQUEST, PASSWORD } = req.body;
  const { model } = REQUEST;

  REQUEST.stream = true;

  if (PASSWORD !== API_PASSWORD) {
    res.status(401).send("Unauthorized");
    return;
  }

  console.log(REQUEST, PASSWORD)

  // If password is correct, reset the rate limiter
  authLimiter.reset(req.ip);

  if (!modelConfig.some((config) => config.model === model)) {
    return res.status(400).json({
      error: `Model not found (${model}), available models: ${modelConfig.map((m) => m.model).join(", ")}`,
    });
  }

  const rateLimiter = rateLimiters[model];
  if (rateLimiter) {
    rateLimiter(req, res, async () => {
      try {
        const stream = await together.chat.completions.create(REQUEST);

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            res.write(JSON.stringify({ content }) + "\n");
          }
        }

        res.end();
      } catch (error) {
        console.error("Error streaming:", error);
        res.write(JSON.stringify({ error: error.message }) + "\n");
        res.end();
      }
    });
  } else {
    res.status(500).json({ error: "Unexpected error with rate limiter." });
  }
});

// Start server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
