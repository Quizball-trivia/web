import localFont from 'next/font/local';

/** Heavy Georgian display face for titles and buttons (the studio sign uses the same file). */
export const orshabatobaDisplay = localFont({
  src: '../../../public/assets/orshabatoba/fonts/noto-sans-georgian-900.woff2',
  weight: '900',
  display: 'swap',
});
