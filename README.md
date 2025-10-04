# TikTok Scraper

A TikTok scraper that supports both hashtag and discover feed scraping with quality filtering.

## Installation

To install dependencies:

```bash
bun install
```

## Usage

### Help

To see all available options:

```bash
bun src/scrapers/main.ts --help
```

### Hashtag Scraper

To scrape TikTok hashtag content:

```bash
bun src/scrapers/main.ts \
  --limitPerQuery 50 \
  --query "technology,ai,programming" \
  --removeNonEnglish true \
  --minFollowers 1000 \
  --minVideoViews 10000 \
  --minAvgViews 15000 \
  --videoLimitPerProfile 10 \
  --includePinnedVideos false \
  --timeWindowInDays 30 \
  --minNoOfVideosInWindow 3 \
  --type hashtag
```

### Discover Scraper

To scrape TikTok discover feed:

```bash
bun src/scrapers/main.ts \
  --limitPerQuery 100 \
  --query "viral,trending" \
  --removeNonEnglish true \
  --minFollowers 5000 \
  --minVideoViews 50000 \
  --minAvgViews 75000 \
  --videoLimitPerProfile 15 \
  --includePinnedVideos true \
  --timeWindowInDays 7 \
  --minNoOfVideosInWindow 2 \
  --type discover
```

### Parameters

- `--limitPerQuery`: Number of items to scrape per query (1-500)
- `--query`: Search queries (comma-separated or JSON file path)
- `--removeNonEnglish`: Filter out non-English content (true/false)
- `--minFollowers`: Minimum follower count for creators
- `--minVideoViews`: Minimum views required per video
- `--minAvgViews`: Minimum average views across creator's videos
- `--videoLimitPerProfile`: Maximum videos to fetch per profile
- `--includePinnedVideos`: Include pinned videos in analysis (true/false)
- `--timeWindowInDays`: Time window for video analysis (days)
- `--minNoOfVideosInWindow`: Minimum videos required in time window
- `--type`: Scraper type (`hashtag` or `discover`)

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
