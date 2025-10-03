import fs from 'node:fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * DebugKey - Cleans the Creator_URL_Key.csv by removing URLs that exist in input CSV
 * Usage: node DebugKey.js "path/to/input.csv"
 */

const INPUT_CSV_PATH = (process.argv[2] || '').trim();
if (!INPUT_CSV_PATH) {
  console.error('Usage: node DebugKey.js "<path_to_input_csv>"');
  process.exit(1);
}

const KEY_FILE_PATH = path.join(path.dirname(import.meta.url.replace('file://', '')), 'Creator_URL_Key.csv');

async function debugKey() {
  try {
    console.log(`Reading input CSV: ${INPUT_CSV_PATH}`);
    const inputContent = fs.readFileSync(INPUT_CSV_PATH, 'utf8');
    
    // Parse input CSV to get creator URLs
    const inputRows = parse(inputContent, { 
      columns: true, 
      skip_empty_lines: true 
    });
    
    const inputUrls = new Set();
    inputRows.forEach(row => {
      const url = row.creator_page_url || row.creator_url || '';
      if (url && url.startsWith('https://www.tiktok.com/@')) {
        inputUrls.add(url);
      }
    });
    
    console.log(`Found ${inputUrls.size} creator URLs in input CSV`);
    
    // Read existing key file
    console.log(`Reading key file: ${KEY_FILE_PATH}`);
    const keyContent = fs.readFileSync(KEY_FILE_PATH, 'utf8');
    const existingUrls = keyContent.trim().split('\n').filter(url => url.trim());
    
    console.log(`Found ${existingUrls.length} URLs in key file`);
    
    // Remove URLs that exist in input CSV
    const cleanedUrls = existingUrls.filter(url => !inputUrls.has(url));
    const removedCount = existingUrls.length - cleanedUrls.length;
    
    console.log(`Removing ${removedCount} URLs from key file`);
    
    // Write cleaned key file
    const cleanedContent = cleanedUrls.join('\n');
    fs.writeFileSync(KEY_FILE_PATH, cleanedContent, 'utf8');
    
    console.log(`✅ Key file cleaned: ${cleanedUrls.length} URLs remaining`);
    
  } catch (error) {
    console.error('DebugKey failed:', error.message);
    process.exit(1);
  }
}

debugKey();