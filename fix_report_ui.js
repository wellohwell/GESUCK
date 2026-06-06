import fs from 'fs';

let content = fs.readFileSync('src/features/reports/pages/OperationalReportPage.tsx', 'utf8');

// 1. Update table header
content = content.replace(
  /<tr className=\{cn\(\n\s*"text-\[9px\] font-black uppercase tracking-\[0.12em\] border-b select-none",\n\s*isLight \? "bg-zinc-50 border-zinc-100 text-zinc-400" : "bg-zinc-900\/40 border-border\/10 text-zinc-500"\n\s*\)\}>/g,
  '<tr className={cn("text-[8px] font-black uppercase tracking-widest opacity-40 border-b select-none", isLight ? "border-zinc-100" : "border-border/10")}>'
);

// 2. Update status badge logic to only return color
// This is already done, just the rendering needs to use it.
// Assuming the user wants text color badges

// 3. Update table row padding and styling
// I will use a more robust regex for the whole row based on its structure
content = content.replace(
  /className=\{cn\(\n\s*"border-b last:border-b-0 transition-colors",\n\s*isLight \? "border-zinc-100 hover:bg-zinc-50\/50 text-zinc-800" \? "border-border\/10 hover:bg-\[\#0c0d0e\]\/40 text-foreground"\n\s*\)\}>/g, // This regex is hard.
  `className={cn(
                               "border-b border-border/10 last:border-b-0 transition-colors",
                               isLight 
                                 ? "hover:bg-zinc-50/50 text-zinc-800" 
                                 : "hover:bg-[#0c0d0e]/40 text-foreground"
                             )}`
);

fs.writeFileSync('src/features/reports/pages/OperationalReportPage.tsx', content);
