import express from 'express';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import TogetherClient from '../client.js';

const router = express.Router();
const ai = new TogetherClient();
const maxTokens = 1024;
const PASSWORD = process.env.PASSWORD;

// Load model configuration
const modelConfigPath = path.join(process.cwd(), 'config', 'modelConfig.json');
let modelConfig = [];
try {
  const fileContent = fs.readFileSync(modelConfigPath, 'utf-8');
  modelConfig = JSON.parse(fileContent);
} catch (error) {
  console.error('Failed to read modelConfig.json:', error);
}

// Set up rate limiters
const rateLimiters = modelConfig.reduce((acc, config) => {
  acc[config.model] = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: config.rateLimit,
    message: {
      error: `Rate limit exceeded for model ${config.model}. Please wait before making more requests.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  return acc;
}, {});

// Route to get available models
router.get('/models', (_, res) => {
  res.json(modelConfig);
});

// Chat route
router.post(
  '/',
  (req, res, next) => {
    const { model, key } = req.body;

    // Validate key (password)
    if (key !== PASSWORD) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Validate model
    if (!modelConfig.some((config) => config.model === model)) {
      return res.status(400).json({
        error: `Model not found (${model}), available models: ${modelConfig.map((m) => m.model).join(' | ')}`,
      });
    }

    // Attach rate limiter for the specified model
    const rateLimiter = rateLimiters[model];
    if (rateLimiter) {
      rateLimiter(req, res, next);
    } else {
      res.status(500).json({ error: 'Unexpected error with rate limiter.' });
    }
  },
  async (req, res) => {
    const { chatMessages, model } = req.body;

    // Validate chat messages
    if (!chatMessages || chatMessages.length === 0) {
      return res.status(400).json({ error: 'Chat messages are required' });
    }

    try {
      // Process chat request
      const response = await ai.chat(model, chatMessages, maxTokens);
      res.json(response);
    } catch (error) {
      console.error('Error during chat processing:', error);
      res.status(500).json({ error: 'Failed to process the request' });
    }
  }
);

export default router;
