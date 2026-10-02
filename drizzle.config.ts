import { defineConfig } from "drizzle-kit";

const remoteUrl = process.env.ALLTOOLS_DB_URL;
const remoteToken = process.env.ALLTOOLS_DB_AUTH_TOKEN;
const isRemote =
  !!remoteUrl && !/^file:/i.test(remoteUrl) && !remoteUrl.endsWith(".db");

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // drizzle-kit's sqlite dialect takes a single url; the libSQL auth token
    // is passed as a query parameter, which @libsql/client understands.
    url: isRemote && remoteToken
      ? `${remoteUrl}?authToken=${remoteToken}`
      : (isRemote ? remoteUrl! : (process.env.ALLTOOLS_DB ?? "./data/alltools.db")),
  },
});
