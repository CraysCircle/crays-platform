"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import styles from "./clubs-community-life-page-en.module.css";

type RhythmStage = {
  kicker: string;
  title: string;
  body: string;
  image: string;
  alt: string;
};

export function ClubsCommunityLifeRhythm({
  stages,
}: {
  stages: readonly RhythmStage[];
}) {
  const [activeStage, setActiveStage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

  const selectStage = (index: number) => {
    setActiveStage(index);
    const track = trackRef.current;
    const stage = stageRefs.current[index];
    if (!track || !stage || track.scrollWidth <= track.clientWidth + 1) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Scroll only this gallery; selecting a moment must not move the whole page.
    track.scrollTo({
      left: stage.offsetLeft - (stageRefs.current[0]?.offsetLeft ?? 0),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const readScrollPosition = () => {
    const track = trackRef.current;
    if (!track || track.scrollWidth <= track.clientWidth + 1) return;
    const start = stageRefs.current[0]?.offsetLeft ?? 0;
    let closest = 0;
    let distance = Infinity;
    stageRefs.current.forEach((stage, index) => {
      if (!stage) return;
      const nextDistance = Math.abs(stage.offsetLeft - start - track.scrollLeft);
      if (nextDistance < distance) {
        closest = index;
        distance = nextDistance;
      }
    });
    setActiveStage((current) => current === closest ? current : closest);
  };

  return (
    <div className={styles.rhythmExperience} aria-label="Morning, Afternoon, Evening">
      <div className={styles.rhythmGrid} ref={trackRef} onScroll={readScrollPosition}>
        {stages.map((stage, index) => (
          <article
            key={stage.kicker}
            role="button"
            tabIndex={0}
            aria-label={`${stage.kicker}: ${stage.title}`}
            aria-pressed={activeStage === index}
            onClick={() => selectStage(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectStage(index);
              }
            }}
            id={`community-rhythm-${index}`}
            data-active={activeStage === index ? "true" : "false"}
            ref={(node) => { stageRefs.current[index] = node; }}
          >
            <figure>
              <span className={styles.photo}>
                <Image alt={stage.alt} src={stage.image} fill sizes="(max-width: 760px) 78vw, (max-width: 1080px) 28vw, 22vw" />
              </span>
            </figure>
            <div className={styles.rhythmHeading}>
              <span>{stage.kicker}</span>
              <h3>{stage.title}</h3>
            </div>
            <p className={styles.rhythmBody}>{stage.body}</p>
          </article>
        ))}
      </div>
      <div className={styles.rhythmConnectors}>
        {stages.slice(1).map((stage, index) => (
          <button
            type="button"
            key={stage.kicker}
            className={styles.rhythmConnector}
            aria-label={`${stages[index].kicker} to ${stage.kicker}: ${stage.title}`}
            aria-controls={`community-rhythm-${index + 1}`}
            onClick={() => selectStage(index + 1)}
          >
            <ArrowRight aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        ))}
      </div>
      <div className={styles.rhythmPositions} aria-label="Choose a moment in the day">
        {stages.map((stage, index) => (
          <button
            type="button"
            key={stage.kicker}
            aria-label={`${stage.kicker}: ${stage.title}`}
            aria-pressed={activeStage === index}
            aria-controls={`community-rhythm-${index}`}
            onClick={() => selectStage(index)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {stages[activeStage]?.kicker}: {stages[activeStage]?.title}
      </p>
    </div>
  );
}
