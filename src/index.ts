import "dotenv/config";
import {App, RequestError} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import * as fs from 'node:fs';
import * as http from "http";


const appId = process.env.APP_ID!;
const webhookSecret = process.env.WEBHOOK_SECRET!;
const privateKeyPath = process.env.PRIVATE_KEY_PATH!;

const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret
  },
});

const messageForNewPRs = "Thanks for opening a new PR! Please follow our contributing guidelines to make your PR easier to review.";


app.webhooks.on("pull_request.opened", async ({octokit, payload}) => {
  console.log(`Received a pull request event for #${payload.pull_request.number}`);
  try {
    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: messageForNewPRs,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    });
  } catch (e) {
    const error = e as RequestError;
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data}`)
    }
    console.error(error)
  }
});

app.webhooks.on("push", async ({octokit, payload}) => {
  console.log(`Received a push to ${payload.repository.full_name}`);
  console.log(`Ref: ${payload.ref}`);
  console.log(`Commit count: ${payload.commits.length}`);

  for (const commit of payload.commits) {
    console.log(`- ${commit.id} by ${commit.author.name}: ${commit.message}`);
  }
});

const port = 3000;
const host = 'localhost';
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

const middleware = createNodeMiddleware(app.webhooks, {path});

http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`);
  console.log('Press Ctrl + C to quit.')
});
