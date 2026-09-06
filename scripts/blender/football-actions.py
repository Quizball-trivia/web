"""Authored football action variations; executed by build-footballer.py.
These are original stylized interpretations, not captured athlete motion.
"""
def keypose(keys,t):
    def vec(v):return (v,0,0) if isinstance(v,(int,float)) else v
    for i in range(len(keys)-1):
        t0,a=keys[i];t1,b=keys[i+1]
        if t<=t1:
            u=max(0,min(1,(t-t0)/(t1-t0)));u=u*u*(3-2*u)
            base=idle(0)
            result={}
            for k in set(a)|set(b)|set(base):
                va=a.get(k,base.get(k,0));vb=b.get(k,base.get(k,0))
                result[k]=va+(vb-va)*u if isinstance(va,(int,float)) and isinstance(vb,(int,float)) else tuple(x+(y-x)*u for x,y in zip(vec(va),vec(vb)))
            return result
    return {**idle(0),**keys[-1][1]}

def shot_variant(t,style):
    d=strike(t)
    p=math.sin(min(1,t/1.5)*math.pi)
    if style=='power':
        d['spine']=(.12+.14*p,.05*p,-.03*p)
        d['shoL']=(-.25,0,.1+.8*p);d['shoR']=(.4*p,0,-.15-.35*p)
        d['hipR']=d['hipR'][0]*(1.12 if t<.8 else 1.03)
        d['kneeR']=d['kneeR'][0]*(1.12 if t<.65 else 1)
        d['_fist']=.48
    elif style=='curl':
        d['pelvis']=(0,-.28*p,-.13*p);d['spine']=(.12,-.3*p,-.11*p)
        d['torso']=(0,.38*p,.08*p)
        d['hipR']=(d['hipR'][0],-.25*p,.15*p)
        d['ankleR']=(.12,-.4*p,0)
        d['shoL']=(-.32,0,.25+.85*p);d['shoR']=(.25*p,0,-.3)
        d['elbL']=-.3;d['elbR']=-.75
    elif style=='toe':
        # Compact knee lift and a quick, nearly straight-foot jab.
        d=keypose([(0,{}),(.48,{'spine':.18,'hipR':-.18,'kneeR':1.05,'shoL':(-.3,0,.2),'elbL':-.85,'elbR':-.9}),(.8,{'spine':.15,'hipR':-.48,'kneeR':.10,'ankleR':-.18,'shoL':(-.2,0,.4),'elbL':-.6,'elbR':-.7}),(1.03,{'spine':.1,'hipR':-.65,'kneeR':.25,'ankleR':-.1}),(1.5,{})],t)
    elif style=='left':
        # Mirror the whole chain so the right foot plants and the left strikes.
        mirrored={}
        for k,v in d.items():
            target=k[:-1]+('R' if k.endswith('L') else 'L') if k.endswith(('L','R')) else k
            vv=(v,0,0) if isinstance(v,(int,float)) else v
            mirrored[target]=(vv[0],-vv[1],-vv[2])
        d=mirrored;d['spine']=(.10,.16*p,.06*p);d['ankleL']=(.08,.2*p,0)
    return d
for style in ['power','curl','toe','left']:bake('strike_'+style,1.5,lambda t,s=style:shot_variant(t,s))

# Ronaldo-inspired rise, airborne half-turn, absorb the landing, wide stance.
def siu(t):
    d=keypose([(0,{}),(.3,{'hipL':-.35,'hipR':-.35,'kneeL':.65,'kneeR':.65,'spine':.16,'shoL':(.35,0,.1),'shoR':(.35,0,-.1)}),(.65,{'shoL':(-2.45,0,.2),'shoR':(-2.45,0,-.2),'elbL':-.35,'elbR':-.35,'hipL':-.1,'hipR':-.1,'kneeL':.35,'kneeR':.45}),(1.12,{'shoL':(-1.6,0,.1),'shoR':(-1.6,0,-.1),'hipL':(0,0,.24),'hipR':(0,0,-.24),'kneeL':.35,'kneeR':.35}),(1.32,{'spine':.15,'hipL':(-.35,0,.24),'hipR':(-.35,0,-.24),'kneeL':.65,'kneeR':.65,'shoL':(.05,0,.24),'shoR':(.05,0,-.24)}),(1.65,{'spine':-.06,'hipL':(-.08,0,.24),'hipR':(-.08,0,-.24),'kneeL':.18,'kneeR':.18,'shoL':(.05,0,.28),'shoR':(.05,0,-.28),'elbL':-.12,'elbR':-.12}),(3.1,{'spine':-.03,'hipL':(-.04,0,.22),'hipR':(-.04,0,-.22),'kneeL':.12,'kneeR':.12,'shoL':(.02,0,.22),'shoR':(.02,0,-.22),'elbL':-.12,'elbR':-.12})],t)
    u=max(0,min(1,(t-.45)/.72))
    d['_root_pos']=(0,4*.48*u*(1-u),0)
    d['_root_yaw']=math.pi*(u*u*(3-2*u));d['_fist']=.58
    return d
bake('celebrate_siu',3.1,siu)

def samba(t):
    envelope=min(1,t/.35)*min(1,max(0,(3.6-t)/.5));beat=math.sin(t*math.pi*3)*envelope
    d=idle(t)
    d.update({'pelvis':(0,beat*.16,beat*.1),'spine':(.03,-beat*.12,-beat*.08),'torso':(0,beat*.2,beat*.06),'hipL':-.15+beat*.12,'hipR':-.15-beat*.12,'kneeL':.28+max(0,beat)*.3,'kneeR':.28+max(0,-beat)*.3,'shoL':(-.6-beat*.18,0,.22),'shoR':(-.6+beat*.18,0,-.22),'elbL':-1.05,'elbR':-1.05,'handL':(0,beat*.25,0),'handR':(0,-beat*.25,0),'head':(-.02,beat*.12,0),'_shaka':1})
    return d
bake('celebrate_samba',3.6,samba)

bake('celebrate_sky',3.2,lambda t:keypose([(0,{}),(.55,{'shoL':(-.9,0,.16),'shoR':(-.9,0,-.16),'elbL':-1.1,'elbR':-1.1}),(1.1,{'shoL':(-2.55,0,.1),'shoR':(-2.55,0,-.1),'elbL':-.14,'elbR':-.14,'head':-.3,'spine':-.04,'_point':1}),(2.5,{'shoL':(-2.55,0,.1),'shoR':(-2.55,0,-.1),'elbL':-.14,'elbR':-.14,'head':-.3,'spine':-.04,'_point':1}),(3.2,{})],t))
bake('celebrate_fold',3.0,lambda t:keypose([(0,{}),(.4,{'shoL':(-.25,0,.05),'shoR':(-.25,0,-.05),'elbL':-.5,'elbR':-.5,'_fold':.35}),(1.0,{'_fold':1,'spine':-.04,'head':-.05,'_fist':.3}),(3.0,{'_fold':1,'spine':-.04,'head':-.05,'_fist':.3})],t))

# Five recognisable pre-kick postures, with restrained breathing/weight shifts.
def stance(t,style):
    breath=math.sin(t*math.tau/2.4);d=idle(t)
    if style=='power':
        d.update({'hipL':(-.025,0,.24),'hipR':(-.025,0,-.24),'kneeL':.07,'kneeR':.07,'spine':.01+breath*.009,'shoL':(.04,0,.12),'shoR':(.04,0,-.12),'elbL':-.12,'elbR':-.12,'head':.08,'_fist':.25})
    elif style=='samba':
        d.update({'pelvis':(0,-.12,.04),'spine':(.07,.08,-.035),'hipL':-.12,'hipR':.06,'kneeL':.28,'kneeR':.08,'shoL':(-.16,0,.05),'shoR':(-.04,0,-.12),'elbL':-.4,'elbR':-.22,'head':(.12,-.08,0)})
    elif style=='left':
        d.update({'spine':.13+breath*.012,'hipL':-.22,'hipR':-.16,'kneeL':.36,'kneeR':.28,'shoL':(-.23,0,-.04),'shoR':(-.2,0,.04),'elbL':-.72,'elbR':-.55,'head':.12})
    elif style=='curl':
        d.update({'pelvis':(0,.25,-.06),'spine':(.1,-.12,.04),'hipL':-.03,'hipR':.14,'kneeL':.13,'kneeR':.32,'shoL':(-.15,0,.16),'shoR':(.03,0,-.12),'elbL':-.45,'elbR':-.3,'head':(.13,-.18,0)})
    elif style=='neymar':
        shift=breath*.025
        d.update({'pelvis':(0,-.08,shift),'spine':(.11,.05,-shift),'hipL':-.08,'hipR':-.23,'kneeL':.18,'kneeR':.40+breath*.06,'ankleR':-.12,'shoL':(-.16,0,.05),'shoR':(-.26,0,-.08),'elbL':-.65,'elbR':-.85,'head':(.11,.08,0)})
    return d
for style in ['power','samba','left','curl','neymar']:bake('stance_'+style,2.4,lambda t,s=style:stance(t,s))
def whip(t):
    # A compact pause in the backswing, then a fast ankle-led instep release.
    mapped=t*.6 if t<.4 else .24+(t-.4)*1.4 if t<.8 else t
    d=shot_variant(mapped,'curl');p=math.sin(min(1,t/1.5)*math.pi)
    d['spine']=(.10,-.18*p,-.05*p);d['hipR']=(d['hipR'][0],-.16*p,.08*p)
    d['shoL']=(-.20,0,.2+.5*p);d['elbL']=-.6;d['elbR']=-.85
    return d
bake('strike_whip',1.5,whip)

# A wider angled setup and left-foot power swing for Roberto Carlos.
def carlos_stance(t):
    d=idle(t)
    d.update({'pelvis':(0,-.28,.025),'spine':(.12,.12,-.025),
              'hipL':(-.15,0,.15),'hipR':(.06,0,-.11),'kneeL':.32,'kneeR':.16,
              'shoL':(-.08,0,.08),'shoR':(-.2,0,-.08),'elbL':-.3,'elbR':-.45,
              'head':(.12,.16,0),'_fist':.2})
    return d
bake('stance_carlos',2.4,carlos_stance)
def left_power(t):
    source=shot_variant(t,'power');d={}
    for k,v in source.items():
        if k.startswith('_'):d[k]=v;continue
        target=k[:-1]+('R' if k.endswith('L') else 'L') if k.endswith(('L','R')) else k
        vv=(v,0,0) if isinstance(v,(int,float)) else v
        d[target]=(vv[0],-vv[1],-vv[2])
    p=math.sin(min(1,t/1.5)*math.pi)
    d['pelvis']=(0,.18*p,.08*p);d['torso']=(0,-.22*p,0)
    d['ankleL']=(.08,.30*p,0)
    return d
bake('strike_left_power',1.5,left_power)
