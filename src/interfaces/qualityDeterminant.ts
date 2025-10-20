import type { AuthorMeta } from "./author";
import type { CliOptions } from "./cliOptions";
import type { ProfileItem } from "./profile";

// exclude unneeded fields from CliOptions
export interface GoodQuality
  extends Omit<CliOptions, "type" | "query" | "limitPerQuery"> {}

export type rowAndPass =
  | { pass: 1; row: AuthorMeta }
  | { pass: 2; row: AuthorMeta }
  | { pass: 3; row: ProfileItem };
