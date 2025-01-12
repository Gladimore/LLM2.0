import fs from "fs";
import path from "path";

let caches = [];

const __dirname = process.cwd();

function getFile(filepath) {
  if (caches[filepath]) {
    return caches[filepath];
  }

  const completePath = path.join(__dirname, filepath);
  const res = fs.readFileSync(completePath, "utf-8");
  caches[filepath] = res;

  return res;
}

export default getFile;
