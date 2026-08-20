import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  RoadToGoalCommitment,
  RoadToGoalProof,
} from "@/lib/repositories/roadToGoal.repo";
import {
  verifyRoadToGoalCommitmentEnvelope,
  verifyRoadToGoalProof,
} from "../roadToGoalProof";

const roundId = "11111111-1111-4111-8111-111111111111";
const calibrationId = "22222222-2222-4222-8222-222222222222";
const serverSeed = "ab".repeat(32);
const clientSeed = "client-proof-seed";
const manifest = {
  game: "road-to-goal" as const,
  version: 3 as const,
  fairnessVersion: 1,
  targetRtpBp: 9_800,
  desiredSkillGapBp: 1_000,
  minimumAccuracyBp: 3_500,
  maximumAccuracyBp: 9_500,
  minimumSurvivalBp: 50,
  maximumSurvivalBp: 9_950,
  multiplierLadderBp: [10_300, 10_800, 11_500, 12_400, 13_600, 15_200, 17_200, 19_800, 23_500, 29_000, 40_000],
  difficulties: ["easy", "easy", "easy", "easy", "medium", "medium", "medium", "medium", "hard", "hard", "hard"] as ("easy" | "medium" | "hard")[],
  zoneAccuracyPriorsBp: [8_000, 8_042, 8_084, 8_126, 6_669, 6_713, 6_757, 6_802, 5_347, 5_393, 5_440],
  timeoutTreatment: "gameplay_incorrect_editorial_separate" as const,
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

const rulesManifestHash = createHash("sha256").update(canonicalJson(manifest)).digest("hex");
const questionSet = manifest.difficulties.map((difficulty, index) => ({
  zone: index + 1,
  commitment_salt: createHash("sha256").update(`salt-${index + 1}`).digest("hex"),
  question_id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, "0")}`,
  difficulty,
  prompt: { en: `Question ${index + 1}`, ka: `Question ${index + 1}` },
  image: null,
  options: ["a", "b", "c", "d"].map((option) => ({
    id: `option-${option}`,
    text: { en: `Option ${option}`, ka: `Option ${option}` },
  })),
  correct_option_id: "option-a",
  expected_accuracy_bp: manifest.zoneAccuracyPriorsBp[index]!,
  calibration_source: "difficulty_prior" as const,
}));
const questionHashes = questionSet.map((question) => createHash("sha256")
  .update(canonicalJson(question))
  .digest("hex"));
const questionSetHash = createHash("sha256")
  .update(canonicalJson(questionHashes))
  .digest("hex");
const commitHash = createHash("sha256").update(JSON.stringify([
  "road-to-goal-commitment",
  3,
  roundId,
  calibrationId,
  rulesManifestHash,
  questionSetHash,
  25,
  null,
  serverSeed,
])).digest("hex");

function firstRollBp(): number {
  const input = JSON.stringify(["road-to-goal", 1, clientSeed, roundId, 0]);
  const rejectionLimit = Math.floor(0x1_0000_0000 / 10_000) * 10_000;
  const digest = createHmac("sha256", serverSeed).update(input).digest();
  for (let offset = 0; offset + 4 <= digest.length; offset += 4) {
    const value = digest.readUInt32BE(offset);
    if (value < rejectionLimit) return value % 10_000;
  }
  throw new Error("unexpected rejection-only digest");
}

describe("Road to Goal browser proof verification", () => {
  const commitment: RoadToGoalCommitment = {
    commitment_id: roundId,
    commitment_version: 3,
    calibration_version_id: calibrationId,
    stake_coins: 25,
    auto_cashout_zone: null,
    commit_hash: commitHash,
    rules_manifest: manifest,
    rules_manifest_hash: rulesManifestHash,
    question_set_hash: questionSetHash,
    question_hashes: questionHashes,
    expires_at: "2026-08-20T12:05:00.000Z",
    server_now: "2026-08-20T12:00:00.000Z",
  };

  it("verifies the manifest before player-seed disclosure", async () => {
    await expect(verifyRoadToGoalCommitmentEnvelope(commitment)).resolves.toBe(true);
    await expect(verifyRoadToGoalCommitmentEnvelope({
      ...commitment,
      rules_manifest_hash: "00".repeat(32),
    })).resolves.toBe(false);
    const alteredManifest = { ...manifest, targetRtpBp: 9_700 };
    await expect(verifyRoadToGoalCommitmentEnvelope({
      ...commitment,
      rules_manifest: alteredManifest,
      rules_manifest_hash: createHash("sha256")
        .update(canonicalJson(alteredManifest))
        .digest("hex"),
    })).resolves.toBe(false);
  });

  it("verifies the reveal and rejects a tampered roll", async () => {
    const roll = firstRollBp();
    const survived = roll < 8_715;
    const proof: RoadToGoalProof = {
      version: 3,
      round_id: roundId,
      calibration_version_id: calibrationId,
      commitment_version: 3,
      commit_hash: commitHash,
      rules_manifest: manifest,
      rules_manifest_hash: rulesManifestHash,
      question_set_hash: questionSetHash,
      question_hashes: questionHashes,
      stake_coins: 25,
      auto_cashout_zone: null,
      question_set: questionSet.slice(0, 1),
      server_seed: serverSeed,
      client_seed: clientSeed,
      status: survived ? "cashed" : "lost",
      payout_coins: survived ? 25.75 : 0,
      cleared_zones: survived ? 1 : 0,
      zones: [{
        zone: 1,
        question_id: questionSet[0]!.question_id,
        answer_option_id: "option-b",
        correct_option_id: "option-a",
        outcome: "wrong",
        expected_accuracy_bp: 8_000,
        target_survival_bp: 9_515,
        correct_survival_bp: 9_715,
        wrong_survival_bp: 8_715,
        applied_survival_bp: 8_715,
        roll_bp: roll,
        survived,
      }],
    };

    await expect(verifyRoadToGoalProof(proof, commitment)).resolves.toBe(true);
    await expect(verifyRoadToGoalProof(proof, {
      ...commitment,
      commit_hash: "00".repeat(32),
    })).resolves.toBe(false);
    await expect(verifyRoadToGoalProof({
      ...proof,
      zones: [{ ...proof.zones[0]!, roll_bp: (roll + 1) % 10_000 }],
    }, commitment)).resolves.toBe(false);
    await expect(verifyRoadToGoalProof({
      ...proof,
      zones: [{
        ...proof.zones[0]!,
        correct_survival_bp: proof.zones[0]!.correct_survival_bp + 1,
      }],
    }, commitment)).resolves.toBe(false);
    await expect(verifyRoadToGoalProof({
      ...proof,
      question_set: proof.question_set.map((question, index) => (
        index === 0 ? { ...question, expected_accuracy_bp: 7_999 } : question
      )),
    }, commitment)).resolves.toBe(false);
    await expect(verifyRoadToGoalProof({
      ...proof,
      status: survived ? "lost" : "cashed",
    }, commitment)).resolves.toBe(false);
  });
});
