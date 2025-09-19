import "dotenv/config";
import { App } from "octokit";
import type { EmitterWebhookEvent } from "@octokit/webhooks/types";
import { Hono } from "hono";
import * as fs from "node:fs";

// Load environment
const appId = process.env.APP_ID!;
const webhookSecret = process.env.WEBHOOK_SECRET!;
const privateKeyPath = process.env.PRIVATE_KEY_PATH!;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// Init Octokit GitHub App
const githubApp = new App({
  appId,
  privateKey,
  webhooks: { secret: webhookSecret },
});

githubApp.webhooks.on("push", ({ payload }: EmitterWebhookEvent<"push">) => {
  console.log(`Received a push to ${payload.repository.full_name}`);
  console.log(`Ref: ${payload.ref}`);
  console.log(`Commit count: ${payload.commits.length}`);

  for (const commit of payload.commits) {
    console.log(`- ${commit.id} by ${commit.author.name}: ${commit.message}`);
  }
});

// Hono app
const app = new Hono();

app.post("/api/integrations/github", async (c) => {
  const body = await c.req.text();
  const headers = Object.fromEntries(c.req.raw.headers);

  try {
    await githubApp.webhooks.verifyAndReceive({
      id: headers["x-github-delivery"] as string,
      name: headers["x-github-event"] as string,
      signature: headers["x-hub-signature-256"] as string,
      payload: body,
    });
    return c.text("Webhook processed", 200);
  } catch (err) {
    console.error("Webhook error:", err);
    return c.text("Webhook signature verification failed", 400);
  }
});

export default app
