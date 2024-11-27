import express from 'express';
import fs from "fs/promises";
import path from "path";
import rateLimit from "express-rate-limit";

import TogetherClient from "./client.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const max_tokens = null; // 1024
const PASSWORD = process.env.PASSWORD;
const ai = new TogetherClient();

const modelConfig = [
  {
    "model": "meta-llama/Llama-Vision-Free",
    "rateLimit": 300
  },
  {
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "rateLimit": 100
  },
  {
    "model": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "rateLimit": 50
  },
  {
    "model": "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    "rateLimit": 20
  }
]

app.get("/api/models", async (_, res) => {
  try {
    res.setHeader("Content-Type", "application/json");
    res.json(modelConfig);
  } catch (error) {
    console.error("Error reading models:", error);
    res.status(500).json({ error: "Failed to read the file" });
  }
});

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

app.post(
  "/api/chat",
  (req, res, next) => {
    const { model, key } = req.body;

    if (key !== PASSWORD) {
      return res.status(403).json({ error: "Forbidden: Invalid password" });
    }

    if (!modelConfig.some((config) => config.model === model)) {
      return res.status(400).json({
        error: `Model not found (${model}), available models: ${modelConfig.map((m) => m.model).join(", ")}`,
      });
    }

    const rateLimiter = rateLimiters[model];
    if (rateLimiter) {
      rateLimiter(req, res, next);
    } else {
      res.status(500).json({ error: "Unexpected error with rate limiter." });
    }
  },
  async (req, res) => {
    console.log("called")
    const { chatMessages, model } = req.body;

    if (!chatMessages || chatMessages.length === 0) {
      return res.status(400).json({ error: "Chat messages are required" });
    }

    try {
      const response = await ai.chat(model, chatMessages, max_tokens);
      res.json(response);
    } catch (error) {
      console.error("Error during chat processing:", error);
      res.status(500).json({ error: "Failed to process the request" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
