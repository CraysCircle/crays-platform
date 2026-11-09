import type { Post } from "./productModel.ts";
// Distribution may produce multiple received copies; it never creates a new original event.
export const originalEventKey = (p: Post) => p.publishing?.eventId || p.id;
export function uniqueOriginals(posts: Post[]): Post[] {
 const seen=new Set<string>();
 return posts.filter(p=>{const key=originalEventKey(p);if(seen.has(key))return false;seen.add(key);return true;});
}
