"""Blender 5.x: remodel the CC0 UBC footballer and author game animation clips.
Run from the repository root with Blender --background --python this-file.
The retained idle/kick motion is the previously bundled retargeted Mixamo work.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/demos/score/footballer'
SOURCE = ROOT / 'art/footballer'
OUT.mkdir(parents=True, exist_ok=True); SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/demos/score/taker.glb'))
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
rig.name = 'Footballer'
rig.animation_data.action = None
for track in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(track)
original_actions = {a.name:a for a in bpy.data.actions}
# The exported clips share the rest skeleton of the existing taker.
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'; bone.rotation_quaternion = Quaternion(); bone.location = (0,0,0); bone.scale=(1,1,1)
bpy.context.view_layer.update()
body = next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>6000)
base_mesh=body.data.copy()

# Bring oversized hands into proportion; transform the finger skeleton and
# mesh together so curls retain their intended pivot positions.
def resize_hand(co):
    sign=1 if co.x>0 else -1
    if abs(co.x)>.735:
        centre=Vector((sign*.735,.065,1.455))
        return centre+(co-centre)*.88
    return co.copy()
for v in body.data.vertices:v.co=resize_hand(v.co)
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    if bone.name.startswith(('hand_','index_','middle_','ring_','pinky_','thumb_')):
        bone.head=resize_hand(bone.head);bone.tail=resize_hand(bone.tail)
bpy.ops.object.mode_set(mode='OBJECT')

def material(name, color, roughness=.7):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Roughness'].default_value=roughness
    return m
skin=material('Football_Skin',(.42,.20,.105),.74)
shirt=material('Football_Jersey',(.045,.32,.92),.82)
shorts=material('Football_Shorts',(.025,.045,.095),.86)
socks=material('Football_Socks',(.87,.90,.86),.88)
accent=material('Football_Trim',(.90,.97,.55),.72)
boot=material('Football_Boots',(.7,.92,.065),.47)
sole=material('Football_Sole',(.015,.022,.035),.58)
glove=material('Football_Gloves',(.90,.94,.85),.68)
# Retain the face and hands, slim exposed limbs; remove all body faces under
# the tailored clothing rather than layering a shirt over superhero muscles.
for v in body.data.vertices:
    x,y,z=v.co
    ax=abs(x)
    if .42<ax<.72 and 1.29<z<1.61:
        v.co.y=.065+(y-.065)*.79; v.co.z=1.455+(z-1.455)*.79
    if .49<z<.72:
        centre=.1143 if x>0 else -.1143
        v.co.x=centre+(x-centre)*.88
body.data.materials.clear();body.data.materials.append(skin)
bm=bmesh.new();bm.from_mesh(body.data)
# Cut the skin exactly at the sock edge so crossing triangles cannot poke
# through the contrasting cuff when the knee bends.
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,.514),plane_no=(0,0,-1),clear_outer=True,clear_inner=False,dist=.00001)
def covered(v):
    x,y,z=v.co; ax=abs(x)
    return (z<.493 or .70<z<1.01 or (.965<z<1.515 and ax<.245) or (.18<ax<.423 and 1.28<z<1.62))
bmesh.ops.delete(bm,geom=[f for f in bm.faces if all(covered(v) for v in f.verts)],context='FACES')
bm.to_mesh(body.data);bm.free();body.name='Football_Skin'
for f in body.data.polygons:f.use_smooth=True

# All clothing uses the original armature weights, so the same character can
# play the retained kick and the newly baked dribble/keeper actions.
def mesh_object(name, verts, faces, mat, weights):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    groups={}
    for i,co in enumerate(verts):
        ws=weights(co)
        total=sum(ws.values())
        for bone,w in ws.items():
            if w<=0:continue
            if bone not in groups:groups[bone]=obj.vertex_groups.new(name=bone)
            groups[bone].add([i],w/total,'REPLACE')
    mod=obj.modifiers.new('Football skeleton','ARMATURE');mod.object=rig
    obj.parent=rig
    for f in mesh.polygons:f.use_smooth=True
    return obj

def spine_weights(co):
    z=co[2]
    if z<1.08:return {'pelvis':max(0,(1.08-z)/.13),'spine_01':1-max(0,(1.08-z)/.13)}
    if z<1.24:return {'spine_01':(1.24-z)/.16,'spine_02':(z-1.08)/.16}
    if z<1.37:return {'spine_02':(1.37-z)/.13,'spine_03':(z-1.24)/.13}
    return {'spine_03':1}

def rings_z(name, rings, mat, weight, centre_x=0, segments=32, folds=0):
    verts=[];faces=[]
    for ri,(z,rx,ry,cy) in enumerate(rings):
        for i in range(segments):
            a=i*math.tau/segments
            ripple=1+folds*math.sin(a*7+ri*.7)
            verts.append((centre_x+rx*math.cos(a)*ripple,cy+ry*math.sin(a)*ripple,z))
    for j in range(len(rings)-1):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh_object(name,verts,faces,mat,weight)

def tailored_surface(name, mat, planes, inflate):
    obj=body.copy();obj.data=base_mesh.copy();bpy.context.collection.objects.link(obj);obj.name=name
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
    for point,normal in planes:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=point,plane_no=normal,clear_outer=True,clear_inner=False,dist=.00001)
    bm.verts.ensure_lookup_table();bm.verts.index_update()
    boundary={v.index for e in bm.edges if e.is_boundary for v in e.verts}
    bm.to_mesh(obj.data);bm.free()
    vg=obj.vertex_groups.new(name='Cloth relaxation')
    vg.add([v.index for v in obj.data.vertices if v.index not in boundary],1,'REPLACE')
    obj.data.materials.clear();obj.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    # Smooth only the newly generated cloth, retaining the connected shoulders,
    # crotch and skin weights of the source surface.
    smooth=obj.modifiers.new('Relax fabric over muscles','SMOOTH');smooth.factor=.75;smooth.iterations=12;smooth.vertex_group='Cloth relaxation'
    bpy.ops.object.modifier_move_up(modifier=smooth.name)
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    for v in obj.data.vertices:v.co+=v.normal*inflate
    if name=='Tailored jersey':
        # Tailor the lower shirt into the chest, waist and hips. Closely spaced
        # rings preserve an athletic taper when the spine bends or twists.
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,1.29),plane_no=(0,0,-1),clear_outer=True,clear_inner=False,dist=.00001)
        ring=sorted({v for e in bm.edges if e.is_boundary for v in e.verts if abs(v.co.z-1.29)<.0001},key=lambda v:math.atan2(v.co.y-.022,v.co.x))
        deform=bm.verts.layers.deform.verify()
        previous=ring
        count=len(ring)
        for z,rx,ry in [(1.285,.214,.144),(1.265,.211,.142),(1.225,.198,.134),(1.18,.180,.122),
                         (1.13,.167,.115),(1.08,.160,.113),(1.03,.169,.120),
                         (.986,.179,.127),(.956,.179,.127)]:
            current=[]
            for i,source in enumerate(ring):
                angle=math.atan2(source.co.y-.022,source.co.x)
                # A slightly flatter front/back and restrained seam folds avoid
                # the circular barrel shape of the old constant-radius rings.
                ca,sa=math.cos(angle),math.sin(angle)
                contour_x=math.copysign(abs(ca)**.94,ca)
                contour_y=math.copysign(abs(sa)**.88,sa)
                fold=.0018*math.sin(angle*6+.4)*(max(0,1-abs(z-1.08)/.18))
                blend=max(0,min(1,(1.29-z)/.11));blend=blend*blend*(3-2*blend)
                tx=(rx+fold)*contour_x;ty=.022+(ry+fold*.5)*contour_y
                v=bm.verts.new((source.co.x*(1-blend)+tx*blend,source.co.y*(1-blend)+ty*blend,z))
                for n,w in spine_weights(v.co).items():v[deform][obj.vertex_groups[n].index]=max(0,w)
                current.append(v)
            for i in range(count):bm.faces.new((previous[i],previous[(i+1)%count],current[(i+1)%count],current[i]))
            previous=current
        # Smooth and regularize the collar and cuffs along their cut planes.
        for e in bm.edges:
            if not e.is_boundary:continue
            for v in e.verts:
                if v.co.z>1.50 and abs(v.co.x)<.14:
                    angle=math.atan2(v.co.y-.019,v.co.x)
                    v.co=(.075*math.cos(angle),.019+.069*math.sin(angle),1.542)
                if abs(v.co.x)>.41:v.co.x=math.copysign(.435,v.co.x)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data);bm.free()
    solid=obj.modifiers.new('Fabric edge thickness','SOLIDIFY');solid.thickness=.003;solid.offset=0
    bpy.ops.object.modifier_move_up(modifier=solid.name);bpy.ops.object.modifier_apply(modifier=solid.name)
    for f in obj.data.polygons:f.use_smooth=True
    return obj
jersey=tailored_surface('Tailored jersey',shirt,[((0,0,.951),(0,0,-1)),((0,0,1.54),(0,0,1)),((.435,0,0),(1,0,0)),((-.435,0,0),(-1,0,0))],.018)
short_garment=tailored_surface('Match shorts',shorts,[((0,0,.677),(0,0,-1)),((0,0,1.04),(0,0,1))],.024)
for v in short_garment.data.vertices:
    if v.co.z>.90:
        factor=1-.18*min(1,(v.co.z-.90)/.1)
        v.co.x*=factor;v.co.y=.03+(v.co.y-.03)*factor
rings_z('Ribbed collar',[(1.526,.078,.072,.019),(1.545,.078,.072,.019)],accent,lambda p:{'spine_03':1},segments=40)
for side,sign in [('l',1),('r',-1)]:
    cx=sign*.1143
    def leg_weights(p,s=side):
        t=max(0,min(1,(p[2]-.84)/.14))
        return {'thigh_'+s:1-t*.45,'pelvis':t*.45}
    rings_z('Football sock '+side,[(.115,.054,.056,.075),(.22,.058,.063,.06),(.34,.075,.081,.044),(.45,.078,.078,.036),(.514,.077,.077,.036)],socks,lambda p,s=side:{'calf_'+s:1},cx,24)
    rings_z('Sock cuff '+side,[(.493,.079,.079,.036),(.514,.079,.079,.036)],accent,lambda p,s=side:{'calf_'+s:1},cx,24)
    # Shaped cleats: a tapered toe box, separate sole, laces and six studs.
    def make_boot(name,lower=False):
        vs=[];fs=[]
        for y,width,height in [(.145,.025,.062),(.12,.052,.107),(.065,.065,.133),(-.02,.075,.116),(-.11,.073,.088),(-.18,.046,.064),(-.205,.013,.042)]:
            for i in range(20):
                a=math.tau*i/20
                z=.018+max(0,math.sin(a))*(.018 if lower else height-.018)
                vs.append((cx+math.cos(a)*width,y,z))
        for j in range(6):
            for i in range(20):
                a=j*20+i;b=j*20+(i+1)%20;fs.append((a,b,b+20,a+20))
        fs.append(tuple(range(19,-1,-1)));fs.append(tuple(range(120,140)))
        return mesh_object(name,vs,fs,sole if lower else boot,lambda p,s=side:{'foot_'+s:1})
    make_boot('Speed cleat '+side);make_boot('Rubber outsole '+side,True)
    for i in range(4):
        y=.008-i*.022;z=.122-i*.007
        mesh_object('Laces '+side+str(i),[(cx-.038,y,z),(cx+.038,y,z),(cx+.038,y+.008,z+.001),(cx-.038,y+.008,z+.001)],[(0,1,2,3)],accent,lambda p,s=side:{'foot_'+s:1})
    for dx in [-.042,.042]:
        for y in [-.12,-.035,.085]:
            vs=[(cx+dx+math.cos(i*math.tau/8)*.012,y+math.sin(i*math.tau/8)*.012,z) for z in [.004,.023] for i in range(8)]
            fs=[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]+[tuple(range(8)),tuple(range(8,16))]
            mesh_object('Cleat stud',vs,fs,sole,lambda p,s=side:{'foot_'+s:1})

# A glove skin follows all the finger chains. It is hidden for outfield players.
hand=body.copy();hand.data=body.data.copy();bpy.context.collection.objects.link(hand);hand.name='Keeper gloves'
bm=bmesh.new();bm.from_mesh(hand.data)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if abs(v.co.x)<.735],context='VERTS')
for v in bm.verts:v.co+=v.normal*.007
bm.to_mesh(hand.data);bm.free();hand.data.materials.clear();hand.data.materials.append(glove)

for m in bpy.data.materials:
    if m.name=='MI_Hair_1':
        bs=m.node_tree.nodes.get('Principled BSDF')
        for link in list(bs.inputs['Base Color'].links):m.node_tree.links.remove(link)
        bs.inputs['Base Color'].default_value=(.028,.018,.012,1)

# Restore the eye texture pruned from the legacy mocap GLB.
eye=next((o for o in bpy.context.scene.objects if o.type=='MESH' and any(m and m.name=='MI_Eyes' for m in o.data.materials)),None)
if eye:
    m=eye.data.materials[0];m.use_nodes=True
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(next((ROOT/'public/assets/demos/score').glob('player-eyes-*.png'))))
    m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

# Merge garment pieces by semantic material: only seven extra draw calls for
# shirt/trim/shorts/socks/boots/soles/gloves, regardless of studs and stitching.
for mat in [shirt,accent,shorts,socks,boot,sole]:
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    objects[0].name=mat.name

# Bake authored football actions into the armature. Poses are expressed in the
# game's Y-up character space; convert to each Blender bone's rest orientation.
N={'pelvis':'pelvis','spine':'spine_01','torso':'spine_02','hipL':'thigh_l','hipR':'thigh_r','kneeL':'calf_l','kneeR':'calf_r','ankleL':'foot_l','ankleR':'foot_r','shoL':'upperarm_l','shoR':'upperarm_r','elbL':'lowerarm_l','elbR':'lowerarm_r','head':'Head','handL':'hand_l','handR':'hand_r'}
C=Quaternion((1,0,0),math.pi/2)
rests={name:rig.data.bones[name].matrix_local.to_quaternion() for name in rig.pose.bones.keys()}
def pose(values):
    for b in rig.pose.bones:b.rotation_quaternion=Quaternion();b.location=(0,0,0);b.scale=(1,1,1)
    for key,name in N.items():
        values3=values.get(key,(0,0,0));values3=(values3,0,0) if isinstance(values3,(int,float)) else (*values3,0,0)[:3]
        x,y,z=values3
        if key in ('elbL','elbR'):x,y=y,x*(1 if key=='elbL' else -1)
        q=Quaternion((1,0,0),x)@Quaternion((0,1,0),y)@Quaternion((0,0,1),z)
        if key in ('shoL','shoR'):q=q@Quaternion((0,0,1),-1.18 if key=='shoL' else 1.18)
        delta=C@q@C.conjugated();rest=rests[name]
        rig.pose.bones[name].rotation_quaternion=rest.conjugated()@delta@rest
    for b in rig.pose.bones:
        if any(b.name.startswith(f) for f in ['index_','middle_','ring_','pinky_','thumb_']):
            amount=.12+values.get('_fist',0)*.65
            if values.get('_shaka',0):amount=.65 if b.name.startswith(('index_','middle_','ring_')) else .05
            if values.get('_point',0):amount=.04 if b.name.startswith('index_') else .65
            curl=Quaternion((0,0,1),-amount if b.name.endswith('_l') else amount)
            b.rotation_quaternion=rests[b.name].conjugated()@curl@rests[b.name]

def reach_blender(side,target):
    upper=rig.pose.bones['upperarm_'+side];lower=rig.pose.bones['lowerarm_'+side];handbone=rig.pose.bones['hand_'+side]
    bpy.context.view_layer.update()
    start=upper.head.copy();mid=lower.head.copy();end=handbone.head.copy()
    l1=(mid-start).length;l2=(end-mid).length;direction=(target-start).normalized();distance=min((target-start).length,l1+l2-.001)
    along=(l1*l1-l2*l2+distance*distance)/(2*distance);height=math.sqrt(max(0,l1*l1-along*along))
    bend=Vector((.6 if side=='l' else -.6,-.25,-1.3));bend=(bend-direction*bend.dot(direction)).normalized()
    elbow=start+direction*along+bend*height
    for bone,child,dest in [(upper,lower,elbow),(lower,handbone,target)]:
        origin=bone.head.copy();old=(child.head-origin).normalized();new=(dest-origin).normalized()
        q=old.rotation_difference(new)
        bone.matrix=Matrix.Translation(origin)@q.to_matrix().to_4x4()@Matrix.Translation(-origin)@bone.matrix
        bpy.context.view_layer.update()

def bake(name,duration,fn):
    action=bpy.data.actions.new(name);action.use_fake_user=True
    rig.animation_data.action=action
    frames=round(duration*24)
    for f in range(frames+1):
        bpy.context.scene.frame_set(f);values=fn(f/24);pose(values)
        if values.get('_fold',0)>0:
            bpy.context.view_layer.update()
            for side,point in [('l',(-.10,-.24,1.33)),('r',(.11,-.29,1.25))]:
                start=rig.pose.bones['hand_'+side].head.copy()
                reach_blender(side,start.lerp(Vector(point),values['_fold']))
                handbone=rig.pose.bones['hand_'+side];finger=rig.pose.bones['middle_01_'+side]
                origin=handbone.head.copy();dest=Vector((-.28 if side=='l' else .28,-.22,1.38 if side=='l' else 1.31))
                old=(finger.head-origin).normalized();new=(dest-origin).normalized()
                q=Quaternion().slerp(old.rotation_difference(new),values['_fold'])
                handbone.matrix=Matrix.Translation(origin)@q.to_matrix().to_4x4()@Matrix.Translation(-origin)@handbone.matrix
                bpy.context.view_layer.update()
        if name in {'outfield_idle','jockey','keeper_idle','dribble'} or name.startswith(('strike','celebrate','stance')):
            bpy.context.view_layer.update()
            feet=['r'] if name.startswith('strike_left') else ['l'] if name.startswith('strike') else ['l','r']
            lowest=10
            for side in feet:
                bone=rig.data.bones['foot_'+side];pb=rig.pose.bones[bone.name]
                for y in [-.12,.085]:
                    point=Vector((.1143 if side=='l' else -.1143,y,.004))
                    posed=pb.matrix@bone.matrix_local.inverted()@point
                    lowest=min(lowest,posed.z)
            rig.pose.bones['pelvis'].location=rests['pelvis'].conjugated()@Vector((0,0,.004-lowest))
        if '_root_pos' in values or '_root_yaw' in values:
            x,y,z=values.get('_root_pos',(0,0,0));rig.pose.bones['root'].location=rests['root'].conjugated()@Vector((x,-z,y))
            q=C@(Quaternion((0,1,0),values.get('_root_yaw',0))@Quaternion((0,0,1),values.get('_root_roll',0)))@C.conjugated()
            rig.pose.bones['root'].rotation_quaternion=rests['root'].conjugated()@q@rests['root']
        for b in rig.pose.bones:
            b.keyframe_insert('rotation_quaternion',frame=f,group=b.name)
            if b.name in {'pelvis','root'}:b.keyframe_insert('location',frame=f,group=b.name)
    rig.animation_data.action=None
    return action

def idle(t):
    b=math.sin(t*math.tau/2)
    return {'spine':(.025+b*.012,0,.012*b),'hipL':-.04,'hipR':.03,'kneeL':.06,'kneeR':.07,'shoL':(-.08,0,.05),'shoR':(-.08,0,-.05),'elbL':-.20,'elbR':-.24,'head':(0,b*.04,0)}
def dribble(t):
    # Shortened forward swing and toe-down recovery, with one purposeful
    # inside-foot touch per cycle. Opposite arm counterbalances the touch.
    a=t/(20/24)*math.tau;s=math.sin(a);touch=max(0,math.cos(a))**6
    return {'pelvis':(0,math.sin(a)*.05,math.sin(a)*.025),'spine':(.13,-s*.045,-s*.045),'torso':(0,s*.08,0),'hipL':s*.57,'hipR':-s*.57-touch*.10,'kneeL':.10+max(0,-s)*1.05,'kneeR':.10+max(0,s)*1.05,'ankleL':-.08-max(0,-s)*.27,'ankleR':(-.08-max(0,s)*.27,touch*.16,0),'shoL':(-s*.48,0,.1),'shoR':(s*.48,0,-.1),'elbL':-.85,'elbR':-.78,'head':(.07,-s*.025,0)}
def jockey(t):
    s=math.sin(t*math.tau/1.2)
    return {'pelvis':(0,0,s*.04),'spine':(.16,0,-s*.03),'hipL':-.22+s*.05,'hipR':-.22-s*.05,'kneeL':.43,'kneeR':.43,'shoL':(-.30,0,.33),'shoR':(-.30,0,-.33),'elbL':-.70,'elbR':-.70,'head':(-.04,-s*.05,0)}
def celebration(t):
    # A restrained fist-pump and relaxed recovery, with both feet planted.
    p=min(1,t/.5);p=p*p*(3-2*p)
    release=max(0,min(1,(t-1.1)/.9));release=release*release*(3-2*release)
    p*=1-release*.7
    d=idle(t)
    d.update({'spine':-.035*p,'shoL':(-.06,0,.08),'shoR':(-.42*p,0,-.12),'elbL':-.3,'elbR':-.24-.95*p,'head':(-.06*p,0,0)})
    return d
bake('outfield_idle',2,idle);bake('dribble',20/24,dribble);bake('jockey',1.2,jockey);bake('celebrate',2,celebration)


# Purpose-built strike: weight over the plant foot, right-leg backswing,
# contact at .8 seconds, then a decelerating follow-through.
STRIKE_KEYS=[
 (0, {'spine':.04,'hipL':-.05,'hipR':.08,'kneeL':.1,'kneeR':.2,'shoL':(-.15,0,.1),'shoR':(-.15,0,-.1),'elbL':-.45,'elbR':-.45}),
 (.40, {'pelvis':(0,.14,-.08),'spine':(.18,-.16,0),'hipL':-.12,'hipR':.7,'kneeL':.22,'kneeR':1.4,'ankleR':-.4,'shoL':(-.6,0,.7),'shoR':(.5,0,-.38),'elbL':-.7,'elbR':-.8,'head':.14}),
 (.8, {'pelvis':(0,-.09,-.06),'spine':(.10,.12,0),'hipL':-.10,'hipR':-.52,'kneeL':.15,'kneeR':.10,'ankleR':.16,'shoL':(-.35,0,.9),'shoR':(.3,0,-.4),'elbL':-.4,'elbR':-.6,'head':.10}),
 (1.02, {'pelvis':(0,-.2,-.06),'spine':(.20,.25,0),'hipL':-.04,'hipR':-1.08,'kneeL':.13,'kneeR':.24,'ankleR':.2,'shoL':(.12,0,.75),'shoR':(-.4,0,-.35),'elbL':-.45,'elbR':-.5,'head':-.06}),
 (1.5, {'spine':.08,'hipL':-.04,'hipR':-.22,'kneeL':.12,'kneeR':.38,'shoL':(-.08,0,.25),'shoR':(-.1,0,-.2),'elbL':-.3,'elbR':-.4}),
]
def strike(t):
    for i in range(len(STRIKE_KEYS)-1):
        t0,a=STRIKE_KEYS[i];t1,b=STRIKE_KEYS[i+1]
        if t<=t1:
            u=max(0,min(1,(t-t0)/(t1-t0)));u=u*u*(3-2*u)
            def vec(v):return (v,0,0) if isinstance(v,(int,float)) else v
            return {k:tuple(x+(y-x)*u for x,y in zip(vec(a.get(k,0)),vec(b.get(k,0)))) for k in set(a)|set(b)}
    return STRIKE_KEYS[-1][1]
bake('strike',1.5,strike)
exec(compile((ROOT/'scripts/blender/football-actions.py').read_text(),'football-actions.py','exec'))

def keeper(t,side=0,high=False):
    # Set -> push -> full reach (contact at .89s) -> cushion -> landing.
    reach=max(0,min(1,(t-.18)/.71));reach=1-(1-reach)**3
    gather=max(0,min(1,(t-.89)/.22));gather=1-(1-gather)**3
    land=max(0,min(1,(t-1.0)/.6));land=land*land*(3-2*land)
    angle=side*(2.95 if high else 2.66)
    x=-.72+(-1.18+.72)*reach
    zl=-.82+(angle-.16+.82)*reach;zr=.82+(angle+.16-.82)*reach
    if gather:
        x=x+(-.48-x)*gather;zl=zl+(side*.4+.58-zl)*gather;zr=zr+(side*.4-.58-zr)*gather
    d={'pelvis':-.16+.28*reach,'spine':.28+((-.12 if high else .12)-.28)*reach+land*.16,'hipL':-.62+((.28 if high else .76)+.62)*reach,'hipR':-.62+((-.2 if high else .18)+.62)*reach,'kneeL':1.08+((.46 if high else 1.02)-1.08)*reach+land*.36,'kneeR':1.08+((.68 if high else .62)-1.08)*reach+land*.28,'ankleL':-.28+.46*reach,'ankleR':-.28+.2*reach,'shoL':(x,0,zl),'shoR':(x,0,zr),'elbL':-.82+.7*reach-gather*1.42,'elbR':-.82+.7*reach-gather*1.42,'head':(-.16+.12*reach,side*.18*gather,-side*.18*land)}
    return d
for side,suffix in [(-1,'left'),(1,'right')]:
    for high,label in [(False,'low'),(True,'high')]:
        bake('keeper_'+label+'_'+suffix,1.65,lambda t,s=side,h=high:keeper(t,s,h))
        def full_dive(t,s=side,h=high):
            d=keeper(t,s,h)
            u=max(0,min(1,(t-.18)/.71));reach=1-(1-u)**3
            v=max(0,min(1,(t-1.0)/.6));land=v*v*(3-2*v)
            contact_x=s*2.45*(.68 if h else .66)
            contact_y=1.06 if h else .08
            x=contact_x*reach+(s*2.45*.52-contact_x*reach)*land
            y=(-.05+(contact_y+.05)*reach+math.sin(reach*math.pi)*(.34 if h else .16))*(1-land)+.035*land
            d['_root_pos']=(x,y,0)
            d['_root_roll']=-s*((.72 if h else .58)*(1-land)+1.44*land)*reach
            return d
        bake('keeper_'+label+'_'+suffix+'_full',1.65,full_dive)
def ready(t):
    d=jockey(t);d.update({'hipL':-.45,'hipR':-.45,'kneeL':.85,'kneeR':.85,'shoL':(-.5,0,-.15),'shoR':(-.5,0,.15),'elbL':-.95,'elbR':-.95})
    return d
bake('keeper_idle',2.4,ready)
# NLA tracks make every clip explicit and reproducible in the .blend.
rig.animation_data.action=None
for a in list(bpy.data.actions):
    if a.name not in original_actions and not a.name.startswith(('outfield','dribble','jockey','celebrate','strike','stance','keeper_')):continue
    track=rig.animation_data.nla_tracks.new();track.name=a.name
    strip=track.strips.new(a.name,0,a);strip.action_slot=a.slots[0]
    track.mute=True
pose(idle(0));bpy.context.scene.render.fps=24
bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=48
# Export the neutral rest pose. Runtime pose adapters must not treat an
# already animated idle pose as the bone's rest orientation.
for bone in rig.pose.bones:
    bone.rotation_quaternion=Quaternion();bone.location=(0,0,0);bone.scale=(1,1,1)
bpy.context.view_layer.update()
# Export separate glTF, so eye PNGs load through same-origin requests under CSP.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type in {'MESH','ARMATURE'}:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'footballer.gltf'),export_format='GLTF_SEPARATE',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_anim_single_armature=True,export_materials='EXPORT',export_apply=False,export_yup=True)
# Review scene, saved alongside the editable model and animation actions.
pose(idle(0));bpy.context.view_layer.update()
hand.hide_render=True
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/demos/score/player-hair.glb'))
new=set(bpy.data.objects)-before
hair_source=next((o for o in new if o.name.startswith('Hair_Buzzed') and o.type=='MESH'),None)
if hair_source:
    hair_source.name='Review hair (runtime-selectable)'
    hmat=material('Review hair',(.026,.017,.012),.85);hair_source.data.materials.clear();hair_source.data.materials.append(hmat)
    # Source styles are already in bind/model space; a head-only skin keeps it attached.
    for v in hair_source.data.vertices:v.co=hair_source.matrix_world@v.co
    hair_source.parent=None;hair_source.matrix_world=Matrix.Identity(4)
    hair_source.vertex_groups.clear();vg=hair_source.vertex_groups.new(name='Head');vg.add(list(range(len(hair_source.data.vertices))),1,'REPLACE')
    hair_source.modifiers.clear();mod=hair_source.modifiers.new('Head bone','ARMATURE');mod.object=rig;hair_source.parent=rig
for o in new:
    if o!=hair_source:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;floor.name='Review floor';floor.data.materials.append(material('Review charcoal',(.025,.038,.055),.9))
world=bpy.data.worlds.new('Studio');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.08,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for loc,power,size,col in [((3,-4,5),500,4,(.84,.92,1)),((-3,-2,3),350,3,(1,.82,.58)),((1,3,4),700,3,(.5,.72,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,-5,2.5));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.5;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
rig.animation_data.action=None;pose(idle(0));bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'footballer.blend'))
scene.render.filepath='/tmp/footballer-blender.png';bpy.ops.render.render(write_still=True)
print('FOOTBALLER_BUILD_COMPLETE',OUT)
