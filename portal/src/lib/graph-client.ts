// Microsoft Graph client configuration
// Uses Managed Identity on Azure App Service, falls back to client credentials locally
import { Client } from "@microsoft/microsoft-graph-client";
import {
  DefaultAzureCredential,
  ClientSecretCredential,
  ManagedIdentityCredential,
} from "@azure/identity";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

/**
 * Gets an Azure token credential that works in both environments:
 * - Azure App Service: System Assigned Managed Identity (no secrets needed)
 * - Local dev: Client credentials (client ID + secret from env vars)
 *
 * Priority order:
 * 1. If USE_MANAGED_IDENTITY=true → ManagedIdentityCredential only
 * 2. If AZURE_AD_CLIENT_SECRET is set → ClientSecretCredential (local dev)
 * 3. Otherwise → DefaultAzureCredential (auto-detects MI, az cli, etc.)
 */
function getCredential() {
  const useMI = process.env.USE_MANAGED_IDENTITY === "true";

  if (useMI) {
    // Explicitly use Managed Identity — fastest on App Service, no fallback chain
    return new ManagedIdentityCredential();
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  if (clientId && clientSecret && tenantId) {
    // Local development: use client credentials
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  // Fallback: DefaultAzureCredential tries MI → az cli → env vars → etc.
  return new DefaultAzureCredential();
}

/**
 * Creates an authenticated Microsoft Graph client.
 * Automatically uses Managed Identity on Azure, client credentials locally.
 */
export async function getGraphClient(): Promise<Client> {
  const credential = getCredential();
  const tokenResponse = await credential.getToken(GRAPH_SCOPE);

  if (!tokenResponse?.token) {
    throw new Error("Failed to acquire Graph API access token");
  }

  return Client.init({
    authProvider: (done) => {
      done(null, tokenResponse.token);
    },
  });
}
