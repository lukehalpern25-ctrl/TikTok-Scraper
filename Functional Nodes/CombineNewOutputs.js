import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Combines all new hashtag email-filtered CSV outputs into one master file
 */

const hashtags = ['manifestingdreams', 'mensuck', 'baddiemindset', 'baddietips', 'wlwtiktok', 'lateinlifelesbian', 'lesbiandating', 'menopause', 'menopausetips'];
const outDir = path.resolve('../outhuge');
const allRows = [];
let headers = [];

console.log('🔗 Combining all huge hashtag outputs into master CSV file...');

for (const hashtag of hashtags) {
  const filePath = path.join(outDir, `huge_nonDupe_bioFiltered_tiktok_${hashtag}_videos.csv`);
  
  if (fs.existsSync(filePath)) {
    console.log(`📄 Reading huge_nonDupe_bioFiltered_tiktok_${hashtag}_videos.csv...`);
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    
    if (headers.length === 0) {
      // Get headers from first file and add source hashtag column
      headers = Object.keys(records[0] || {});
      headers.push('Source Hashtag');
    }
    
    // Add source hashtag to each row
    const recordsWithSource = records.map(row => ({
      ...row,
      'Source Hashtag': hashtag
    }));
    
    allRows.push(...recordsWithSource);
    console.log(`   Added ${records.length} rows from "${hashtag}"`);
  } else {
    console.log(`⚠️  File not found: ${hashtag}_emailFiltered.csv`);
  }
}

if (allRows.length === 0) {
  console.log('❌ No data found to combine');
  process.exit(1);
}

// Sort by Contact Email to group similar creators
allRows.sort((a, b) => (a['Contact Email'] || '').localeCompare(b['Contact Email'] || ''));

// Generate combined CSV
const combinedCsv = stringify(allRows, { 
  header: true,
  columns: headers 
});

// Create filename with timestamp
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
const combinedFileName = `combined_huge_hashtags_${timestamp}.csv`;
const combinedPath = path.join(outDir, combinedFileName);

fs.writeFileSync(combinedPath, combinedCsv, 'utf8');

console.log(`✅ Combined CSV created: ${combinedFileName}`);
console.log(`📊 Combined file stats:`);
console.log(`   • Total rows: ${allRows.length}`);
console.log(`   • Source hashtags: ${hashtags.length}`);
console.log(`   • Unique emails: ${new Set(allRows.map(row => row['Contact Email'])).size}`);
console.log(`   • File location: ${combinedPath}`);