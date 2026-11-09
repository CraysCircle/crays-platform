import { useEffect, useRef, type ReactEventHandler } from 'react';
import type { ProductWorld } from './productModel.ts';
import { resolvePaidVideo, type PaidVideoSource } from './paidVideoWatermark.ts';
import './paid-original-video.css';

export type PaidOriginalVideoProps = {
  world: ProductWorld;
  postId: string;
  source: PaidVideoSource;
  onTimeUpdate?: ReactEventHandler<HTMLVideoElement>;
};

/** No video, source, poster or original URL is mounted without current access. */
export function PaidOriginalVideo({ world, postId, source, onTimeUpdate }: PaidOriginalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = resolvePaidVideo(world, postId, source);
  const src = video.allowed ? video.src : undefined;
  useEffect(() => {
    const element = videoRef.current;
    return () => {
      // Release a previous source on navigation, source changes or entitlement loss.
      if (!element) return;
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, [src]);

  if (!video.allowed) return <p className="paid-original-video-status" role="status">
    {video.reason === 'access' ? 'Original video is locked. Check your current access.' : 'Original video is unavailable. Your existing rights are unchanged.'}
  </p>;

  return <figure className="paid-original-video">
    <div className="paid-original-video-stage">
      <video key={src} ref={videoRef} className="native-player" controls playsInline preload="none"
        src={src} poster={video.poster} aria-label={video.alt}
        controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture disableRemotePlayback
        onTimeUpdate={onTimeUpdate} />
      {video.watermark && <span className="paid-original-video-watermark" aria-label="Personalised example copy reference">{video.watermark}</span>}
    </div>
    {(video.sample || video.watermark) && <figcaption className="paid-original-video-caption">
      {video.sample && <span>Illustrative sample clip.</span>}
      {video.watermark && <details><summary>About this copy watermark</summary><p>This example watermark is visible during inline playback. It is not encoded into the video and is not forensic DRM. Native fullscreen, external playback and saved copies may omit it.</p></details>}
    </figcaption>}
  </figure>;
}
