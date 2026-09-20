import type {
  RoadToGoalCommitment,
  RoadToGoalProof,
} from "@/lib/repositories/roadToGoal.repo";

const BASIS_POINTS = 10_000;
const UINT32_RANGE = 0x1_0000_0000;
const COMMITMENT_VERSION = 3;
const EXPECTED_RULES_MANIFEST = {
  game: "road-to-goal",
  version: 3,
  fairnessVersion: 1,
  targetRtpBp: 9_800,
  desiredSkillGapBp: 1_000,
  minimumAccuracyBp: 3_500,
  maximumAccuracyBp: 9_500,
  minimumSurvivalBp: 50,
  maximumSurvivalBp: 9_950,
  multiplierLadderBp: [
    10_300, 10_800, 11_500, 12_400, 13_600, 15_200,
    17_200, 19_800, 23_500, 29_000, 40_000,
  ],
  difficulties: [
    "easy", "easy", "easy", "easy",
    "medium", "medium", "medium", "medium",
    "hard", "hard", "hard",
  ],
  zoneAccuracyPriorsBp: [
    8_000, 8_042, 8_084, 8_126,
    6_669, 6_713, 6_757, 6_802,
    5_347, 5_393, 5_440,
  ],
  timeoutTreatment: "gameplay_incorrect_editorial_separate",
} as const;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const rendered = JSON.stringify(value);
    if (rendered === undefined) throw new TypeError("Unsupported commitment value");
    return rendered;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hmacSha256(keyHex: string, value: string): Promise<ArrayBuffer> {
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new TypeError("Invalid server seed");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keyHex),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}

async function rollBp(serverSeed: string, input: string): Promise<number> {
  const rejectionLimit = Math.floor(UINT32_RANGE / BASIS_POINTS) * BASIS_POINTS;
  let counter = 0;
  for (;;) {
    const message = counter === 0 ? input : `${input}:${counter}`;
    const digest = new DataView(await hmacSha256(serverSeed, message));
    for (let offset = 0; offset + 4 <= digest.byteLength; offset += 4) {
      const value = digest.getUint32(offset, false);
      if (value < rejectionLimit) return value % BASIS_POINTS;
    }
    counter += 1;
  }
}

function expectedOdds(
  manifest: RoadToGoalProof["rules_manifest"],
  zoneIndex: number,
  rawAccuracyBp: number,
) {
  const multiplier = manifest.multiplierLadderBp[zoneIndex];
  const previous = zoneIndex === 0
    ? manifest.targetRtpBp
    : manifest.multiplierLadderBp[zoneIndex - 1];
  if (!multiplier || !previous) throw new RangeError("Invalid multiplier ladder");
  const targetSurvivalBp = Number(
    (
      BigInt(previous) * BigInt(BASIS_POINTS)
      + BigInt(multiplier) / BigInt(2)
    ) / BigInt(multiplier),
  );
  const expectedAccuracyBp = Math.min(
    manifest.maximumAccuracyBp,
    Math.max(manifest.minimumAccuracyBp, rawAccuracyBp),
  );

  for (let gapBp = manifest.desiredSkillGapBp; gapBp > 0; gapBp -= 1) {
    const idealWrongNumerator = targetSurvivalBp * BASIS_POINTS - expectedAccuracyBp * gapBp;
    const lowerWrongBp = Math.floor(idealWrongNumerator / BASIS_POINTS);
    let closest: { correct: number; wrong: number; error: number } | null = null;
    for (const wrong of [lowerWrongBp, lowerWrongBp + 1]) {
      const correct = wrong + gapBp;
      if (
        wrong < manifest.minimumSurvivalBp
        || correct > manifest.maximumSurvivalBp
      ) continue;
      const weighted = expectedAccuracyBp * correct
        + (BASIS_POINTS - expectedAccuracyBp) * wrong;
      const error = Math.abs(weighted - targetSurvivalBp * BASIS_POINTS);
      if (!closest || error < closest.error) closest = { correct, wrong, error };
    }
    if (closest) {
      return {
        expectedAccuracyBp,
        targetSurvivalBp,
        correctSurvivalBp: closest.correct,
        wrongSurvivalBp: closest.wrong,
      };
    }
  }
  throw new RangeError("Unable to reproduce survival odds");
}

function questionCommitmentView(
  question: RoadToGoalProof["question_set"][number],
) {
  return {
    zone: question.zone,
    commitment_salt: question.commitment_salt,
    question_id: question.question_id,
    difficulty: question.difficulty,
    prompt: question.prompt,
    image: question.image ?? null,
    options: question.options,
    correct_option_id: question.correct_option_id,
    expected_accuracy_bp: question.expected_accuracy_bp,
    calibration_source: question.calibration_source,
  };
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function verifyRoadToGoalCommitmentEnvelope(
  commitment: RoadToGoalCommitment,
): Promise<boolean> {
  try {
    return (
      commitment.commitment_version === COMMITMENT_VERSION
      && commitment.rules_manifest.game === "road-to-goal"
      && commitment.rules_manifest.version === COMMITMENT_VERSION
      && canonicalJson(commitment.rules_manifest) === canonicalJson(EXPECTED_RULES_MANIFEST)
      && /^[0-9a-f]{64}$/i.test(commitment.commit_hash)
      && /^[0-9a-f]{64}$/i.test(commitment.question_set_hash)
      && commitment.question_hashes.length === 11
      && commitment.question_hashes.every((hash) => /^[0-9a-f]{64}$/i.test(hash))
      && await sha256(canonicalJson(commitment.question_hashes))
        === commitment.question_set_hash.toLowerCase()
      && [10, 25, 50].includes(commitment.stake_coins)
      && (
        commitment.auto_cashout_zone === null
        || Number.isInteger(commitment.auto_cashout_zone)
          && commitment.auto_cashout_zone >= 1
          && commitment.auto_cashout_zone <= 10
      )
      && await sha256(canonicalJson(commitment.rules_manifest))
        === commitment.rules_manifest_hash.toLowerCase()
    );
  } catch {
    return false;
  }
}

/** Independently verifies the rules manifest, server reveal, every HMAC roll,
 * applied threshold, and survival result returned by the backend. */
export async function verifyRoadToGoalProof(
  proof: RoadToGoalProof,
  committedBeforeSeed: RoadToGoalCommitment,
): Promise<boolean> {
  try {
    if (
      !(await verifyRoadToGoalCommitmentEnvelope(committedBeforeSeed))
      ||
      proof.version !== COMMITMENT_VERSION
      || proof.commitment_version !== COMMITMENT_VERSION
      || !proof.calibration_version_id
      || canonicalJson(proof.rules_manifest) !== canonicalJson(EXPECTED_RULES_MANIFEST)
      || await sha256(canonicalJson(proof.rules_manifest))
        !== proof.rules_manifest_hash.toLowerCase()
    ) return false;

    if (
      committedBeforeSeed.commitment_id !== proof.round_id
      || committedBeforeSeed.commitment_version !== proof.commitment_version
      || committedBeforeSeed.calibration_version_id !== proof.calibration_version_id
      || committedBeforeSeed.stake_coins !== proof.stake_coins
      || committedBeforeSeed.auto_cashout_zone !== proof.auto_cashout_zone
      || committedBeforeSeed.commit_hash.toLowerCase() !== proof.commit_hash.toLowerCase()
      || committedBeforeSeed.rules_manifest_hash.toLowerCase()
        !== proof.rules_manifest_hash.toLowerCase()
      || committedBeforeSeed.question_set_hash.toLowerCase()
        !== proof.question_set_hash.toLowerCase()
      || canonicalJson(committedBeforeSeed.rules_manifest) !== canonicalJson(proof.rules_manifest)
      || !sameStrings(committedBeforeSeed.question_hashes, proof.question_hashes)
    ) return false;

    if (
      proof.question_hashes.length !== 11
      || proof.question_hashes.some((hash) => !/^[0-9a-f]{64}$/i.test(hash))
      || await sha256(canonicalJson(proof.question_hashes))
        !== proof.question_set_hash.toLowerCase()
      || proof.zones.length < 1
      || proof.zones.length > 11
      || proof.question_set.length !== proof.zones.length
      || proof.question_set.some((question, index) => question.zone !== index + 1)
    ) return false;

    for (const [index, question] of proof.question_set.entries()) {
      if (
        await sha256(canonicalJson(questionCommitmentView(question)))
          !== proof.question_hashes[index]?.toLowerCase()
      ) return false;
    }

    const expectedCommitment = await sha256(JSON.stringify([
      "road-to-goal-commitment",
      COMMITMENT_VERSION,
      proof.round_id,
      proof.calibration_version_id,
      proof.rules_manifest_hash.toLowerCase(),
      proof.question_set_hash.toLowerCase(),
      proof.stake_coins,
      proof.auto_cashout_zone,
      proof.server_seed.toLowerCase(),
    ]));
    if (expectedCommitment !== proof.commit_hash.toLowerCase()) return false;

    for (const zone of proof.zones) {
      const zoneIndex = zone.zone - 1;
      if (zoneIndex < 0 || zoneIndex > 10 || zone.zone !== proof.zones.indexOf(zone) + 1) {
        return false;
      }
      const question = proof.question_set[zoneIndex];
      if (
        !question
        || question.question_id !== zone.question_id
        || question.correct_option_id !== zone.correct_option_id
        || (zone.outcome === "correct" && zone.answer_option_id !== zone.correct_option_id)
        || (zone.outcome === "wrong" && (
          zone.answer_option_id === null
          || zone.answer_option_id === zone.correct_option_id
        ))
      ) return false;
      const odds = expectedOdds(
        proof.rules_manifest,
        zoneIndex,
        question.expected_accuracy_bp,
      );
      const input = JSON.stringify([
        "road-to-goal",
        proof.rules_manifest.fairnessVersion,
        proof.client_seed,
        proof.round_id,
        zoneIndex,
      ]);
      const expectedRoll = await rollBp(proof.server_seed, input);
      const expectedApplied = zone.outcome === "correct"
        ? zone.correct_survival_bp
        : zone.wrong_survival_bp;
      if (
        expectedRoll !== zone.roll_bp
        || zone.expected_accuracy_bp !== odds.expectedAccuracyBp
        || zone.target_survival_bp !== odds.targetSurvivalBp
        || zone.correct_survival_bp !== odds.correctSurvivalBp
        || zone.wrong_survival_bp !== odds.wrongSurvivalBp
        || zone.applied_survival_bp !== expectedApplied
        || zone.survived !== (expectedRoll < expectedApplied)
      ) return false;
    }


    const allSurvived = proof.zones.every((zone) => zone.survived);
    const lastZone = proof.zones.at(-1);
    if (!lastZone) return false;
    if (proof.status === "lost") {
      if (
        lastZone.survived
        || proof.zones.slice(0, -1).some((zone) => !zone.survived)
        || proof.cleared_zones !== proof.zones.length - 1
        || proof.payout_coins !== 0
      ) return false;
    } else {
      const expectedCleared = proof.zones.length;
      const expectedMultiplier = proof.rules_manifest.multiplierLadderBp[expectedCleared - 1];
      if (!allSurvived || !expectedMultiplier || proof.cleared_zones !== expectedCleared) return false;
      const expectedPayout = proof.stake_coins * expectedMultiplier / BASIS_POINTS;
      if (Math.abs(proof.payout_coins - expectedPayout) > 1e-9) return false;
      if (
        (proof.status === "completed" && expectedCleared !== 11)
        || (proof.status === "cashed" && expectedCleared >= 11)
      ) return false;
    }
    return true;
  } catch {
    return false;
  }
}
