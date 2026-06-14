import React, { useMemo } from 'react';
import Select, { components, type OptionProps, type SingleValueProps, type GroupBase } from 'react-select';
import { selectableClubs, type Club } from '@/lib/clubs';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';

interface ClubSelectProps {
  value: string;
  onChange: (value: string) => void;
}

type ClubGroup = GroupBase<Club> & { flag?: string; country: string; countryKa?: string };

/** Build country-grouped options (with flags). Hidden/restricted clubs are
 * included only for the user allowed to see them (e.g. owms → Zlatan F.C.). */
function useGroupedClubs(): ClubGroup[] {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  return useMemo(() => {
    const list = selectableClubs(userId);
    const byCountry = new Map<string, Club[]>();
    for (const c of list) {
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
  }, [userId]);
}

function ClubOption(props: OptionProps<Club, false, ClubGroup>) {
  const { data } = props;
  return (
    <components.Option {...props}>
      <span className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
        <span className="truncate">{data.label}</span>
      </span>
    </components.SingleValue>
  );
}

export default function ClubSelect({ value, onChange }: ClubSelectProps) {
  const { t, locale } = useLocale();
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
      placeholder={t('onboarding.searchAndSelectClub')}
      isClearable
      classNamePrefix="react-select"
      components={{ Option: ClubOption, SingleValue: ClubSingleValue }}
      // Group heading shows the flag + country name (localized).
      formatGroupLabel={(group) => (
        <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-white/80">
          <span className="text-base">{(group as ClubGroup).flag}</span>
          {locale === 'ka' && (group as ClubGroup).countryKa ? (group as ClubGroup).countryKa : group.label}
        </span>
      )}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
          ...base,
          minHeight: 64,
          paddingInline: 12,
          fontSize: 16,
          fontWeight: 600,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          borderRadius: 18,
          backgroundColor: 'hsl(var(--brand-blue))',
          borderColor: 'transparent',
          boxShadow: state.isFocused ? '0 0 0 2px #fff' : 'none',
          color: '#fff',
          textAlign: 'center',
          flexWrap: 'nowrap',
          ':hover': { borderColor: 'transparent' },
        }),
        menu: (base) => ({
          ...base,
          zIndex: 100,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: 'hsl(var(--surface-card))',
          color: '#fff',
        }),
        groupHeading: (base) => ({ ...base, paddingTop: 8, paddingBottom: 4 }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? 'hsl(var(--brand-blue))'
            : state.isFocused
            ? 'hsl(var(--brand-blue) / 0.2)'
            : 'transparent',
          color: '#fff',
          fontWeight: state.isSelected ? 700 : 500,
        }),
        singleValue: (base) => ({
          ...base,
          color: '#fff',
          textAlign: 'center',
          margin: 0,
          maxWidth: '100%',
          overflow: 'hidden',
        }),
        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.7)', textAlign: 'center', width: '100%', fontSize: 15 }),
        input: (base) => ({ ...base, color: '#fff' }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.8)', padding: 4 }),
        clearIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.8)', padding: 4 }),
        valueContainer: (base) => ({ ...base, justifyContent: 'center', overflow: 'hidden', flexWrap: 'nowrap', paddingInline: 4 }),
      }}
    />
  );
}
