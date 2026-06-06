import fs from 'fs';
let c = fs.readFileSync('src/features/reports/pages/OperationalReportPage.tsx', 'utf8');
c = c.replace(/'Klik untuk tambah keterangan...'/g, "'-'");
c = c.replace(/italic hover:bg-secondary\/40 border-dashed border-border\/30 hover:border-border\/60 print:text-black\/50 print:italic/g, "hover:bg-secondary\/40 hover:border-border\/60 print:text-black\/50");
fs.writeFileSync('src/features/reports/pages/OperationalReportPage.tsx', c);
