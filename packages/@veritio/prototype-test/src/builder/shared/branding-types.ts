// =============================================================================
// Branding Type Definitions

export interface BrandingImage {
  url: string;
  filename: string;
  size?: number;
  path?: string;
  mimeType?: string;
}

export type StudyBackgroundMode = "theme" | "color" | "image";
export type StudyBackgroundLayout = "fill" | "fit" | "tile";
export type StudyBackgroundPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
export type StudyContentSurface = "solid" | "glass";
export type StudyBackgroundMimeType = "image/png" | "image/jpeg" | "image/webp";

export interface StudyBackgroundImage {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: StudyBackgroundMimeType;
  width?: number;
  height?: number;
}

export interface StudyBackgroundSettings {
  mode: StudyBackgroundMode;
  color?: string;
  image?: StudyBackgroundImage;
  layout: StudyBackgroundLayout;
  position: StudyBackgroundPosition;
  overlayOpacity: number;
  contentSurface: StudyContentSurface;
}

// Logo size constraints (in pixels)
export const LOGO_SIZE_MIN = 24;
export const LOGO_SIZE_MAX = 80;
export const LOGO_SIZE_DEFAULT = 48;

// Preview scaling factor (preview is smaller than actual)
export const LOGO_PREVIEW_SCALE = 0.65;
export type StylePresetId =
  | "default" // Clean, professional (current styling)
  | "vega" // Bold, high-contrast
  | "nova" // Soft, rounded
  | "maia" // Minimal, flat
  | "lyra" // Elegant, refined
  | "mira"; // Playful, vibrant
export type RadiusOption = "none" | "small" | "default" | "large";
export type ThemeMode = "light" | "dark" | "system";
/** Text/icon color on brand-colored surfaces. 'auto' maximizes measured contrast. */
export type BrandTextMode = "auto" | "light" | "dark";

export interface BrandingSettings {
  logo?: BrandingImage;
  logoSize?: number; // Height in pixels (24-80), default 48
  socialImage?: BrandingImage;
  primaryColor?: string; // Hex color for buttons
  brandTextMode?: BrandTextMode; // Text color on brand surfaces, default: 'auto'
  /** @deprecated Retained for backwards compatibility. Participant rendering ignores it. */
  backgroundColor?: string;
  background?: StudyBackgroundSettings;
  buttonText?: {
    continue?: string; // Custom text for "Continue" button
    finished?: string; // Custom text for "Finished" button
  };
  cardSortInstructions?: string; // Custom default instructions for card sort modal

  // Style customization options
  stylePreset?: StylePresetId; // Visual style preset, default: 'default'
  radiusOption?: RadiusOption; // Border radius option, default: 'default' (8px)
  themeMode?: ThemeMode; // Theme mode, default: 'light'
}

export const DEFAULT_BRANDING: BrandingSettings = {
  themeMode: "light",
  stylePreset: "default",
  radiusOption: "default",
};
