'use client';

/** Favorite-club picker — same UX as Quizball's onboarding (searchable
 *  select grouped by country, real crests), restyled for Table Derby and
 *  Georgian-only. */

import { useMemo } from 'react';
import Select, { components, type OptionProps, type SingleValueProps, type GroupBase } from 'react-select';
import { selectableClubs, type Club } from '@/lib/clubs';
import { normalizeName } from '@/features/mini-games/lib/matching';
import { TD } from '../lib/copy';

type ClubGroup = GroupBase<Club> & { flag?: string; country: string; countryKa?: string };

function useGroupedClubs(): ClubGroup[] {
  return useMemo(() => {
    const byCountry = new Map<string, Club[]>();
    for (const c of selectableClubs(null)) {
      const arr = byCountry.get(c.country) ?? [];
      arr.push(c);
      byCountry.set(c.country, arr);
    }
    return [...byCountry.entries()].map(([country, options]) => ({
      label: country,
      country,
      flag: options[0]?.flag,
      countryKa: options[0]?.countryKa,
      options,
    }));
  }, []);
}

function ClubOption(props: OptionProps<Club, false, ClubGroup>) {
  const { data } = props;
  return (
    <components.Option {...props}>
      <span className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- crest from the club registry */}
        <img src={data.logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
        <span>{data.label}</span>
      </span>
    </components.Option>
  );
}

function ClubSingleValue(props: SingleValueProps<Club, false, ClubGroup>) {
  const { data } = props;
  return (
    <components.SingleValue {...props}>
      <span className="flex min-w-0 items-center justify-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- crest from the club registry */}
        <img src={data.logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
        <span className="truncate">{data.label}</span>
      </span>
    </components.SingleValue>
  );
}

export function TdClubSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const groups = useGroupedClubs();
  const selected = useMemo(() => {
    for (const g of groups) {
      const hit = g.options.find((c) => c.value === value);
      if (hit) return hit;
    }
    return null;
  }, [groups, value]);

  return (
    <Select<Club, false, ClubGroup>
      options={groups}
      value={selected}
      onChange={(option) => onChange(option ? option.value : '')}
      placeholder={TD.onbClubSearch}
      noOptionsMessage={() => 'ვერ მოიძებნა'}
      // Georgian input is transliterated so "ბარსელ..." finds Barcelona
      filterOption={(option, raw) => {
        if (!raw) return true;
        const q = normalizeName(raw);
        const label = normalizeName(option.label);
        return label.includes(q) || label.replace(/c/g, 's').includes(q.replace(/c/g, 's'));
      }}
      isClearable
      classNamePrefix="td-club-select"
      components={{ Option: ClubOption, SingleValue: ClubSingleValue }}
      formatGroupLabel={(group) => (
        <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide text-white/70">
          <span className="text-base">{(group as ClubGroup).flag}</span>
          {(group as ClubGroup).countryKa ?? group.label}
        </span>
      )}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
          ...base,
          minHeight: 60,
          paddingInline: 12,
          fontSize: 15,
          fontWeight: 700,
          textTransform: 'uppercase',
          fontFamily: "'Noto Sans Georgian', 'Poppins', sans-serif",
          borderRadius: 12,
          backgroundColor: 'var(--td-charcoal)',
          borderColor: 'transparent',
          boxShadow: state.isFocused ? '4px 4px 0 rgba(0,0,0,0.5), 0 0 0 2px var(--td-orange)' : '4px 4px 0 rgba(0,0,0,0.5)',
          color: '#fff',
          textAlign: 'center',
          flexWrap: 'nowrap',
          ':hover': { borderColor: 'transparent' },
        }),
        menu: (base) => ({
          ...base,
          zIndex: 100,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#1e1e1e',
          boxShadow: '5px 5px 0 rgba(0,0,0,0.55)',
          color: '#fff',
        }),
        groupHeading: (base) => ({ ...base, paddingTop: 8, paddingBottom: 4 }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected ? 'var(--td-orange)' : state.isFocused ? 'rgba(238,90,34,0.18)' : 'transparent',
          color: state.isSelected ? '#0d0d0d' : '#fff',
          fontWeight: state.isSelected ? 800 : 500,
        }),
        singleValue: (base) => ({ ...base, color: '#fff', textAlign: 'center', margin: 0, maxWidth: '100%', overflow: 'hidden' }),
        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '100%', fontSize: 14 }),
        input: (base) => ({ ...base, color: '#fff' }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.8)', padding: 4 }),
      }}
    />
  );
}
