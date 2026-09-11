import { apiFetch } from '@/lib/api/client';
import type { Locale } from '@/lib/i18n/messages';
export type SurveyKind='vote'|'idea';
export type SurveyAnswer={kind:'vote';removeOrder:boolean;removeWho:boolean}|{kind:'idea';idea:string};
export const claimSurvey=(matchId:string)=>apiFetch('post','/api/v1/feedback/season3/claim',{body:{matchId},auth:true});
export const dismissSurvey=(matchId:string)=>apiFetch('post','/api/v1/feedback/season3/dismiss',{body:{matchId},auth:true});
export const submitSurvey=(matchId:string,locale:Locale,answer:SurveyAnswer)=>apiFetch('post','/api/v1/feedback/season3',{body:{matchId,locale,...answer},auth:true});
export const surveyKey=(userId:string)=>`quizball.season3.after-ranked.${userId}`;
export function markSeason3Return(userId:string,matchId:string){
  try{sessionStorage.setItem(surveyKey(userId),JSON.stringify({matchId,at:Date.now()}));}catch{/* Optional prompt must not block navigation. */}
}
