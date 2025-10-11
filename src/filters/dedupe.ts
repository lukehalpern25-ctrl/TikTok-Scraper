import { readFileSync } from "fs";
import type { AuthorMeta } from "../interfaces/author";
import type { ProfileItem } from "../interfaces/profile";
import path from "path";

const seenIDs = new Set<string>();

// This dedupes the rows by their authorMeta.id
export function dedupe(row: AuthorMeta | ProfileItem) {
  console.log(`Checking ${row.id} for duplicate`);
  const v = row.id;

  if (seenIDs.has(v)) {
    console.log(`${row.id} is duplicate - filtering out`);
    return false; // Duplicate found, filter out
  }

  console.log(`${row.id} is unique - keeping`);
  seenIDs.add(v);
  return true; // Keep this item
}

// this loads the creator list from the creator list csv file
// not using a library because it's a relatively trivial CSV file
const creatorList = readFileSync(
  path.join(__dirname, "..", "data", "Creator_URL_Key.csv"),
  "utf8",
);
const creatorListArray = creatorList
  .split("\n")
  .map((line) => line.split(",")[0]?.trim())
  .filter((line) => line !== "");

export function dedupeAgaisntCreatorList(row: ProfileItem) {
  const inTikTokForm = `${row.authorMeta.profileUrl}`;
  if (creatorListArray.includes(inTikTokForm)) {
    console.log(
      `${row.authorMeta.profileUrl} is in the creator list - filtering out`,
    );
    return false;
  }

  console.log(
    `${row.authorMeta.profileUrl} is not in the creator list - keeping`,
  );
  return true;
}

