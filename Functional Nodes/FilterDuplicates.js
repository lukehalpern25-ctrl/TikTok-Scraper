import { Parser as Json2CsvParser } from 'json2csv';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Usage:
 *   node FilterDuplicates.js "path/to/unfiltered.csv"
 */

const UNFILTERED_CSV_PATH = (process.argv[2] || '').trim();
if (!UNFILTERED_CSV_PATH) {
  console.error('Usage: node FilterDuplicates.js "<path_to_unfiltered_csv>"');
  process.exit(1);
}

const KEY_LIST_PATH = path.resolve('./Creator_URL_Key.csv');

async function run() {
  // 1) Read the unfiltered CSV
  console.log(`Reading unfiltered CSV: ${UNFILTERED_CSV_PATH}`);
  const csvContent = fs.readFileSync(UNFILTERED_CSV_PATH, 'utf8');
  
  // Parse CSV properly
  const lines = csvContent.trim().split('\n');
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());
  
  // Find the creator_page_url column index
  const urlColumnIndex = headers.findIndex(h => h === 'creator_page_url');
  if (urlColumnIndex === -1) {
    console.error('Error: Could not find "creator_page_url" column in CSV');
    console.error('Available columns:', headers);
    process.exit(1);
  }
  
  console.log(`Found creator_page_url column at index ${urlColumnIndex}`);
  
  // Parse data rows - better CSV parsing
  const dataRows = lines.slice(1).map(line => {
    // Split by comma but handle quoted fields
    const cols = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim().replace(/^"|"$/g, ''));
    
    return {
      rawLine: line,
      url: cols[urlColumnIndex]?.trim() || null,
      columns: cols
    };
  });
  
  console.log(`Found ${dataRows.length} rows in unfiltered CSV`);
  
  // 2) Remove duplicate creators within the input CSV (keep only first occurrence of each creator)
  const seenCreators = new Set();
  const uniqueCreatorRows = [];
  let internalDuplicates = 0;
  
  for (const row of dataRows) {
    // Skip rows with missing/invalid URLs but keep them in output
    if (!row.url || row.url === 'null' || row.url === '' || !row.url.startsWith('https://www.tiktok.com/@')) {
      uniqueCreatorRows.push(row);
      continue;
    }
    
    if (seenCreators.has(row.url)) {
      internalDuplicates++;
      console.log(`Removing internal duplicate: ${row.url}`);
    } else {
      seenCreators.add(row.url);
      uniqueCreatorRows.push(row);
    }
  }
  
  console.log(`Removed ${internalDuplicates} internal duplicates (multiple videos from same creators)`);
  console.log(`${uniqueCreatorRows.length} rows with unique creators remaining`);
  
  // 3) Read existing key list (create if doesn't exist)
  let existingUrls = new Set();
  if (fs.existsSync(KEY_LIST_PATH)) {
    const keyListContent = fs.readFileSync(KEY_LIST_PATH, 'utf8');
    existingUrls = new Set(keyListContent.split('\n').map(url => url.trim()).filter(url => url));
    console.log(`Loaded ${existingUrls.size} existing creator URLs from key list`);
  } else {
    console.log('Key list file does not exist, creating new one');
  }
  
  // 4) Filter out duplicates against key list and collect new URLs
  const filteredRows = [];
  const newUrls = [];
  
  for (const row of uniqueCreatorRows) {
    // Check if URL is missing or invalid
    if (!row.url || row.url === 'null' || row.url === '' || !row.url.startsWith('https://www.tiktok.com/@')) {
      // Keep rows with no URL or invalid URLs in the output CSV but don't add to key
      filteredRows.push(row.rawLine);
      continue;
    }
    
    if (existingUrls.has(row.url)) {
      console.log(`Removing duplicate: ${row.url}`);
    } else {
      // Not a duplicate - keep this row and add URL to key
      filteredRows.push(row.rawLine);
      newUrls.push(row.url);
      existingUrls.add(row.url);
    }
  }
  
  console.log(`Filtered out ${uniqueCreatorRows.length - filteredRows.length} duplicates against key list`);
  console.log(`${filteredRows.length} final unique rows remaining`);
  console.log(`${newUrls.length} new creator URLs to add to key list`);
  
  // 4) Append new URLs to key list
  if (newUrls.length > 0) {
    const newUrlsText = newUrls.join('\n') + '\n';
    fs.appendFileSync(KEY_LIST_PATH, newUrlsText, 'utf8');
    console.log(`Appended ${newUrls.length} new URLs to key list: ${KEY_LIST_PATH}`);
  }
  
  // 5) Write non-duplicate CSV (only if there are non-duplicate rows)
  if (filteredRows.length > 0) {
    const filteredCsvContent = [lines[0], ...filteredRows].join('\n');
    
    const inputFileName = path.basename(UNFILTERED_CSV_PATH, '.csv');
    const outputPath = path.resolve(`../out/debugging/nonDupe_${inputFileName}.csv`);
    fs.writeFileSync(outputPath, filteredCsvContent, 'utf8');
    
    console.log(`✅ Non-duplicate CSV saved to: ${outputPath}`);
  } else {
    console.log(`No non-duplicate rows found - no CSV exported`);
  }
  
  console.log(`✅ Key list updated with ${newUrls.length} new URLs`);
}

run().catch((err) => {
  console.error('Run failed:', err?.message || err);
  process.exit(1);
});