import { reopenAdPrivacyChoices } from './googleConsent';

/** Shared English advertising notice, also available on the canonical /en/privacy page. */
export function AdvertisingPrivacyNotice() {
  return (
    <section lang="en" className="space-y-3 text-sm leading-relaxed text-white/70">
      <h2 className="text-lg font-semibold text-white">Advertising and cookie choices</h2>
      <p>Advertising notice updated November 9, 2026.</p>
      <p>Quizball LLC operates quizball.io. When advertising is enabled, we use Google AdSense to display ads. Google and its advertising partners may use cookies, web beacons, IP addresses, device information and ad interactions to deliver, personalize and measure advertising and prevent fraud.</p>
      <p>For visitors in the European Economic Area, the United Kingdom and Switzerland, Google’s consent message provides choices to consent, decline or manage advertising purposes and partners. Google uses these choices to determine which ads can be served. You can reopen your choices through Privacy and cookie settings when advertising is enabled.</p>
      <p>
        Read <a href="https://policies.google.com/technologies/partner-sites" className="underline">how Google uses information from sites that use its services</a> and manage personalization in <a href="https://myadcenter.google.com/" className="underline">Google My Ad Center</a>. For questions about Quizball’s use of data, email <a href="mailto:nika@quizball.io" className="underline">nika@quizball.io</a>.
      </p>
      {process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true' && (
        <button type="button" onClick={reopenAdPrivacyChoices} className="underline underline-offset-4">Privacy and cookie settings</button>
      )}
    </section>
  );
}
