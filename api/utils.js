const fs = require("fs");
const path = require("path");

function GetFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  return fs.readFileSync(fullPath, "utf-8"); // Return the file as a string
}

module.exports = { GetFile };
