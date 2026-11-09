/** Compile-only type for the original server-host helper; no runtime credentials or environment injection. */
declare const process:{env:Record<string,string|undefined>};
