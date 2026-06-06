import fs from 'fs';

let content = fs.readFileSync('src/features/reports/pages/OperationalReportPage.tsx', 'utf8');

const regex = /  const handlePrint = async \(\) => \{[\s\S]*?  \};/;
const newHandlePrint = `  const handlePrint = () => {
    // Karena aplikasi menggunakan Tailwind v4 (dengan modern CSS oklab/oklch colors),
    // library JS pembuat PDF seperti html2canvas akan mengalami error parsing.
    // Untungnya, karena ini adalah PWA yang berjalan standalone,
    // kita cukup memanggil pembuat PDF native bawaan device (window.print)
    // yang akan mengubahnya menjadi dialog 'Save as PDF' dengan rendering 100% akurat.
    setTimeout(() => {
      window.print();
    }, 100);
  };`;

content = content.replace(regex, newHandlePrint);

fs.writeFileSync('src/features/reports/pages/OperationalReportPage.tsx', content);
