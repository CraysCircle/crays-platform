import { canReadPaidOriginal, readableOriginalMedia } from './paidContentAccess.ts';
import type { ProductWorld } from './productModel.ts';

/** Select an original by its stored identity, never by a caller-supplied URL. */
export type PaidVideoSource =
  | { kind: 'published-media'; mediaId: string }
  | { kind: 'attached-file' }
  | { kind: 'sample' };

export type PaidVideoProjection =
  | { allowed: false; reason: 'access' | 'unavailable' }
  | { allowed: true; src: string; alt: string; poster?: string; watermark: string | null; sample: boolean };

/**
 * Stable example copy reference only, not encryption, a signature, forensic DRM,
 * or irreversible anonymisation. No buyer name, contact address or public key
 * is emitted. A real personalised render needs a private server-side mapping.
 */
export function paidVideoCopyReference(owner: string, postId: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(JSON.stringify(['crays-video-copy-v1', owner, postId]))) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return `CRAYS · Copy ${hash.toString(16).padStart(16, '0').toUpperCase()}`;
}

function playableUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  return /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value) || /^blob:/i.test(value) || /^data:video\//i.test(value);
}

/** Current local entitlement model; production must also authorise original retrieval. */
export function resolvePaidVideo(world: ProductWorld, postId: string, source: PaidVideoSource): PaidVideoProjection {
  const matches = world.posts.filter(post => post.id === postId);
  if (matches.length !== 1 || !canReadPaidOriginal(world, matches[0])) return { allowed: false, reason: 'access' };
  const post = matches[0];
  if (!post.mediaAvailable) return { allowed: false, reason: 'unavailable' };

  const watermark = post.protected && world.identity.signedIn
    ? paidVideoCopyReference(world.owner, post.id) : null;
  if (source.kind === 'published-media') {
    const media = readableOriginalMedia(world, post).filter(item => item.id === source.mediaId);
    if (media.length !== 1 || media[0].kind !== 'video' || !playableUrl(media[0].url)) return { allowed: false, reason: 'unavailable' };
    return { allowed: true, src: media[0].url, poster:post.image?(post.image.startsWith('/')?post.image:`/assets/crays/${post.image}`):undefined, alt: media[0].alt || post.title, watermark, sample: false };
  }
  if (source.kind === 'attached-file') {
    const files = world.objects.filter(file => file.kind === 'media-asset' && file.id === post.mediaId && file.owner === post.author);
    const file = files[0];
    if (files.length !== 1 || file.status === 'unreachable' || !String(file.mime).startsWith('video/') || !playableUrl(file.dataUrl)) return { allowed: false, reason: 'unavailable' };
    return { allowed: true, src: file.dataUrl, alt: String(file.name || post.title), watermark, sample: false };
  }
  // This is the explicitly labelled existing dummy clip, never a fallback for a
  // missing attachment or an unresolved real original.
  if (post.mediaId || post.publishing || post.demoMedia?.length || !['video', 'audio', 'live'].includes(post.type)) return { allowed: false, reason: 'unavailable' };
  return { allowed: true, src: '/assets/crays/sample-venue.mp4', poster: '/assets/crays/venue-table.png', alt: 'Sample media player', watermark, sample: true };
}
