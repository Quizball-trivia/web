import type { PartnerLocale } from "../../partnerCopy";

interface RankedCopy {
  back: string;
  resume: string;
  unavailable: string;
  settling: string;
  cancelledTitle: string;
  cancelledReturned: string;
  cancelledUsed: string;
  resultTitle: string;
  resultUnavailable: string;
  victory: string;
  defeat: string;
  draw: string;
}

const COPY: Record<PartnerLocale, RankedCopy> = {
  en: {
    back: "Back to games",
    resume: "Resume match",
    unavailable: "Ranked is not available right now. Please try again in a moment.",
    settling: "Counting your points…",
    cancelledTitle: "Match cancelled",
    cancelledReturned: "No points this time. Your play was returned.",
    cancelledUsed: "No points this time. The play counts as used.",
    resultTitle: "Match over",
    resultUnavailable: "We could not load the result here. Your plays left are on the games list.",
    victory: "Victory",
    defeat: "Defeat",
    draw: "Draw",
  },
  ka: {
    back: "თამაშებზე დაბრუნება",
    resume: "მატჩში დაბრუნება",
    unavailable: "რეიტინგული მატჩი ახლა მიუწვდომელია. სცადეთ ცოტა ხანში.",
    settling: "ქულებს ვითვლით…",
    cancelledTitle: "მატჩი გაუქმდა",
    cancelledReturned: "ამჯერად ქულები არ არის. თამაში დაგიბრუნდათ.",
    cancelledUsed: "ამჯერად ქულები არ არის. თამაში გამოყენებულად ითვლება.",
    resultTitle: "მატჩი დასრულდა",
    resultUnavailable: "შედეგის ჩატვირთვა ვერ მოხერხდა. დარჩენილი თამაშები თამაშების სიაშია.",
    victory: "გამარჯვება",
    defeat: "მარცხი",
    draw: "ფრე",
  },
};

export function rankedCopy(locale: PartnerLocale): RankedCopy {
  return COPY[locale];
}
