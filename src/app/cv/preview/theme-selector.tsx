'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { PRINT_THEMES, DEFAULT_PRINT_THEME_ID, type PrintTheme } from '@/lib/print-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_KEY = 'cv-print-theme-id';

export function getPrintThemeById(themeId: string | null | undefined): PrintTheme | undefined {
  if (!themeId) return undefined;
  return PRINT_THEMES.find((t) => t.id === themeId);
}

export function getDefaultPrintTheme(): PrintTheme {
  return getPrintThemeById(DEFAULT_PRINT_THEME_ID) ?? PRINT_THEMES[0]!;
}

export function readPersistedPrintThemeId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistPrintThemeId(themeId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // ignore
  }
}

export type ThemeSelectorProps = {
  value: string;
  onThemeChange: (themeId: string) => void;
};

export function ThemeSelector({ value, onThemeChange }: ThemeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTheme = useMemo(() => {
    return getPrintThemeById(value) ?? getDefaultPrintTheme();
  }, [value]);

  // Keep localStorage in sync (URL is handled on change).
  useEffect(() => {
    persistPrintThemeId(selectedTheme.id);
  }, [selectedTheme.id]);

  const handleChange = (themeId: string) => {
    const nextTheme = getPrintThemeById(themeId) ?? getDefaultPrintTheme();

    // Update URL (?theme=...) so it’s shareable and consistent across routes.
    const params = new URLSearchParams(searchParams?.toString());
    params.set('theme', nextTheme.id);
    router.replace(`${pathname}?${params.toString()}`);

    onThemeChange(nextTheme.id);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Theme:</span>
      <Select value={selectedTheme.id} onValueChange={handleChange}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRINT_THEMES.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

