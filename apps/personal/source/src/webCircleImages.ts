/** Distinct illustrative covers for the existing demo Circles; no membership changes. */
const covers:Record<string,string>={
 'circle-design':'award-fashion-illustration.png',
 'circle-build':'web-event-makers.webp',
 'demo-group-table':'venue-table.png',
 'demo-group-move':'lifestyle-gym-05.webp',
 'demo-group-makers':'award-founder-illustration.png',
 'house-harbor-house':'lifestyle-club-12.jpg',
 'table-harbor-house':'circle.png',
 'house-coast':'web-discover-people.webp',
 'table-coast':'member-dining.webp',
 'house-studio':'lifestyle-pro-00.jpg',
 'table-studio':'lifestyle-club-13.jpg',
 'house-move':'lifestyle-gym-04.webp',
 'table-move':'lifestyle-gym-01.webp',
 'house-forest-city':'lifestyle-club-01.webp',
 'table-forest-city':'lifestyle-club-06.jpg',
 'house-independent-grocer-preview':'web-discover-grocer.webp',
 'table-independent-grocer-preview':'coffee-original-hero.jpg',
};
export function webCircleImage(circle:{id:string;image?:unknown}){
 return typeof circle.image==='string'&&circle.image?circle.image:covers[circle.id]||'award-art-illustration.png';
}
