export type AwsDatabaseTargetBinding = Readonly<{
  hostname: string; database: string; role: string; port: number; ca: string;
}>;
export function getAwsDatabaseTargetBinding(
  env: Record<string, string | undefined>, purpose: 'coreIdentity' | 'clubProperty' | 'originalMember' | 'scheduling' | 'financeContext',
): AwsDatabaseTargetBinding | null;
