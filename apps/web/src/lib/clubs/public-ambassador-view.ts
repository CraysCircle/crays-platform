/** Safe public fields projected from a published SaaS record. No identity/recipient authority. */
export type PublicAmbassadorView = Readonly<{
 slug: string; name: string; version: number; role: "founder" | "cofounder" | "ambassador";
 affiliation: string; linkedInUrl: string | null; canonicalPath: string; canonicalUrl: string;
 media: { url: string; sha256: string; bytes: number; width: number; height: number;
 contentType: "image/png" | "image/jpeg"; focalPoint: { x: number; y: number }; alt: string };
 socialImage: { url: string; width: number; height: number; alt: string };
}>;
