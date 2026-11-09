import {TodayLocalizedContent} from "./today-localized-content";
import Image from "next/image";
import {BriefcaseBusiness,CalendarDays,Dumbbell,Flag,HeartHandshake,HeartPulse,MapPin,Mic2,Presentation,Sparkles,Users,Wifi} from "lucide-react";
import styles from "./crays-club-experience.module.css";

// Original approved homepage imagery and icons, reused for both hotel listings.
export const CRAYS_CLUB_EXPERIENCES = [
  { icon: CalendarDays, title: "Network & Community", image: "/__crays-clubs/phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp?auto=format&fit=crop&w=900&q=84" },
  { icon: Wifi, title: "24/7 Coworking", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-coworking.jpg" },
  { icon: Flag, title: "Golf", image: "/__crays-clubs/search-v2695/01-forest-city-golf-tourism.png" },
  { icon: Dumbbell, title: "Gym & Fitness", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-gym.jpg" },
  { icon: HeartHandshake, title: "Healthy Meals", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-healthy-meals.jpg" },
  { icon: MapPin, title: "Social Living", image: "/__crays-clubs/forest-city-v2552/marina/010-8e9f49db19e3ce85.jpg" },
  { icon: Sparkles, title: "Content Studio", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-content-studio.jpg" },
  { icon: Wifi, title: "AI, Nostr, Bitcoin & Tech", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-wifi.jpg" },
  { icon: Users, title: "Workshops", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-workshops.jpg" },
  { icon: Presentation, title: "Conference & Event", image: "/__crays-clubs/phase9-owner/homepage-v38/community-conference-event-v2.png" },
  { icon: HeartPulse, title: "Mindset & Longevity", image: "/__crays-clubs/phase9-owner/homepage-v38/community-longevity-v1.png" },
  { icon: Mic2, title: "Guest Speakers", image: "/__crays-clubs/phase9-owner/homepage-v38/community-guest-speakers-v2.png" },
  { icon: Dumbbell, title: "Sport & Health", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-fitness-classes.jpg" },
  { icon: BriefcaseBusiness, title: "Job & Learning", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-tech-tutorials.jpg" },
] as const;
const displayOrder=[0,1,2,3,4,9,6,7,8,5,10,11,12,13] as const;

export function CraysClubExperience(){
 return <TodayLocalizedContent><div className={styles.experience} data-crays-club-experience>
  <h3>Work. Live. Play. With Crays.</h3>
  <p>Crays is an invitation-led private members club for entrepreneurs, founders, creators and remote professionals. Meet people to build with, share everyday life and grow your network beyond your stay.</p>
  <p>Within the hotel, Crays brings the community together through shared workspaces, workshops, events, healthy routines and social experiences. Find collaborators, learn new skills, recharge and make connections that continue into your next chapter.</p>
  <p className={styles.packageCopy}><strong>Your package includes your room and Crays services.</strong> Services are provided for each person. When two people share a room, the price also covers the Crays services for both guests.</p>
  <ul className={styles.grid} aria-label="Crays Club services and programme">
   {displayOrder.map(index=>{const item=CRAYS_CLUB_EXPERIENCES[index];const Icon=item.icon;return <li className={styles.tile} data-wide={item.title==="Social Living"?"true":undefined} key={item.title}>
    <Image src={item.image} alt="" fill unoptimized sizes="(max-width: 560px) 90vw, (max-width: 820px) 45vw, 310px"/>
    <span className={styles.shade} aria-hidden="true"/>
    <span className={styles.title}><Icon size={20} strokeWidth={1.8} aria-hidden="true"/>{item.title}</span>
   </li>;})}
  </ul>
  <p className={styles.offerNote}>Your offer details the programme and services included for your stay.</p>
 </div></TodayLocalizedContent>;
}

export function CraysPackageNote(){
 return <TodayLocalizedContent><p className={styles.bookingNote}><strong>Room + Crays services</strong><span>Your package brings your room, community and Crays programme together. Services are priced per person, including when two guests share one room.</span><a href="#overview">Explore the Crays experience</a></p></TodayLocalizedContent>;
}
