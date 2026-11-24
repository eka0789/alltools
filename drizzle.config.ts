import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { pathToFileURL } from "node:url";

const remoteUrl = process.env.ALLTOOLS_DB_URL;
const remoteToken = process.env.ALLTOOLS_DB_AUTH_TOKEN;
const isRemote =
  !!remoteUrl && !/^file:/i.test(remoteUrl) && !remoteUrl.endsWith(".db");

function localFileUrl(): string {
  const raw = process.env.ALLTOOLS_DB ?? "./data/alltools.db";
  if (/^file:/i.test(raw)) return raw;
  return pathToFileURL(path.resolve(raw)).href;
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // drizzle-kit's sqlite dialect takes a single url; the libSQL auth token
    // is passed as a query parameter, which @libsql/client understands.
    url: isRemote && remoteToken
      ? `${remoteUrl}?authToken=${remoteToken}`
      : (isRemote ? remoteUrl! : localFileUrl()),
  },
});
