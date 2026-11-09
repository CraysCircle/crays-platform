import {Globe,InstagramLogo,TiktokLogo,YoutubeLogo,XLogo,SnapchatLogo,FacebookLogo,LinkedinLogo,ThreadsLogo,PinterestLogo,TwitchLogo,DiscordLogo,TelegramLogo,WhatsappLogo,RedditLogo,PatreonLogo,SpotifyLogo} from '@phosphor-icons/react';
import{creatorPublicLinks,creatorSocialPlatforms}from'./creatorSocialLinks';
import './creator-social-links.css';
const icons={website:Globe,instagram:InstagramLogo,tiktok:TiktokLogo,youtube:YoutubeLogo,x:XLogo,snapchat:SnapchatLogo,facebook:FacebookLogo,linkedin:LinkedinLogo,threads:ThreadsLogo,pinterest:PinterestLogo,twitch:TwitchLogo,discord:DiscordLogo,telegram:TelegramLogo,whatsapp:WhatsappLogo,reddit:RedditLogo,patreon:PatreonLogo,spotify:SpotifyLogo};
export function CreatorSocialIcon({platform,size=23}:{platform:string;size?:number}){const Icon=icons[platform.toLowerCase() as keyof typeof icons]||Globe;return <Icon size={size} aria-hidden="true"/>;}
export function CreatorSocialLinks({links,label='Social profiles'}:{links:unknown;label?:string}){
 const items=creatorPublicLinks(links);if(!items.length)return null;
 return <nav className="creator-social-links" aria-label={label}>{items.map(link=>{const platform=creatorSocialPlatforms.find(p=>p.key===link.label.toLowerCase()||p.name.toLowerCase()===link.label.toLowerCase()),name=platform?.name||link.label;return <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} profile`} title={name}><CreatorSocialIcon platform={platform?.key||'website'}/><span className="crays-screen-reader-only">{name}</span></a>;})}</nav>;
}
