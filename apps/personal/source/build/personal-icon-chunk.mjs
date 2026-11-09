/** Keep the same tree-shaken icons in one cacheable asset rather than hundreds of HTTP imports. */
export function personalIconChunk(id){
 if(id.replaceAll('\\','/').includes('/node_modules/@phosphor-icons/react/'))return 'personal-icons';
}
