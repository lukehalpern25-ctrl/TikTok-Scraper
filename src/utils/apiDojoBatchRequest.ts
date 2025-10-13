import { ApifyClient } from "apify-client";
import type { APIDojoHashTag } from "../interfaces/apidojo_hashtag";
import type { APIDojoProfile } from "../interfaces/apidojo_profile";

interface ApiDojoBatchRequestConfig {
  actorId: string;
  queries: string[];
  maxItems: number;
  batchSize?: number;
  isProfile?: boolean; // To determine if it's profile or hashtag scraping
}

interface ApiDojoBatchResponse {
  items: (APIDojoHashTag | APIDojoProfile)[];
  count: number;
  successfulRequests: number;
  failedRequests: number;
}

export async function apiDojoBatchRequest(
  client: ApifyClient,
  config: ApiDojoBatchRequestConfig,
): Promise<ApiDojoBatchResponse> {
  const {
    actorId,
    queries,
    maxItems,
    batchSize = 7,
    isProfile = false,
  } = config;

  console.log(
    `Starting APIDojo batch request for ${queries.length} queries using ${actorId}`,
  );
  console.log(
    `Splitting into ${batchSize} parallel requests with ~${Math.ceil(queries.length / batchSize)} queries each`,
  );

  // Split queries into chunks for parallel processing
  const chunks: string[][] = [];
  const chunkSize = Math.ceil(queries.length / batchSize);

  for (let i = 0; i < queries.length; i += chunkSize) {
    chunks.push(queries.slice(i, i + chunkSize));
  }

  console.log(
    `Created ${chunks.length} chunks: ${chunks.map((chunk) => chunk.length).join(", ")} queries each`,
  );

  // Create API request promises for each chunk
  const requestPromises: Promise<any>[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const index = i;
    
    const requestPromise = (async () => {
      // Configure request based on scraper type
      let requestConfig: any;
      
      if (isProfile) {
        // Profile scraper configuration
        requestConfig = {
          maxItems,
          usernames: chunk,
        };
      } else {
        // Hashtag scraper configuration
        requestConfig = {
          dateRange: "DEFAULT",
          includeSearchKeywords: false,
          keywords: chunk.map(query => query.startsWith('#') ? query : `#${query}`),
          maxItems,
          sortType: "RELEVANCE",
        };
      }

      try {
        console.log(
          `Starting APIDojo request ${index + 1}/${chunks.length} with ${chunk.length} ${isProfile ? 'usernames' : 'hashtags'}`,
        );
        const response = await client.actor(actorId).call(requestConfig);

        // Get dataset items
        const dataset = await client
          .dataset(response.defaultDatasetId)
          .listItems({ limit: 0 });

        console.log(`APIDojo request ${index + 1}: ${dataset.count} items retrieved`);

        return {
          success: true,
          chunkIndex: index,
          data: dataset,
          queriesCount: chunk.length,
        };
      } catch (error) {
        console.error(
          `Failed APIDojo request ${index + 1} with ${chunk.length} ${isProfile ? 'usernames' : 'hashtags'}:`,
          error,
        );
        return {
          success: false,
          chunkIndex: index,
          error: error instanceof Error ? error.message : "Unknown error",
          queriesCount: chunk.length,
        };
      }
    })();
    
    requestPromises.push(requestPromise);
  }

  // Execute all requests in parallel with Promise.allSettled
  console.log(`Executing ${requestPromises.length} parallel APIDojo requests...`);
  const results = await Promise.allSettled(requestPromises);

  // Process results
  const allItems: (APIDojoHashTag | APIDojoProfile)[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalQueriesProcessed = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const { success, data, queriesCount, error } = result.value;

      if (success && data) {
        allItems.push(...data.items);
        successfulRequests++;
        totalQueriesProcessed += queriesCount;
      } else {
        console.error(`APIDojo chunk ${index + 1} failed:`, error);
        failedRequests++;
      }
    } else {
      console.error(`APIDojo promise rejected for chunk ${index + 1}:`, result.reason);
      failedRequests++;
    }
  });

  const totalCount = allItems.length;

  console.log(`APIDojo batch request completed:`);
  console.log(
    `Successful requests: ${successfulRequests}/${chunks.length}`,
  );
  console.log(`Failed requests: ${failedRequests}/${chunks.length}`);
  console.log(
    `Total ${isProfile ? 'usernames' : 'hashtags'} processed: ${totalQueriesProcessed}/${queries.length}`,
  );
  console.log(`Total items retrieved: ${totalCount}`);

  return {
    items: allItems,
    count: totalCount,
    successfulRequests,
    failedRequests,
  };
}