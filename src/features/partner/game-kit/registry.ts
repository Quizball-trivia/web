import type { PartnerGameRegistry } from "./PartnerGameHost";
import { PartnerCardDetectiveGame } from "../games/card-detective/PartnerCardDetectiveGame";
import { CareerPathPartner, CountdownPartner, HigherLowerPartner, PickEmPartner, TrueFalsePartner } from "../games/dailies";
import { PartnerGuessTheGoalGame } from "../games/guess-the-goal/PartnerGuessTheGoalGame";
import { QuizBoardPartner } from "../games/quiz-board/QuizBoardPartner";
import { PartnerRankedScreen } from "../games/ranked/PartnerRankedScreen";
import { RoadToGoalPartner } from "../games/road-to-goal/RoadToGoalPartner";
import { TriviaMinesPartner } from "../games/trivia-mines/TriviaMinesPartner";

/** One entry per partner game screen. */
export const partnerGameRegistry: PartnerGameRegistry = {
  ranked: PartnerRankedScreen,
  countdown: CountdownPartner,
  "true-false": TrueFalsePartner,
  "pick-em": PickEmPartner,
  "career-path": CareerPathPartner,
  "higher-lower": HigherLowerPartner,
  "guess-the-goal": PartnerGuessTheGoalGame,
  "card-detective": PartnerCardDetectiveGame,
  "quiz-board": QuizBoardPartner,
  "road-to-goal": RoadToGoalPartner,
  "trivia-mines": TriviaMinesPartner,
};
