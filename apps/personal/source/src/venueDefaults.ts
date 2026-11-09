import type { Venue } from "./productModel.ts";
// Owner-requested demo membership; not a booking, live presence or production access grant.
export const forestCityDemo: Venue = {
  id: "forest-city",
  name: "Crays Club Forest City",
  type: "Lifestyle club",
  city: "Forest City, Malaysia",
  description:
    "A coastal base for work, life and community at Forest City Marina. Explore the Spot, meet your community and prepare a visit. Membership, confirmed stays and access to individual services remain separate. This is a fictional member preview, not a live opening or availability claim.",
  image: "forest-city-marina.webp",
  services: [
    "Food & drinks",
    "Table booking",
    "Community events",
    "Workspace",
    "Gym & wellbeing",
  ],
  visited: false,
  relayJoined: true,
  membership: "active",
  grant: "Fictional demo membership",
  otherGrant: false,
  presence: "none",
  visibility: { Socializing: false, Business: false, Dating: false },
  area: "Main space",
  operatorActive: true,
  role: "Member",
  relay: "wss://forest-city.relay.example.invalid",
};
