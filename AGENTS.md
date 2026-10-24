# Releases

The user requires staging and production to stay in sync after each approved release.

- Merge changes into `staging` first. Verify CI and the actual staging deployment before releasing the same code to `main` through a `staging` -> `main` pull request.
- A release is complete only after both deployed environments contain the approved changes. Compare branch trees and Vercel deployment commits; a successful build alone is insufficient.
- Do not deploy a production-only feature branch and leave staging without its fixes. If an emergency production fix already exists, merge `main` back into `staging`, preserving other work, and verify staging.
- Staging can temporarily contain features under review. If exact parity would release additional features, identify those features and obtain authorization before promoting them. Never delete staging work or force-reset either branch to manufacture parity.
- Keep each environment's own configuration and data. Code parity does not authorize copying production credentials or databases into staging.

See [docs/RELEASING.md](docs/RELEASING.md) for the release checklist.
