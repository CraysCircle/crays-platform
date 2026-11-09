/** Editable presentation of the accepted season; historical workbook rounds are not imported. */
export const propsSeasonPhases = [
 {id:'nomination',title:'Nomination',detail:'A creator enters a category',destination:'nomination'},
 {id:'category-race',title:'Category race',detail:'Daily contests, Stories, Reels & challenges',destination:'race'},
 {id:'top-100',title:'Top 100',detail:'Current annual category standings',destination:'race'},
 {id:'top-3',title:'Top 3',detail:'Final category results lead to prizes',destination:'race'},
 {id:'finals',title:'Finals · the live event',detail:'Celebrate together at the annual CRAYS Props Award',destination:'event'},
 {id:'winner',title:'Winner · No. 1 leaves a mark',detail:'Star & handprint in every global CRAYS Club',destination:'event'},
] as const;
