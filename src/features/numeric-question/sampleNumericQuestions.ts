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
 * Invented practice questions (made-up players, clubs and numbers) for the dev harnesses that play numeric questions
 * without a backend. Never put real questions or answers here: the repo is public — real content lives only in the
 * database (see CLAUDE.md).
 */
export const SAMPLE_NUMERIC_QUESTIONS: SampleNumericQuestion[] = [
  { id: 'practice-1', prompt: {"en": "Transfer fee: Mateo Varga → Northport FC, 21/22?", "ka": "ტრანსფერის ღირებულება: მატეო ვარგა → ნორთპორტი, 21/22?", "es": "Precio del traspaso: Mateo Varga → Northport FC, 21/22?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 34, step: 1, precision: 0 },
  { id: 'practice-2', prompt: {"en": "Transfer fee: Ilias Brandt → Real Corvena, 19/20?", "ka": "ტრანსფერის ღირებულება: ილიას ბრანდტი → რეალ კორვენა, 19/20?", "es": "Precio del traspaso: Ilias Brandt → Real Corvena, 19/20?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 58, step: 1, precision: 0 },
  { id: 'practice-3', prompt: {"en": "Transfer fee: Tomás Okafor → Atlético Brisa, 23/24?", "ka": "ტრანსფერის ღირებულება: ტომას ოკაფორი → ატლეტიკო ბრიზა, 23/24?", "es": "Precio del traspaso: Tomás Okafor → Atlético Brisa, 23/24?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 22, step: 1, precision: 0 },
  { id: 'practice-4', prompt: {"en": "Transfer fee: Noah Lindqvist → Kingsbridge United, 22/23?", "ka": "ტრანსფერის ღირებულება: ნოა ლინდქვისტი → კინგსბრიჯ იუნაიტედი, 22/23?", "es": "Precio del traspaso: Noah Lindqvist → Kingsbridge United, 22/23?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 71, step: 1, precision: 0 },
  { id: 'practice-5', prompt: {"en": "League goals: Dario Pellegrini, Sporting Alvor, 2020/21?", "ka": "ლიგის გოლები: დარიო პელეგრინი, სპორტინგ ალვორი, 2020/21?", "es": "Goles en liga: Dario Pellegrini, Sporting Alvor, 2020/21?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 17, step: 1, precision: 0 },
  { id: 'practice-6', prompt: {"en": "League goals: Kwame Asante, Rivermouth Athletic, 2023/24?", "ka": "ლიგის გოლები: კვამე ასანტე, რივერმაუთ ატლეტიკი, 2023/24?", "es": "Goles en liga: Kwame Asante, Rivermouth Athletic, 2023/24?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 11, step: 1, precision: 0 },
  { id: 'practice-7', prompt: {"en": "League goals: Jonas Weber, FC Halden, 2018/19?", "ka": "ლიგის გოლები: იონას ვებერი, ჰალდენი, 2018/19?", "es": "Goles en liga: Jonas Weber, FC Halden, 2018/19?"}, unit: {"en": "goals", "ka": "გოლი", "es": "goles"}, value: 24, step: 1, precision: 0 },
  { id: 'practice-8', prompt: {"en": "League assists: Rafael Cunhal, Deportivo Mareas, 2021/22?", "ka": "ლიგის ასისტები: რაფაელ კუნიალი, დეპორტივო მარეასი, 2021/22?", "es": "Asistencias en liga: Rafael Cunhal, Deportivo Mareas, 2021/22?"}, unit: {"en": "assists", "ka": "ასისტი", "es": "asistencias"}, value: 9, step: 1, precision: 0 },
  { id: 'practice-9', prompt: {"en": "Height: Luka Mardaleishvili?", "ka": "სიმაღლე: ლუკა მარდალეიშვილი?", "es": "Estatura: Luka Mardaleishvili?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 186, step: 1, precision: 0 },
  { id: 'practice-10', prompt: {"en": "Height: Sami Haddad?", "ka": "სიმაღლე: სამი ჰადადი?", "es": "Estatura: Sami Haddad?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 174, step: 1, precision: 0 },
  { id: 'practice-11', prompt: {"en": "Height: Erik Solberg?", "ka": "სიმაღლე: ერიკ სოლბერგი?", "es": "Estatura: Erik Solberg?"}, unit: {"en": "cm", "ka": "სმ", "es": "cm"}, value: 193, step: 1, precision: 0 },
  { id: 'practice-12', prompt: {"en": "Peak market value: Ángel Ferreyra?", "ka": "პიკური საბაზრო ღირებულება: ანხელ ფერეირა?", "es": "Valor máximo de mercado: Ángel Ferreyra?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 45, step: 1, precision: 0 },
  { id: 'practice-13', prompt: {"en": "Peak market value: Theo Marchetti?", "ka": "პიკური საბაზრო ღირებულება: თეო მარკეტი?", "es": "Valor máximo de mercado: Theo Marchetti?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 80, step: 1, precision: 0 },
  { id: 'practice-14', prompt: {"en": "Peak market value: Yusuf Demir Kaya?", "ka": "პიკური საბაზრო ღირებულება: იუსუფ დემირ კაია?", "es": "Valor máximo de mercado: Yusuf Demir Kaya?"}, unit: {"en": "€M", "ka": "მლნ €", "es": "M€"}, value: 28, step: 1, precision: 0 },
  { id: 'practice-15', prompt: {"en": "Caps for his country: Marco Bellandi?", "ka": "მატჩები ნაკრებში: მარკო ბელანდი?", "es": "Partidos internacionales: Marco Bellandi?"}, unit: {"en": "caps", "ka": "მატჩი", "es": "partidos"}, value: 64, step: 1, precision: 0 },
  { id: 'practice-16', prompt: {"en": "Caps for his country: Oskar Nyberg?", "ka": "მატჩები ნაკრებში: ოსკარ ნიბერგი?", "es": "Partidos internacionales: Oskar Nyberg?"}, unit: {"en": "caps", "ka": "მატჩი", "es": "partidos"}, value: 38, step: 1, precision: 0 },
  { id: 'practice-17', prompt: {"en": "Attendance: Northport FC vs Real Corvena, Continental Cup final 2016/17?", "ka": "დამსწრეთა რაოდენობა: ნორთპორტი – რეალ კორვენა, კონტინენტური თასის ფინალი 2016/17?", "es": "Asistencia: Northport FC vs Real Corvena, final de la Copa Continental 2016/17?"}, unit: {"en": "spectators", "ka": "მაყურებელი", "es": "espectadores"}, value: 52500, step: 500, precision: 0 },
  { id: 'practice-18', prompt: {"en": "Attendance: Atlético Brisa vs FC Halden, Super Cup 2022?", "ka": "დამსწრეთა რაოდენობა: ატლეტიკო ბრიზა – ჰალდენი, სუპერთასი 2022?", "es": "Asistencia: Atlético Brisa vs FC Halden, Supercopa 2022?"}, unit: {"en": "spectators", "ka": "მაყურებელი", "es": "espectadores"}, value: 31000, step: 500, precision: 0 },
  { id: 'practice-19', prompt: {"en": "Stadium capacity: Estadio del Faro (Deportivo Mareas)?", "ka": "სტადიონის ტევადობა: ესტადიო დელ ფარო (დეპორტივო მარეასი)?", "es": "Capacidad: Estadio del Faro (Deportivo Mareas)?"}, unit: {"en": "seats", "ka": "ადგილი", "es": "asientos"}, value: 42500, step: 500, precision: 0 },
  { id: 'practice-20', prompt: {"en": "Year founded: Kingsbridge United?", "ka": "დაარსების წელი: კინგსბრიჯ იუნაიტედი?", "es": "Año de fundación: Kingsbridge United?"}, unit: {"en": "year", "ka": "წელი", "es": "año"}, value: 1894, step: 1, precision: 0 },
];
