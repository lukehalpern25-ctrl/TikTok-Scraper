import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { RunData } from "../types";

interface PipelineStats {
  extracted: number;
  deduped: number;
  qualityPass1: number;
  expanded: number;
  finalDeduped: number;
  qualityPass2: number;
  qualityPass3: number;
  final: number;
}

export class DataService {
  private getStepCount(timestamp: string): number {
    try {
      const intermediaryPath = path.join(
        process.cwd(),
        "../out/intermediary",
        timestamp,
      );
      return readdirSync(intermediaryPath).filter((f) => f.endsWith(".json"))
        .length;
    } catch {
      return 0;
    }
  }

  getAvailableRuns(): RunData[] {
    const allFiles: RunData[] = [];

    // Read from both discover and hashtag directories
    const directories = ["discover", "hashtag"];

    for (const dir of directories) {
      try {
        const dirPath = path.join(process.cwd(), "../out", dir);
        const files = readdirSync(dirPath)
          .filter((f) => f.endsWith(".json"))
          .map((f) => {
            const timestamp = f.replace(".json", "");
            const filePath = path.join(dirPath, f);
            const stats = statSync(filePath);

            // Try to read metadata
            let metadata, processed;
            try {
              const content = JSON.parse(readFileSync(filePath, "utf8"));
              metadata = content.metadata;
              processed = content.processed;
            } catch (e) {
              console.warn(`Failed to parse ${f}:`, e);
            }

            return {
              timestamp,
              date: stats.mtime.toISOString(),
              metadata,
              processed,
              stepCount: this.getStepCount(timestamp),
            };
          });

        allFiles.push(...files);
      } catch (error) {
        console.warn(`No ${dir} directory found:`, error);
      }
    }

    // Sort all files by timestamp descending
    return allFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  getRunData(timestamp: string) {
    // Try both discover and hashtag directories
    const directories = ["discover", "hashtag"];

    for (const dir of directories) {
      try {
        const filePath = path.join(
          process.cwd(),
          "../out",
          dir,
          `${timestamp}.json`,
        );
        return JSON.parse(readFileSync(filePath, "utf8"));
      } catch (error) {
        // Continue to next directory
      }
    }

    throw new Error(`Run not found: ${timestamp}`);
  }

  getStepData(timestamp: string, step: string) {
    try {
      const filePath = path.join(
        process.cwd(),
        "../out/intermediary",
        timestamp,
        `${step}.json`,
      );
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Step data not found: ${timestamp}/${step}`);
    }
  }

  getPipelineStats(timestamp: string): PipelineStats | null {
    try {
      const intermediaryPath = path.join(
        process.cwd(),
        "../out/intermediary",
        timestamp,
      );

      const stepFiles = {
        extracted: "01_extracted_profiles.json",
        deduped: "02_deduped_profiles.json", 
        qualityPass1: "03_quality_filtered_pass1.json",
        expanded: "04_expanded_profiles.json",
        finalDeduped: "05_final_deduped_video_rows.json",
        qualityPass2: "06_quality_filtered_pass2.json",
        qualityPass3: "07_quality_filtered_pass3.json",
        final: "08_final_processed.json"
      };

      const stats: PipelineStats = {
        extracted: 0,
        deduped: 0,
        qualityPass1: 0,
        expanded: 0,
        finalDeduped: 0,
        qualityPass2: 0,
        qualityPass3: 0,
        final: 0
      };

      for (const [step, filename] of Object.entries(stepFiles)) {
        try {
          const filePath = path.join(intermediaryPath, filename);
          const content = JSON.parse(readFileSync(filePath, "utf8"));
          stats[step as keyof PipelineStats] = Array.isArray(content) ? content.length : 0;
        } catch (error) {
          // If step file doesn't exist, keep count as 0
        }
      }

      return stats;
    } catch (error) {
      return null;
    }
  }

  getAveragePipelineStats(): PipelineStats | null {
    const allStats: PipelineStats[] = [];

    // Get stats for all runs
    const directories = ["discover", "hashtag"];
    
    for (const dir of directories) {
      try {
        const dirPath = path.join(process.cwd(), "../out", dir);
        const files = readdirSync(dirPath)
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(".json", ""));

        for (const timestamp of files) {
          const stats = this.getPipelineStats(timestamp);
          if (stats) {
            allStats.push(stats);
          }
        }
      } catch (error) {
        // Directory doesn't exist, continue
      }
    }

    if (allStats.length === 0) {
      return null;
    }

    // Calculate averages
    const avgStats: PipelineStats = {
      extracted: 0,
      deduped: 0,
      qualityPass1: 0,
      expanded: 0,
      finalDeduped: 0,
      qualityPass2: 0,
      qualityPass3: 0,
      final: 0
    };

    for (const step of Object.keys(avgStats) as (keyof PipelineStats)[]) {
      avgStats[step] = Math.round(
        allStats.reduce((sum, stats) => sum + stats[step], 0) / allStats.length
      );
    }

    return avgStats;
  }
}

