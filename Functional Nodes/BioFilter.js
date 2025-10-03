// BioFilter.js
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Usage:
 *   node BioFilter.js "path/to/input.csv"
 */
const INPUT = (process.argv[2] || '').trim();
if (!INPUT) {
  console.error('Usage: node BioFilter.js "<path_to_input_csv>"');
  process.exit(1);
}

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g;
// Link "hint" emojis/phrases
const LINK_INDICATORS = ['⬇️','👇🏽','👇','👇🏻','👇🏼','👇🏾','👇🏿','⬇','↓','link in bio','see link'];

function classifyBio(bioRaw) {
  const bio = (bioRaw ?? '').toString().trim();
  if (!bio) return { bio_class: 'unsure', bio_email: '', bio_url_text: '' };

  const email = (bio.match(EMAIL_REGEX) || [])[0] || '';
  if (email) return { bio_class: 'email', bio_email: email, bio_url_text: '' };

  // Optional: extract a URL-like string from the bio for later use
  const urlMatch = bio.match(/\b(?:(?:https?:\/\/|www\.)[^\s<>()]+|(?:linktr\.ee|beacons\.ai|stan\.store|koji\.to|bio\.site|bio\.link|campsite\.bio|flow\.page|tap\.bio|msha\.ke)\/[^\s<>()]+)/i);
  const urlText = urlMatch ? (urlMatch[0].replace(/[),.;:!?]+$/, '')) : '';

  const hasIndicator = LINK_INDICATORS.some(s => bio.toLowerCase().includes(s));
  return { bio_class: hasIndicator ? 'link' : 'unsure', bio_email: '', bio_url_text: urlText };
}

const csvContent = fs.readFileSync(INPUT, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

let emailCount = 0, linkCount = 0, unsureCount = 0;
for (const r of records) {
  const { bio_class, bio_email, bio_url_text } = classifyBio(r.creator_bio);
  r.bio_class = bio_class;              // 'email' | 'link' | 'unsure'
  r.bio_email = bio_email;              // first email if found
  r.bio_url_text = bio_url_text;        // first URL-like text in bio (if any)

  if (bio_class === 'email') emailCount++;
  else if (bio_class === 'link') linkCount++;
  else unsureCount++;
}

const outCsv = stringify(records, { header: true });
const base = path.basename(INPUT, path.extname(INPUT));
const outPath = path.resolve(`../out/debugging/bioFiltered_${base}.csv`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, outCsv, 'utf8');

console.log('Bio processing complete:');
console.log('- Emails found:', emailCount);
console.log('- Link indicators:', linkCount);
console.log('- Unsure/other:', unsureCount);
console.log('✅ Saved:', outPath);