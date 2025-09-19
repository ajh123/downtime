import "dotenv/config";
import { fileURLToPath } from "url";
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

import github from "./integrations/github.ts";

const app = new Hono()

app.route("/api/integrations/github", github);

// Convert import.meta.url to a normal file path
const __filename = fileURLToPath(import.meta.url);

if (__filename === process.argv[1]) {
  const server = serve(app)

  // graceful shutdown
  process.on('SIGINT', () => {
    server.close()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    server.close((err) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      process.exit(0)
    })
  })

  let address = ""
  const realAddress = server.address()
  if (typeof realAddress === "string") {
    address = realAddress
  } else if (realAddress && typeof realAddress === "object") {
    address = `http://localhost:${realAddress.port}`
  }

  console.log('opened server on', address);
}

export default app