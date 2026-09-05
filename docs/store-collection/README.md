# Approved avatar collection

46 items: 23 jerseys, 17 hairstyles, Blue Sport glasses, two beards, Čech headguard, and two earrings. The registry uses the final user-approved fit and curl-depth settings. Removed prototypes are not included.

Item names, category labels and hair colours are translated in English, Georgian and Spanish. Products are coin-priced and use the existing catalog metadata and ownership validation. Headwear and earrings require the companion backend change and catalog migration.

The development tuner at `/dev/jerseys` can override fit locally. Browser overrides never affect production defaults. Copy overrides exports further adjustments; source values are in `src/lib/avatars/collection.ts` and `parts.ts`.

Backend migration: `20260905072244_seed_approved_avatar_collection.sql`. Deploy backend validation support before the web collection. Verify all 46 product slugs after migration. Production promotion cherry-picks only the reviewed collection commits.
