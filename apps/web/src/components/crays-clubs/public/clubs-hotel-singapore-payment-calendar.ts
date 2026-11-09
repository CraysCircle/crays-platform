import {parseStayDay} from "@/lib/member-commerce/clubs-calendar-month-stay";
// Exact official MOM public-holiday dates, including observed Monday holidays.
// User-selected rule: Singapore Monday-Friday, excluding bank/public holidays.
export const SINGAPORE_PAYMENT_CALENDAR={version:"sg-mom-2026-2027-reviewed-20261007",timeZone:"Asia/Singapore",sourceUrls:["https://www.mom.gov.sg/newsroom/press-releases/2025/0616-public-holidays-for-2026","https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027"],verifiedYears:[2026,2027]} as const;
const holidays:Readonly<Record<number,readonly string[]>>={
 2026:["2026-01-01","2026-02-17","2026-02-18","2026-03-21","2026-04-03","2026-05-01","2026-05-27","2026-05-31","2026-06-01","2026-08-09","2026-08-10","2026-11-08","2026-11-09","2026-12-25"],
 2027:["2027-01-01","2027-02-06","2027-02-07","2027-02-08","2027-03-10","2027-03-26","2027-05-01","2027-05-17","2027-05-20","2027-08-09","2027-10-28","2027-12-25"]
};
export function singaporePaymentDeadline(monthStart:string):string|null {
 const cursor=parseStayDay(monthStart);if(cursor.getUTCDate()!==1)throw Error("PAYMENT_MONTH_START_REQUIRED");
 let remaining=3;
 while(remaining>0){cursor.setUTCDate(cursor.getUTCDate()-1);const year=cursor.getUTCFullYear();const list=holidays[year];if(!list)return null;
 const day=cursor.getUTCDay(),iso=cursor.toISOString().slice(0,10);if(day!==0&&day!==6&&!list.includes(iso))remaining--;
 }
 return cursor.toISOString().slice(0,10);
}
