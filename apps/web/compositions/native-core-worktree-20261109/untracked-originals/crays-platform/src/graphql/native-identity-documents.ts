export type NativeIdentityStatusProjection = {
  contactRevision: string | null;
  accountMapped: boolean;
  accountId: string | null;
  accountStatus: string;
  emailVerificationRequired: boolean;
  nostrPublicKeyHex: string | null;
  nostrSignerVerified: boolean;
  requiredActions: string[];
};

export const NativeIdentityStatusDocument = { __meta__: { hash: "ddd997fbe168bf5e721b39f37712421e7f02676cac75287cc09ec0e68d6e0073" } } as const;

export const NativeEmailSetupDocument = { __meta__: { hash: "b4cc2f723cd30ca91f38e65ec55d7d537189ffd4d0a7ef569829a10a8401d547" } } as const;
export const NativeRegisterEmailDocument = { __meta__: { hash: "ab20c81eea12948255c864d930c7beb0e1124fe5b72bd09baa730406bd364dc9" } } as const;
export type NativeEmailRegistrationInput = { idempotencyKey: string; expectedContactRevision: string };
export type NativeEmailRegistrationProjection = { receiptId: string; contactRevision: string; current: boolean; replayed: boolean };
