'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCircle, X, Users } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export interface PickerCandidate {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  code: string;
  category?: { code: string };
  registrationDate: string;
  practicalHours?: number;
  practicalHoursRealized?: number;
}

function unwrapList<T>(raw: unknown): T[] {
  let list: unknown = raw;
  for (let i = 0; i < 3; i += 1) {
    if (Array.isArray(list)) break;
    if (list && typeof list === 'object' && 'data' in list) {
      list = (list as { data: unknown }).data;
    } else break;
  }
  return (Array.isArray(list) ? list : []) as T[];
}

function initialsOf(c: PickerCandidate) {
  const a = c.firstName?.[0] ?? '';
  const b = c.lastName?.[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

const AVATAR_TONES = [
  'bg-blue-50 text-blue-700 ring-blue-200',
  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'bg-violet-50 text-violet-700 ring-violet-200',
  'bg-amber-50 text-amber-700 ring-amber-200',
  'bg-rose-50 text-rose-700 ring-rose-200',
  'bg-sky-50 text-sky-700 ring-sky-200',
];

function toneFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

interface Props<C extends PickerCandidate> {
  selected: C | null;
  onSelect: (c: C) => void;
  onClear: () => void;
  /** Title above the search input when nothing is selected */
  title?: string;
  /** Subtitle / instructions below the title */
  subtitle?: string;
  /** Placeholder for the search input */
  placeholder?: string;
}

/**
 * Self-contained candidate selector used at the top of per-candidate pages
 * (orë teorike, orë praktike, vërtetimet, etc).
 *
 * - When nothing is selected: shows a search box + a "recent candidates"
 *   quick-pick grid so the user can one-click the most likely targets
 *   without typing.
 * - When a candidate is picked: collapses to a compact banner with an
 *   "X" to clear and pick another.
 */
export function CandidatePicker<C extends PickerCandidate>({
  selected,
  onSelect,
  onClear,
  title = 'Zgjidhni Kandidatin',
  subtitle = 'Kërkoni me emër, mbiemër ose numër personal, ose zgjidhni një nga kandidatët e fundit.',
  placeholder = 'Kërko kandidatin…',
}: Props<C>) {
  const [query, setQuery] = useState('');

  // Quick-pick: most recently registered active candidates
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['candidates-recent-picker'],
    queryFn: async () =>
      unwrapList<C>(
        await api.get('/candidates', {
          params: { isArchived: false, limit: 6, sort: '-registrationDate' },
        })
      ),
    enabled: !selected,
  });
  const recent = Array.isArray(recentData) ? recentData : [];

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['candidates-picker-search', query],
    queryFn: async () =>
      unwrapList<C>(
        await api.get('/candidates', {
          params: { search: query, limit: 10, isArchived: false },
        })
      ),
    enabled: query.length >= 2 && !selected,
  });
  const searchResults = Array.isArray(searchData) ? searchData : [];

  // Selected banner
  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ring-1 ring-inset',
            toneFor(`${selected.firstName} ${selected.lastName}`)
          )}
        >
          {initialsOf(selected)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {selected.firstName} {selected.lastName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
            <span className="font-mono">{selected.code}</span>
            <span className="text-slate-300">·</span>
            <span>{selected.personalNumber}</span>
            {selected.category && (
              <>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-slate-700">
                  {selected.category.code}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <X className="h-3 w-3" />
          Ndrysho
        </button>
      </div>
    );
  }

  // Empty / picker state
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-200">
            <Users className="h-4 w-4" />
          </span>
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
        {query.length >= 2 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            {searchLoading ? (
              <div className="p-3">
                <Skeleton className="h-9 w-full" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Asnjë kandidat nuk u gjet për “{query}”.
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {searchResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(c);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1 ring-inset',
                          toneFor(`${c.firstName} ${c.lastName}`)
                        )}
                      >
                        {initialsOf(c)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          <span className="font-mono">{c.code}</span>
                          <span className="px-1 text-slate-300">·</span>
                          {c.personalNumber}
                        </p>
                      </div>
                      {c.category && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-slate-700">
                          {c.category.code}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Recent candidates quick-pick grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Kandidatët e fundit
          </span>
          <span className="text-[11px] text-slate-400">Klikoni për të zgjedhur</span>
        </div>
        {recentLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 py-6 text-center">
            <UserCircle className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-500">Asnjë kandidat aktiv.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
              >
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ring-1 ring-inset',
                    toneFor(`${c.firstName} ${c.lastName}`)
                  )}
                >
                  {initialsOf(c)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    <span className="font-mono">{c.code}</span>
                  </p>
                </div>
                {c.category && (
                  <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-slate-700">
                    {c.category.code}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
