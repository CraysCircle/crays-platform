# Identity and account boundaries

CRAYS uses Auth0 integration alongside its own application, native and provider session boundaries. Identity work needs to preserve the relationship between the signed-in person, their CRAYS application session and the provider principal used for a specific operation.

## Follow the implementation

- [Shared Club/Member application](https://github.com/CraysCircle/crays-platform/blob/main/apps/web/README.md) documents the qualified application source and its original configuration relationships.
- [Auth0 SDK metadata](https://github.com/CraysCircle/crays-platform/blob/main/apps/web/third-party/packages/@auth0/nextjs-auth0/4.24.0/package.json) records the preserved **@auth0/nextjs-auth0 4.24.0** dependency.
- [Personal sign-in workspace](https://github.com/CraysCircle/crays-platform/blob/main/apps/personal/source/src/SignInWorkspace.tsx) is a frontend entry point for understanding the captured Personal sign-in interface.
- [Personal source guide](https://github.com/CraysCircle/crays-platform/blob/main/apps/personal/README.md) explains that frontend's source views and recovery inputs.
- [Club runtime configuration keys](https://github.com/CraysCircle/crays-platform/blob/main/services/club-next-runtime/member-runtime38/configuration-keys.json) documents required field names without publishing private values.

Hosted Auth0, the SDK and CRAYS-owned integration code have different responsibilities. Public SDK/application source does not mean that CRAYS owns or mirrors Auth0's hosted implementation.

## Work on this area

Start with the selected application's source guide and its provider/session adapter contract. Useful contributions include explaining sign-in and return flows, documenting native/web account relationships, and testing authorization failures with dedicated synthetic identities.

Use a separately configured development identity tenant and reviewed application registration. Public examples should describe the configuration shape and ownership boundary; production credentials, owner sessions and personal account state are not development fixtures.

## Integration status

The shared source capture records the Auth0 SDK version above. A separate custom-login asset capture identifies ACUL release **5161b54e24be68c38b293ca4** and preserves 18 of 22 original source files, but its evidence does not prove the Auth0 tenant actually uses those assets. Complete custom-login source/release mapping and the selected application's current end-to-end identity acceptance remain separate work.

[Back to services](README.md)
