import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_PATTERNS = [
  { regex: /#[0-9a-fA-F]{3,6}/g, name: 'Hex Color' },
  { regex: /rgb\s*\(/g, name: 'RGB Color' },
  { regex: /hsl\s*\(/g, name: 'HSL Color' },
  { regex: /oklch\s*\(/g, name: 'OKLCH Color' },
  { regex: /linear-gradient/g, name: 'Linear Gradient' },
  { regex: /radial-gradient/g, name: 'Radial Gradient' },
  { regex: /backdrop-filter/g, name: 'Backdrop Filter' },
  { regex: /bg-\[.*\]/g, name: 'Arbitrary Background' },
  { regex: /text-\[.*\]/g, name: 'Arbitrary Text Color' },
];

const IGNORE_FILES = ['globals.css', 'tailwind.config.ts', 'check-colors.js'];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let errorCount = 0;

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        errorCount += scanDirectory(fullPath);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !IGNORE_FILES.includes(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        FORBIDDEN_PATTERNS.forEach((pattern) => {
          if (pattern.regex.test(line)) {
            if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;

            console.error(`Error: Found ${pattern.name} in ${file}:${index + 1}`);
            console.error(`  ${line.trim()}`);
            errorCount += 1;
          }
        });
      });
    }
  });

  return errorCount;
}

console.log('Scanning for forbidden colors...');
const errors = scanDirectory(path.join(process.cwd(), 'src'));

if (errors > 0) {
  console.error(`Found ${errors} color violations. Please use strict design tokens.`);
  process.exit(1);
} else {
  console.log('No forbidden colors found.');
}
