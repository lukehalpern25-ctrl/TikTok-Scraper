import { ApifyClient } from 'apify-client';
import { Parser as Json2CsvParser } from 'json2csv';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

/**
 * ProfileScraper.js - Scrapes all unpinned videos from first 6 videos of TikTok profiles  
 * Usage: node ProfileScraper.js "input.csv"
 * 
 * Input: CSV file with Contact Email and Profile Url columns (like emailFiltered output)
 * Output: Up to 15 columns - Contact Email, Profile Url, Name, Video1 Views, Video1 Date, ..., Video6 Views, Video6 Date
 */

const INPUT_CSV = (process.argv[2] || '').trim().replace(/"/g, '');

if (!INPUT_CSV || !INPUT_CSV.endsWith('.csv')) {
  console.error('Usage: node ProfileScraper.js "input.csv"');
  console.error('Input must be a CSV file with Contact Email and Profile Url columns');
  process.exit(1);
}

if (!fs.existsSync(INPUT_CSV)) {
  console.error(`❌ File not found: ${INPUT_CSV}`);
  process.exit(1);
}

// Apify client with same token as HashtagScrape
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

function parseInputCSV(filePath) {
  console.log(`📄 Reading CSV file: ${filePath}`);
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const profiles = records.map(row => ({
    email: row['Contact Email'] || '',
    profileUrl: row['Profile Url'] || '',
    name: row['Creator Nickname'] || row['nickname'] || ''
  })).filter(profile => profile.profileUrl && profile.profileUrl.includes('tiktok.com/@'));
  
  console.log(`Found ${profiles.length} profiles with valid URLs`);
  return profiles;
}

async function run() {
  try {
    const profiles = parseInputCSV(INPUT_CSV);
    
    if (profiles.length === 0) {
      console.error('❌ No valid TikTok profile URLs found in CSV');
      process.exit(1);
    }
    
    console.log(`🚀 Starting video scrape for ${profiles.length} profiles...`);
    console.log(`📥 Scraping all unpinned videos from first 6 videos of each profile...`);
    
    // Extract just the URLs for the profile scraper
    const profileUrls = profiles.map(p => p.profileUrl);
    
    // Run the Clockworks profile scraper Actor to get videos
    const runInput = {
      profiles: profileUrls,
      resultsPerPage: 6, // Maximum 6 videos per profile
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadSubtitles: false,
      shouldDownloadVideos: false,
    };

    console.log(`⏳ Running clockworks/tiktok-profile-scraper...`);
    const { defaultDatasetId } = await client
      .actor('clockworks/tiktok-profile-scraper')
      .call(runInput);

    // Fetch all results from dataset
    const ds = client.dataset(defaultDatasetId);
    const all = [];
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { items } = await ds.listItems({ offset, limit: pageSize });
      all.push(...items);
      offset += items.length;
      if (items.length < pageSize) break;
    }

    console.log(`📥 Fetched ${all.length} video records from dataset`);

    // Group videos by profile and create output rows
    const videosByProfile = new Map();
    
    // First, organize videos by profile URL
    all.forEach(video => {
      if (video.authorMeta && video.authorMeta.name) {
        const profileUrl = `https://www.tiktok.com/@${video.authorMeta.name}`;
        if (!videosByProfile.has(profileUrl)) {
          videosByProfile.set(profileUrl, []);
        }
        videosByProfile.get(profileUrl).push({
          views: video.playCount || 0,
          publishedDate: video.createTime ? new Date(video.createTime * 1000).toISOString().split('T')[0] : '',
          isPinned: video.isPinned || false
        });
      }
    });

    // Create output rows with up to 15 columns (3 base + 6 videos × 2 columns each)
    const outputRows = profiles.map(profile => {
      const videos = videosByProfile.get(profile.profileUrl) || [];
      
      // Filter out pinned videos and get all unpinned ones (up to 6)
      const unpinnedVideos = videos
        .filter(v => !v.isPinned)
        .slice(0, 6);
      
      // Build row: Email, Profile URL, Name, then Video1 Views, Video1 Date, Video2 Views, Video2 Date, etc.
      const row = {
        'Contact Email': profile.email,
        'Profile Url': profile.profileUrl,
        'Name': profile.name
      };
      
      // Add video data for up to 6 videos
      for (let i = 0; i < 6; i++) {
        const video = unpinnedVideos[i];
        row[`Video${i + 1} Views`] = video ? video.views : '';
        row[`Video${i + 1} Date`] = video ? video.publishedDate : '';
      }
      
      return row;
    });

    // Write CSV output
    if (outputRows.length > 0) {
      const parser = new Json2CsvParser({ header: true });
      const csv = parser.parse(outputRows);

      const outDir = path.resolve('../out');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      // Extract filename from input path and create output name
      const inputFileName = path.basename(INPUT_CSV, '.csv');
      const outPath = path.join(outDir, `vids_${inputFileName}.csv`);
      fs.writeFileSync(outPath, csv, 'utf8');

      console.log(`✅ Video data saved to: ${outPath}`);
      console.log(`📊 Scraping summary:`);
      console.log(`   • Total profiles processed: ${profiles.length}`);
      console.log(`   • Profiles with videos found: ${outputRows.filter(row => row['Video1 Views']).length}`);
      console.log(`   • Total videos collected: ${all.length}`);
    } else {
      console.log('⚠️  No video data retrieved');
    }

  } catch (error) {
    console.error('❌ ProfileScraper failed:', error?.message || error);
    process.exit(1);
  }
}

run();