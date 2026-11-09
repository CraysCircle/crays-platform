"use strict";
// Deployment adapter only; the original application and origin guards remain unchanged.
const http = require("node:http");
const next = require("/app/node_modules/next");
const allowedHosts = new Set(["www.craysclub.com", "craysclub.com"]);
const app = next({dev: false, dir: "/app", hostname: "www.craysclub.com", port: 443});
const handle = app.getRequestHandler();
let closing = false;
const server = http.createServer((req, res) => {
  const peer = req.socket.remoteAddress;
  const trustedHost = peer === "172.18.0.1" || peer === "::ffff:172.18.0.1";
  if (!allowedHosts.has(req.headers.host) || !trustedHost ||
      req.headers["x-forwarded-proto"] !== "https" ||
      req.headers["x-forwarded-port"] !== "443") {
    res.writeHead(421, {"content-type": "application/json", "cache-control": "no-store"});
    res.end('{"error":"PRIVATE_HTTPS_INGRESS_NOT_ADMITTED"}');
    return;
  }
  Promise.resolve(handle(req, res)).catch(() => {
    if (!res.headersSent) res.writeHead(500, {"content-type": "application/json", "cache-control": "no-store"});
    res.end('{"error":"ORIGINAL_NEXT_REQUEST_FAILED"}');
  });
});
server.on("clientError", (_error, socket) => socket.destroy());
async function close() {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    try { await app.close(); process.exit(0); }
    catch { process.exit(1); }
  });
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
app.prepare().then(() => {
  if (!closing) server.listen(8080, "0.0.0.0");
}).catch(() => {
  process.stderr.write("CUSTOM_LISTENER_START_FAILED\n");
  process.exit(1);
});
