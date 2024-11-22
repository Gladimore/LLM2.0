const TogetherClient = require("./client");

const express = require("express");
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
const models = [
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  "meta-llama/Llama-Vision-Free",
  "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
];

const password = process.env["PASSWORD"];

app.post("/api/chat", async (req, res) => {
  const { chatMessages, model, submitedPassword } = req.body;

  if (submitedPassword !== password) {
    return res.status(400).json({ error: "Invalid password" });
  }

  if (!models.includes(model)) {
    return res
      .status(400)
      .json({
        error: `Model not found (${model}), available models: ${models.join(" | ")}`,
      });
  }

  if (!chatMessages || chatMessages.length === 0) {
    return res.status(400).json({ error: "Chat messages are required" });
  }

  const response = await ai.chat(model, chatMessages, max_tokens);

  res.json(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
