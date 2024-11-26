import express from "express";
import fs from "fs/promises";
import path from "path";
import rateLimit from "express-rate-limit";

//import TogetherClient from "./client.js";
import Together from "together-ai";

class TogetherClient {
  constructor(apiKey = process.env["TOGETHER_API_KEY"]) {
    this.apiKey = apiKey;
    this.together = new Together({
      apiKey: this.apiKey,
    });
  }

  async chat(model, messages, { max_tokens, ...rest } = {}) {
    if (!this.together?.chat?.completions?.create) {
      throw new Error("together.chat.completions.create is not defined");
    }

    const responseStream = await this.together.chat.completions.create({
      model: model,
      messages: messages,
      stream: false,
      max_tokens: max_tokens || 2048,
      ...rest,
    });

    return responseStream.choices[0].message.content;
  }
}

const router = express.Router();

const filePath = path.join(process.cwd(), "models.json");
let modelConfig = [];

const max_tokens = 1024;
const PASSWORD = process.env.PASSWORD;
const ai = new TogetherClient();

async function loadModelConfig() {
  try {
    const file = await fs.readFile(filePath, "utf8");
    modelConfig = JSON.parse(file);
  } catch (error) {
    console.error("Error loading model configuration:", error);
    throw new Error("Failed to load model configuration");
  }
}

router.get("/api/models", async (_, res) => {
  try {
    await loadModelConfig();
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

router.post(
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

// Centralized error handling middleware
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Load model configuration on startup
loadModelConfig().catch((error) => {
  console.error("Failed to load model configuration:", error);
  process.exit(1);
});

export default (req, res) => {
  router(req, res, (err) => {
    if (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });
};
