/** Presentation-only illustration choice. No event, eligibility, booking or ownership changes. */
type EventIllustration={id:string;name?:unknown};
const kind=(name:unknown)=>/move|movement|training/i.test(String(name))?'movement':/conversation|making|maker/i.test(String(name))?'makers':'table';
const pictures={table:['web-event-shared-table.webp','member-dining.webp','web-discover-rooftop.webp','web-discover-hotel.webp'],makers:['web-event-makers.webp','web-discover-people.webp','lifestyle-club-13.jpg','lifestyle-pro-00.jpg'],movement:['web-event-movement.webp','gym-challenge-strength-duo.jpeg','gym-coaching-trainer-client.jpg','venue-gym.jpg']};
export function webEventImage(event:EventIllustration,events:readonly EventIllustration[]){const group=kind(event.name),index=events.findIndex(e=>e.id===event.id),ordinal=events.slice(0,Math.max(0,index)).filter(e=>kind(e.name)===group).length;return pictures[group][ordinal%pictures[group].length];}
