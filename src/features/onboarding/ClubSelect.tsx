import React from 'react';
import Select from 'react-select';
import clubs from '@/data/top5leagues-clubs.json';

interface ClubSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ClubSelect({ value, onChange }: ClubSelectProps) {
  return (
    <Select
      options={clubs}
      value={clubs.find((c) => c.value === value) || null}
      onChange={(option) => onChange(option ? option.value : '')}
      placeholder="Search and select your club"
      isClearable
      classNamePrefix="react-select"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
          ...base,
          minHeight: 64,
          paddingInline: 16,
          fontSize: 22,
          fontWeight: 600,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          borderRadius: 18,
          backgroundColor: 'hsl(var(--brand-blue))',
          borderColor: 'transparent',
          boxShadow: state.isFocused ? '0 0 0 2px #fff' : 'none',
          color: '#fff',
          textAlign: 'center',
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
        singleValue: (base) => ({ ...base, color: '#fff', textAlign: 'center', width: '100%' }),
        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.7)', textAlign: 'center', width: '100%' }),
        input: (base) => ({ ...base, color: '#fff' }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.8)' }),
        clearIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.8)' }),
        valueContainer: (base) => ({ ...base, justifyContent: 'center' }),
      }}
    />
  );
}
