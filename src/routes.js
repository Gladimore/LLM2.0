import { Router } from "express";
import expressRateLimiter from "express-rate-limit";

import getFileHandler from "../js/getFile.js";
import AIHandler from "../js/aiHandler.js";

const router = Router();
const ai = new AIHandler();

const modelPath = "../data/models.json";
const API_PASSWORD = process.env["API_PASSWORD"];

const rateLimiter = expressRateLimiter({
  windowMs: 24 * 60 * 60000, // day
  max: 10,
  skip: (req) => req.body.password === API_PASSWORD,
  message: "Too many requests, please try again later.",
});

router.get("/models", (_, res) => {
  const models = getFileHandler(modelPath);

  return res.json(models);
});

router.post("/chat", rateLimiter, (req, res) => {
  const { request_body, password } = req.body;

  if (password !== API_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const models = getFileHandler(modelPath);

  if (!models.includes(request_body.model)) {
    return res.status(400).json({ error: "Invalid model" });
  }

  const { message, json, errored, err_message } = ai.send(request_body);

  if (errored) {
    return res.status(500).json({ error: err_message });
  }

  return res.json({ message, json });
});

export default router;