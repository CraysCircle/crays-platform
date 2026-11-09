// Exact original WASM generation compiled and exercised with the normal account
// runtime. Vite retains the generated module's relative WASM asset URL.
let loading;
export function loadCurrentOriginalGroupEngine(){
 if(!loading)loading=import('../../.qualification/group-own-device-binding-v1440/pkg/crays_browser_engine_wasm.js').then(async module=>{await module.default();return module.BrowserRamAccount;}).catch(error=>{loading=null;throw error;});
 return loading;
}
