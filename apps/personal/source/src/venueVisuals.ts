import type{ProductWorld}from'./productModel';
/** Update only the identifiable fictional legacy illustration, never a user-chosen photo or access state. */
export function withVenueVisualDefaults(input:ProductWorld):ProductWorld{
 if(input.owner!=='thorben'||!input.settings.demoHistory)return input;
 const coast=input.venues.find(v=>v.id==='coast'&&v.name==='Coast Club'&&v.city==='Barcelona'&&v.image==='venue-table.png');
 if(!coast)return input;
 const world=structuredClone(input);world.venues.find(v=>v.id===coast.id)!.image='lifestyle-club-05.jpg';return world;
}
