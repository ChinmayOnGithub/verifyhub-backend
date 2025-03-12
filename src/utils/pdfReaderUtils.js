import { PdfReader } from 'pdfreader';

const FIELD_PATTERNS = {
  uid: /^\s*UID\s*:\s*(.+)/i,
  candidateName: /^\s*Candidate\s+Name\s*:\s*(.+)/i,
  courseName: /^\s*Course\s+Name\s*:\s*(.+)/i,
  orgName: /^\s*(Organization|Org)\s*:\s*(.+)/i // More flexible pattern
};

export const extractCertificate = (filePath) => {
  return new Promise((resolve, reject) => {
    const fields = { uid: null, candidateName: null, courseName: null, orgName: null };
    const textItems = [];
    let currentY = null;

    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) return reject(err);

      if (!item) {
        // Process collected text items
        const lines = {};
        textItems.forEach(({ y, text }) => {
          lines[y] = (lines[y] || '') + text + ' ';
        });

        Object.values(lines).forEach(line => {
          const cleanLine = line.trim();
          Object.entries(FIELD_PATTERNS).forEach(([field, pattern]) => {
            const match = cleanLine.match(pattern);
            if (match) {
              fields[field] = (match[1] || match[2]).trim(); // Handle different capture groups
            }
          });
        });

        // Final validation
        const missing = Object.entries(fields).filter(([_, v]) => !v).map(([k]) => k);
        if (missing.length) return reject(new Error(`Missing fields: ${missing.join(', ')}`));
        return resolve(fields);
      }

      if (item.text) {
        // Group text by Y position
        if (currentY !== item.y) {
          currentY = item.y;
          textItems.push({ y: currentY, text: '' });
        }
        textItems[textItems.length - 1].text += item.text + ' ';
      }
    });
  });
};