import Together from "together-ai";

class TogetherClient {
  constructor(apiKey = process.env["TOGETHER_API_KEY"]) {
    this.apiKey = apiKey;
    this.together = new Together({
      apiKey: this.apiKey,
    });
    this.default_tokens = 1024;
  }

  async chat(model, messages, { max_tokens, ...rest } = {}) {
    if (!this.together?.chat?.completions?.create) {
      throw new Error("together.chat.completions.create is not defined");
    }

    const responseStream = await this.together.chat.completions.create({
      model: model,
      messages: messages,
      stream: false,
      max_tokens: max_tokens || this.default_tokens,
      ...rest,
    });

    return responseStream.choices[0].message.content;
  }
}

export default TogetherClient;
