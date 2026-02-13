// Microsoft Graph client configuration
import { Client } from "@microsoft/microsoft-graph-client";

/**
 * Creates an authenticated Microsoft Graph client using client credentials flow.
 * Used for server-side API routes that need app-level permissions.
 */
export async function getGraphClient(): Promise<Client> {
  const tokenResponse = await getAccessToken();

  return Client.init({
    authProvider: (done) => {
      done(null, tokenResponse);
    },
  });
}

/**
 * Gets an access token using client credentials flow (app-only).
 */
async function getAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_AD_TENANT_ID!;
  const clientId = process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}
