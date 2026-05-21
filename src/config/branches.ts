export type BranchId = string;

export type BranchConfig = {
  id: BranchId;
  name: string;
  spreadsheetId: string;
  active: boolean;
};

export const branches: Record<BranchId, BranchConfig> = {
  YK01: {
    id: 'YK01',
    name: 'Jogja',
    spreadsheetId: 'YOUR_JOGJA_SPREADSHEET_ID', // Replace with actual
    active: true,
  },
  SL02: {
    id: 'SL02',
    name: 'Solo',
    spreadsheetId: 'YOUR_SOLO_SPREADSHEET_ID', // Replace with actual
    active: true,
  },
  KLT03: {
    id: 'KLT03',
    name: 'Klaten',
    spreadsheetId: 'YOUR_KLATEN_SPREADSHEET_ID', // Replace with actual
    active: true,
  },
};
