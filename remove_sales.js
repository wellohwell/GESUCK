import fs from 'fs';

let content = fs.readFileSync('src/features/reports/pages/OperationalReportPage.tsx', 'utf8');

content = content.replace(/  const \[salesList, setSalesList.*?\n/, '');
content = content.replace(/  const \[isEditingSales, setIsEditingSales.*?\n/, '');
content = content.replace(/  const \[salesInput, setSalesInput.*?\n/, '');

content = content.replace(/  useEffect\(\(\) => \{\n    if \(!user\?\.uid\) return;\n    const reportRef = doc\(db, 'weeklyReports'.*?\}, \[user\?\.uid, weekString\]\);\n\n/s, '');

content = content.replace(/  const handleSaveSales = async \(\) => \{.*?  \};\n\n/s, '');

content = content.replace(/          \{\/\* Sales Team Section \*\/.*?          \{\/\* Summary Cards \*\/\}/s, '          {/* Summary Cards */}');

fs.writeFileSync('src/features/reports/pages/OperationalReportPage.tsx', content);
