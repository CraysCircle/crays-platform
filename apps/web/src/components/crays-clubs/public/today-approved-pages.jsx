"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TodayLocalizedContent, useTodayText } from "./today-localized-content";
import "./today-approved-pages.css";
import "./today-responsive.css";

const go = (path) => { window.location.href = path; };
const saidiaImage = "/__crays-clubs/today-20260912/hubs/saidia-morocco.png";
const medellinImage = "/__crays-clubs/today-20260912/hubs/medellin-colombia.png";
const prosperaImage = "/__crays-clubs/today-20260912/hubs/prospera-roatan-honduras.png";
const kaecImage = "/__crays-clubs/today-20260912/hubs/kaec-saudi-arabia.png";
const rawNames = ["028f88ea-9cb5-4d67-ad4a-0dd8e52b729e.webp", "02e7950f-9db5-47a1-9e86-5c99094bb677.webp", "02e7950f-9db5-47a1-9e86-5c99094bdfgdg.webp", "07009344-bc5a-40e2-bb27-9858d0685388.webp", "0a0ecbde-e793-4c2f-a22c-d3a3e65e71b7.webp", "0ce8b4aa-7c4b-4abd-8593-77af00f4b7f8.webp", "0f8e2b8a-93d1-4b6b-9bd5-25c6e290bc76.webp", "14870a46-2f27-412f-ba86-f49ba7e7ecd3.webp", "17177b85-7bfc-4361-a35f-c75dd8d9b754.webp", "17ab5c56-36f8-40b8-87a2-162d2dc082aa.webp", "188dbe2e-16df-429d-9252-e4776aa607c5.webp", "213c22dd-d53e-4660-a4fe-351818208071.webp", "23d1c276-4e2f-4de3-8dd6-ac45b3e37f30.webp", "244ce0d4-88c2-4dc5-8858-376fd95264f6.webp", "2452c13b-e4eb-4d78-9563-d15185eaf0df.webp", "259ab981-e6e5-4873-94a0-4287b9c85c68.webp", "38830736-8585-4bcb-a691-a3073fd1a892.webp", "3ac38c84-e3a5-486d-b97d-9831d6397a53.webp", "3d599880-7f85-4fbd-8dbb-5572d41e960a.webp", "3e50a612-cdb4-4028-afc3-e7df9b414a6a.webp", "42b88ebe-53fe-4daa-881a-a81eb531205b.webp", "477842dc-f245-437e-8ace-490dd45e383b.webp", "4a92fe57-164a-4223-8b9f-07c73e1a1a21.webp", "4c00fbd1-da77-4c17-ac18-40b5c8d26b77.webp", "5068bd3a-a37e-4b7b-ac0c-8d704f1cb57e.webp", "51a4d9e2-3d66-4bf0-a00f-98aa6df1b41c.webp", "54504a17-70e5-41e4-abc5-0f99dfe1aa60.webp", "56c931ea-a5c3-4d1e-98ee-eb3c3be45158.webp", "5b66a5da-f82c-4dc6-a578-0ff6d4fb037c.webp", "5baf5c41-b5f9-49ae-8352-0cc41a7d0fad.webp", "5c2e6bf1-ce53-4a36-aca9-c5da9b38ddde.webp", "5db3562a-b63b-4d9c-90e0-a398e8a4c427.webp", "5ec7a23b-bbe3-41c6-a089-0d896e345b35.webp", "692a9f9d-2d36-4994-967a-bd97a8e19d6c.webp", "6bd7817a-8df7-40be-9579-f1172f1e1559.webp", "6dea988c-b602-4384-978f-90367023ca05.webp", "7a8b544c-44fd-4701-ac7f-71b474d9e08c.webp", "7dce0f88-f0c3-4cce-a7d5-cc4c338718ea.webp", "7e4dc959-aaeb-4a62-8043-5da7881696e4.webp", "7ed76199-c0f9-4bb9-ade9-3ced82f18778.webp", "7eef846a-03cb-4229-8631-d3e939da51ed.webp", "7fa193d1-60af-4e13-8689-ebc860b734d8.webp", "8679978a-d54f-4738-a1b3-b7552b8ce958.webp", "8752f47b-f659-46aa-a9d3-6c3fe22d7cf6.webp", "8902d233-f966-499e-8b47-ae340ef833fc.webp", "8a6c3043-5867-42d3-b0b7-047b81a47ed4.webp", "8f78949f-5b9a-4c4a-bf1b-274ce811d1a0.webp", "94d6e4a4-ed21-49f0-831c-693da000359b.webp", "aaea0094-be9d-497b-9793-1e3dd947eaa8.webp", "af6a8a7b-e0f8-46b6-8e33-edd716ff86a8.webp", "af8a837d-7a89-4cf3-a478-ff98fe8bc5c6.webp", "b62a49d6-f2b7-4276-be79-b6c88ffbd601.webp", "b63fd919-3eb4-4f3f-a94d-6feb92fe6341.webp", "b6bdd51a-6602-40c5-8694-02e0e388082e.webp", "bad1616f-1e59-4629-b1fb-a07dc6664359.webp", "bb161955-b15a-49e5-b22c-62db4a3ba5d3.webp", "bf8008db-227f-4f19-9f74-b1ee56a6ba98.webp", "bfc5fe14-550b-4e6e-a7e0-285208da23ea.webp", "bfc5fe14-550b-4e6e-a7e0-285dsgsdgd.webp", "c10ed2e4-975f-4797-aedc-bcc4897d0be3.webp", "c8db8f03-0d15-4205-b5a2-81fb6c892415.webp", "c919b989-91d1-45b3-b091-5067bb9e7967.webp", "cac8be86-cdd8-4266-b3d5-daa862b1106f.webp", "cc20c0bc-a54a-4817-aabc-0b5c38282098.webp", "d05a7624-c18b-4f44-b791-c9236ef62c30.webp", "d05a7624-c18b-4f44-b791-c9236ef62dfg.webp", "d2052958-824d-4dbe-9177-8f10f3dd4086.webp", "d31924c6-4547-4486-930b-cf8f796b85ce.webp", "d44f7fe6-ab85-40b1-b680-a347c4cca32d.webp", "db2be5f1-465f-4f03-8370-c73b31b5fe7d.webp", "db2be5f1-465f-4f03-8370-c7ffasfaf.webp", "db2be5f1-465f-4f03-8370-cdsgdsfgsgf.webp", "db2be5f1-465f-4f03-8370-cfdgfsdhhj.webp", "dd2eaafd-936a-40c9-a235-0375e3a29154.webp", "e4691a62-7ac7-4a20-9549-b3b59c260488.webp", "e52079e0-adca-4600-a4cd-85340979effb.webp", "e96a26aa-cb35-4652-be0b-139b2aa8f430.webp", "e96a26aa-cb35-4652-be0b-139fsfsfdsf.webp", "e9b103a6-67d2-4dad-b53f-3a3efac58f88.webp", "f53df50e-03d9-4ca0-9f53-6fba4134bbc6.webp", "f606b666-c267-470d-930c-745cc1e95fc6.webp", "fa6b3b14-63d2-4e05-86cf-28e3c3e02ca7.webp", "faf4b4ba-bc42-4a05-9bd8-145df69a61f8.webp", "fbc963f0-7e09-4ab1-9036-d5db3fa9eb08.webp", "fd59aca4-9346-40b8-a483-8658349a5e4e.webp", "fd59aca4-9346-40b8-a483-86583dffdfgs.webp", "fd59aca4-9346-40b8-a483-865sdfsfs.webp", "fd59aca4-9346-40b8-a483-8sgdsgwre.webp"];
const images = rawNames.map((name) => ({ name, src: "/__crays-clubs/today-20260912/optimized/" + name }));
images.splice(48, 0, null);
images.splice(71, 0, null);
images.forEach((item, i) => { if (item) item.n = i + 1; });
const placeIds = new Set([1,16,20,41,42,53,59,75,81,82,90]);
const places = images.filter((x) => x && placeIds.has(x.n));
const people = images.filter((x) => x && !placeIds.has(x.n));

const forestCityBusiness = { name: "forest-city-financial-zone-coast", src: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-financial-zone-coast.png" };
const forestCityMarina = { name: "forest-city-marina-bright", src: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-marina-bright.png" };
const forestCityGolfHotel = { name: "forest-city-golf-hotel", src: "/__crays-clubs/phase9-owner/owner-golf-hotel.png" };
const forestCityGolfCourse = { name: "forest-city-golf-course", src: "/__crays-clubs/forest-city-v2552/golf/032-6f396e2a1347f0d1.jpg" };
const forestCityCoast = { name: "forest-city-coast", src: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-coast.webp" };

function Button({to,children,outline=false}){return <a className={`btn ${outline?"outline":""}`} href={to}>{children}<span>→</span></a>}
function Photo({item,alt="CRAYS community",place=false,priority=false}){const {text}=useTodayText();return <img src={item?.src} alt={text(alt)} loading={priority?"eager":"lazy"} decoding="async" fetchPriority={priority?"high":undefined} className={place?"place-photo":"people-photo"}/>}
function Icon({type="people"}){const paths={build:<><path d="M4 20V10m6 10V4m6 16v-7m4 7V7"/><path d="M2 20h20"/></>,home:<><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,people:<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 14c4 0 6 2 6 6"/></>,calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,network:<><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="m7 11 10-5M7 13l10 5"/></>,star:<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>,deal:<><path d="m3 12 5-5 4 4 4-4 5 5"/><path d="m5 14 4 4c1 1 2 1 3 0l7-7"/></>,globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9"/></>,heart:<><path d="M12 21S4 16 4 9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 7-6 12-6 12Z"/></>};return <svg className="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]||paths.people}</svg>}

function Header(){const [open,setOpen]=useState(false);const local=(e,path)=>{e.preventDefault();setOpen(false);go(path)};return <><header className="live-header"><a className="logo logo-image" href="/" onClick={e=>local(e,"/")}><img src="/crays-logo.svg" alt="crays"/></a><nav className="live-shortcuts" aria-label="Main menu shortcuts"><a href="/en/discover" onClick={e=>local(e,"/en/discover")}>Forest City</a><a href="https://www.craysclub.com/en/community-life">Community Life</a><a href="https://www.craysclub.com/en/school-jobs">School &amp; Jobs</a><a href="https://www.craysclub.com/en/ambassadors/isabel-maria-jeworski/apply">Ambassadors</a></nav><div className="head-actions"><a className="login" href="https://www.craysclub.com/en/account">Log in</a><a className="assoc" href="https://www.crays.org">A member of the Crays Association</a><button aria-expanded={open} onClick={()=>setOpen(!open)}>Menu <span>☰</span></button></div></header>{open&&<aside className="menu"><a href="/en/this-your-kinda-crowd" onClick={e=>local(e,"/en/this-your-kinda-crowd")}>This your kinda crowd?</a><a href="/en/discover" onClick={e=>local(e,"/en/discover")}>Forest City</a><a href="https://www.craysclub.com/en/become-a-member">Become a member</a></aside>}</>}
function Footer(){const groups=[["CRAYS Clubs",["About Us","/en/about-us"],["Experiences","/en/experiences"],["Lifestyle","/en/lifestyle"],["Community Life","/en/community-life"]],["Belong",["Become a member","/en/become-a-member"],["Ambassadors","/en/ambassadors"],["Families","/en/families"],["Teams","/en/teams"]],["Build",["Hospitality","/en/hospitality"],["Learn for Life","/en/school-jobs"],["Host Company","/en/host-company"],["Brand as a Service","/en/brand-as-a-service"]],["Connect",["Contact","/en/contact"],["Legal","/en/legal"],["Crays Association","https://www.crays.org/"],["Crays Franchise","https://www.crays.pro/"]]];const socials=[
  ["GitHub","https://github.com/CraysCircle","github.svg"],
  ["X","https://x.com/CraysCircle","x.svg"],
  ["Open Collective","https://opencollective.com/crays","opencollective.svg"],
  ["Reddit","https://www.reddit.com/r/Crays/","reddit.svg"],
  ["Telegram","https://t.me/craysclub","telegram.svg"],
  ["TikTok","https://www.tiktok.com/@thorbenbiesenbac1","tiktok.svg"],
  ["YouTube","https://www.youtube.com/@CraysCircle","youtube.svg"],
  ["LinkedIn","https://www.linkedin.com/company/crays/","linkedin.svg"],
  ["Instagram","https://www.instagram.com/crays_circle/","instagram.svg"],
  ["Nostr / Crays Network","https://www.crays.net","nostr.webp"],
  ["Discord","https://discord.gg/dpYZk8xAvR","discord.svg"]
];return <footer id="site-footer"><div className="footer-lead"><small>Claim your global home</small><h2>Meet friends, collaborators,<br/>and business partners<br/>across the Crays Club world.</h2><Button to="https://www.craysclub.com/en/become-a-member">Become a member</Button></div><div className="footer-grid"><div><img className="footer-logo" src="/crays-logo.svg" alt="crays"/><p>An invitation-led community for<br/>people building international lives,<br/>companies and creative work.</p></div>{groups.map(g=><div key={g[0]}><b>{g[0]}</b>{g.slice(1).map(([label,href])=><a href={href.startsWith("http")?href:`https://www.craysclub.com${href}`} key={label}>{label}</a>)}</div>)}</div><div className="footer-network"><a href="https://www.crays.org">Crays AG ↗</a><span>The Crays operating layer.</span></div><div className="footer-bottom"><span>© 2026 CRAYS. All rights reserved.</span><div className="socials" aria-label="CRAYS social channels">{socials.map(([label,href,icon])=><a href={href} key={label} aria-label={label} target="_blank" rel="noreferrer"><img src={`https://www.craysclub.com/__crays-clubs/assets/footer-icons/${icon}`} alt=""/></a>)}</div><span className="legal-links"><a href="https://www.craysclub.com/en/legal/privacy-policy">Privacy</a><a href="https://www.craysclub.com/en/legal/terms-and-conditions">Terms</a><a href="https://www.craysclub.com/en/legal/data-protection">Data protection</a><a href="https://www.craysclub.com/en/legal/imprint">Imprint</a></span></div></footer>}

const liveAsset=path=>`https://www.craysclub.com${path}`;
const homeTiles=[
 ["/ __crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-city-aerial.webp","/__crays-clubs/phase9-owner/forest-city-v16/forest-city-domus.webp"],
 ["/__crays-clubs/phase9-owner/owner-forest-city-campus.png","/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-skyline.webp"],
 ["/__crays-clubs/phase9-owner/forest-city-v16/forest-city-marina-pool.webp","/__crays-clubs/phase9-owner/hero-stock/hero-tile-06.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-07.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-08.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-09.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-10.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-11.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-12.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-13.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-14.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-15.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-16.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock-owner-v1/tile9-right-second.avif","/__crays-clubs/phase9-owner/hero-stock/hero-tile-18.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-19.jpg","/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-coast.webp"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-21.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-22.jpg"],
 ["/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-boats.webp","/__crays-clubs/phase9-owner/forest-city-v16/forest-city-night.webp"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-25.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-26.jpg"],
 ["/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-boardwalk.webp","/__crays-clubs/phase9-owner/hero-stock/hero-tile-28.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-29.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-30.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-23.jpg","/__crays-clubs/phase9-owner/forest-city-v16/forest-city-tropical-walkway.webp"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-33.jpg","/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-marina.webp"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-35.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-36.jpg"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-37.jpg","/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-waterfront.webp"],
 ["/__crays-clubs/phase9-owner/hero-stock/hero-tile-39.jpg","/__crays-clubs/phase9-owner/hero-stock/hero-tile-40.jpg"]
].map(pair=>pair.map(path=>liveAsset(path.replace("/ ","/"))));
function Home(){const [flipped,setFlipped]=useState(new Set([1,5,6,7,8,11]));const toggle=i=>setFlipped(old=>{const next=new Set(old);next.has(i)?next.delete(i):next.add(i);return next});return <main className="home"><div className="mosaic">{homeTiles.map((pair,i)=><button className={`home-tile tile-${i+1} ${flipped.has(i)?"flipped":""}`} onClick={()=>toggle(i)} aria-label={`Community image ${i+1}. Flip image`} aria-pressed={flipped.has(i)} key={pair[0]}><span className="tile-flip"><img src={pair[0]} alt="CRAYS community"/><img src={pair[1]} alt="" aria-hidden="true"/></span></button>)}</div><div className="home-copy"><small>Private Members Club</small><h1>A New Era of<br/>Work, Live, and Play</h1><p>Work, live, play, and build your next chapter<br/>with us in an invitation-led community by the sea.</p><Button to="/en/discover">Discover Forest City</Button><a className="btn outline" href="https://www.craysclub.com/en/become-a-member">Have an invitation?</a></div></main>}

const moves=[["build","Build here","Ideas to impact. Faster together."],["home","Live here","A healthier, richer way of life."],["people","Bring your team","Talent, space and support to scale."],["calendar","Host your community","Unforgettable events and experiences."],["network","Invest & connect","People, deals and what’s next."],["star","Create culture","A more inspired world, together."]];
export function TodayCrowd(){const {text}=useTodayText();const [tab,setTab]=useState("People");const [filter,setFilter]=useState("All");const [selected,setSelected]=useState(null);const [activeMove,setActiveMove]=useState(0);const tabs=["People","Spaces","Programs","Services","Network"];const tabIcons={People:"people",Spaces:"home",Programs:"calendar",Services:"deal",Network:"network"};const tabImages=[12,59,44,34,51];const platformContent={
  People:{eyebrow:"A high-trust circle",title:"The right people change everything.",body:"Meet founders, builders, creators, operators and investors who understand the reality of building. Relationships form through shared time, honest conversations and mutual contribution — never pitch-first networking.",points:["Curated membership","Meaningful introductions","Global and local belonging"],cta:"Explore people"},
  Spaces:{eyebrow:"A real-world home base",title:"Build beside people who get it.",body:"Work, meet, think and reset in spaces designed to feel lived-in rather than corporate. From a focused week to a permanent base, CRAYS turns the club into part of your everyday rhythm.",points:["Work and meeting spaces","Homes and longer stays","Clubhouses across five hubs"],cta:"Explore spaces"},
  Programs:{eyebrow:"Shared experiences",title:"Learn, create and grow together.",body:"Join talks, workshops, founder sessions, cultural moments, training and curated adventures. Choose what fits your interests and energy; belonging is built through quality of participation, not constant attendance.",points:["Founder and expert sessions","Residencies and team sprints","Culture, sport and travel"],cta:"Explore programs"},
  Services:{eyebrow:"Practical support",title:"Move through the world with fewer barriers.",body:"Vetted specialists support relocation, residency, real estate, banking, legal, health, family life and event production. One trusted network helps turn an international plan into daily reality.",points:["Relocation and residency","Company and family support","Events and local access"],cta:"Explore services"},
  Network:{eyebrow:"A private coordination layer",title:"Find the signal. Reach the right person.",body:"Use a trusted member network for introductions, opportunities, recruiting, partnerships and deal flow. Digital coordination connects the community; physical hubs turn those connections into durable relationships.",points:["Member directory and introductions","Opportunities and deal flow","Cross-hub reach"],cta:"Explore network"}
};const usedPeople=new Set([5,7,12,14,17,26,28,30,33,34,37,44,45,46,50,51,63,65,70,79,84,86,87,89]);const categories={Events:new Set([3,4,6,7,11,14,18,19,21,23,25,27,32,34,35,36,38,39,44,45,46,47,48,50,55,57,58,60,61,62,63,69,71,72,73,77,78,80,83,84,85,88]),Work:new Set([9,12,13,17,30,31,33,37,43,51,70,74,76,89]),Life:new Set([2,5,8,22,28,29,52,65,79,86]),Sports:new Set([10,24,40,54,56,64,67,68,87])};const galleryPeople=people.filter(x=>!usedPeople.has(x.n));const categoryFor=n=>Object.entries(categories).find(([,ids])=>ids.has(n))?.[0]||"Community";const shown=useMemo(()=>filter==="All"?galleryPeople:galleryPeople.filter(x=>categoryFor(x.n)===filter),[filter]);return <TodayLocalizedContent><main id="clubs-home-content" className="today-approved crowd">
  <section className="crowd-hero"><Photo item={images[32]} alt="CRAYS community atmosphere"/><div className="headline"><small>The platform for what’s next</small><h1>This your{" "}<br/>kinda <em>crowd?</em></h1><p>A global community, real opportunities, and the place to build a bigger tomorrow — together.</p></div><div className="scribble">Choose<br/>your move ↘</div><div className="scribble scribble-right">Same people.<br/>A bigger tomorrow.</div><h2 className="today-sr-only">Choose your format</h2><div className="move-grid">{moves.map((m,i)=><article className={activeMove===i?"active":""} key={m[1]} onMouseEnter={()=>setActiveMove(i)}><Photo item={images[[26,5,28,63,50,79][i]-1]}/><div><span className="move-icon"><Icon type={m[0]}/></span><h3>{m[1]}</h3><p>{m[2]}</p></div></article>)}</div></section>
  <section className="light value-section" id="story">
   <div className="value-heading"><div><small>The CRAYS value equation</small><h2 className="sentence-heading">{text("You bring your X. CRAYS adds the platform.").split(/(?<=\.)\s+/).map((line,i)=><span key={i}>{line}{" "}</span>)}</h2></div><p>Six building blocks. One clear path from ambition to opportunity.</p></div>
   <div className="equation value-equation">
    <article className="value-card you"><Photo item={images[36]} alt="CRAYS member"/><div className="value-card-copy"><span>You bring</span><h3>Your X</h3><p>Ideas · Talents · Teams · Capital · Passion · Purpose</p></div></article>
    {[["People","Curated global members",84,false],["Place","Extraordinary locations",16,true],["Programs","Events, residencies and learning",7,false],["Services","From travel to relocation",14,false],["Network","Introductions, deal flow and opportunities",45,false]].map(x=><article className="value-card add-card" key={x[0]}><Photo item={images[x[2]-1]} place={x[3]} alt={x[0]}/><div className="value-card-copy"><span><img src="/assets/crays-logo.svg" alt="CRAYS"/> adds</span><h3>{x[0]}</h3><p>{x[1]}</p></div></article>)}
    <article className="value-outcome"><span className="value-equals">=</span><div><span>What’s next</span><h3>Bigger opportunities. A richer life. A more open world.</h3></div></article>
   </div>
  </section>
  <section id="platform"><small>Explore the CRAYS platform</small><div className="title"><h2>A complete ecosystem for ambitious people.</h2><a href="#platform">Explore all capabilities →</a></div><div className="tabs" role="group" aria-label="Explore the CRAYS platform">{tabs.map(x=><button aria-pressed={tab===x} className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}><Icon type={tabIcons[x]}/>{x}</button>)}</div><div className="feature" data-platform-tab={tab} key={tab}><Photo item={images[tabImages[tabs.indexOf(tab)]-1]} place={tab==="Spaces"}/><div className="feature-copy"><small>{platformContent[tab].eyebrow}</small><h2>{platformContent[tab].title}</h2><p>{platformContent[tab].body}</p><Button to="#gallery">{platformContent[tab].cta}</Button></div><div className="feature-points">{platformContent[tab].points.map((point,i)=><div key={point}><span>0{i+1}</span><b>{point}</b></div>)}</div></div></section>
  <section className="dark opps-section" id="opportunities"><Photo item={images[41]} place/><div className="title"><div><small>Real opportunities. Real outcomes.</small><h2>Turn your ambitions into momentum.</h2></div><Button to="#formats">Explore opportunities</Button></div><div className="opps">{[["deal","Partnerships","Strategic collaborations"],["build","Deal flow","Curated opportunities"],["people","Recruiting","Top talent, global reach"],["globe","Market entry","Asia and beyond"],["network","Community reach","A larger, lasting impact"]].map(x=><article key={x[1]}><Icon type={x[0]}/><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></section>
  <section id="formats"><small>Choose your format</small><div className="title"><h2>Different times. Same bigger possibilities.</h2><div className="format-help"><span>Not sure? We’ll help you find the right fit.</span><a href="https://www.craysclub.com/en/contact">Chat with our team →</a></div></div><div className="formats">{[
    ["Event","From meetups to conferences",46,false,"https://www.craysclub.com/en/experiences"],
    ["1-week sprint","Focus. Build. Make progress.",30,false,"https://www.craysclub.com/en/contact"],
    ["1-month residency","Live, work and grow together.",70,false,"https://www.craysclub.com/en/contact"],
    ["Permanent base","Make CRAYS home.",75,true,"/en/discover"]
  ].map(x=><a className="format-card" href={x[4]} key={x[0]}><Photo item={images[x[2]-1]} place={x[3]}/><h3>{x[0]} <span>→</span></h3><p>{x[1]}</p></a>)}</div></section>
  <section className="wellbeing" id="wellbeing"><Photo item={images[86]}/><div><small>Health & family as foundation</small><h2>{text("A longer, brighter tomorrow — together.").split(" — ").map((part,i)=><span key={i} className={i?"together-phrase":undefined}>{i?" — ":""}{part}</span>)}</h2><p>World-class fitness, wellness and longevity. Family support. A balanced life that fuels your biggest work.</p><a href="#gallery">Explore wellbeing →</a></div><Photo item={images[85]}/><div className="wellbeing-list">{[["heart","Fitness & Longevity"],["people","Family Support"],["heart","Healthcare Access"],["people","Community & Belonging"]].map(x=><span key={x[1]}><Icon type={x[0]}/>{x[1]}</span>)}</div></section>
  <section id="gallery"><small>Our world in photos</small><div className="title"><h2 className="sentence-heading">{text("Real people. Real moments. A global community.").split(/(?<=\.)\s+/).map((line,i)=><span key={i}>{line}{" "}</span>)}</h2><div className="filters">{["All","Events","Work","Life","Sports","Community"].map(x=><button aria-pressed={filter===x} className={filter===x?"active":""} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div></div><div className="wall">{shown.map(x=><button className="photo-button" onClick={()=>setSelected(x)} key={x.name}><Photo item={x}/><span>View</span></button>)}</div></section>
  <section className="locations" id="hubs"><small>The 5 hubs</small><div className="title"><h2 className="sentence-heading">{text("A home today. Five places to build what’s next.").split(/(?<=\.)\s+/).map((line,i)=><span key={i}>{line}{" "}</span>)}</h2><a href="/en/discover">Explore locations →</a></div><div className="location-row five-hubs">{[["Forest City, Malaysia",places[2]?.src],["Medellín, Colombia",medellinImage],["Saïdia, Morocco",saidiaImage],["Próspera, Roatán, Honduras",prosperaImage],["KAEC, Saudi Arabia",kaecImage]].map(([label,src])=><a href="/en/discover" key={label}><img src={src} alt={label} className="place-photo" loading="lazy"/><b>{label}</b><span>Explore the hub</span></a>)}<article className="more-hubs"><Icon type="globe"/><b>More hubs</b><span>To be announced</span></article></div></section>
  <section className="fit" id="fit-check"><div className="fit-shell"><div className="fit-left"><Photo item={images[88]}/><div><small>Fit check</small><h2>Is CRAYS right for you?</h2><p>Do you value community over competition?</p><p>Are you building, creating or looking for what’s next?</p><p>Do you want to live a healthier, more connected life?</p><p>Are you ready to contribute and grow with others?</p></div></div><div className="fit-action"><small>Take the next step</small><h2>Join a global community built for what’s next.</h2><p>Apply to become a member and get access to people, places and opportunities around the world.</p><Button to="https://www.craysclub.com/en/become-a-member">Apply now</Button><span className="fit-note">Same energy.<br/>Bigger tomorrow.</span></div></div></section>
  {selected&&<PhotoDialog item={selected} onClose={()=>setSelected(null)}/>}
 </main></TodayLocalizedContent>}

export function TodayForest(){
 const {text}=useTodayText();
 const [slide,setSlide]=useState(0);
 const [hostMode,setHostMode]=useState(0);
 const [galleryFilter,setGalleryFilter]=useState("All");
 const [allPhotosOpen,setAllPhotosOpen]=useState(false);
 const [galleryOffset,setGalleryOffset]=useState(0);
 const [coastOffset,setCoastOffset]=useState(0);
 const [selected,setSelected]=useState(null);
 const labels=["Arrive","Live","Work","Gather","Unwind"];
 const introCards=[
  ["home","A home in Asia","A welcoming international community in a unique coastal setting.",images[0]],
  ["build","Space to build","Workplaces, programs and connections to turn ideas into impact.",images[35]],
  ["people","Life around you","Nature, leisure and a vibrant community bring balance to every day.",images[57]]
 ];
 const campusMedia=[[images[58],images[19],images[46]],[images[3],images[4],images[5]],[images[6],images[8],images[9]],[images[10],images[13],images[14]],[images[22],images[23],images[24]]];
 const hostTabs=[["calendar","Event"],["people","Team sprint"],["people","Community residency"],["home","Company base"]];
 const hostCopy=[
  ["Events that create real momentum.","Conferences, workshops, product launches and more - in an inspiring setting by the sea."],
  ["Focused weeks for ambitious teams.","Bring your team together to align, build and make meaningful progress."],
  ["Live, work and grow together.","A shared chapter with the people, spaces and support to move forward."],
  ["A base for what comes next.","Give your company an international home with room for people and ideas."]
 ];
 const galleryLead = [images[2],images[15],images[7],images[83]];
 const galleryCategory = item => [41,75,81,82,90].includes(item.n) ? "Landscape" : [1,16,20,42,53].includes(item.n) ? "Architecture" : [59].includes(item.n) ? "Interiors" : "Community";
 const galleryItems = [...galleryLead,...images.filter(item=>item&&!galleryLead.some(lead=>lead.name===item.name))].map(item=>[item,placeIds.has(item.n),galleryCategory(item)]);
 const filteredGallery = galleryFilter === "All" ? galleryItems : galleryItems.filter(([, ,category])=>category===galleryFilter);
 const visibleGallery = Array.from({length:Math.min(4,filteredGallery.length)},(_,i)=>filteredGallery[(i+galleryOffset)%filteredGallery.length]);
 return <TodayLocalizedContent><main id="clubs-discover-content" className="today-approved forest">
  <section className="forest-hero">
   <Photo item={images[52]} priority place alt="CRAYS Forest City architectural vision"/>
   <div className="forest-hero-copy"><small>CRAYS Clubs &middot; Forest City</small><h1>Forest City{" "}<br/>Your next chapter,{" "}<br/><em>in one place.</em></h1><p>Live, work, create and connect by the sea.</p><div className="forest-hero-actions"><Button to="https://www.craysclub.com/en/become-a-member">Apply</Button><a className="btn outline" href="/en/this-your-kinda-crowd">This your kinda crowd?</a></div></div>
   <i>A more open<br/>world, together.<span/></i><span className="hero-vision">CRAYS architectural vision</span>
  </section>

  <section className="forest-intro">
   <div className="title"><div><small>The network has a real address</small><h2>More than a destination.<br/>A launchpad for what&rsquo;s next.</h2></div><p>In Forest City, a global community comes together in an extraordinary setting - where opportunity, people and lifestyle create a brighter tomorrow.</p></div>
   <div className="intro">{introCards.map(([icon,title,copy,item])=><article key={title}><Photo item={item} place={icon==="home"} alt={title}/><div className="intro-copy"><Icon type={icon}/><div><h3>{title}</h3><p>{copy}</p></div></div></article>)}</div>
  </section>

  <section className="dark campus-section">
   <div className="title"><div><small>Explore the campus</small><h2>One destination.<br/>Many ways to belong.</h2></div><p>From world-class amenities to inspiring spaces, discover a campus designed for work, life and everything in between.</p></div>
   <div className="campus">
    <div className="campus-main" id="campus-view"><Photo item={campusMedia[slide][0]} place={slide===0} alt={labels[slide]}/><div className="campus-caption"><span>0{slide+1} / 05</span><b>{labels[slide]} in style</b><small>A warm welcome to a global community.</small></div><div className="campus-arrows"><button aria-label="Previous campus view" onClick={()=>setSlide((slide+4)%5)}>&larr;</button><button aria-label="Next campus view" onClick={()=>setSlide((slide+1)%5)}>&rarr;</button></div></div>
    <div className="campus-side"><figure><Photo item={campusMedia[slide][1]} place={slide===0} alt={labels[slide]+" spaces"}/><figcaption>Spaces to live well</figcaption></figure><figure><Photo item={campusMedia[slide][2]} place={false} alt={labels[slide]+" facilities"}/><figcaption>Facilities that energise</figcaption></figure></div>
    <div className="vertical" aria-label="Explore the campus">{labels.map((label,i)=><button aria-pressed={slide===i} aria-controls="campus-view" className={slide===i?"active":""} onClick={()=>setSlide(i)} key={label}>{label}</button>)}</div>
   </div>
  </section>

  <section className="stay-section" id="stay">
   <div className="title"><div><small>Stay</small><h2 className="stay-headline">{text("A few days. A focused month. Your next base.").split(/(?<=\.)\s+/).map((line,i)=><span key={i}>{line}{" "}</span>)}</h2></div><p>Choose the setting that suits your style.</p></div>
   <div className="stay">{[["The Marina","Membership access and monthly stays at Forest City Marina Hotel on Pulau Satu.",forestCityMarina,"https://www.craysclub.com/en/hospitality/marina-hotel"],["The Golf","Public night, week and month stays beside two 18-hole courses, a driving range and academy.",forestCityGolfHotel,"https://www.craysclub.com/en/hospitality/golf-hotel"]].map(([title,copy,item,href])=><article key={title}><Photo item={item} place alt={title}/><div><h3>{title}</h3><p>{copy}</p><a className="stay-text-link" href={href}>{text(`Discover ${title}`)} <span>&rarr;</span></a><a className="round-link" href={href} aria-label={title}>&rarr;</a></div></article>)}</div><div className="stay-support">{[["01","Local Crays support","Help with arrival, handover and stay questions."],["02","Availability first","Every request is checked before payment."],["03","Clear hotel details","Access, stay lengths and facilities in one place."],["04","Saved stay flow","Wish list, request and account stay connected."]].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
  </section>

  <section className="work">
   <div className="work-copy"><small>Give your ideas room to happen</small><h2>Work, learn and create together.</h2><p>Flexible workspaces, expert-led programs and a global community help you go further, faster.</p><Button to="#host">Explore workspaces</Button></div>
   <figure><Photo item={images[34]} alt="Talk at CRAYS"/><figcaption>Talks that inspire</figcaption></figure><figure><Photo item={images[12]} alt="CRAYS workspace"/><figcaption>Studios for what&rsquo;s next</figcaption></figure>
  </section>

  <section className="destination-programmes"><div className="title"><div><small>Beyond the stay</small><h2>Make Forest City the setting for what comes next.</h2></div><p>From golf-led escapes to international business gatherings, CRAYS shapes each request with relevant local venues and operators.</p></div><div className="programme-grid"><article><Photo item={forestCityGolfCourse} place alt="Forest City golf resort"/><div><small>Golf tourism</small><h3>Build a complete Forest City golf journey.</h3><p>Two 18-hole courses, a driving range, academy, resort hospitality and dining create one coastal base for hosted groups, coaching and corporate golf days.</p><a href="https://www.craysclub.com/en/contact">Request a golf programme &rarr;</a></div></article><article><Photo item={images[43]} alt="CRAYS conference"/><div><small>MICE &amp; events</small><h3>Bring your next gathering to the coast.</h3><p>Meetings, incentives, conferences and exhibitions come together with accommodation, function spaces, catering and regional access near Singapore.</p><a href="https://www.craysclub.com/en/contact">Plan an event &rarr;</a></div></article></div></section>
  <section className="financial-zone" id="financial-zone">
   <div className="financial-visual"><Photo item={forestCityBusiness} place alt="Forest City business district and coastline"/><span className="financial-badge"><Icon type="globe"/> Forest City Special Financial Zone</span></div>
   <div className="financial-copy"><small>Build from Forest City</small><h2>Give the company behind your idea a strategic home.</h2><p>Forest City&rsquo;s Special Financial Zone is designed for high-value business activities, global services, selected relocation projects and financial services. Qualifying projects can apply for targeted incentives, including a 5% corporate tax rate for eligible Global Services Hub and defined relocation activities.</p>
    <div className="financial-points"><article><Icon type="build"/><div><h3>Shape the right structure</h3><p>CRAYS helps founders and teams turn projects born in the community into a clear company and location brief.</p></div></article><article><Icon type="network"/><div><h3>Connect to the official pathway</h3><p>We coordinate relevant local specialists and the route to MIDA and IMFC-J for eligibility and location confirmation.</p></div></article><article><Icon type="home"/><div><h3>Build a working base</h3><p>Combine company formation planning with workspace, stays, talent and a community around the business.</p></div></article></div>
    <div className="financial-actions"><Button to="https://www.craysclub.com/en/contact">Explore a Forest City company base</Button><a className="financial-source" href="https://www.mida.gov.my/forms-and-guidelines/fcsfz-tax-incentive-package/" target="_blank" rel="noreferrer">Official MIDA guidance ↗</a></div>
    <p className="financial-note">Incentives are subject to qualifying activities, official approval and ongoing compliance. CRAYS does not provide tax or legal advice.</p>
   </div>
  </section>

  <section className="dark host-section" id="host">
   <div className="title"><div><small>Bring the people you&rsquo;re building with</small><h2 className="host-headline">{text("Host, collaborate, and grow - together.").split(/(?<=Host, collaborate,) /).map((line,i)=><span key={i}>{line}{" "}</span>)}</h2></div><p>From focused sprints to global gatherings, CRAYS provides the spaces, support and community to make it happen.</p></div>
   <div className="tabs host-tabs">{hostTabs.map(([icon,label],i)=><button aria-pressed={hostMode===i} aria-controls="host-view" className={hostMode===i?"active":""} onClick={()=>setHostMode(i)} key={label}><Icon type={icon}/>{label}</button>)}</div>
   <div className="host-feature" id="host-view" data-host-mode={hostMode}><Photo item={images[[18,47,11,42][hostMode]]} alt={hostTabs[hostMode][1]}/><div><h2>{hostCopy[hostMode][0]}</h2><p>{hostCopy[hostMode][1]}</p><Button to="https://www.craysclub.com/en/contact">Plan a group stay</Button><i>Bigger people.<br/>Brighter possibilities.<span/></i></div></div>
  </section>

  <section className="wellbeing forest-wellbeing">
   <div><small>A better rhythm, every day</small><h2>Wellbeing that works for real life.</h2><p>Stay active, recharge and enjoy a balanced lifestyle with world-class fitness, healthy dining and a community that keeps you moving.</p></div>
   {[39,21,33,56].map((index,i)=><figure key={index}><Photo item={images[index]} alt={["Fitness","Yoga","Healthy dining","Community wellbeing"][i]}/></figure>)}
  </section>

  <section className="coast-section">
   <div className="coast-top"><div><small>Your everyday, with a different horizon</small><h2>Work, live and explore by the sea.</h2><p>A one-of-a-kind coastal setting with beaches, green spaces and a vibrant international community.</p><a className="section-link" href="#forest-gallery">Discover the surroundings <span>&rarr;</span></a></div><figure><Photo item={images[40]} place alt="Forest City coast"/></figure></div>
   <div className="coast-strip">{[["Coastline",forestCityCoast,true],["Green escapes",images[89],true],["A vibrant community",images[27],false]].map((_,i,list)=>list[(i+coastOffset)%list.length]).map(([label,item,place])=><figure key={label}><Photo item={item} place={place} alt={label}/><figcaption>{label}</figcaption></figure>)}<button className="coast-prev" aria-label="Previous surrounding" onClick={()=>setCoastOffset((n)=>(n+2)%3)}>&larr;</button><button className="coast-next" aria-label="Next surrounding" onClick={()=>setCoastOffset((n)=>(n+1)%3)}>&rarr;</button></div>
  </section>

  <section className="destination-facts"><div><small>Forest City, Johor</small><h2>A coastal base for stays, golf and regional access.</h2><p>Forest City sits in Iskandar Puteri near the Malaysia-Singapore Second Link. Pulau Satu is the central developed island within the four-island masterplan.</p></div><div className="fact-grid"><article><Icon type="home"/><h3>Stay</h3><p>Marina Hotel and Golf Hotel anchor the current CRAYS property discovery.</p></article><article><Icon type="globe"/><h3>Golf &amp; recreation</h3><p>Two 18-hole courses, pools, gyms, dining and event spaces.</p></article><article><Icon type="network"/><h3>Regional access</h3><p>Road access to Sultan Abu Bakar CIQ and the Second Link to Singapore.</p></article><article><Icon type="build"/><h3>Special Financial Zone</h3><p>Targeted incentives may apply to approved projects, subject to official eligibility and annual compliance.</p></article></div></section>
  <section className="dark forest-gallery-section" id="forest-gallery">
   <div className="title"><div><small>Explore Forest City</small><h2>See Forest City from every angle.</h2></div><a href="#forest-gallery" onClick={e=>{e.preventDefault();setAllPhotosOpen(true);}}>View all photographs &rarr;</a></div>
   <div className="forest-filter-row">{["All","Landscape","Architecture","Interiors","Community"].map(label=><button aria-pressed={galleryFilter===label} className={galleryFilter===label?"active":""} onClick={()=>{setGalleryFilter(label);setGalleryOffset(0);}} key={label}>{label}</button>)}</div>
   <div className="place-wall">{visibleGallery.map(([item,place])=><button className="photo-button" onClick={()=>setSelected(item)} key={item.name}><Photo item={item} place={place}/><span>&rarr;</span></button>)}<button className="gallery-prev" aria-label="Previous photographs" disabled={filteredGallery.length<=4} onClick={()=>setGalleryOffset((n)=>(n+filteredGallery.length-1)%filteredGallery.length)}>&larr;</button><button className="gallery-next" aria-label="Next photographs" disabled={filteredGallery.length<=4} onClick={()=>setGalleryOffset((n)=>(n+1)%filteredGallery.length)}>&rarr;</button><span className="gallery-count">{String(galleryOffset+1).padStart(2,"0")} / {filteredGallery.length}</span><span className="gallery-location">Johor as your base. Singapore within reach.</span></div>
  </section>

  <section className="faq">
   <div className="title"><div><small>Frequently asked questions</small><h2>Quick answers to get you started.</h2></div><p>Still have questions? <a href="https://www.craysclub.com/en/contact">Contact our team &rarr;</a></p></div>
   <div className="faq-grid">{[["What is CRAYS Forest City?","A coastal CRAYS base in Iskandar Puteri, Johor, combining stays, work, community, golf and event access."],["Who can apply?","Members, prospective members, teams and event organisers can share their plans. Membership and property availability are checked separately."],["What types of stays are available?","Marina monthly member stays and public night, week or month stays at the Golf Hotel are presented before availability is confirmed."],["How do I get there?","Forest City is near the Malaysia-Singapore Second Link with road access via Sultan Abu Bakar CIQ. Transport should be confirmed before travel."]].map(([question,answer],i)=><details key={question}><summary><span>{i+1}</span>{question}<b>&#8964;</b></summary><p>{answer}</p></details>)}</div>
  </section>

  <section className="closing forest-closing">
   <div><h2>Make room for<br/>your next chapter.</h2><p>A global community. A brighter tomorrow.</p><div><Button to="https://www.craysclub.com/en/become-a-member">Apply</Button><a className="btn outline" href="https://www.craysclub.com/en/contact">Plan a group stay</a></div></div>
   <Photo item={images[77]} alt="CRAYS community"/>
   <a href="/en/this-your-kinda-crowd"><b>This your<br/>kinda crowd?</b><span>Meet the people &rarr;</span></a>
  </section>
  {allPhotosOpen&&<PhotoCollection items={galleryItems.map(([item])=>item)} onClose={()=>setAllPhotosOpen(false)}/>}
  {selected&&<PhotoDialog item={selected} onClose={()=>setSelected(null)}/>}
 </main></TodayLocalizedContent>
}

function PhotoCollection({items,onClose}) {
 const ref=useRef(null);const {text}=useTodayText();const [active,setActive]=useState(null);
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement;dialog.showModal();return()=>{dialog.close();previous?.focus?.();};},[]);
 return <dialog ref={ref} className="today-photo-dialog today-photo-collection" aria-label={text("View all photographs →")} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
 <button autoFocus onClick={onClose}>{text("Close")}</button>
 {active?<><button className="collection-back" onClick={()=>setActive(null)}>{text("All")}</button><img src={active.src} alt={text("CRAYS community")}/></>:<div className="collection-grid">{items.map(item=><button key={item.name} onClick={()=>setActive(item)} aria-label={text("Photo preview")}><img src={item.src} alt={text("CRAYS community")} loading="lazy"/></button>)}</div>}
 </dialog>;
}

function PhotoDialog({item,onClose}) {
 const ref=useRef(null); const {text}=useTodayText();
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement;dialog.showModal();return()=>{dialog.close();previous?.focus?.();};},[]);
 return <dialog ref={ref} className="today-photo-dialog" aria-label={text("Photo preview")} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button autoFocus onClick={onClose}>{text("Close")}</button><img src={item.src} alt={text("CRAYS community")}/></dialog>;
}

export function App(){const [path,setPath]=useState(location.pathname);useEffect(()=>{const fn=()=>setPath(location.pathname);addEventListener("popstate",fn);return()=>removeEventListener("popstate",fn)},[]);return <><Header/>{path.includes("forest-city")?<Forest/>:path.includes("this-your-kinda-crowd")?<Crowd/>:<Home/>}<Footer/></>}

