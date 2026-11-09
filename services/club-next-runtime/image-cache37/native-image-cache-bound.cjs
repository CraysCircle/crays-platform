"use strict";
// Native Next image disk cache bound only; original application/listener/bootstrap stay unchanged.
const assert = require("node:assert/strict");
const config = JSON.parse(process.env.__NEXT_PRIVATE_STANDALONE_CONFIG || "null");
assert(config && config.experimental.trustHostHeader === true && config.images, "EXACT_EXISTING_NATIVE_NEXT_CONFIG_REQUIRED");
assert(!Object.hasOwn(config.images, "maximumDiskCacheSize"), "UNEXPECTED_PREEXISTING_IMAGE_CACHE_BOUND");
config.images.maximumDiskCacheSize = 134217728;
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
