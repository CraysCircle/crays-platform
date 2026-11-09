import {ClubsDirectMembershipApplicationPage} from "@/components/crays-clubs/public/clubs-direct-membership-application-page";
import {isSafeDirectMembershipReturnTo} from "@/lib/clubs/direct-membership-application-contract";
import {clubsPageMetadata} from "@/lib/clubs/seo";
export const metadata=clubsPageMetadata("en","apply-directly",{title:"Membership application | CRAYS Clubs"},{index:false});
export default async function ApplyDirectlyPage({searchParams}:{searchParams:Promise<{returnTo?:string|string[]}>}){
 const requested=(await searchParams).returnTo;
 const returnTo=typeof requested==="string"&&isSafeDirectMembershipReturnTo(requested)?requested:"/en/account?view=membership";
 return <ClubsDirectMembershipApplicationPage locale="en" returnTo={returnTo}/>;
}
