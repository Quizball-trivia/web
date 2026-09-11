import { apiFetch } from '@/lib/api/client';
import type { Locale } from '@/lib/i18n/messages';
export type SurveyKind='vote'|'idea';
export type SurveyAnswer={kind:'vote';removeOrder:boolean;removeWho:boolean}|{kind:'idea';idea:string};
const post=apiFetch as unknown as <T>(method:'post',path:string,options:{body:unknown;auth:boolean})=>Promise<T>;
export const claimSurvey=(matchId:string)=>post<{kind:SurveyKind|null}>('post','/api/v1/feedback/season3/claim',{body:{matchId},auth:true});
export const dismissSurvey=(matchId:string)=>post('post','/api/v1/feedback/season3/dismiss',{body:{matchId},auth:true});
export const submitSurvey=(matchId:string,locale:Locale,answer:SurveyAnswer)=>post<{ok:boolean}>('post','/api/v1/feedback/season3',{body:{matchId,locale,...answer},auth:true});
export const surveyKey=(userId:string)=>`quizball.season3.after-ranked.${userId}`;
export function markSeason3Return(userId:string,matchId:string){
  try{sessionStorage.setItem(surveyKey(userId),JSON.stringify({matchId,at:Date.now()}));}catch{/* Optional prompt must not block navigation. */}
}
