"use client";

import { forwardRef, type ImgHTMLAttributes, type SyntheticEvent } from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number;
  placeholder?: 'empty' | 'blur';
  blurDataURL?: string;
  onLoadingComplete?: (image: HTMLImageElement) => void;
};

/** Original URLs, dimensions and crop CSS; no replacement assets or URL rewriting. */
const MemberBrowserImage = forwardRef<HTMLImageElement, Props>(function MemberBrowserImage(
  { fill, priority, unoptimized: _unoptimized, quality: _quality, placeholder: _placeholder,
    blurDataURL: _blur, onLoadingComplete, onLoad, style, loading, fetchPriority, ...props }, ref,
) {
  const loaded = (event: SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(event);
    onLoadingComplete?.(event.currentTarget);
  };
  return <img {...props} ref={ref} loading={priority ? 'eager' : loading ?? 'lazy'}
    fetchPriority={priority ? 'high' : fetchPriority} onLoad={loaded}
    style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style} />;
});

export default MemberBrowserImage;
