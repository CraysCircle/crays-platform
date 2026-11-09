import { experienceFunctionIds } from "./experienceBindings";
// Generated from the complete R2 register by scripts/build-coverage.py.
export const screenFunctionBindings: Record<string, string[]> = {
  home: ["AL-001", "AL-080", "AL-081", "AL-249", "AL-293"],
  chat: [
    "AL-083",
    "AL-084",
    "AL-085",
    "AL-090",
    "AL-226",
    "AL-249",
    "AL-252",
    "AL-293",
    "AL-295",
    "AL-299",
  ],
  tasks: ["AL-293", "AL-249"],
  task: ["AL-293", "AL-249"],
  result: ["AL-293", "AL-249"],
  social: ["AL-061", "AL-310"],
  profile: ["AL-089", "AL-090"],
  qr: ["AL-046", "AL-047", "AL-048", "AL-215", "AL-237", "AL-238"],
  venue: ["AL-046", "AL-048", "AL-215", "AL-298"],
  network: ["AL-310"],
  explore: ["AL-310"],
  you: ["AL-249"],
  requests: ["AL-061", "AL-083"],
  services: ["AL-298"],
};
export function functionIdsForScreen(id: string) {
  return [
    ...new Set([
      ...(screenFunctionBindings[id.split("-")[0]] || []),
      ...experienceFunctionIds(id),
    ]),
  ];
}
