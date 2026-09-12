import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { Season3Survey } from './Season3Survey';
const mocks=vi.hoisted(()=>({claim:vi.fn(),submit:vi.fn(),dismiss:vi.fn()}));
vi.mock('@/stores/auth.store',()=>({useAuthStore:(fn:(s:unknown)=>unknown)=>fn({user:{id:'user'}})}));
vi.mock('./season3.repo',()=>({surveyKey:()=> 'survey-test',claimSurvey:mocks.claim,submitSurvey:mocks.submit,dismissSurvey:mocks.dismiss}));
describe('Season 3 survey',()=>{
  beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();localStorage.clear();sessionStorage.setItem('survey-test',JSON.stringify({matchId:'match',at:Date.now()}));mocks.dismiss.mockResolvedValue({ok:true});mocks.submit.mockResolvedValue({ok:true});});
  afterEach(()=>{vi.useRealTimers();});
  async function open(kind:string){mocks.claim.mockResolvedValue({kind});render(<Season3Survey/>);await screen.findByRole('dialog',{}, {timeout:3000});}
  it('requires nonblank input, sends locale and waits for save before thanks',async()=>{
    await open('idea');expect(sessionStorage.getItem('survey-test')).not.toBeNull();
    const send=screen.getByRole('button',{name:'Send my response'});expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'  Cooperative mode  '}});fireEvent.click(send);
    await screen.findByText('Thanks for your feedback!');expect(mocks.submit).toHaveBeenCalledWith('match','en',{kind:'idea',idea:'Cooperative mode'});
    expect(sessionStorage.getItem('survey-test')).toBeNull();
  });
  it('requires both separate votes and preserves false',async()=>{
    await open('vote');fireEvent.click(screen.getAllByRole('button',{name:'No, keep it'})[0]!);
    expect(screen.getByRole('button',{name:'Send my response'})).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button',{name:'Yes, remove it'})[1]!);fireEvent.click(screen.getByRole('button',{name:'Send my response'}));
    await waitFor(()=>expect(mocks.submit).toHaveBeenCalledWith('match','en',{kind:'vote',removeOrder:false,removeWho:true}));
  });
  it('keeps input on failure without showing success',async()=>{
    mocks.submit.mockRejectedValue(new Error('offline'));await open('idea');fireEvent.change(screen.getByRole('textbox'),{target:{value:'Team mode'}});fireEvent.click(screen.getByRole('button',{name:'Send my response'}));
    await screen.findByRole('alert');expect(screen.getByRole('textbox')).toHaveValue('Team mode');expect(screen.queryByText('Thanks for your feedback!')).toBeNull();
  });
  it('dismisses even when network is offline',async()=>{
    mocks.dismiss.mockRejectedValue(new Error('offline'));await open('idea');fireEvent.click(screen.getByRole('button',{name:'Not now'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(Number(localStorage.getItem('survey-test.snooze'))).toBeGreaterThan(Date.now());
  });
});
