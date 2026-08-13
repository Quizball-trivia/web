// GENERATED: game 1 of last week's REAL Weekend League qualifier
// (prod tournament week 2026-08-08), one question per round type, bilingual.
// Payload/evaluation are verbatim wl_questions rows — the same wire shapes
// the live socket dispatches, so the sim renders them exactly like the event.
import type { SimQuestion } from "@/features/weekend-league/live/useWlSimulated";

export const WL_LAST_WEEK_QUESTIONS: SimQuestion[] = [
  {
    "kind": "true_false",
    "question": {
      "prompt": {
        "en": "Germany and Brazil have played against each other in two Men's FIFA World Cup Finals.",
        "ka": "გერმანიასა და ბრაზილიას ერთმანეთის წინააღმდეგ მამაკაცთა ფიფას მსოფლიო ჩემპიონატის ორ ფინალში აქვთ ნათამაშები."
      }
    },
    "evaluation": {
      "correct_id": "false"
    },
    "points": 150
  },
  {
    "kind": "put_in_order",
    "question": {
      "items": [
        {
          "id": "03161d91-adba-454e-816a-f98414ee798b",
          "emoji": null,
          "label": {
            "en": "Netherlands",
            "ka": "ნიდერლანდები"
          }
        },
        {
          "id": "47264eb4-ae83-415d-ad9f-5511e5ec352e",
          "emoji": null,
          "label": {
            "en": "Zaire",
            "ka": "ზაირი"
          }
        },
        {
          "id": "6c537e35-86ab-4d13-9b7a-5b208619c4fb",
          "emoji": null,
          "label": {
            "en": "Italy",
            "ka": "იტალია"
          }
        },
        {
          "id": "a04a39da-cfb6-4233-a282-061847ae4d67",
          "emoji": null,
          "label": {
            "en": "Yugoslavia",
            "ka": "იუგოსლავია"
          }
        }
      ],
      "prompt": {
        "en": "Order these teams by Total Goals Scored in the World Cup 1974 (High to Low)",
        "ka": "დაალაგეთ ეს გუნდები 1974 წლის მსოფლიო ჩემპიონატზე გატანილი გოლების საერთო რაოდენობის მიხედვით (მაღლიდან დაბლისკენ)"
      },
      "direction": "desc",
      "instruction": null
    },
    "evaluation": {
      "order": [
        "47264eb4-ae83-415d-ad9f-5511e5ec352e",
        "6c537e35-86ab-4d13-9b7a-5b208619c4fb",
        "a04a39da-cfb6-4233-a282-061847ae4d67",
        "03161d91-adba-454e-816a-f98414ee798b"
      ]
    },
    "points": 150
  },
  {
    "kind": "mcq",
    "question": {
      "image": {
        "url": "https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/public/imgs/wl-photo-quiz/q21.webp",
        "width": 1094,
        "height": 547,
        "provider": "wl-editor-photo",
        "storage_status": "stored"
      },
      "prompt": {
        "en": "Who was the Liverpool goalkeeper beaten by this strike in the 2018 Champions League final?",
        "ka": "ვინ იყო ლივერპულის მეკარე, რომელიც 2018 წლის ჩემპიონთა ლიგის ფინალში ამ დარტყმამ დაამარცხა?"
      },
      "options": [
        {
          "id": "fa0b5793-323a-478e-8ee1-379918e97ddf",
          "text": {
            "en": "Simon Mignolet",
            "ka": "სიმონ მინიოლე"
          }
        },
        {
          "id": "29ebe259-07cc-42e7-ad9d-b6c5767cb590",
          "text": {
            "en": "Alisson Becker",
            "ka": "ალისონ ბეკერი"
          }
        },
        {
          "id": "7dc08c0c-058a-4b0a-a7de-7e36de4bd33d",
          "text": {
            "en": "Loris Karius",
            "ka": "ლორის კარიუსი"
          }
        },
        {
          "id": "44d1adcb-b2f0-46d2-a556-45c933b84551",
          "text": {
            "en": "Pepe Reina",
            "ka": "პეპე რეინა"
          }
        }
      ]
    },
    "evaluation": {
      "correct_id": "7dc08c0c-058a-4b0a-a7de-7e36de4bd33d"
    },
    "points": 200
  },
  {
    "kind": "career_path",
    "question": {
      "clubs": [
        {
          "en": "Metz",
          "ka": "მეცი"
        },
        {
          "en": "Red Bull Salzburg",
          "ka": "რედ ბულ ზალცბურგი"
        },
        {
          "en": "Southampton",
          "ka": "საუთჰემპტონი"
        },
        {
          "en": "Liverpool",
          "ka": "ლივერპული"
        },
        {
          "en": "Bayern Munich",
          "ka": "მიუნხენის ბაიერნი"
        },
        {
          "en": "Al Nassr",
          "ka": "ალ ნასრი"
        }
      ]
    },
    "evaluation": {
      "display_answer": {
        "en": "Sadio Mané",
        "ka": "სადიო მანე"
      },
      "accepted_answers": [
        "Sadio Mané",
        "Mane",
        "სადიო მანე",
        "Sadio",
        "მანე",
        "სადიო"
      ]
    },
    "points": 250
  },
  {
    "kind": "who_am_i",
    "question": {
      "clues": [
        {
          "type": "text",
          "content": {
            "en": "I started my career at Racing Club in Argentina before moving to Italian side Genoa in Serie B in 2004.",
            "ka": "კარიერა არგენტინულ „რასინგ კლუბში“ დავიწყე, სანამ 2004 წელს იტალიურ „ჯენოაში“, სერია B-ში გადავიდოდი."
          }
        },
        {
          "type": "text",
          "content": {
            "en": "I scored 24 La Liga goals for Real Zaragoza in the 2006-07 season, outscoring both Ronaldinho and Ruud van Nistelrooy in open play.",
            "ka": "2006-07 წლების სეზონში „რეალ სარაგოსას“ შემადგენლობაში ლა ლიგაში 24 გოლი გავიტანე და თამაშიდან გატანილი გოლებით რონალდინიოსაც და რუდ ვან ნისტელროისაც ვაჯობე."
          }
        },
        {
          "type": "text",
          "content": {
            "en": "I am the older brother of a former FC Barcelona center-back.",
            "ka": "მე „ბარსელონას“ ყოფილი ცენტრალური მცველის უფროსი ძმა ვარ."
          }
        },
        {
          "type": "text",
          "content": {
            "en": "I scored both goals in the 2010 UEFA Champions League Final against Bayern Munich to secure Inter Milan's treble.",
            "ka": "2010 წლის უეფას ჩემპიონთა ლიგის ფინალში მიუნხენის „ბაიერნის“ წინააღმდეგ ორივე გოლი გავიტანე და „ინტერს“ ტრებლი მოვაპოვებინე."
          }
        },
        {
          "type": "text",
          "content": {
            "en": "I am an Argentine striker nicknamed \"El Príncipe\" (The Prince) due to my physical resemblance to Enzo Francescoli.",
            "ka": "მე არგენტინელი თავდამსხმელი ვარ, მეტსახელად „El Príncipe“ (პრინცი), რადგან გარეგნულად ენცო ფრანჩესკოლის ვგავარ."
          }
        }
      ]
    },
    "evaluation": {
      "display_answer": {
        "en": "Diego Milito",
        "ka": "დიეგო მილიტო"
      },
      "accepted_answers": [
        "Diego Milito",
        "დიეგო მილიტო",
        "Milito",
        "Diego",
        "მილიტო",
        "დიეგო"
      ]
    },
    "points": 300
  }
];
