# Staging and production releases

All changes, including fixes, go through `staging` before `main`. At the end of an approved release, the two deployed environments must serve the same application source. Their configuration and data remain environment-specific.

## Release checklist

1. Merge the reviewed change into `staging` and wait for lint, typecheck, tests, and build to pass.
2. Verify that `staging.quizball.io` points to the intended ready Vercel deployment. Check the affected behavior against the staging services.
3. Compare all changes between `staging` and `main`. Include every additional staging feature in the release approval; do not assume approval for one fix covers other features.
4. Open `staging` -> `main`. The `staging-first` workflow rejects production pull requests from other branches. Require `check` and `staging-first` in the main branch's protection settings to enforce this rule.
5. Once the approved release's checks pass, merge it and wait for the production deployment to become ready.
6. Confirm `quizball.io` and `staging.quizball.io` use deployments containing the released changes. Check affected production behavior and error logs.
7. Compare the remote branch trees with `git diff --exit-code origin/main origin/staging`. Different merge commit IDs are acceptable when the source trees are identical. Report any remaining difference explicitly before calling the release complete.

## Recovering from a production-only fix

Merge `main` back into `staging` through a reviewed pull request. Preserve staging features, run the combined checks, and verify the staging deployment. If staging already contains additional features, bringing those to production requires their own approval. Do not discard them or silently release them to make the branches match.

The workflow is a release guard, not an automatic production deployment. Staging may be ahead while changes are tested; completing a release includes bringing both environments to the same approved source tree.
