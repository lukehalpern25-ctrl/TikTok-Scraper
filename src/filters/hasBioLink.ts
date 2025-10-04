import type { ProfileItem } from "../interfaces/profile";

// Checks if a row has a bio
// It attempts to fetch the creator's profile and scrapes the bio normally there.
export function hasBio(row: ProfileItem) {
  return !!row.authorMeta.bioLink;
}
