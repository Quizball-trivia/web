# Table Derby buzzer — the actual show prop: an orange rounded-rect button
# box (pressable lid with a seam) on a dark base slab, small dark bolt mark
# on the lid. Renders a single transparent PNG for the buzzer round.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#     --factory-startup --python scripts/table-derby/buzzer-square.py -- out.png
import sys

import bpy

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/buzzer.png"

ORANGE = (0xEE, 0x5A, 0x22)
CHARCOAL = (0x1A, 0x1A, 0x1A)
MARK = (0x28, 0x1E, 0x1A)


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def mat(name, rgb, rough=0.42):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*[srgb_to_linear(v) for v in rgb], 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return m


def rounded_box(name, sx, sy, sz, z, bevel, material, segments=6):
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, sz)
    ob.location = (0, 0, z)
    bpy.ops.object.transform_apply(scale=True)
    mod = ob.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = segments
    ob.data.materials.append(material)
    ob.data.shade_smooth()
    return ob


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

orange = mat("orange", ORANGE, rough=0.52)
dark = mat("dark", CHARCOAL, rough=0.6)
markm = mat("mark", MARK, rough=0.5)

# Dark base slab (slightly narrower footprint), lower body, then the lid —
# a hair smaller with a gap above the body so the press seam reads.
rounded_box("base", 1.72, 1.18, 0.20, 0.10, 0.03, dark)
rounded_box("body", 1.90, 1.30, 0.30, 0.20 + 0.15, 0.04, orange)
# Lid sits sunk into the body — a slightly smaller cap, so the press seam
# reads as a hairline step, not a crevice.
rounded_box("lid", 1.87, 1.27, 0.44, 0.20 + 0.30 - 0.02 + 0.22, 0.05, orange)

# Bolt mark lying flat on the lid, small and off-square like the prop's.
lid_top = 0.20 + 0.30 - 0.02 + 0.44
pts = [(0.00, 1.00), (0.52, 1.00), (0.20, 0.38), (0.62, 0.38), (-0.18, -1.00), (0.02, -0.02), (-0.40, -0.02)]
mesh = bpy.data.meshes.new("bolt")
scale = 0.16
mesh.from_pydata([(x * scale, y * scale, 0) for x, y in pts], [], [list(range(len(pts)))])
mesh.update()
bolt = bpy.data.objects.new("bolt", mesh)
bpy.context.collection.objects.link(bolt)
bolt.location = (0, 0.12, lid_top + 0.002)
bolt.rotation_euler = (0, 0, 0.35)
solid = bolt.modifiers.new("solid", "SOLIDIFY")
solid.thickness = 0.012
bolt.data.materials.append(markm)

# Camera: near-front three-quarter, gently above — like the show close-ups.
bpy.ops.object.camera_add(location=(1.5, -4.6, 2.3))
cam = bpy.context.active_object
bpy.ops.object.empty_add(location=(0, 0, 0.42))
target = bpy.context.active_object
con = cam.constraints.new("TRACK_TO")
con.target = target
cam.data.lens = 62
bpy.context.scene.camera = cam

# Soft key + fill + rim.
def area(loc, energy, size):
    bpy.ops.object.light_add(type="AREA", location=loc)
    li = bpy.context.active_object
    li.data.energy = energy
    li.data.size = size
    li.constraints.new("TRACK_TO").target = target


area((-2.5, -3.0, 4.5), 340, 6.0)
area((3.5, -1.5, 2.0), 140, 4.0)
area((0.5, 4.0, 3.0), 180, 4.0)

sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.view_settings.view_transform = "Standard"
sc.render.film_transparent = True
sc.render.resolution_x = 1200
sc.render.resolution_y = 860
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("wrote", OUT)
