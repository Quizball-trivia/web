'use client';
import { useEffect,useRef,useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { claimSurvey,dismissSurvey,submitSurvey,surveyKey,type SurveyKind } from './season3.repo';

export function Season3Survey(){
  const userId=useAuthStore(s=>s.user?.id);
  return userId?<PlayerSeason3Survey key={userId} userId={userId}/>:null;
}
function PlayerSeason3Survey({userId}:{userId:string}){
  const {locale,t}=useLocale();
  const [prompt,setPrompt]=useState<{kind:SurveyKind;matchId:string}|null>(null);
  const [order,setOrder]=useState<boolean|null>(null),[who,setWho]=useState<boolean|null>(null);
  const [idea,setIdea]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false);
  const submitting=useRef(false);
  useEffect(()=>{
    if(!userId)return;
    let cancelled=false;
    let attempts=0;
    let timer:ReturnType<typeof setTimeout>;
    const run=async()=>{
      try{
        const raw=sessionStorage.getItem(surveyKey(userId));if(!raw)return;
        if(Number(localStorage.getItem(`${surveyKey(userId)}.snooze`))>Date.now())return;
        const pending=JSON.parse(raw) as {matchId:string;at:number};
        if(!pending.matchId||Date.now()-pending.at>30*60*1000){sessionStorage.removeItem(surveyKey(userId));return;}
        if(document.querySelector('[role="dialog"]')){timer=setTimeout(run,3000);return;}
        const result=await claimSurvey(pending.matchId);
        if(cancelled)return;
        if(!result.kind)sessionStorage.removeItem(surveyKey(userId));
        if(result.kind){setOrder(null);setWho(null);setIdea('');setDone(false);setError(false);setPrompt({kind:result.kind,matchId:pending.matchId});}
      }catch{if(!cancelled&&++attempts<3)timer=setTimeout(run,3000);}
    };
    timer=setTimeout(run,1000);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[userId]);
  const close=async()=>{
    if(submitting.current||!prompt)return;
    if(done){setPrompt(null);return;}
    submitting.current=true;setBusy(true);setError(false);
    try{localStorage.setItem(`${surveyKey(userId)}.snooze`,String(Date.now()+7*86400000));}catch{/* Storage may be disabled. */}
    setPrompt(null);
    try{await dismissSurvey(prompt.matchId);sessionStorage.removeItem(surveyKey(userId));}catch{/* Local snooze still protects this browser while offline. */}finally{submitting.current=false;setBusy(false);}
  };
  const send=async()=>{
    if(submitting.current||!prompt)return;
    if(prompt.kind==='vote'&&(order===null||who===null)||prompt.kind==='idea'&&!idea.trim())return;
    submitting.current=true;setBusy(true);setError(false);
    try{
      await submitSurvey(prompt.matchId,locale,prompt.kind==='vote'?{kind:'vote',removeOrder:order!,removeWho:who!}:{kind:'idea',idea:idea.trim()});
      try{sessionStorage.removeItem(surveyKey(userId));}catch{/* The server response is already saved. */}
      setDone(true);
    }catch{setError(true);}finally{submitting.current=false;setBusy(false);}
  };
  return <Dialog open={!!prompt} onOpenChange={open=>{if(!open)void close();}}>
    <DialogContent className="bg-brand-blue text-white border-white/20 rounded-3xl p-6 sm:p-8 max-h-[90dvh] overflow-y-auto [&>button:last-child]:hidden" aria-describedby="season3-description">
      <ModalCloseButton onClose={()=>{void close();}}/>
      <p className="text-brand-yellow font-bold text-xs tracking-widest pr-14 min-h-12">{t('season3.eyebrow')}</p>
      <DialogTitle className={done?'text-center text-2xl':'sr-only'}>{done?t('season3.thanks'):t('season3.eyebrow')}</DialogTitle>
      <DialogDescription id="season3-description" className={done?'sr-only':'text-white font-bold text-lg leading-relaxed'}>{t(prompt?.kind==='idea'?'season3.ideaQuestion':'season3.voteQuestion')}</DialogDescription>
      {done?<div className="flex justify-center"><Check className="rounded-full bg-brand-yellow text-black p-3 size-16"/></div>:prompt?.kind==='idea'?<div>
        <label className="sr-only" htmlFor="season3-idea">{t('season3.ideaQuestion')}</label>
        <textarea id="season3-idea" value={idea} onChange={e=>setIdea(e.target.value)} disabled={busy} maxLength={500} placeholder={t('season3.placeholder')} className="w-full min-h-40 rounded-2xl border border-white/40 bg-black/15 p-4 text-white placeholder:text-white/70 focus:outline-brand-yellow"/>
        <p className="text-right text-xs text-white/75 mt-2">{idea.length} / 500</p>
      </div>:<>{([['order',order,setOrder],['who',who,setWho]] as const).map(([key,value,setValue])=><fieldset key={key} disabled={busy} className="min-w-0">
        <legend className="font-bold text-sm leading-relaxed mb-3">{t(key==='order'?'season3.order':'season3.who')}</legend>
        <div className="grid grid-cols-2 gap-3 border border-white/25 bg-black/15 rounded-2xl p-4">{[true,false].map(v=><button key={String(v)} type="button" aria-pressed={value===v} onClick={()=>setValue(v)} className={`rounded-xl p-3 text-sm font-bold border ${value===v?'bg-brand-yellow text-black border-brand-yellow':'border-white/40 text-white'}`}>{t(v?'season3.remove':'season3.keep')}</button>)}</div>
      </fieldset>)}</>}
      {error&&<p role="alert" className="text-white font-bold">{t('season3.error')}</p>}
      <button disabled={busy||!done&&(prompt?.kind==='idea'?!idea.trim():order===null||who===null)} onClick={()=>{void(done?close():send());}} className="bg-brand-yellow text-black rounded-xl p-4 font-bold disabled:opacity-50">{t(done?'season3.back':busy?'season3.sending':'season3.send')}</button>
      {!done&&<button disabled={busy} onClick={()=>{void close();}} className="text-white/85 p-2">{t('season3.later')}</button>}
    </DialogContent>
  </Dialog>;
}
