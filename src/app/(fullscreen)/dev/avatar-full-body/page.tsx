'use client';

/**
 * Dev harness: the zone match's full-body avatar next to the app's own avatar art (proof the upper body is the real,
 * unchanged AvatarPreview), across skins and jerseys, the pose library frozen at key moments, and the FUT card on each
 * tier's own frame. Guarded by NODE_ENV.
 */

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AvatarPreview } from '@/components/AvatarPreview';
import type { AvatarCustomization } from '@/types/game';
import { AvatarFullBody } from '@/features/zone-match/AvatarFullBody';
import { FutCard } from '@/features/zone-match/ZoneMatchFutCard';
import {
  STAND,
  celebratePose,
  crouchPose,
  divePose,
  idlePose,
  jockeyPose,
  keeperSetPose,
  kneeSlidePose,
  runPose,
  slidePose,
  sprawlPose,
  stepOverPose,
  strikePose,
  type FullBodyPose,
} from '@/features/zone-match/zoneMatch.fullBody';

const AVATARS: { label: string; customization: AvatarCustomization }[] = [
  { label: 'Light · green', customization: { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' } },
  { label: 'Brown · red', customization: { skin: 'skin_male_dark', jersey: 'jersey_red', hair: 'hair_boy_basic' } },
  { label: 'Tan · Barcelona', customization: { skin: 'skin_male_white_alt', jersey: 'jersey_barcelona', hair: 'hair_wave' } },
  { label: 'Dark · Dortmund', customization: { skin: 'skin_male_dark_alt', jersey: 'jersey_dortmund', hair: 'hair_cornrows' } },
  { label: 'Light · Real', customization: { skin: 'skin_male_white', jersey: 'jersey_real', hair: 'hair_ronaldo_goat' } },
];

/** One seat per tier band (RP picks the tier, and with it the card's frame art). */
const TIER_SEATS = [
  { rp: 250, name: 'Academy' }, { rp: 400, name: 'Youth' }, { rp: 800, name: 'Reserve' }, { rp: 1200, name: 'Bench' },
  { rp: 1800, name: 'Rotation' }, { rp: 2500, name: 'Starting XI' }, { rp: 3500, name: 'Key player' }, { rp: 4500, name: 'Captain' },
  { rp: 6000, name: 'World class' }, { rp: 8000, name: 'Legend' }, { rp: 12000, name: 'GOAT' },
];

const POSES: { label: string; pose: FullBodyPose }[] = [
  { label: 'Stand', pose: STAND },
  { label: 'Idle', pose: idlePose(1.2) },
  { label: 'Run 1', pose: runPose(0.1, 1) },
  { label: 'Run 2', pose: runPose(0.35, 1) },
  { label: 'Run 3', pose: runPose(0.6, 1) },
  { label: 'Wind-up', pose: strikePose(0.55) },
  { label: 'Strike', pose: strikePose(0.82) },
  { label: 'Follow', pose: strikePose(1.05) },
  { label: 'Jockey', pose: jockeyPose(0.3) },
  { label: 'Keeper set', pose: keeperSetPose(0.2) },
  { label: 'Slide', pose: slidePose(1) },
  { label: 'Dive', pose: divePose(0.9) },
  { label: 'Sprawl', pose: sprawlPose(1, 0) },
  { label: 'Jump', pose: celebratePose(0.5) },
  { label: 'Knee slide', pose: kneeSlidePose() },
  { label: 'Crouch', pose: crouchPose(1) },
  { label: 'Step-over', pose: stepOverPose(0.3) },
];

export default function DevAvatarFullBodyPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return (
    <div className="min-h-dvh bg-surface-page-alt p-4 font-poppins text-white">
      <h1 className="mb-3 text-lg font-bold uppercase">App avatar → full body</h1>
      <div className="flex flex-wrap gap-4" data-shot="compare">
        {AVATARS.map(({ label, customization }, i) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 p-2">
            <div className="text-[10px] uppercase text-white/60">{label}</div>
            <div className="flex items-end gap-2">
              <div className="flex flex-col items-center gap-1">
                <AvatarDisplay customization={customization} size="md" />
                <AvatarPreview customization={customization} width={110} />
                <div className="text-[9px] uppercase text-white/40">App</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <AvatarFullBody customization={customization} seed={i} style={{ width: 110 }} />
                <div className="text-[9px] uppercase text-white/40">Full body</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-6 text-lg font-bold uppercase">FUT card per tier</h2>
      <div className="flex flex-wrap gap-4" data-shot="tiers">
        {TIER_SEATS.map(({ rp, name }, i) => (
          <FutCard
            key={rp}
            seat={{ name, avatarCustomization: AVATARS[i % AVATARS.length].customization, rankPoints: rp }}
            width={170}
            slots={i % 3 === 0 ? ['captains-armband', 'goalkeeper-gloves', 'long-ball'] : i % 3 === 1 ? ['fog', 'tiki-taka', null] : [null, null, null]}
          />
        ))}
      </div>
      <h2 className="mb-3 mt-6 text-lg font-bold uppercase">Poses</h2>
      <div className="flex flex-wrap gap-3" data-shot="poses">
        {POSES.map(({ label, pose }) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 px-2 pb-1 pt-6">
            <AvatarFullBody customization={AVATARS[1].customization} seed={1} pose={pose} style={{ width: 70 }} />
            <div className="text-[9px] uppercase text-white/50">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
