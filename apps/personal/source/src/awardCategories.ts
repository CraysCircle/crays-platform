// Source: Categories for Award.xlsx, Tabelle1 B2:J14. All nine pillars and ninety source subcategories retained.
export const awardCategories=["Entrepreneurship", "Digital & Web3", "Content Creator", "Living", "Fashion", "Art", "Lifestyle", "Music", "Actors"] as const;
export const awardSubcategories:Record<string,string[]>={
  "Entrepreneurship": [
    "Entrepreneur of the year",
    "Brand of the year",
    "Investor of the Year VC",
    "Best Business Angel of the Year",
    "Best Ad of the Year",
    "Advertising, Media & PR",
    "Best Accelerator of the Year",
    "Websites and Mobile Sites",
    "Best Videoclip of the Year",
    "Best Co-Working of the Year"
  ],
  "Digital & Web3": [
    "NFT Project of the Year",
    "DeFi Project of the Year",
    "Metaverse Project of the Year",
    "DAO of the Year",
    "The Mainstream Award",
    "Video Game of the Year",
    "Investor of the Year Crypto",
    "Most influential Industry person of the Year",
    "Inventor of the Year",
    "Most innovative platform of the Year"
  ],
  "Content Creator": [
    "Social Media Star of the Year",
    "Role model of the year",
    "Best Podcast of the Year",
    "Best Travel Content of the Year",
    "Crypto Influencer of the Year",
    "Best Brand Campaign of the Year",
    "Best platform of the Year",
    "Best Agency of the Year",
    "Best VLOG of the Year",
    "Most innovative Creator of the Year"
  ],
  "Living": [
    "City of the Year",
    "Place to be of the Year",
    "Global Citizen of the Year",
    "Home Electronic of the year",
    "Best Service of the Year",
    "Arquitect of the Year",
    "Living Project of the Year",
    "Best Design Piece of the Year",
    "Best Interior Designer of the Year",
    "Work, Live & Play Innovation of the Year"
  ],
  "Fashion": [
    "Fashion Designer of the Year",
    "Business Leader of the Year",
    "Urban Luxe Brand of the Year",
    "Emerging Talent  of the Year",
    "Marketing Event of the Year",
    "Fashion Blog of the Year",
    "Runway Show of the Year",
    "Best Fashion Event of the Year",
    "Best Brand of the Year",
    "Best Marketing Campaign of the Year"
  ],
  "Art": [
    "Graffitti Artist of the Year",
    "Arquitecture of the Year",
    "Video Animation of the Year",
    "Best Exhibition of the Year",
    "Photographer of the Year",
    "Comic/Manga of the Year",
    "NFT Art of the Year",
    "Art Piece of the Year",
    "Extraordinary Ideas of the Year",
    "Artr industry product of the Year"
  ],
  "Lifestyle": [
    "Social Celebrity of the Year",
    "Sustainibility Star of the Year",
    "Style Star of the Year",
    "Game Changer of the Year",
    "Best Event of the Year",
    "Nomad of the Year",
    "Best Club of the Year",
    "Athelete of the Year",
    "Best E-Sport Team",
    "Divesity Award of the Year"
  ],
  "Music": [
    "Male Artist of the Year",
    "Female Artist of the Year",
    "Group of the Year",
    "Song of the Year",
    "Album of the Year",
    "Music Video of the Year",
    "Concert Tour of the Year",
    "Best Live Show of the year",
    "Best Video Show of the Year",
    "Innovation of the Year"
  ],
  "Actors": [
    "Director of the Year",
    "Male Movie Star of the Year",
    "Female Movie Star of the Year",
    "Movie Music of the Year",
    "Male TV Star of the Year",
    "Female TV Star of the Year",
    "Producer of the Year",
    "Talk Show of the Year",
    "Social Engagement Actor of the Year",
    "Innovative tech cartoon of the Year"
  ]
};

/** Visible names may evolve; the workbook taxonomy remains canonical. */
export const awardCategoryLabel=(value:string)=>({'Content Creator':'Creators','Actors':'Film & Actors'} as Record<string,string>)[value]||value;
export const awardSubcategoryLabel=(value:string)=>({'The Mainstream Award':'The Mainstream Props','Divesity Award of the Year':'Diversity Props of the Year'} as Record<string,string>)[value]||value;

/** Read compatibility for pre-freeze draft labels; do not rewrite immutable receipts. */
export const awardSubcategoryValue=(value:string)=>({'The Mainstream Props':'The Mainstream Award','Divesity Props of the Year':'Divesity Award of the Year'} as Record<string,string>)[value]||value;
