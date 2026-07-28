"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudyMetaStore } from "@/stores/study-meta-store";
import { STYLE_PRESETS, getAllPresetIds } from "@/lib/style-presets";
import { RADIUS_OPTIONS, THEME_OPTIONS } from "../constants";

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string }>;
  disabled?: boolean;
  onChange: (value: T) => void;
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: SelectFieldProps<T>) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => onChange(nextValue as T)}
      >
        <SelectTrigger id={id} size="sm" className="w-full min-w-0">
          <SelectValue className="min-w-0 truncate">
            {selectedOption?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-64">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface StyleSectionProps {
  studyId: string;
  isReadOnly?: boolean;
}

export function StyleSection({
  studyId: _studyId,
  isReadOnly,
}: StyleSectionProps) {
  const { meta, setStylePreset, setRadiusOption, setThemeMode } =
    useStudyMetaStore();

  const currentStylePreset = meta.branding.stylePreset || "default";
  const currentRadius = meta.branding.radiusOption || "default";
  const currentThemeMode = meta.branding.themeMode || "light";
  const styleOptions = getAllPresetIds().map((presetId) => {
    const preset = STYLE_PRESETS[presetId];
    return {
      value: presetId,
      label: preset.name,
      description: preset.description,
    };
  });

  return (
    <div className="@container space-y-3">
      <Label className="text-sm font-medium">Style & Appearance</Label>
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 @sm:grid-cols-3">
        <SelectField
          id="branding-style-preset"
          label="Style"
          value={currentStylePreset}
          options={styleOptions}
          disabled={isReadOnly}
          onChange={(value) => {
            if (value !== currentStylePreset) setStylePreset(value);
          }}
        />

        <SelectField
          id="branding-theme-mode"
          label="Theme"
          value={currentThemeMode}
          options={THEME_OPTIONS}
          disabled={isReadOnly}
          onChange={(value) => {
            if (value !== currentThemeMode) setThemeMode(value);
          }}
        />

        <SelectField
          id="branding-radius-option"
          label="Corners"
          value={currentRadius}
          options={RADIUS_OPTIONS}
          disabled={isReadOnly}
          onChange={(value) => {
            if (value !== currentRadius) setRadiusOption(value);
          }}
        />
      </div>
    </div>
  );
}
