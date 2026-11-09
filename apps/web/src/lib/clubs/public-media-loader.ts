/** Responsive derivatives of the same approved public asset. The media route
 * verifies current publication on every request, including conditional requests. */
export function clubsPublicMediaLoader({src,width}:{src:string;width:number}):string {
  if(!src.startsWith('/api/crays/clubs/media/'))return src;
  const widths=[320,640,960,1280,1920];
  const selected=widths.find(value=>value>=width)??1920;
  return `${src}${src.includes('?')?'&':'?'}w=${selected}`;
}
