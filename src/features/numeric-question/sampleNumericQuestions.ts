import type { I18nField } from '@/lib/realtime/socket.types';

export interface SampleNumericQuestion {
  id: string;
  prompt: I18nField;
  unit: I18nField;
  value: number;
  /** Granularity of the answer, used to round scripted guesses. */
  step: number;
  /** Decimals a guess may carry. */
  precision: number;
}

/**
 * Real Stat Sniper questions (quizball-backend scripts/stat-sniper-content/questions.json) for the dev harnesses that
 * play numeric questions without a backend.
 */
export const SAMPLE_NUMERIC_QUESTIONS: SampleNumericQuestion[] = [
  { id: 'ss-1', prompt: {"en": "Transfer fee: Mario Balotelli → Liverpool, 14/15?", "ka": "ტრანსფერის ღირებულება: მარიო ბალოტელი → ლივერპული, 14/15?", "es": "Precio del traspaso: Mario Balotelli → Liverpool, 14/15?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 20, step: 1, precision: 0 },
  { id: 'ss-2', prompt: {"en": "Transfer fee: Neymar → Paris Saint-Germain, 17/18?", "ka": "ტრანსფერის ღირებულება: ნეიმარი → პარი სენ-ჟერმენი, 17/18?", "es": "Precio del traspaso: Neymar → Paris Saint-Germain, 17/18?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 222, step: 1, precision: 0 },
  { id: 'ss-3', prompt: {"en": "Transfer fee: Edson Álvarez → West Ham United, 23/24?", "ka": "ტრანსფერის ღირებულება: ედსონ ალვარესი → ვესტ ჰემი, 23/24?", "es": "Precio del traspaso: Edson Álvarez → West Ham United, 23/24?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 38, step: 1, precision: 0 },
  { id: 'ss-4', prompt: {"en": "Transfer fee: Nélson Semedo → FC Barcelona, 17/18?", "ka": "ტრანსფერის ღირებულება: ნელსონ სემედუ → ბარსელონა, 17/18?", "es": "Precio del traspaso: Nélson Semedo → FC Barcelona, 17/18?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 36, step: 1, precision: 0 },
  { id: 'ss-5', prompt: {"en": "Transfer fee: Georginio Wijnaldum → Liverpool, 16/17?", "ka": "ტრანსფერის ღირებულება: ჯორჯინიო ვეინალდუმი → ლივერპული, 16/17?", "es": "Precio del traspaso: Georginio Wijnaldum → Liverpool, 16/17?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 28, step: 1, precision: 0 },
  { id: 'ss-6', prompt: {"en": "Transfer fee: Randal Kolo Muani → Paris Saint-Germain, 23/24?", "ka": "ტრანსფერის ღირებულება: რანდალ კოლო მუანი → პარი სენ-ჟერმენი, 23/24?", "es": "Precio del traspaso: Randal Kolo Muani → Paris Saint-Germain, 23/24?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 95, step: 1, precision: 0 },
  { id: 'ss-7', prompt: {"en": "Transfer fee: Christian Pulisic → AC Milan, 23/24?", "ka": "ტრანსფერის ღირებულება: კრისტიან პულისიჩი → მილანი, 23/24?", "es": "Precio del traspaso: Christian Pulisic → AC Milan, 23/24?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 21, step: 1, precision: 0 },
  { id: 'ss-8', prompt: {"en": "Transfer fee: Luis Díaz → FC Bayern Munich, 25/26?", "ka": "ტრანსფერის ღირებულება: ლუის დიასი → ბაიერნ მიუნხენი, 25/26?", "es": "Precio del traspaso: Luis Díaz → FC Bayern Munich, 25/26?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 70, step: 1, precision: 0 },
  { id: 'ss-9', prompt: {"en": "League goals: Matheus Cunha, Wolves, 2023/24?", "ka": "ლიგის გოლები: მატეუს კუნია, Wolves, 2023/24?", "es": "Goles en liga: Matheus Cunha, Wolves, 2023/24?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 12, step: 1, precision: 0 },
  // Corrected (source file says 18): the dataset files the June–July 2020 restart games under 2020/21.
  { id: 'ss-10', prompt: {"en": "League goals: Raheem Sterling, Manchester City, 2020/21?", "ka": "ლიგის გოლები: რაჰიმ სტერლინგი, მანჩესტერ სიტი, 2020/21?", "es": "Goles en liga: Raheem Sterling, Manchester City, 2020/21?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 10, step: 1, precision: 0 },
  { id: 'ss-11', prompt: {"en": "League goals: Paulo Dybala, AS Roma, 2022/23?", "ka": "ლიგის გოლები: პაულო დიბალა, რომა, 2022/23?", "es": "Goles en liga: Paulo Dybala, AS Roma, 2022/23?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 12, step: 1, precision: 0 },
  { id: 'ss-12', prompt: {"en": "League goals: Riyad Mahrez, Leicester City, 2017/18?", "ka": "ლიგის გოლები: რიად მაჰრეზი, ლესტერი, 2017/18?", "es": "Goles en liga: Riyad Mahrez, Leicester City, 2017/18?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 12, step: 1, precision: 0 },
  // Corrected (source file says 14, his tally before the 2020 restart): 17 Premier League goals.
  { id: 'ss-13', prompt: {"en": "League goals: Marcus Rashford, Manchester United, 2019/20?", "ka": "ლიგის გოლები: მარკუს რაშფორდი, მანჩესტერ იუნაიტედი, 2019/20?", "es": "Goles en liga: Marcus Rashford, Manchester United, 2019/20?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 17, step: 1, precision: 0 },
  { id: 'ss-14', prompt: {"en": "League goals: Mario Mandzukic, FC Bayern Munich, 2012/13?", "ka": "ლიგის გოლები: მარიო მანჯუკიჩი, ბაიერნ მიუნხენი, 2012/13?", "es": "Goles en liga: Mario Mandzukic, FC Bayern Munich, 2012/13?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 15, step: 1, precision: 0 },
  { id: 'ss-15', prompt: {"en": "League goals: Cristiano Ronaldo, Real Madrid CF, 2017/18?", "ka": "ლიგის გოლები: კრიშტიანუ რონალდუ, რეალ მადრიდი, 2017/18?", "es": "Goles en liga: Cristiano Ronaldo, Real Madrid CF, 2017/18?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 26, step: 1, precision: 0 },
  { id: 'ss-16', prompt: {"en": "League goals: Alexis Sánchez, FC Barcelona, 2013/14?", "ka": "ლიგის გოლები: ალექსის სანჩესი, ბარსელონა, 2013/14?", "es": "Goles en liga: Alexis Sánchez, FC Barcelona, 2013/14?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 19, step: 1, precision: 0 },
  { id: 'ss-17', prompt: {"en": "Height: Christian Eriksen?", "ka": "სიმაღლე: კრისტიან ერიკსენი?", "es": "Estatura: Christian Eriksen?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 182, step: 1, precision: 0 },
  { id: 'ss-18', prompt: {"en": "Height: Dominik Szoboszlai?", "ka": "სიმაღლე: დომინიკ სობოსლაი?", "es": "Estatura: Dominik Szoboszlai?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 187, step: 1, precision: 0 },
  { id: 'ss-19', prompt: {"en": "Height: Ángel Di María?", "ka": "სიმაღლე: ანხელ დი მარია?", "es": "Estatura: Ángel Di María?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 178, step: 1, precision: 0 },
  { id: 'ss-20', prompt: {"en": "Height: João Félix?", "ka": "სიმაღლე: ჟოაუ ფელიქსი?", "es": "Estatura: João Félix?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 179, step: 1, precision: 0 },
  { id: 'ss-21', prompt: {"en": "Height: Romelu Lukaku?", "ka": "სიმაღლე: რომელუ ლუკაკუ?", "es": "Estatura: Romelu Lukaku?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 190, step: 1, precision: 0 },
  { id: 'ss-22', prompt: {"en": "Peak Transfermarkt value: Joshua Kimmich?", "ka": "პიკური საბაზრო ღირებულება (Transfermarkt): ჯოშუა კიმიხი?", "es": "Valor máximo en Transfermarkt: Joshua Kimmich?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 90, step: 1, precision: 0 },
  { id: 'ss-23', prompt: {"en": "Peak Transfermarkt value: Diogo Jota?", "ka": "პიკური საბაზრო ღირებულება (Transfermarkt): დიოგუ ჟოტა?", "es": "Valor máximo en Transfermarkt: Diogo Jota?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 60, step: 1, precision: 0 },
  { id: 'ss-24', prompt: {"en": "Peak Transfermarkt value: Darwin Núñez?", "ka": "პიკური საბაზრო ღირებულება (Transfermarkt): დარვინ ნუნიესი?", "es": "Valor máximo en Transfermarkt: Darwin Núñez?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 70, step: 1, precision: 0 },
  { id: 'ss-25', prompt: {"en": "Peak Transfermarkt value: Romelu Lukaku?", "ka": "პიკური საბაზრო ღირებულება (Transfermarkt): რომელუ ლუკაკუ?", "es": "Valor máximo en Transfermarkt: Romelu Lukaku?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 100, step: 1, precision: 0 },
  { id: 'ss-26', prompt: {"en": "Peak Transfermarkt value: Ryan Gravenberch?", "ka": "პიკური საბაზრო ღირებულება (Transfermarkt): რაიან გრავენბერხი?", "es": "Valor máximo en Transfermarkt: Ryan Gravenberch?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 90, step: 1, precision: 0 },
  { id: 'ss-27', prompt: {"en": "Attendance: Dnipro vs Sevilla FC, Europa League final 2014/15?", "ka": "დამსწრეთა რაოდენობა: Dnipro – სევილია, ევროპა ლიგა ფინალი 2014/15?", "es": "Asistencia: Dnipro vs Sevilla FC, final de Europa League 2014/15?"}, unit: {"en": "spectators", "ka": "მაყურებელი", "es": "espectadores"}, value: 45000, step: 500, precision: 0 },
  { id: 'ss-28', prompt: {"en": "Attendance: Real Madrid CF vs Atlético de Madrid, Champions League final 2013/14?", "ka": "დამსწრეთა რაოდენობა: რეალ მადრიდი – ატლეტიკო, ჩემპიონთა ლიგა ფინალი 2013/14?", "es": "Asistencia: Real Madrid CF vs Atlético de Madrid, final de Champions League 2013/14?"}, unit: {"en": "spectators", "ka": "მაყურებელი", "es": "espectadores"}, value: 60976, step: 500, precision: 0 },
  { id: 'ss-29', prompt: {"en": "Attendance: Manchester City vs Inter Milan, Champions League final 2022/23?", "ka": "დამსწრეთა რაოდენობა: მანჩესტერ სიტი – ინტერი, ჩემპიონთა ლიგა ფინალი 2022/23?", "es": "Asistencia: Manchester City vs Inter Milan, final de Champions League 2022/23?"}, unit: {"en": "spectators", "ka": "მაყურებელი", "es": "espectadores"}, value: 72000, step: 500, precision: 0 },
  { id: 'ss-30', prompt: {"en": "Attendance: Marseille vs Atlético de Madrid, Europa League final 2017/18?", "ka": "დამსწრეთა რაოდენობა: მარსელი – ატლეტიკო, ევროპა ლიგა ფინალი 2017/18?", "es": "Asistencia: Marseille vs Atlético de Madrid, final de Europa League 2017/18?"}, unit: {"en": "spectators", "ka": "მაყურებელი", "es": "espectadores"}, value: 55768, step: 500, precision: 0 },
];
