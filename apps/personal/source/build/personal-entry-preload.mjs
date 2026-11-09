/** Fetch the existing Personal entry in parallel with account admission; never mount it before admission. */
export function personalEntryPreload(){
 return {name:'crays-personal-entry-preload',apply:'build',transformIndexHtml:{order:'post',handler(_html,context){
  const entry=Object.values(context.bundle||{}).find(file=>file.type==='chunk'&&file.facadeModuleId?.replaceAll('\\','/').endsWith('/src/Prototype.tsx'));
  if(!entry)return [];
  return [{tag:'link',attrs:{rel:'modulepreload',href:'/'+entry.fileName},injectTo:'head'},
   {tag:'link',attrs:{rel:'preload',as:'image',href:'/assets/crays/member-marina-original.webp'},injectTo:'head'},
   ...[...(entry.viteMetadata?.importedCss||[])].map(file=>({tag:'link',attrs:{rel:'preload',as:'style',href:'/'+file,crossorigin:''},injectTo:'head'}))];
 }}};
}
