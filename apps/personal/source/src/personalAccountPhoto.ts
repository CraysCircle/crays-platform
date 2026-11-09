/** Presentation asset for the existing, independently verified owner TEST account.
 * The original SDK/Core gate supplies accountId. This grants no access and does
 * not map other accounts by name, contact, or the example world's owner alias.
 * The second exact ID is the verified original canonical owner Core account;
 * this is only the existing owner-selected presentation image, never admission.
 * Binding evidence: unified-member-integration-20261027/test-core-account-candidate/
 * EXACT_TEST_BINDING_APPLY_ACTUAL.json; owner-selected image: contact-thorben.png.
 */
export function personalAccountPhoto(account: {accountId: string}): string {
  return ['acct_clubs_test_holiday_manager_owner_001', 'acct_dae5f628-3c09-4fd9-940d-fe55cb68323c'].includes(account.accountId)
    ? 'contact-thorben.png'
    : '';
}
