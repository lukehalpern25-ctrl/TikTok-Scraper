export class StaticRoutes {
  async handleRequest(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    
    // Serve the main page
    if (url.pathname === "/") {
      return new Response(await Bun.file("./index.html").text(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve static CSS files
    if (url.pathname.startsWith("/styles/")) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/css" }
        });
      }
    }
    
    // Serve and transpile TypeScript/TSX files
    if (url.pathname.startsWith("/components/") && (url.pathname.endsWith(".tsx") || url.pathname.endsWith(".ts"))) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        try {
          const result = await Bun.build({
            entrypoints: [filePath],
            format: "esm",
            target: "browser",
            minify: false,
            splitting: false,
          });
          
          if (result.success && result.outputs[0]) {
            const jsContent = await result.outputs[0].text();
            return new Response(jsContent, {
              headers: { "Content-Type": "application/javascript" }
            });
          }
        } catch (error) {
          console.error("Failed to transpile:", error);
        }
      }
    }
    
    return null;
  }
}