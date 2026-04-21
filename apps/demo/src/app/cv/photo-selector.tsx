'use client';

import { useRef } from 'react';
import type { Locale } from '@/domain/model/cv';
import { useCVActions, useCVState } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';

export function PhotoSelector({ locale }: { locale: Locale }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { cv } = useCVState();
  const { updatePhoto } = useCVActions();

  const onPick = () => inputRef.current?.click();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      updatePhoto(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPick}
        className="border-gray-200"
        disabled={!cv}
      >
        {locale === 'sv' ? 'Välj bild' : 'Choose photo'}
      </Button>
      {cv?.photoDataUrl ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => updatePhoto(null)}
          className="text-red-600 hover:bg-red-50"
        >
          {locale === 'sv' ? 'Ta bort' : 'Remove'}
        </Button>
      ) : null}
    </div>
  );
}

