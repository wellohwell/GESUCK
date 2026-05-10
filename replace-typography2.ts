import * as fs from "fs";

function processFile(path: string) {
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/font-bold/g, 'font-medium');
  content = content.replace(/font-semibold/g, 'font-medium'); // Make everything uniformly balanced to medium
  fs.writeFileSync(path, content, 'utf-8');
}

processFile('src/pages/Dashboard.tsx');
processFile('src/pages/Admin.tsx');
processFile('src/pages/Login.tsx');
console.log("Replaced typography styling to font-medium.");
