import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * VideoFilter.js - Filters ProfileScraper output based on view count and video recency
 * Usage: node VideoFilter.js "input.csv"
 * 
 * Filters:
 * 1. Removes rows where ALL videos have less than 3000 views
 * 2. Removes rows with less than 2 videos in the last 2 weeks (from Sept 21, 2025)
 * 
 * Input: CSV from ProfileScraper with video data columns
 * Output: Filtered CSV with same structure
 */

const INPUT_CSV = (process.argv[2] || '').trim().replace(/"/g, '');

if (!INPUT_CSV || !INPUT_CSV.endsWith('.csv')) {
  console.error('Usage: node VideoFilter.js "input.csv"');
  console.error('Input must be a CSV file from ProfileScraper');
  process.exit(1);
}

if (!fs.existsSync(INPUT_CSV)) {
  console.error(`❌ File not found: ${INPUT_CSV}`);
  process.exit(1);
}

// Reference date: September 21, 2025
const REFERENCE_DATE = new Date('2025-09-21');
const TWO_WEEKS_AGO = new Date(REFERENCE_DATE);
TWO_WEEKS_AGO.setDate(TWO_WEEKS_AGO.getDate() - 14); // Sept 7, 2025

const MIN_VIEWS = 3000;
const MIN_RECENT_VIDEOS = 2;

console.log(`📅 Reference date: ${REFERENCE_DATE.toISOString().split('T')[0]}`);
console.log(`📅 Two weeks ago: ${TWO_WEEKS_AGO.toISOString().split('T')[0]}`);
console.log(`👀 Minimum views per video: ${MIN_VIEWS}`);
console.log(`🎬 Minimum recent videos: ${MIN_RECENT_VIDEOS}\n`);

function parseVideoData(row) {
  const videos = [];
  
  // Extract video data from columns (Video1 Views, Video1 Date, Video2 Views, Video2 Date, etc.)
  for (let i = 1; i <= 6; i++) {
    const viewsKey = `Video${i} Views`;
    const dateKey = `Video${i} Date`;
    
    const views = parseInt(row[viewsKey]) || 0;
    const dateStr = row[dateKey] || '';
    
    // Only include videos that have both views and date
    if (views > 0 && dateStr) {
      videos.push({
        views: views,
        date: new Date(dateStr),
        dateStr: dateStr
      });
    }
  }
  
  return videos;
}

function passesViewFilter(videos) {
  // Check if at least one video has 3000+ views
  return videos.some(video => video.views >= MIN_VIEWS);
}

function passesRecencyFilter(videos) {
  // Count videos in the last 2 weeks
  const recentVideos = videos.filter(video => video.date >= TWO_WEEKS_AGO);
  return recentVideos.length >= MIN_RECENT_VIDEOS;
}

async function run() {
  try {
    console.log(`📄 Reading CSV file: ${INPUT_CSV}`);
    const csvContent = fs.readFileSync(INPUT_CSV, 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    
    console.log(`Found ${records.length} total rows\n`);
    
    let viewFilterCount = 0;
    let recencyFilterCount = 0;
    let bothFiltersCount = 0;
    
    // Filter rows based on criteria
    const filteredRows = records.filter(row => {
      const videos = parseVideoData(row);
      const email = row['Contact Email'] || '';
      const profileUrl = row['Profile Url'] || '';
      
      if (videos.length === 0) {
        console.log(`❌ No video data: ${email || profileUrl}`);
        return false;
      }
      
      const passesViews = passesViewFilter(videos);
      const passesRecency = passesRecencyFilter(videos);
      
      if (!passesViews && !passesRecency) {
        bothFiltersCount++;
        console.log(`❌ Failed both filters: ${email || profileUrl} (max views: ${Math.max(...videos.map(v => v.views))}, recent videos: ${videos.filter(v => v.date >= TWO_WEEKS_AGO).length})`);
        return false;
      } else if (!passesViews) {
        viewFilterCount++;
        console.log(`❌ Failed view filter: ${email || profileUrl} (max views: ${Math.max(...videos.map(v => v.views))})`);
        return false;
      } else if (!passesRecency) {
        recencyFilterCount++;
        console.log(`❌ Failed recency filter: ${email || profileUrl} (recent videos: ${videos.filter(v => v.date >= TWO_WEEKS_AGO).length})`);
        return false;
      } else {
        console.log(`✅ Passed all filters: ${email || profileUrl} (max views: ${Math.max(...videos.map(v => v.views))}, recent videos: ${videos.filter(v => v.date >= TWO_WEEKS_AGO).length})`);
        return true;
      }
    });
    
    console.log(`\n📊 Filtering complete:`);
    console.log(`   • Original rows: ${records.length}`);
    console.log(`   • Passed all filters: ${filteredRows.length}`);
    console.log(`   • Failed view filter only: ${viewFilterCount}`);
    console.log(`   • Failed recency filter only: ${recencyFilterCount}`);
    console.log(`   • Failed both filters: ${bothFiltersCount}`);
    console.log(`   • Total filtered out: ${records.length - filteredRows.length}`);
    
    if (filteredRows.length === 0) {
      console.log('\n⚠️  No rows passed the filters - no output file created');
      return;
    }
    
    // Write filtered CSV
    const outputCsv = stringify(filteredRows, { header: true });
    
    const outDir = path.resolve('../out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    // Extract filename from input path and create output name
    const inputFileName = path.basename(INPUT_CSV, '.csv');
    const outPath = path.join(outDir, `filtered_${inputFileName}.csv`);
    
    fs.writeFileSync(outPath, outputCsv, 'utf8');
    
    console.log(`\n✅ Filtered video data saved to: ${outPath}`);
    
  } catch (error) {
    console.error('❌ VideoFilter failed:', error?.message || error);
    process.exit(1);
  }
}

run();