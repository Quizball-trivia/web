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
      placeholder="Search and select your club..."
      isClearable
      classNamePrefix="react-select"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
          ...base,
          minHeight: 56,
          fontSize: 18,
          backgroundColor: 'hsl(var(--card, 220 15% 15%))',
          borderColor: state.isFocused ? 'hsl(var(--primary, 145 60% 45%))' : 'hsl(var(--border, 220 15% 25%))',
          boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary, 145 60% 45%) / 0.2)' : 'none',
          color: 'hsl(var(--card-foreground, 0 0% 95%))',
        }),
        menu: (base) => ({
          ...base,
          zIndex: 100,
          backgroundColor: 'hsl(var(--card, 220 15% 15%))',
          color: 'hsl(var(--card-foreground, 0 0% 95%))',
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? 'hsl(var(--primary, 145 60% 45%))'
            : state.isFocused
            ? 'hsl(var(--primary, 145 60% 45%) / 0.15)'
            : 'transparent',
          color: state.isSelected
            ? 'hsl(var(--primary-foreground, 220 20% 10%))'
            : 'hsl(var(--card-foreground, 0 0% 95%))',
          fontWeight: state.isSelected ? 600 : 400,
        }),
        singleValue: (base) => ({
          ...base,
          color: 'hsl(var(--card-foreground, 0 0% 95%))',
        }),
        placeholder: (base) => ({
          ...base,
          color: 'hsl(var(--muted-foreground, 220 10% 60%))',
        }),
        input: (base) => ({
          ...base,
          color: 'hsl(var(--card-foreground, 0 0% 95%))',
        }),
      }}
    />
  );
}
