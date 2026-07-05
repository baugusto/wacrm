/**
 * Single source of truth for the ROI Wise color-theme catalog.
 *
 * The CSS variables themselves live in `src/app/globals.css` under
 * `html[data-theme="..."]` blocks — that file is the one we paste
 * theme tokens into. This module only carries the metadata the UI
 * (settings picker, no-flash boot script) needs.
 *
 * Adding a new accent is a two-step change:
 *   1. Append the new `html[data-theme="<id>"]` block in globals.css
 *      with every token from an existing theme (use violet as the
 *      shape reference).
 *   2. Add an entry below. The order here drives the picker grid.
 */

export const THEME_IDS = [
  'violet',
  'emerald',
  'cobalt',
  'amber',
  'rose',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = 'violet';

export const STORAGE_KEY = 'wacrm.theme';

/**
 * MODE — the light/dark dimension, orthogonal to the accent theme.
 *
 * The CSS variables live in `src/app/globals.css` under
 * `html[data-mode="..."]` blocks (neutral surfaces only). Applied
 * at runtime via `document.documentElement.dataset.mode`. Dark is
 * the historical default and stays the app's identity; light is the
 * opt-in eye-strain-friendly alternative.
 *
 * Persisted under its own localStorage key so it composes freely
 * with the accent choice.
 */
export const MODES = ['light', 'dark'] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = 'dark';

export const MODE_STORAGE_KEY = 'wacrm.mode';

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === 'string' &&
    (MODES as ReadonlyArray<string>).includes(value)
  );
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  /**
   * Static swatch color for the picker chip. Hard-coded so the boot
   * script / picker cards don't need a getComputedStyle round trip
   * before the page settles. Must mirror `--primary` of the same
   * theme in globals.css.
   */
  swatch: string;
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  {
    id: 'violet',
    name: 'Wise Teal',
    tagline: 'The default ROI Wise signal for conversion and core actions.',
    swatch: '#0BBFAD',
  },
  {
    id: 'emerald',
    name: 'Growth Green',
    tagline: 'Recovered revenue, positive movement, and successful outcomes.',
    swatch: '#22D07A',
  },
  {
    id: 'cobalt',
    name: 'Attribution Blue',
    tagline: 'Analysis, signal clarity, and source attribution.',
    swatch: '#60A5FA',
  },
  {
    id: 'amber',
    name: 'Opportunity Amber',
    tagline: 'Attention states and opportunities that need a decision.',
    swatch: '#F59E0B',
  },
  {
    id: 'rose',
    name: 'Loss Red',
    tagline: 'Risk, loss, and destructive states used with restraint.',
    swatch: '#F04E4E',
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === 'string' &&
    (THEME_IDS as ReadonlyArray<string>).includes(value)
  );
}
