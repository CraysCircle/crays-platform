import {ClubsDirectMembershipApplicationPage} from "@/components/crays-clubs/public/clubs-direct-membership-application-page";
import {isSafeDirectMembershipReturnTo} from "@/lib/clubs/direct-membership-application-contract";
import {clubsPageMetadata} from "@/lib/clubs/seo";
export const metadata=clubsPageMetadata("ca","apply-directly",{title:"Sol·licitud de membresia | CRAYS Clubs"},{index:false});
export default async function ApplyDirectlyPage({searchParams}:{searchParams:Promise<{returnTo?:string|string[]}>}){
 const requested=(await searchParams).returnTo;
 const returnTo=typeof requested==="string"&&isSafeDirectMembershipReturnTo(requested)?requested:"/ca/account?view=membership";
 return <ClubsDirectMembershipApplicationPage locale="ca" returnTo={returnTo}/>;
}
