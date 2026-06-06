import { execSync } from "child_process";
try {
  execSync("git checkout -- src/features/reports/pages/OperationalReportPage.tsx");
  console.log("File successfully restored from Git!");
} catch (error: any) {
  console.error("Error restoring file:", error.message);
}
