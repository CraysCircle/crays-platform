
// Root deployment transport: native installed Next production configuration only.
;(() => {
  const f = require("node:fs"), c = require("node:crypto"), a = require("node:assert/strict");
  a(!Object.hasOwn(process.env, "__NEXT_PRIVATE_STANDALONE_CONFIG"), "UNEXPECTED_PREEXISTING_NEXT_CONFIG");
  const bytes = f.readFileSync("/app/.next/required-server-files.json");
  a.equal(c.createHash("sha256").update(bytes).digest("hex"), "9a5b015780ff3b5332835d0f8f44800953589f04b63624a6d683e7c1cb58f416", "EXACT_BUILD28_SERVER_CONFIG_REQUIRED");
  const config = JSON.parse(bytes).config;
  a.equal(config.experimental.trustHostHeader, false, "EXACT_ORIGINAL_NEXT_ORIGIN_CONFIG_REQUIRED");
  config.experimental.trustHostHeader = true;
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
})();
