import fs from 'fs';

let content = fs.readFileSync('src/lib/services.ts', 'utf8');

// Replace standard constraints
content = content.replace(/if \(branchId && !isManager\) \{\s*constraints\.push\(where\("branchId", "==", branchId\)\);\s*\}/g, 
  `if (!isManager) {
    if (branchId) {
      constraints.push(where("branchId", "==", branchId));
    } else if (isBranchRestricted) {
      constraints.push(where("branchId", "==", "UNASSIGNED"));
    }
  }`);

// Replace baseConstraints
content = content.replace(/if \(branchId && !isManager\) \{\s*baseConstraints\.push\(where\("branchId", "==", branchId\)\);\s*\}/g, 
  `if (!isManager) {
    if (branchId) {
      baseConstraints.push(where("branchId", "==", branchId));
    } else if (isBranchRestricted) {
      baseConstraints.push(where("branchId", "==", "UNASSIGNED"));
    }
  }`);

fs.writeFileSync('src/lib/services.ts', content);
