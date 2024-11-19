const fs = require("fs");
const path = require("path");

function GetFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  let file = fs.readFileSync(fullPath, "utf-8");
  return new Response(file);
}

module.exports = { GetFile };
