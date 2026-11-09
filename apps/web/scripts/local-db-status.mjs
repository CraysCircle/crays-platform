import { spawnSync } from "node:child_process";
import net from "node:net";

function commandAvailable(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    available: !result.error && result.status === 0,
    output: result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null,
  };
}

function checkTcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 1500 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

const docker = commandAvailable("docker", ["--version"]);
const compose = commandAvailable("docker", ["compose", "version"]);
const tcpReachable = await checkTcp("127.0.0.1", 54329);

console.log(
  JSON.stringify(
    {
      dockerAvailable: docker.available,
      dockerVersion: docker.output,
      composeAvailable: compose.available,
      composeVersion: compose.output,
      localTarget: {
        host: "127.0.0.1",
        port: 54329,
        database: "crays_platform",
        user: "crays",
        passwordRequired: false,
      },
      tcpReachable,
      nextStep: docker.available
        ? "Run npm run db:local:up, then set CRAYS_DATABASE_URL for this shell before applying the migration."
        : "Install or expose Docker locally, or choose a managed disposable Postgres target.",
    },
    null,
    2,
  ),
);
