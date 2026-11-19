// Refuses to build while the dev server is running.
//
// `next build` and `next dev` share the .next directory. A production build
// overwrites the dev server's manifests mid-flight, the server starts serving
// chunks that no longer exist, and the site 500s with an empty stylesheet.
// The only fix is the one this script enforces: build with the server down.

import net from "node:net";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const dev = pkg.scripts?.dev ?? "";
const port = Number(/--port[ =](\d+)/.exec(dev)?.[1] ?? 3000);

const probe = net.createServer();
probe.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Refusing to build: the dev server is on port ${port}.`);
    console.error("A build overwrites .next while the dev server reads it, and the site breaks.");
    console.error("Stop the dev server, run the build, then start the dev server again.");
    process.exit(1);
  }
  console.error(`Could not check port ${port}: ${err.code ?? err.message}`);
  process.exit(1);
});
probe.listen(port, "0.0.0.0", () => {
  probe.close(() => process.exit(0));
});
