import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountryFlag } from '../CountryFlag';

describe('local country flag artwork', () => {
  it.each([['Argentina', 'ar'], ['TR', 'tr'], ['Georgia', 'ge'], ['gb-eng', 'gb-eng']])('uses a local asset for %s', (code, flag) => {
    const { container } = render(<CountryFlag code={code} />);
    expect(container.firstChild).toHaveStyle({ backgroundImage: `url("/assets/football-grid/flags/${flag}.svg")` });
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('retains caller sizing and cover overrides', () => {
    const { container } = render(<CountryFlag code="es" className="size-5" style={{ width: '100%', backgroundSize: 'cover' }} />);
    expect(container.firstChild).toHaveClass('size-5');
    expect(container.firstChild).toHaveStyle({ width: '100%', backgroundSize: 'cover' });
  });

  it.each(['', '../secret', 'not a country'])('omits invalid country input %s', (code) => {
    const { container } = render(<CountryFlag code={code} />);
    expect(container).toBeEmptyDOMElement();
  });
});
