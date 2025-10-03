import fs from 'node:fs';
import path from 'node:path';

/**
 * Usage:
 *   node QualityFilter.js "path/to/filtered.csv"
 */

const FILTERED_CSV_PATH = (process.argv[2] || '').trim();
if (!FILTERED_CSV_PATH) {
  console.error('Usage: node QualityFilter.js "<path_to_filtered_csv>"');
  process.exit(1);
}

// Quality thresholds
const MIN_FOLLOWERS = 15000;
const MIN_VIDEO_COUNT = 10;
const MIN_PLAYS = 2000;
const HUGE_FOLLOWERS_THRESHOLD = 150000;

async function run() {
  // 1) Read the filtered CSV
  console.log(`Reading filtered CSV: ${FILTERED_CSV_PATH}`);
  const csvContent = fs.readFileSync(FILTERED_CSV_PATH, 'utf8');
  
  // Parse CSV manually
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  // Find the required column indices
  const followersIndex = headers.findIndex(h => h.trim() === 'creator_followers');
  const videoCountIndex = headers.findIndex(h => h.trim() === 'creator_video_count');
  const playsIndex = headers.findIndex(h => h.trim() === 'plays');
  
  if (followersIndex === -1) {
    console.error('Error: Could not find "creator_followers" column in CSV');
    process.exit(1);
  }
  
  if (videoCountIndex === -1) {
    console.error('Error: Could not find "creator_video_count" column in CSV');
    process.exit(1);
  }
  
  if (playsIndex === -1) {
    console.error('Error: Could not find "plays" column in CSV');
    process.exit(1);
  }
  
  // Parse data rows and apply quality filters
  const dataRows = lines.slice(1);
  const qualityRows = [];
  const hugeCreatorRows = [];
  let removedCount = 0;
  
  console.log(`Processing ${dataRows.length} rows...`);
  console.log(`Quality thresholds: ${MIN_FOLLOWERS}+ followers, ${MIN_VIDEO_COUNT}+ videos, ${MIN_PLAYS}+ plays`);
  console.log(`Huge creators threshold: ${HUGE_FOLLOWERS_THRESHOLD}+ followers (saved separately)`);
  
  for (const line of dataRows) {
    const cols = line.split(',').map(col => col.replace(/"/g, ''));
    
    // Get follower count, video count, and plays
    const followers = parseInt(cols[followersIndex]) || 0;
    const videoCount = parseInt(cols[videoCountIndex]) || 0;
    const plays = parseInt(cols[playsIndex]) || 0;
    
    // First check if creator meets minimum quality thresholds
    if (followers >= MIN_FOLLOWERS && videoCount >= MIN_VIDEO_COUNT && plays >= MIN_PLAYS) {
      // Then separate huge creators from regular quality creators
      if (followers >= HUGE_FOLLOWERS_THRESHOLD) {
        hugeCreatorRows.push(line);
        console.log(`Huge creator saved: ${followers} followers, ${plays} plays`);
      } else {
        qualityRows.push(line);
      }
    } else {
      removedCount++;
      console.log(`Removed: ${followers} followers, ${videoCount} videos, ${plays} plays`);
    }
  }
  
  // Remove unwanted columns from all rows before separating huge creators
  const columnsToRemove = ['plays', 'likes', 'comments', 'bio_url_text', 'video_url', 'creator_hearts_total', 'creator_video_count', 'creator_bio_link', 'creator_followers'];
  const indicesToRemove = columnsToRemove.map(col => headers.findIndex(h => h.trim() === col)).filter(idx => idx !== -1);
  
  // Create new header without removed columns
  const newHeaders = headers.filter((_, index) => !indicesToRemove.includes(index));
  const newHeaderLine = newHeaders.join(',');
  
  // Remove columns from quality rows
  const cleanedQualityRows = qualityRows.map(line => {
    const cols = line.split(',');
    return cols.filter((_, index) => !indicesToRemove.includes(index)).join(',');
  });
  
  // Remove columns from huge creator rows  
  const cleanedHugeCreatorRows = hugeCreatorRows.map(line => {
    const cols = line.split(',');
    return cols.filter((_, index) => !indicesToRemove.includes(index)).join(',');
  });
  
  console.log(`\\nFiltering complete:`);
  console.log(`- Original rows: ${dataRows.length}`);
  console.log(`- Removed (low quality): ${removedCount}`);
  console.log(`- Huge creators (150k+): ${hugeCreatorRows.length}`);
  console.log(`- Quality rows remaining: ${qualityRows.length}`);
  console.log(`- Removed columns: ${columnsToRemove.join(', ')}`);
  
  // Rearrange columns for Google Doc template after all filtering
  const bioEmailIdx = newHeaders.findIndex(h => h.trim() === 'bio_email');
  const creatorPageUrlIdx = newHeaders.findIndex(h => h.trim() === 'creator_page_url');
  const creatorNicknameIdx = newHeaders.findIndex(h => h.trim() === 'creator_nickname');
  const creatorBioIdx = newHeaders.findIndex(h => h.trim() === 'creator_bio');
  const bioClassIdx = newHeaders.findIndex(h => h.trim() === 'bio_class');
  
  // New column order with empty columns for Google Doc
  const finalHeaders = ['Contact Email', 'Backend Mapping', 'Profile Url', 'Best Video Links', 'Creator Nickname', 'Creator Bio', 'Bio Info'];
  const finalHeaderLine = finalHeaders.join(',');
  
  // Rearrange quality rows to match new column order
  const rearrangedQualityRows = cleanedQualityRows.map(line => {
    const cols = line.split(',');
    return [
      cols[bioEmailIdx] || '',           // bio_email
      '',                                // Backend Mapping (empty)
      cols[creatorPageUrlIdx] || '',     // creator_page_url
      '',                                // Best Video Links (empty)
      cols[creatorNicknameIdx] || '',    // creator_nickname
      cols[creatorBioIdx] || '',         // creator_bio
      cols[bioClassIdx] || ''            // bio_class
    ].join(',');
  });
  
  // Rearrange huge creator rows to match new column order
  const rearrangedHugeCreatorRows = cleanedHugeCreatorRows.map(line => {
    const cols = line.split(',');
    return [
      cols[bioEmailIdx] || '',           // bio_email
      '',                                // Backend Mapping (empty)
      cols[creatorPageUrlIdx] || '',     // creator_page_url
      '',                                // Best Video Links (empty)
      cols[creatorNicknameIdx] || '',    // creator_nickname
      cols[creatorBioIdx] || '',         // creator_bio
      cols[bioClassIdx] || ''            // bio_class
    ].join(',');
  });
  
  // 3) Write huge creators CSV to huge folder
  const inputFileName = path.basename(FILTERED_CSV_PATH, '.csv');
  if (rearrangedHugeCreatorRows.length > 0) {
    const hugeCreatorsContent = [finalHeaderLine, ...rearrangedHugeCreatorRows].join('\n');
    const hugeFolderPath = path.join(path.dirname(import.meta.url.replace('file://', '')), '..', 'outhuge');
    if (!fs.existsSync(hugeFolderPath)) {
      fs.mkdirSync(hugeFolderPath, { recursive: true });
    }
    const hugePath = path.join(hugeFolderPath, `huge_${inputFileName}.csv`);
    fs.writeFileSync(hugePath, hugeCreatorsContent, 'utf8');
    console.log(`✅ Huge creators CSV saved to: ${hugePath}`);
  }
  
  // 4) Write quality-filtered CSV to out folder
  const qualityFilteredContent = [finalHeaderLine, ...rearrangedQualityRows].join('\n');
  const outFolderPath = path.join(path.dirname(import.meta.url.replace('file://', '')), '..', 'out', 'debugging');
  if (!fs.existsSync(outFolderPath)) {
    fs.mkdirSync(outFolderPath, { recursive: true });
  }
  const outputPath = path.join(outFolderPath, `quality_${inputFileName}.csv`);
  fs.writeFileSync(outputPath, qualityFilteredContent, 'utf8');
  
  console.log(`✅ Quality-filtered CSV saved to: ${outputPath}`);
}

run().catch((err) => {
  console.error('Run failed:', err?.message || err);
  process.exit(1);
});