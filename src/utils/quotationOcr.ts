import Tesseract from 'tesseract.js';

const COLUMN_SPLIT_REGEX = /\s{2,}|\t|\|/;

const padRows = (rows: string[][]): string[][] => {
  const maxCols = Math.max(1, ...rows.map((row) => row.length));
  return rows.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) {
      padded.push('');
    }
    return padded;
  });
};

export const parseOcrTextToTable = (text: string): string[][] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [['']];
  }

  const rows = lines.map((line) => {
    const parts = line
      .split(COLUMN_SPLIT_REGEX)
      .map((cell) => cell.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [line];
  });

  return padRows(rows);
};

export const extractTextFromImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const result = await Tesseract.recognize(file, 'spa+eng', {
    logger: (info) => {
      if (info.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  return result.data.text.trim();
};

export const createEmptyTable = (rows = 5, cols = 4): string[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));

export const normalizeTableRows = (rows: string[][]): string[][] => {
  if (rows.length === 0) {
    return createEmptyTable(1, 1);
  }
  return padRows(rows);
};
