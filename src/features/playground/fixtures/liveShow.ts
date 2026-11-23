// An invented football universe for the Live Show prototype: made-up players, clubs, matches and numbers, so no real
// question or answer ever sits in this public repository. The real-data pack the owner plays lives in
// public/dev-data/live-show.json (gitignored, built from ~/dev/quizball-private/live-show); the prototype loads it
// when it is there.
import type { ShowOption, ShowPack } from '@/features/live-show/show.types';

const opt = (id: string, en: string, ka?: string): ShowOption => ({ id, label: { en, ka } });
const crest = (seed: string, initials: string, era = 3) => ({ kind: 'crest' as const, seed, era, initials });
const shirt = (seed: string, era = 3) => ({ kind: 'shirt' as const, seed, era });

const CLUBS = {
  aurora: opt('aurora', 'Atlético Aurora', 'ატლეტიკო ავრორა'),
  brisa: opt('brisa', 'Real Brisa', 'რეალ ბრიზა'),
  nube: opt('nube', 'Deportivo Nube', 'დეპორტივო ნუბე'),
  puerto: opt('puerto', 'Puerto Azul FC', 'პუერტო აზული'),
  caliza: opt('caliza', 'Real Caliza', 'რეალ კალისა'),
  norte: opt('norte', 'Norte United', 'ნორტე იუნაიტედი'),
  faro: opt('faro', 'Deportivo Faro', 'დეპორტივო ფარო'),
  sierra: opt('sierra', 'Unión Sierra', 'უნიონ სიერა'),
};

const P = (id: string, en: string) => opt(id, en);

export const INVENTED_SHOW_PACK: ShowPack = {
  id: 'invented-1',
  title: { en: 'Invented Show Night', ka: 'გამოგონილი შოუ' },
  stages: [
    {
      id: 'warmup',
      title: { en: 'Warm-up', ka: 'გახურება' },
      keep: { share: 0.5 },
      questions: [
        {
          id: 'tf-1', kind: 'true_false',
          prompt: { en: 'Tomás Varelo has played for Real Brisa.', ka: 'ტომას ვარელო რეალ ბრიზაში თამაშობდა.' },
          options: [opt('true', 'True', 'მართალია'), opt('false', 'False', 'ტყუილია')], correctId: 'true',
        },
        {
          id: 'mcq-1', kind: 'mcq',
          prompt: { en: 'Which club won the invented Northern League three times in a row?', ka: 'რომელმა კლუბმა მოიგო ჩრდილოეთის ლიგა ზედიზედ სამჯერ?' },
          options: [CLUBS.aurora, CLUBS.brisa, CLUBS.nube, CLUBS.norte], correctId: 'nube',
        },
        {
          id: 'tf-2', kind: 'true_false',
          prompt: { en: 'Deportivo Faro has never been relegated.', ka: 'დეპორტივო ფარო არასოდეს დაქვეითებულა.' },
          options: [opt('true', 'True', 'მართალია'), opt('false', 'False', 'ტყუილია')], correctId: 'false',
        },
        {
          id: 'mcq-2', kind: 'mcq',
          prompt: { en: 'Who is the invented league’s all-time top scorer?', ka: 'ვინ არის ლიგის ყველა დროის საუკეთესო ბომბარდირი?' },
          options: [P('p1', 'Iker Montañés'), P('p2', 'Bruno Salcedal'), P('p3', 'Dante Ferrolo'), P('p4', 'Lucas Oyarzábal')], correctId: 'p3',
        },
      ],
    },
    {
      id: 'who',
      title: { en: 'Who is it?', ka: 'ვინ არის?' },
      keep: { share: 0.5 },
      questions: [
        {
          id: 'zoom-1', kind: 'zoom_out',
          prompt: { en: 'Whose crest is this?', ka: 'ვისი ემბლემაა?' },
          art: crest('aurora', 'AA', 2), focus: { x: 0.62, y: 0.4 },
          options: [CLUBS.aurora, CLUBS.caliza, CLUBS.sierra, CLUBS.puerto], correctId: 'aurora',
        },
        {
          id: 'evo-1', kind: 'evolution', subject: 'crest',
          prompt: { en: 'Whose crest history is this?', ka: 'ვისი ემბლემის ისტორიაა?' },
          eras: [
            { year: 1903, art: crest('puerto', 'PA', 0) },
            { year: 1951, art: crest('puerto', 'PA', 1) },
            { year: 1988, art: crest('puerto', 'PA', 2) },
            { year: 2019, art: crest('puerto', 'PA', 3) },
          ],
          options: [CLUBS.norte, CLUBS.puerto, CLUBS.faro, CLUBS.brisa], correctId: 'puerto',
        },
        {
          id: 'zoom-2', kind: 'zoom_out',
          prompt: { en: 'Whose home shirt is this?', ka: 'ვისი მაისურია?' },
          art: shirt('caliza', 3), focus: { x: 0.3, y: 0.7 },
          options: [CLUBS.nube, CLUBS.sierra, CLUBS.caliza, CLUBS.aurora], correctId: 'caliza',
        },
        {
          id: 'evo-2', kind: 'evolution', subject: 'shirt',
          prompt: { en: 'Whose home shirts are these?', ka: 'ვისი მაისურებია?' },
          eras: [
            { year: 1924, art: shirt('sierra', 0) },
            { year: 1966, art: shirt('sierra', 1) },
            { year: 1997, art: shirt('sierra', 2) },
            { year: 2024, art: shirt('sierra', 3) },
          ],
          options: [CLUBS.sierra, CLUBS.brisa, CLUBS.norte, CLUBS.faro], correctId: 'sierra',
        },
        {
          id: 'odd-1', kind: 'odd_one_out',
          prompt: { en: 'Three of them played for Atlético Aurora. Who never did?', ka: 'სამი ატლეტიკო ავრორაში თამაშობდა. ვინ არა?' },
          options: [P('a', 'Mateo Quirogal'), P('b', 'Julián Brizuelo'), P('c', 'Emi Castañar'), P('d', 'Fede Luquín')], correctId: 'c',
        },
      ],
    },
    {
      id: 'mines',
      title: { en: 'Minesweeper', ka: 'ნაღმები' },
      keep: { share: 0.5 },
      questions: [
        {
          id: 'mines-1', kind: 'mines',
          prompt: { en: 'Pick everyone who played for Real Brisa. Pick a mine and the board scores 0.', ka: 'მონიშნე ყველა, ვინც რეალ ბრიზაში თამაშობდა. ნაღმი = 0 ქულა.' },
          cards: ['Tomás Varelo', 'Iker Montañés', 'Bruno Salcedal', 'Nico Arrizábal', 'Dante Ferrolo', 'Lucas Oyarzábal', 'Mateo Quirogal', 'Julián Brizuelo', 'Santi Varelo']
            .map((n, i) => P(`m1-${i}`, n)),
          fits: ['m1-0', 'm1-1', 'm1-3', 'm1-4', 'm1-6', 'm1-8'],
        },
        {
          id: 'mines-2', kind: 'mines',
          prompt: { en: 'Pick every club that won the Silver Cup. Pick a mine and the board scores 0.', ka: 'მონიშნე ყველა კლუბი, ვინც ვერცხლის თასი მოიგო. ნაღმი = 0 ქულა.' },
          cards: Object.values(CLUBS).concat([opt('montes', 'Montes SC'), opt('isla', 'Isla Verde')]).map((c, i) => ({ ...c, id: `m2-${i}` })),
          fits: ['m2-0', 'm2-2', 'm2-3', 'm2-5', 'm2-6', 'm2-8'],
        },
      ],
    },
    {
      id: 'numbers',
      title: { en: 'Numbers', ka: 'რიცხვები' },
      keep: { count: 10 },
      questions: [
        {
          id: 'num-1', kind: 'closest_number',
          prompt: { en: 'How many league goals did Dante Ferrolo score?', ka: 'რამდენი გოლი გაიტანა დანტე ფეროლომ ლიგაში?' },
          min: 0, max: 400, step: 1, answer: 213, unit: { en: 'goals', ka: 'გოლი' },
        },
        {
          id: 'minute-1', kind: 'what_minute',
          prompt: { en: 'In what minute did Real Brisa score the winner in the invented cup final?', ka: 'რომელ წუთზე გაიტანა რეალ ბრიზამ გადამწყვეტი გოლი?' },
          context: { en: 'Real Brisa 2–1 Norte United · Silver Cup final', ka: 'რეალ ბრიზა 2–1 ნორტე იუნაიტედი · ფინალი' },
          min: 1, max: 120, step: 1, answer: 88, tolerance: 30,
        },
        {
          id: 'num-2', kind: 'closest_number',
          prompt: { en: 'How many people fit in the invented Estadio Faro?', ka: 'რამდენ მაყურებელს იტევს ფაროს სტადიონი?' },
          min: 0, max: 100000, step: 500, answer: 46500, unit: { en: 'seats', ka: 'ადგილი' },
        },
      ],
    },
    {
      id: 'final',
      title: { en: 'Final', ka: 'ფინალი' },
      final: true,
      questions: [
        {
          id: 'fake-1', kind: 'fake_fact',
          subject: { name: { en: 'Nico Arrizábal' } },
          prompt: { en: 'One of these clubs is a lie. Which one?', ka: 'ერთ-ერთი კლუბი ტყუილია. რომელი?' },
          options: [CLUBS.puerto, CLUBS.caliza, CLUBS.norte, CLUBS.faro], correctId: 'norte',
        },
        {
          id: 'mcq-f1', kind: 'mcq',
          prompt: { en: 'Which shirt number did Lucas Oyarzábal wear for Unión Sierra?', ka: 'რომელი ნომრით თამაშობდა ლუკას ოიარსაბალი?' },
          options: [opt('7', '7'), opt('9', '9'), opt('10', '10'), opt('11', '11')], correctId: '10',
        },
        {
          id: 'fake-2', kind: 'fake_fact',
          subject: { name: { en: 'Gael Ortuzar' } },
          prompt: { en: 'One of these trophies he never won. Which one?', ka: 'ერთი ტროფი მას არ მოუგია. რომელი?' },
          options: [opt('north', 'Northern League'), opt('silver', 'Silver Cup'), opt('cont', 'Continental Trophy'), opt('boot', 'Golden Boot')], correctId: 'boot',
        },
      ],
    },
  ],
};
