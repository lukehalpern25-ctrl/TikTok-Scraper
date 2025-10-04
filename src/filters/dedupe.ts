import type { AuthorMeta } from "../interfaces/author";
import type { ProfileItem } from "../interfaces/profile";

const seenHashes = new Set<string>();

// This dedupes the rows by their authorMeta.id
export function dedupe(row: AuthorMeta | ProfileItem) {
  console.log(`Checking ${row.id} for duplicate`);
  // Create a hash of the item
  const v = row.id;

  if (seenHashes.has(v)) {
    console.log(`${row.id} is duplicate - filtering out`);
    return false; // Duplicate found, filter out
  }

  console.log(`${row.id} is unique - keeping`);
  seenHashes.add(v);
  return true; // Keep this item
}

