import type { ProfileItem } from "../interfaces/profile";

const relevantLink = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g,
  linkIndicators: [
    "⬇️",
    "👇🏽",
    "👇",
    "👇🏻",
    "👇🏼",
    "👇🏾",
    "👇🏿",
    "⬇",
    "↓",
    "link in bio",
    "see link",
  ],
  socialLinks:
    /\b(?:(?:https?:\/\/|www\.)[^\s<>()]+|(?:linktr\.ee|beacons\.ai|stan\.store|koji\.to|bio\.site|bio\.link|campsite\.bio|flow\.page|tap\.bio|msha\.ke)\/[^\s<>()]+)/i,
};

export function hasEmailOrLink(row: ProfileItem) {
  const text = row.authorMeta.signature;
  console.log(`Checking ${row.id} for contact info`);

  if (relevantLink.email.test(text)) {
    console.log(`Creator ${row.id} has email in bio`);
    return true;
  }

  if (relevantLink.socialLinks.test(text)) {
    console.log(`Creator ${row.id} has social links`);
    return true;
  }

  if (
    relevantLink.linkIndicators.some((indicator) => text.includes(indicator))
  ) {
    console.log(`Creator ${row.id} has link indicators in bio`);
    return true;
  }

  console.log(`Creator ${row.id} has no contact info`);
  return false;
}
