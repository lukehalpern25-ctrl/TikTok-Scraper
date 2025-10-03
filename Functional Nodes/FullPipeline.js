import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Full TikTok Scraping Pipeline
 * Usage: node FullPipeline.js "hashtag" [limit]
 * 
 * Pipeline: HashtagScrape → BioFilter → FilterDuplicates → Quality_HugeSplit_Filter → EmailFilter
 */

const HASHTAG = (process.argv[2] || '').trim().replace(/"/g, '');
const LIMIT = parseInt(process.argv[3]) || 350;
if (!HASHTAG) {
  console.error('Usage: node FullPipeline.js "hashtag" [limit]');
  process.exit(1);
}

console.log(`🚀 Starting Full Pipeline for hashtag: "${HASHTAG}" (${LIMIT} videos)`);
console.log('Pipeline: HashtagScrape → BioFilter → FilterDuplicates → Quality_HugeSplit_Filter → EmailFilter\n');

function runNode(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  Running ${scriptName}...`);
    
    const child = spawn('node', [scriptName, ...args], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scriptName} completed successfully\n`);
        resolve();
      } else {
        console.error(`❌ ${scriptName} failed with exit code ${code}`);
        reject(new Error(`${scriptName} failed`));
      }
    });
    
    child.on('error', (err) => {
      console.error(`❌ Failed to start ${scriptName}:`, err.message);
      reject(err);
    });
  });
}

async function runFullPipeline() {
  try {
    // Step 1: HashtagScrape
    await runNode('HashtagScrape.js', [HASHTAG, LIMIT]);
    
    // Step 2: BioFilter
    const rawCsvPath = path.join(__dirname, '..', 'out', 'debugging', `tiktok_${HASHTAG}_videos.csv`);
    await runNode('BioFilter.js', [rawCsvPath]);
    
    // Step 3: FilterDuplicates  
    const bioFilteredPath = path.join(__dirname, '..', 'out', 'debugging', `bioFiltered_tiktok_${HASHTAG}_videos.csv`);
    await runNode('FilterDuplicates.js', [bioFilteredPath]);
    
    // Step 4: Quality_HugeSplit_Filter
    const nonDupePath = path.join(__dirname, '..', 'out', 'debugging', `nonDupe_bioFiltered_tiktok_${HASHTAG}_videos.csv`);
    await runNode('Quality_HugeSplit_Filter.js', [nonDupePath]);
    
    // Step 5: EmailFilter (only for quality creators, not huge creators)
    const qualityPath = path.join(__dirname, '..', 'out', 'debugging', `quality_nonDupe_bioFiltered_tiktok_${HASHTAG}_videos.csv`);
    await runNode('EmailFilter.js', [qualityPath]);
    
    console.log('🎉 PIPELINE COMPLETE! 🎉');
    console.log(`\n📁 Final outputs:`);
    console.log(`   • Email-filtered creators: /out/${HASHTAG}_emailFiltered.csv`);
    console.log(`   • Huge creators: /outhuge/huge_nonDupe_bioFiltered_tiktok_${HASHTAG}_videos.csv`);
    console.log(`\n🔧 Debug files: /out/debugging/`);
    
  } catch (error) {
    console.error('\n💥 Pipeline failed:', error.message);
    process.exit(1);
  }
}

runFullPipeline();