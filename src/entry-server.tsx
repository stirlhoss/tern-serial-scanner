// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { waitForDatabaseInitialization } from "./lib/db-init";

// Initialize database when server starts
waitForDatabaseInitialization().catch((err) => {
  console.error("Failed to initialize database:", err);
});

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
