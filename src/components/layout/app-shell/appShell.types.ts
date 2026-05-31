/**
 * Shared types for the AppShell split.
 */

export type AppShellProps = {
  children: React.ReactNode;
};

export type RankedGeoHintDebug = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
};
