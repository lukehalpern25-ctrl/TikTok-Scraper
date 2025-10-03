import { ApifyClient } from 'apify-client';
import { Parser as Json2CsvParser } from 'json2csv';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Usage:
 *   node tiktok_hashtag_to_csv.mjs "webscraping"
 *   node tiktok_hashtag_to_csv.mjs "#foryou"
 */
const RAW_TAG = (process.argv[2] || '').trim();
const RAW_LIMIT = parseInt(process.argv[3]) || 350;
if (!RAW_TAG) {
  console.error('Usage: node tiktok_hashtag_to_csv.mjs "<hashtag>" [limit]');
  process.exit(1);
}
const HASHTAG = RAW_TAG.replace(/^#/, ''); // allow #tag or tag
const LIMIT_PER_HASHTAG = RAW_LIMIT;       // configurable video limit

// ---- Apify client ----
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

async function run() {
  // 1) Run the Clockworks hashtag scraper Actor
  // Input schema keys documented on the Actor page:
  // - hashtags: string[]
  // - resultsPerPage: integer (max posts per hashtag)
  // - shouldDownload* flags (we keep them false for speed/cost)
  const runInput = {
    hashtags: [HASHTAG],
    resultsPerPage: LIMIT_PER_HASHTAG,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
  };

  console.log(`Starting hashtag scrape for #${HASHTAG} (limit ${LIMIT_PER_HASHTAG})…`);
  const { defaultDatasetId } = await client
    .actor('clockworks/tiktok-hashtag-scraper')
    .call(runInput); // waits for finish

  // 2) Pull ALL dataset items (paginate if needed)
  const ds = client.dataset(defaultDatasetId);
  const all = [];
  let offset = 0;
  const pageSize = 1000;

  // listItems() is the standard way to fetch dataset results via client.dataset(). :contentReference[oaicite:1]{index=1}
  while (true) {
    const { items } = await ds.listItems({ offset, limit: pageSize });
    all.push(...items);
    offset += items.length;
    if (items.length < pageSize) break;
  }

  console.log(`Fetched ${all.length} video rows from dataset.`);

  // 3) Normalize into a flat, filter-friendly shape
  const rows = all.map((v) => {
    const a = v.authorMeta ?? {};
    const bioLink =
      typeof a.bioLink === 'object' && a.bioLink !== null
        ? (a.bioLink.link || a.bioLink.url || null)
        : (a.bioLink || null);

    // Clean bio field to prevent CSV parsing issues
    const cleanBio = (bio) => {
      if (!bio) return null;
      // Replace newlines, carriage returns, and tabs with spaces
      // Remove extra whitespace and limit length
      return bio.replace(/[\r\n\t]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 500) || null;
    };

    return {
      creator_nickname: a.nickName ?? null,
      creator_followers: a.fans ?? null,
      creator_hearts_total: a.heart ?? null,
      creator_video_count: a.video ?? null,
      creator_bio: cleanBio(a.signature),
      creator_bio_link: bioLink,
      creator_page_url: a.name ? `https://www.tiktok.com/@${a.name}` : null,
      video_url: v.webVideoUrl ?? null,
      plays: v.playCount ?? null,
      likes: v.diggCount ?? null,
      comments: v.commentCount ?? null,
    };
  });

  // 4) Write CSV
  const parser = new Json2CsvParser({ header: true });
  const csv = parser.parse(rows);

  const outDir = path.resolve('../out/debugging');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filenameSafe = HASHTAG.replace(/[^\w.-]+/g, '_');
  const outPath = path.join(outDir, `tiktok_${filenameSafe}_videos.csv`);
  fs.writeFileSync(outPath, csv, 'utf8');

  console.log(`✅ CSV saved to: ${outPath}`);
}

run().catch((err) => {
  console.error('Run failed:', err?.message || err);
  process.exit(1);
});
