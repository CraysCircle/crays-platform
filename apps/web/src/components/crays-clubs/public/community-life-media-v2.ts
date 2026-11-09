export type CommunityLifeMedia = {
  id: string;
  src: string;
  sourceUrl: string;
  creator: string;
  license: string;
  section: string;
  crop: string;
  alt: string;
};

const pexels = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;

export const communityLifeMedia: CommunityLifeMedia[] = [
  { id: "pexels-3184287", src: pexels("3184287"), sourceUrl: "https://www.pexels.com/photo/3184287/", creator: "fauxels", license: "Pexels License", section: "hero-background", crop: "cover 50% 42%", alt: "A generic community in a focused conversation" },
  { id: "pexels-1181406", src: pexels("1181406"), sourceUrl: "https://www.pexels.com/photo/1181406/", creator: "Christina Morillo", license: "Pexels License", section: "hero-collage-large", crop: "cover 50% 48%", alt: "People collaborating around a table" },
  { id: "pexels-3769021", src: pexels("3769021"), sourceUrl: "https://www.pexels.com/photo/3769021/", creator: "Andrea Piacquadio", license: "Pexels License", section: "hero-collage-small-one", crop: "cover 50% 38%", alt: "Friends sharing a relaxed conversation" },
  { id: "pexels-7551752", src: pexels("7551752"), sourceUrl: "https://www.pexels.com/photo/7551752/", creator: "Kampus Production", license: "Pexels License", section: "hero-collage-small-two", crop: "cover 50% 50%", alt: "A generic shared table moment" },
  { id: "pexels-1181396", src: pexels("1181396"), sourceUrl: "https://www.pexels.com/photo/1181396/", creator: "Christina Morillo", license: "Pexels License", section: "community-layer-primary", crop: "cover 50% 44%", alt: "People exchanging ideas in a bright workspace" },
  { id: "pexels-2422293", src: pexels("2422293"), sourceUrl: "https://www.pexels.com/photo/2422293/", creator: "Jopwell", license: "Pexels License", section: "community-layer-secondary", crop: "cover 50% 50%", alt: "A diverse group in a generic community setting" },
  { id: "pexels-3861969", src: pexels("3861969"), sourceUrl: "https://www.pexels.com/photo/3861969/", creator: "ThisIsEngineering", license: "Pexels License", section: "rhythm-morning", crop: "cover 50% 45%", alt: "A person focused on project work" },
  { id: "pexels-3184639", src: pexels("3184639"), sourceUrl: "https://www.pexels.com/photo/3184639/", creator: "fauxels", license: "Pexels License", section: "rhythm-afternoon", crop: "cover 50% 52%", alt: "A collaborative afternoon workshop" },
  { id: "pexels-6646918", src: pexels("6646918"), sourceUrl: "https://www.pexels.com/photo/6646918/", creator: "RDNE Stock project", license: "Pexels License", section: "rhythm-evening", crop: "cover 50% 48%", alt: "People gathering around a shared evening table" },
  { id: "pexels-3184423", src: pexels("3184423"), sourceUrl: "https://www.pexels.com/photo/3184423/", creator: "fauxels", license: "Pexels License", section: "mode-work", crop: "cover 50% 45%", alt: "A generic team creating together" },
  { id: "pexels-271624", src: pexels("271624"), sourceUrl: "https://www.pexels.com/photo/271624/", creator: "Pixabay", license: "Pexels License", section: "mode-live", crop: "cover 50% 55%", alt: "A calm generic interior for everyday living" },
  { id: "pexels-1190298", src: pexels("1190298"), sourceUrl: "https://www.pexels.com/photo/1190298/", creator: "Wolfgang", license: "Pexels License", section: "mode-play", crop: "cover 50% 48%", alt: "A generic cultural gathering with stage light" },
  { id: "pexels-2422278", src: pexels("2422278"), sourceUrl: "https://www.pexels.com/photo/2422278/", creator: "Jopwell", license: "Pexels License", section: "mode-global-citizen", crop: "cover 50% 42%", alt: "A diverse group sharing a public-space conversation" },
  { id: "pexels-3184431", src: pexels("3184431"), sourceUrl: "https://www.pexels.com/photo/3184431/", creator: "fauxels", license: "Pexels License", section: "hosted-culture-primary", crop: "cover 50% 50%", alt: "A group marking a shared commitment" },
  { id: "pexels-3184360", src: pexels("3184360"), sourceUrl: "https://www.pexels.com/photo/3184360/", creator: "fauxels", license: "Pexels License", section: "hosted-culture-secondary", crop: "cover 50% 45%", alt: "People sharing ideas around a table" },
  { id: "pexels-3184465", src: pexels("3184465"), sourceUrl: "https://www.pexels.com/photo/3184465/", creator: "fauxels", license: "Pexels License", section: "hosted-culture-tertiary", crop: "cover 50% 48%", alt: "Colleagues greeting one another in a generic setting" },
  { id: "pexels-3184418", src: pexels("3184418"), sourceUrl: "https://www.pexels.com/photo/3184418/", creator: "fauxels", license: "Pexels License", section: "global-citizen-wide", crop: "cover 50% 52%", alt: "A generic cross-cultural working group" }
];
