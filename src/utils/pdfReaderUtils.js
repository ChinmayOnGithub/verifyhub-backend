import { PdfReader } from 'pdfreader';

const FIELD_PATTERNS = {
  uid: /\b(?:UID|ID)\s*:\s*(.+)/i, // Matches "Certificate ID: 111111"
  candidateName: /This is to certify that\s+(.+)$/i, // After "This is to certify that"
  courseName: /completed the\s+(.+)$/i, // After "has successfully completed the"
  orgName: /offered by\s+(.+)$/i // After "offered by"
};

export const extractCertificate = (filePath) => {
  return new Promise((resolve, reject) => {
    const fields = { uid: null, candidateName: null, courseName: null, orgName: null };
    const textItems = [];
    let currentY = null;

    console.log(`Starting PDF extraction for: ${filePath}`);

    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) {
        console.error('PDF parsing error:', err);
        return reject(new Error(`PDF parsing failed: ${err.message}`));
      }

      if (!item) {
        const lines = {};
        textItems.forEach(({ y, text }) => {
          lines[y] = (lines[y] || '') + text.trim() + ' ';
        });

        console.log('Extracted lines:', lines);

        Object.values(lines).forEach(line => {
          const cleanLine = line.trim();
          Object.entries(FIELD_PATTERNS).forEach(([field, pattern]) => {
            const match = cleanLine.match(pattern);
            if (match && !fields[field]) {
              fields[field] = match[1].trim();
              console.log(`Found ${field}: ${fields[field]}`);
            }
          });
        });

        const missing = Object.entries(fields).filter(([_, v]) => !v).map(([k]) => k);
        if (missing.length > 0) {
          console.log('Extraction complete, missing fields:', missing);
          return reject(new Error(`Missing fields: ${missing.join(', ')}`));
        }

        console.log('Extraction successful:', fields);
        return resolve(fields);
      }

      if (item.text) {
        if (currentY !== item.y) {
          currentY = item.y;
          textItems.push({ y: currentY, text: '' });
        }
        textItems[textItems.length - 1].text += item.text;
      }
    });
  });
};