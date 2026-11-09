"use client";
import NextImage, { type ImageProps } from "next/image";
import { clubsPublicMediaLoader } from "@/lib/clubs/public-media-loader";
import { useEffect, useRef, useState } from "react";

/** Retry only the approved public hospitality asset endpoint after transient failures. */
export function HospitalityImage(props: ImageProps) {
  const key = typeof props.src === "string" ? props.src : "default" in props.src ? props.src.default.src : props.src.src;
  return <RetryingHospitalityImage key={key} {...props} />;
}

function RetryingHospitalityImage({ src, onError, ...props }: ImageProps) {
  const [attempt, setAttempt] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (retryTimer.current !== null) clearTimeout(retryTimer.current);
  }, []);
  const retryable = typeof src === "string" && src.startsWith("/api/crays/clubs/media/");
  const resolvedSrc = retryable && attempt > 0 ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src;
  return <NextImage {...props} src={resolvedSrc} unoptimized={retryable ? false : props.unoptimized} loader={retryable ? clubsPublicMediaLoader : props.loader} onError={event => {
    onError?.(event);
    if (!retryable || attempt >= 3 || retryTimer.current !== null) return;
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      setAttempt(value => value + 1);
    }, 500 * 2 ** attempt);
  }} />;
}
