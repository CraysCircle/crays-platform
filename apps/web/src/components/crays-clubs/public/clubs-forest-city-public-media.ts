export type ForestCityPublicMediaAsset = {
  id: string;
  src: string;
  sourceUrl: string;
  provider: "Pexels";
  creator: "fauxels";
  license: "Pexels License";
  termsUrl: "https://www.pexels.com/license/";
  cataloguedAt: "2026-08-24";
  section: "community" | "work" | "school" | "families" | "lifestyle" | "company";
  crop: string;
  alt: string;
};

const generic = (
  id: string,
  section: ForestCityPublicMediaAsset["section"],
  crop: string,
  alt: string,
): ForestCityPublicMediaAsset => ({
  id: `pexels-${id}`,
  src: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1800`,
  sourceUrl: `https://www.pexels.com/photo/${id}/`,
  provider: "Pexels",
  creator: "fauxels",
  license: "Pexels License",
  termsUrl: "https://www.pexels.com/license/",
  cataloguedAt: "2026-08-24",
  section,
  crop,
  alt,
});

export const forestCityGenericMedia: ForestCityPublicMediaAsset[] = [
  generic("3182887", "community", "center 44%", "A generic group gathering around a shared table"),
  generic("3182903", "work", "center 42%", "A generic team working together with laptops and notes"),
  generic("3182973", "school", "center 40%", "A generic peer learning conversation"),
  generic("3182980", "families", "center 45%", "A generic intergenerational community conversation"),
  generic("3183150", "lifestyle", "center 46%", "A generic social moment shared around a table"),
  generic("3183165", "company", "center 42%", "A generic company workshop in progress"),
];
