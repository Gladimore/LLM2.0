# LLM2.0

```
const { JSDOM } = require("jsdom");
const fs = require("fs");

// Read an HTML file (replace 'example.html' with your actual file)
fs.readFile("example.html", "utf-8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  // Parse the HTML using JSDOM
  const dom = new JSDOM(data);
  const document = dom.window.document;

  // Select all list items with role="listitem"
  document.querySelectorAll("[role='listitem']").forEach((div) => {
    const radioGroup = div.querySelector("[role='radiogroup']");

    if (radioGroup) {
      const header = div.querySelector('[role="heading"][aria-level="3"]');
      const question = header.querySelector("span").innerText;
      console.log("Question:", question);

      const options = radioGroup.querySelector('[role="presentation"]');
      const radios = {};

      options.querySelectorAll("label").forEach((label) => {
        const radio = label.querySelector('[role="radio"]');
        const optionValue = label.querySelector('span[dir="auto"]').innerText;

        radios[optionValue] = radio;
      });

      console.log("Radios:", radios);
    }
  });
});
```
