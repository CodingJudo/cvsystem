'use client';

import { useMemo, useState } from 'react';
import type { Contacts, Locale } from '@/domain/model/cv';
import { useCVActions, useCVState } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EMPTY_CONTACTS: Contacts = { email: null, phone: null, address: null, website: null };

function withNullIfEmpty(value: string): string | null {
  const v = value.trim();
  return v.length ? v : null;
}

export function ContactsEditor({ locale }: { locale: Locale }) {
  const { cv } = useCVState();
  const { updateContacts } = useCVActions();
  const [isEditing, setIsEditing] = useState(false);

  const contacts = useMemo(() => {
    return cv?.contacts ?? EMPTY_CONTACTS;
  }, [cv]);

  const setField = (field: keyof Contacts, value: string) => {
    if (!cv) return;
    updateContacts({
      ...contacts,
      [field]: withNullIfEmpty(value),
    });
  };

  const t = {
    title: locale === 'sv' ? 'Kontakt' : 'Contact',
    description: locale === 'sv' ? 'Kontaktuppgifter för CV' : 'Contact details for the CV',
    edit: locale === 'sv' ? 'Redigera' : 'Edit',
    done: locale === 'sv' ? 'Klar' : 'Done',
    email: locale === 'sv' ? 'E-post' : 'Email',
    phone: locale === 'sv' ? 'Telefon' : 'Phone',
    address: locale === 'sv' ? 'Adress' : 'Address',
    website: locale === 'sv' ? 'Webbplats' : 'Website',
    empty: locale === 'sv' ? 'Inga kontaktuppgifter angivna' : 'No contact details provided',
  };

  const hasAny =
    Boolean(contacts.email) || Boolean(contacts.phone) || Boolean(contacts.address) || Boolean(contacts.website);

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-[var(--geisli-secondary)]">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            className="text-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/10"
            disabled={!cv}
          >
            {isEditing ? t.done : t.edit}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-gray-700">{t.email}</label>
              <Input
                value={contacts.email ?? ''}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-gray-700">{t.phone}</label>
              <Input
                value={contacts.phone ?? ''}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+46 70 000 00 00"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-gray-700">{t.address}</label>
              <Input
                value={contacts.address ?? ''}
                onChange={(e) => setField('address', e.target.value)}
                placeholder={locale === 'sv' ? 'Tegnérgatan 34, Stockholm' : 'Street, City'}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-gray-700">{t.website}</label>
              <Input
                value={contacts.website ?? ''}
                onChange={(e) => setField('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
        ) : hasAny ? (
          <div className="grid gap-1 text-sm text-gray-700">
            {contacts.email ? (
              <div>
                <span className="text-gray-500">{t.email}: </span>
                <span>{contacts.email}</span>
              </div>
            ) : null}
            {contacts.phone ? (
              <div>
                <span className="text-gray-500">{t.phone}: </span>
                <span>{contacts.phone}</span>
              </div>
            ) : null}
            {contacts.address ? (
              <div>
                <span className="text-gray-500">{t.address}: </span>
                <span>{contacts.address}</span>
              </div>
            ) : null}
            {contacts.website ? (
              <div>
                <span className="text-gray-500">{t.website}: </span>
                <span>{contacts.website}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-gray-400 italic">{t.empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

