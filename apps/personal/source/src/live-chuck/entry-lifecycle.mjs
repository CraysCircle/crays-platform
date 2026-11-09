/** Each visible Chuck entry shares the existing account controller. Reopening a
 * settled view reads the canonical transcript again, including changes made
 * while that view was closed. It never resends or creates another controller.
 * Unknown outcomes and lost authority retain their explicit recovery flow. */
export async function openChuckEntry(controller) {
 if(!controller)return false;
 const snapshot=controller.getSnapshot();
 if(snapshot.phase==='idle'){
  await controller.open();
  return true;
 }
 if(snapshot.conversation&&['ready','waiting-reply'].includes(snapshot.phase)){
  await controller.refresh();
  return true;
 }
 return false;
}
