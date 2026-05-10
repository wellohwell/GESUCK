import * as fs from "fs";

function processFile(path: string) {
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/font-black/g, 'font-semibold');
  content = content.replace(/tracking-widest/g, 'tracking-tight');
  content = content.replace(/tracking-\[0\.2em\]/g, 'tracking-tight');
  content = content.replace(/tracking-\[0\.18em\]/g, 'tracking-tight');
  content = content.replace(/tracking-\[0\.3em\]/g, 'tracking-tight');
  content = content.replace(/tracking-\[0\.15em\]/g, 'tracking-tight');
  content = content.replace(/tracking-\[0\.1em\]/g, 'tracking-tight');
  content = content.replace(/uppercase/g, '');
  content = content.replace(/italic/g, '');
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[10px\]/g, 'text-sm');
  content = content.replace(/text-\[11px\]/g, 'text-sm');
  content = content.replace(/text-\[8px\]/g, 'text-xs');
  content = content.replace(/text-\[7px\]/g, 'text-xs');
  fs.writeFileSync(path, content, 'utf-8');
}

processFile('src/pages/Dashboard.tsx');
processFile('src/pages/Admin.tsx');
processFile('src/pages/Login.tsx');
console.log("Replaced typography styling.");
