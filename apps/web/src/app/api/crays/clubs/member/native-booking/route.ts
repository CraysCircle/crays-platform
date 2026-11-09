import {queryMemberNativeBooking} from "@/db/core-member-booking-runtime-pool";
import {createMemberNativeBookingHandler} from "@/lib/clubs/member-native-booking-handler";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export const POST=createMemberNativeBookingHandler({query:queryMemberNativeBooking});
