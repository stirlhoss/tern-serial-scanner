import OAuth, { type Configuration } from "~/oauth";
import { oauthSignIn } from "~/lib/server";

const config: Configuration = {
  password: process.env.SESSION_SECRET!,
  netsuite: {
    id: process.env.NETSUITE_ID!,
    secret: process.env.NETSUITE_SECRET!,
    accountId: import.meta.env.VITE_NETSUITE_ACCOUNT_ID!,
  },
  handler: async (email, accessToken, redirectTo) =>
    oauthSignIn(email, accessToken, redirectTo),
};

export const GET = OAuth(config);
