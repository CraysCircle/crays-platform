import {ArrowUpRight, CaretRight, HandPalm, Star, Trophy} from '@phosphor-icons/react';

/** Final season outcomes only. Current standings never grant an honour or access. */
export const awardCeremony = {
  cadence: 'annual',
  prizeRanks: [1, 2, 3],
  permanentHonourRank: 1,
  honour: ['star', 'handprint'],
  honourLocations: 'every global CRAYS Club',
  website: 'https://www.craysaward.com/',
} as const;

export function AwardLiveEventCard({onOpen}: {onOpen: () => void}) {
  return <button className="award-ceremony-entry" onClick={onOpen}>
    <span className="award-ceremony-emblem" aria-hidden="true"><Trophy size={28}/></span>
    <span><small>CRAYS PROPS AWARD · ANNUAL LIVE EVENT</small><strong>From your story to the stage.</strong>
      <span>Top 3 receive their prizes in person. No. 1 leaves a lasting mark.</span>
    </span><CaretRight size={20} aria-hidden="true"/>
  </button>;
}

export function AwardLiveEventScreen({asset, onRankings}: {asset: (name: string) => string; onRankings: () => void}) {
  return <div className="award-ceremony" data-testid="award-annual-event">
    <section className="award-hero">
      <img src={asset('lifestyle-club-04.webp')} alt="Illustrative CRAYS Club atmosphere, not a confirmed event venue"/>
      <div><span>THE ANNUAL CRAYS Props Award</span><h1>Your moment.<br/>On the stage.</h1>
        <p>One Props season of stories. One annual celebration of the people behind them.</p></div>
    </section>
    <section aria-labelledby="award-ceremony-prizes">
      <h2 id="award-ceremony-prizes">Three places. A live celebration.</h2>
      <p>The final Top 3 in each selected Props-season category receive their prizes in person at the annual live event.</p>
      <ol className="award-ceremony-podium" aria-label="Final category winners receiving prizes at the live event">
        {[1, 2, 3].map(rank=><li key={rank} className={`award-ceremony-place award-ceremony-place-${rank}`}>
          <Trophy size={rank===1?30:24} weight={rank===1?'fill':'regular'} aria-hidden="true"/>
          <strong>{rank===1?'1st':rank===2?'2nd':'3rd'}</strong><span>Prize on stage</span>
          {rank===1&&<small>+ permanent honour</small>}
        </li>)}
      </ol>
    </section>
    <section className="award-ceremony-legacy" aria-labelledby="award-ceremony-legacy">
      <div className="award-ceremony-legacy-icons" aria-hidden="true"><Star size={32}/><HandPalm size={32}/></div>
      <span className="eyebrow">EXCLUSIVELY FOR THE CATEGORY WINNER</span>
      <h2 id="award-ceremony-legacy">First place. A lasting mark.</h2>
      <p>Only the final No. 1 receives a star and handprint in the floor of every global CRAYS Club.</p>
      <span className="award-ceremony-legacy-note">A permanent celebration of the winner, inspired by the idea of a walk of fame.</span>
    </section>
    <a className="award-ceremony-site" href={awardCeremony.website} target="_blank" rel="noopener noreferrer">
      <span><strong>Meet the live event.</strong><small>craysaward.com</small></span><ArrowUpRight size={23} aria-hidden="true"/>
    </a>
    <button className="award-row" onClick={onRankings}><Trophy size={23}/><span>Follow the race<small>Explore the current Top 100 and Top 3</small></span><CaretRight size={19}/></button>
    <details className="award-details"><summary>From current ranking to final honours</summary>
      <p>A current Top-3 position is a provisional standing. Final category results, closing rules and ties must be resolved before prizes or winner honours are awarded.</p>
      <p>Voting does not include an event ticket, travel, accommodation or Club access. Event dates, venue, attendance arrangements and prize details will be announced separately.</p>
      <p>This is a planned experience in the clickdummy. No real winner, prize, star or handprint is issued here.</p>
    </details>
  </div>;
}
