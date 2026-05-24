import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";
import type { RioHistoricEventsResponse } from "@/lib/rio-history";

const DEFAULT_LOGIN_URL =
  "https://auth.iam.rio.cloud/login?post_login_redirect_uri=https%3A%2F%2Fauth.iam.rio.cloud%2Foauth%2Fauthorize%3Fclient_id%3Dda6726bd-0ceb-4a59-964d-4d5ece2bf16a%26redirect_uri%3Dhttps%253A%252F%252Fhome.rio.cloud%252Fredirect%26response_type%3Dcode%26scope%3Dopenid%2Bprofile%2Bemail%2Bmenu.read%26state%3D83cafa96b1cc4f93962d1dd8387e8af3%26code_challenge%3D6Df0lNT5rP4V-4adIOYdRnbjx5EuZoOH0-yQBhju-0A%26code_challenge_method%3DS256";

const ASSET_HISTORY_URL = "https://asset-history.rio.cloud/fleetmonitor/eventHistory#/asset-history";

const DEFAULT_EVENT_TYPES = [
  "position",
  "first-and-last-position",
  "product",
  "border-crossing",
  "driver-card",
  "driving-state",
  "fuel-drop",
  "geofence",
  "pto-state",
];

export async function withRioPortal<T>(
  fn: (client: RioPortalClient) => Promise<T>
): Promise<T> {
  const username = process.env.RIO_USERNAME;
  const password = process.env.RIO_PASSWORD;

  if (!username || !password) {
    throw new Error("RIO_USERNAME i RIO_PASSWORD moraju biti postavljeni u .env");
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1400 },
      acceptDownloads: true,
    });
    const page = await context.newPage();

    try {
      await loginToRioPortal(page, username, password);
      const client = new RioPortalClient(context, page);
      return await fn(client);
    } catch (error) {
      lastError = error;
      if (attempt >= 2) {
        throw error;
      }
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }

  throw lastError instanceof Error ? lastError : new Error("RIO portal session nije uspjela");
}

export class RioPortalClient {
  private bearerToken: string | null = null;

  constructor(private readonly context: BrowserContext, private readonly page: Page) {}

  async fetchHistoricEvents(params: {
    assetId: string;
    from: Date;
    to: Date;
    locale?: string;
    includeEventTypes?: string[];
  }): Promise<RioHistoricEventsResponse> {
    const token = await this.ensureBearerToken(params.assetId);
    const locale = params.locale || "hr-HR";
    const includeEventTypes = params.includeEventTypes || DEFAULT_EVENT_TYPES;
    const url = new URL(`https://api.asset-history.rio.cloud/historic-events/assets/${params.assetId}`);
    url.searchParams.set("from", params.from.toISOString());
    url.searchParams.set("to", params.to.toISOString());
    url.searchParams.set("locale", locale);
    url.searchParams.set("include_only_event_types", includeEventTypes.join(","));

    const response = await this.context.request.get(url.toString(), {
      headers: {
        authorization: token,
        referer: "https://asset-history.rio.cloud/",
      },
    });

    if (!response.ok()) {
      throw new Error(`RIO history ${response.status()}: ${await response.text()}`);
    }

    return (await response.json()) as RioHistoricEventsResponse;
  }

  async saveHistoricEventsJson(params: {
    assetId: string;
    from: Date;
    to: Date;
    filePath: string;
  }) {
    const fs = await import("node:fs/promises");
    const response = await this.fetchHistoricEvents(params);
    await fs.writeFile(params.filePath, JSON.stringify(response, null, 2), "utf8");
    return response;
  }

  private async ensureBearerToken(assetId: string) {
    if (this.bearerToken) return this.bearerToken;

    const bootstrapUrl = `${ASSET_HISTORY_URL}?assetIds=${encodeURIComponent(assetId)}&timeRangeType=TODAY`;
    const tokenPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("RIO bearer token nije uhvaćen na asset-history page-u")), 30000);

      const handler = (request: { url(): string; headers(): Record<string, string> }) => {
        if (!request.url().includes("api.asset-history.rio.cloud/historic-positions/assets/")) {
          return;
        }

        const token = request.headers()["authorization"];
        if (!token) return;

        clearTimeout(timeout);
        this.page.off("request", handler as never);
        resolve(token);
      };

      this.page.on("request", handler as never);
    });

    await this.page.goto(bootstrapUrl, { waitUntil: "networkidle" });
    await this.page.waitForTimeout(5000);
    this.bearerToken = await tokenPromise;
    return this.bearerToken;
  }
}

async function loginToRioPortal(page: Page, username: string, password: string) {
  await page.goto(process.env.RIO_LOGIN_URL || DEFAULT_LOGIN_URL, { waitUntil: "networkidle" });

  const usernameInput = page.locator("#username");
  const passwordInput = page.locator("#current-password");

  if ((await usernameInput.count()) === 0 || (await passwordInput.count()) === 0) {
    return;
  }

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.waitForLoadState("networkidle");
}
