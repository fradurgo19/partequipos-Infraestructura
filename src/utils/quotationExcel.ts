import * as XLSX from 'xlsx';

export const downloadTableAsExcel = (
  rows: string[][],
  fileName: string,
  sheetName = 'Cotización'
): void => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};
