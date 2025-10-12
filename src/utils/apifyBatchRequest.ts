import { ApifyClient } from "apify-client";

interface BatchRequestConfig {
  actorId: string;
  queries: string[];
  baseConfig: Record<string, any>;
  queryFieldName: string;
  batchSize?: number;
}

interface BatchResponse {
  items: any[];
  count: number;
  successfulRequests: number;
  failedRequests: number;
}

export async function apifyBatchRequest(
  client: ApifyClient,
  config: BatchRequestConfig,
): Promise<BatchResponse> {
  const {
    actorId,
    queries,
    baseConfig,
    queryFieldName,
    batchSize = 7,
  } = config;

  console.log(
    `Starting batch request for ${queries.length} queries using ${actorId}`,
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
      const requestConfig = {
        ...baseConfig,
        [queryFieldName]: chunk,
      };

      try {
        console.log(
          `Starting request ${index + 1}/${chunks.length} with ${chunk.length} queries`,
        );
        const response = await client.actor(actorId).call(requestConfig);

        // Get dataset items
        const dataset = await client
          .dataset(response.defaultDatasetId)
          .listItems({ limit: 0 });

        console.log(`Request ${index + 1}: ${dataset.count} items retrieved`);

        return {
          success: true,
          chunkIndex: index,
          data: dataset,
          queriesCount: chunk.length,
        };
      } catch (error) {
        console.error(
          `Failed request ${index + 1} with ${chunk.length} queries:`,
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
  console.log(`Executing ${requestPromises.length} parallel requests...`);
  const results = await Promise.allSettled(requestPromises);

  // Process results
  const allItems: any[] = [];
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
        console.error(`Chunk ${index + 1} failed:`, error);
        failedRequests++;
      }
    } else {
      console.error(`Promise rejected for chunk ${index + 1}:`, result.reason);
      failedRequests++;
    }
  });

  const totalCount = allItems.length;

  console.log(`Batch request completed:`);
  console.log(
    `Successful requests: ${successfulRequests}/${chunks.length}`,
  );
  console.log(`Failed requests: ${failedRequests}/${chunks.length}`);
  console.log(
    `Total queries processed: ${totalQueriesProcessed}/${queries.length}`,
  );
  console.log(`Total items retrieved: ${totalCount}`);

  return {
    items: allItems,
    count: totalCount,
    successfulRequests,
    failedRequests,
  };
}

