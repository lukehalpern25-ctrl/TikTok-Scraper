import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Creates a "Fail" CSV with creators who didn't pass the VideoFilter
 */

const videoDataPath = path.resolve('../out/vids_combined_all_hashtags_2025-09-22T07-21-03.csv');
const filteredDataPath = path.resolve('../out/filtered_vids_combined_all_hashtags_2025-09-22T07-21-03.csv');
const outDir = path.resolve('../out');

console.log('📄 Reading video data and filtered data...');

// Read both files
const videoData = parse(fs.readFileSync(videoDataPath, 'utf8'), { columns: true, skip_empty_lines: true });
const filteredData = parse(fs.readFileSync(filteredDataPath, 'utf8'), { columns: true, skip_empty_lines: true });

// Get emails of creators who passed the filter
const passedEmails = new Set(filteredData.map(row => row['Contact Email']));

// Find creators who failed the filter
const failedCreators = videoData.filter(row => !passedEmails.has(row['Contact Email']));

console.log(`📊 Analysis:`);
console.log(`   • Total creators: ${videoData.length}`);
console.log(`   • Passed filter: ${filteredData.length}`);
console.log(`   • Failed filter: ${failedCreators.length}`);

if (failedCreators.length > 0) {
  // Create CSV with failed creators
  const failCsv = stringify(failedCreators, { 
    header: true,
    columns: Object.keys(failedCreators[0])
  });

  const failPath = path.join(outDir, 'Fail.csv');
  fs.writeFileSync(failPath, failCsv, 'utf8');

  console.log(`✅ Fail list created: Fail.csv`);
  console.log(`📁 Location: ${failPath}`);
  
  // Show breakdown of failure reasons by analyzing the data
  console.log(`\n🔍 Failure breakdown:`);
  
  const referenceDate = new Date('2025-09-21');
  const twoWeeksAgo = new Date(referenceDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  let viewsOnly = 0;
  let recencyOnly = 0;
  let bothFailed = 0;
  
  failedCreators.forEach(creator => {
    // Calculate max views from Video1-6 Views columns
    const viewCounts = [];
    for (let i = 1; i <= 6; i++) {
      const views = parseInt(creator[`Video${i} Views`]) || 0;
      if (views > 0) viewCounts.push(views);
    }
    const maxViews = Math.max(...viewCounts, 0);
    
    // Calculate recent videos
    let recentCount = 0;
    for (let i = 1; i <= 6; i++) {
      const dateStr = creator[`Video${i} Date`];
      if (dateStr) {
        const videoDate = new Date(dateStr);
        if (videoDate >= twoWeeksAgo) recentCount++;
      }
    }
    
    const passedViews = maxViews >= 3000;
    const passedRecency = recentCount >= 2;
    
    if (!passedViews && passedRecency) viewsOnly++;
    else if (passedViews && !passedRecency) recencyOnly++;
    else if (!passedViews && !passedRecency) bothFailed++;
  });
  
  console.log(`   • Failed views only: ${viewsOnly}`);
  console.log(`   • Failed recency only: ${recencyOnly}`);
  console.log(`   • Failed both: ${bothFailed}`);
  
} else {
  console.log('⚠️  No failed creators found');
}