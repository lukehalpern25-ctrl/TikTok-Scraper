import { mkdirSync, writeFileSync } from "fs";
import path from "path";

export function writeData(filePath: string, data: string) {
  // make the path if it doesn't exists
  const dir = path.dirname(filePath);
  console.log(`Creating directory: ${dir}`);
  mkdirSync(dir, { recursive: true });

  console.log(`Writing data to file: ${filePath}`);
  writeFileSync(filePath, data);
  console.log(`File saved successfully`);
}
