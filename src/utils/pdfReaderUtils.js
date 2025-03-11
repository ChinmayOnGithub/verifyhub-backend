// src/utils/pdfReaderUtils.js
import { PdfReader } from 'pdfreader';

/**
 * Extracts text from a PDF file using pdfreader.
 * @param {string} filePath - The path to the PDF file.
 * @returns {Promise<string>} - A promise that resolves with the extracted text.
 */
export const extractTextFromPDF = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = {}; // Mapping of y coordinate (row) to text content.
    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        // End of file reached; sort rows and join text.
        const text = Object.keys(rows)
          .sort((a, b) => a - b)
          .map((rowNum) => rows[rowNum])
          .join('\n');
        resolve(text);
      } else if (item.text) {
        // Append text to the corresponding row (round y coordinate for consistency)
        const y = Math.floor(item.y);
        rows[y] = (rows[y] || "") + item.text + " ";
      }
    });
  });
};

export default extractTextFromPDF;
