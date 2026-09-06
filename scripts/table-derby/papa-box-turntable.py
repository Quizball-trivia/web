"""Papa Carlo's Box — pentagonal card carousel from the show, as a
120-frame turntable (full 360 deg — faces carry unique card colors).
Charcoal tower + recessed pockets, orange base with betsson.sport,
orange pentagon cap with circular inset (per the blueprint)."""

import math
import os

import bpy

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tdrenders", "box")
os.makedirs(OUT, exist_ok=True)


def srgb_to_linear(c):
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c[:3]) + (1,)


ORANGE = srgb_to_linear((0.933, 0.353, 0.133))
CHARCOAL = srgb_to_linear((0.11, 0.11, 0.11))
POCKET = srgb_to_linear((0.05, 0.05, 0.05))
WHITE = srgb_to_linear((0.97, 0.97, 0.97))

# card colors baked into the box (pair p on the face that the app shows
# as logical face p; physical face k maps to pair (3 - k) % 5)
CARD_HEX = [
    (0x4C, 0x9F, 0x45), (0xD6, 0x45, 0x41), (0xE8, 0xB6, 0x2B), (0x3E, 0x7B, 0xC4),
    (0xEE, 0x5A, 0x22), (0x8C, 0x4F, 0xB0), (0x2A, 0xA7, 0x9B), (0xD4, 0x58, 0x9B),
    (0xF4, 0xF1, 0xEC), (0xC0, 0xCA, 0x33),
]


def mat(name, rgba, rough=0.5, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    return m


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.resolution_x = 640
sc.render.resolution_y = 760
sc.render.film_transparent = True
sc.view_settings.view_transform = "Standard"
try:
    sc.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    sc.render.engine = "BLENDER_EEVEE"

# camera + target
cam = bpy.data.cameras.new("cam")
camo = bpy.data.objects.new("cam", cam)
sc.collection.objects.link(camo)
camo.location = (0, -5.2, 2.6)
sc.camera = camo
tgt = bpy.data.objects.new("target", None)
tgt.location = (0, 0, 1.35)
sc.collection.objects.link(tgt)
tr = camo.constraints.new("TRACK_TO")
tr.target = tgt
tr.track_axis = "TRACK_NEGATIVE_Z"
tr.up_axis = "UP_Y"

# lights
for name, kind, energy, size, loc, rot in [
    ("key", "AREA", 900, 6, (3, -3, 5), (35, 0, 35)),
    ("fill", "AREA", 380, 8, (-4, -1, 3), (55, 0, -65)),
    ("rim", "AREA", 500, 4, (0, 4, 3.5), (-40, 0, 0)),
]:
    li = bpy.data.lights.new(name, kind)
    li.energy = energy
    li.size = size
    lo = bpy.data.objects.new(name, li)
    lo.location = loc
    lo.rotation_euler = tuple(math.radians(a) for a in rot)
    sc.collection.objects.link(lo)

m_orange = mat("orange", ORANGE, rough=0.5)
m_dark = mat("dark", CHARCOAL, rough=0.45)
m_pocket = mat("pocket", POCKET, rough=0.7)
m_white = mat("white", WHITE, rough=0.6)

# ── static base (does not spin) ──────────────────────────────────────
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.34, depth=0.52, location=(0, 0, 0.26))
base = bpy.context.object
base.data.materials.append(m_orange)
md = base.modifiers.new("bevel", "BEVEL")
md.width = 0.04
md.segments = 3

for body, size, z in [("betsson", 0.21, 0.30), (".sport", 0.12, 0.14)]:
    bpy.ops.object.text_add(location=(0, -1.345, z))
    t = bpy.context.object
    t.data.body = body
    t.data.size = size
    t.data.extrude = 0.004
    t.data.align_x = "CENTER"
    t.rotation_euler = (math.radians(90), 0, 0)
    t.data.materials.append(m_white)

# ── spinning assembly ────────────────────────────────────────────────
spin = bpy.data.objects.new("spin", None)
sc.collection.objects.link(spin)

APO = math.cos(math.radians(36))  # pentagon apothem for r=1

# tower: 5-sided prism, one face toward the camera (rot_z = 18 deg)
bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=1.0, depth=2.1, location=(0, 0, 1.57))
tower = bpy.context.object
tower.rotation_euler[2] = 0
tower.data.materials.append(m_dark)

# pocket cutters: 2 per face
cutters = []
for k in range(5):
    theta = math.radians(54 + 72 * k)
    d = (math.cos(theta), math.sin(theta))
    for z in (2.0, 1.25):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(d[0] * (APO + 0.02), d[1] * (APO + 0.02), z))
        c = bpy.context.object
        c.scale = (1.06, 0.18, 0.52)
        c.rotation_euler[2] = theta - math.radians(90)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        cutters.append(c)
bpy.ops.object.select_all(action="DESELECT")
for c in cutters:
    c.select_set(True)
bpy.context.view_layer.objects.active = cutters[0]
bpy.ops.object.join()
cutter = bpy.context.object
mb = tower.modifiers.new("cut", "BOOLEAN")
mb.operation = "DIFFERENCE"
mb.object = cutter
bpy.context.view_layer.objects.active = tower
bpy.ops.object.modifier_apply(modifier="cut")
bpy.data.objects.remove(cutter, do_unlink=True)

# pocket back plates (slightly darker, sunk into each recess)
plates = []
for k in range(5):
    theta = math.radians(54 + 72 * k)
    d = (math.cos(theta), math.sin(theta))
    for z in (2.0, 1.25):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(d[0] * (APO - 0.07), d[1] * (APO - 0.07), z))
        p = bpy.context.object
        p.scale = (1.0, 0.02, 0.46)
        p.rotation_euler[2] = theta - math.radians(90)
        p.data.materials.append(m_pocket)
        plates.append(p)

# colored card slabs seated in every pocket (they spin with the box)
card_mats = [mat(f"card{i}", srgb_to_linear(tuple(v / 255 for v in c)), rough=0.5) for i, c in enumerate(CARD_HEX)]
for k in range(5):
    theta = math.radians(54 + 72 * k)
    d = (math.cos(theta), math.sin(theta))
    pair = (3 - k) % 5
    for j, z in enumerate((2.0, 1.25)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(d[0] * (APO - 0.045), d[1] * (APO - 0.045), z))
        card = bpy.context.object
        card.scale = (0.96, 0.035, 0.40)
        card.rotation_euler[2] = theta - math.radians(90)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        mdc = card.modifiers.new("bevel", "BEVEL")
        mdc.width = 0.015
        mdc.segments = 2
        card.data.materials.append(card_mats[pair * 2 + j])
        plates.append(card)

# cap: orange pentagon + dark circular inset (blueprint's top hole)
bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.94, depth=0.08, location=(0, 0, 2.66))
cap = bpy.context.object
cap.rotation_euler[2] = 0
cap.data.materials.append(m_orange)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.32, depth=0.05, location=(0, 0, 2.70))
hole = bpy.context.object
hole.data.materials.append(m_dark)

for o in [tower, cap, hole] + plates:
    o.parent = spin

# ── render 120 frames over 360 deg (unique colors per face) ──────────
for f in range(120):
    spin.rotation_euler[2] = math.radians(f * 3)
    sc.render.filepath = os.path.join(OUT, f"box_{f:03d}.png")
    bpy.ops.render.render(write_still=True)
    print("WROTE", f)
print("ALL DONE")
