const Together = require("together-ai");

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

module.exports = TogetherClient;
