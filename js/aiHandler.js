import fetch from "node-fetch";

const API_KEY = process.env["API_KEY"];
const url = "https://api.sambanova.ai/v1/chat/completions";

class AIHandler {
  async send(data) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const json = await response.json();
      const { choices } = json;

      const message = choices[0].message.content;

      return {
        message,
        json,
      };
    } catch (error) {
      console.error("Error:", error);
      return {
        errored: true,
        error_message: error.message,
      };
    }
  }
}

export default AIHandler;
