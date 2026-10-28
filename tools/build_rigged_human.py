"""Builds the player's rigged human mesh (public/models/player.glb) from nothing but a list of joint
positions -- no downloaded or purchased assets, so it ships free and without a licence question.

Run with Blender's own Python, from the repo root:
    blender --background --python tools/build_rigged_human.py

What it does, in order:
  1. A "skeleton" mesh: 25 vertices at human joint positions, connected by edges (pelvis to spine to
     chest..., shoulder to elbow to wrist..., hip to knee to ankle...).
  2. A Skin modifier gives each vertex a radius, so the modifier builds a solid rounded body around those
     edges -- a torso, limbs, a head, all as one continuous surface instead of separate shapes bolted
     together.
  3. `skin_armature_create` turns that same edge skeleton into a real Armature (bones) and automatically
     skins the generated body to it (vertex weights from the skin radii), so the mesh deforms correctly
     when a bone rotates.
  4. Every bone is renamed to the joint names the game's characters3d.ts already drives through setPose
     (torso, head, armL/R, elbowL/R, legL/R, kneeL/R, ...), by matching each bone's head/tail position back
     to the named vertex it came from. The mesh's vertex groups (which skin_armature_create names after the
     bones' original, un-renamed names) are renamed the same way, or the skin weights would no longer point
     at the right bone once the bones themselves are renamed.
  5. Exported as glTF binary (.glb), which Three.js loads as a THREE.SkinnedMesh with a THREE.Skeleton of
     named THREE.Bone objects -- see buildRiggedCharacter() in src/characters3d.ts, which loads this file,
     finds the bones by these same names, and wraps each one in a poseHandle() so setPose's existing
     rotation-based poses (walk, sit, wave, ...) drive the bones as if they were the procedural rig's
     groups, no changes to setPose itself required.

Known rough edges, for whoever picks this up next:
  - No clothing: the mesh is a bare body. characters3d.ts only tints its skin tone from the player's Look;
    it does not yet attempt the shirt/trouser/shoe colours and styles the procedural character shows.
  - No face, and the hands/feet are simple rounded stubs, not sculpted. This is a base mesh, not a
    finished character model.
  - A Subdivision Surface modifier is added for smoothing, but Blender's glTF exporter does not carry it
    into a skinned export (the shipped mesh is the unsubdivided skin-modifier geometry, visibly faceted).
    Getting a smooth skinned export needs either a higher-resolution base skeleton (more edge segments, so
    the skin modifier itself produces more faces) or applying the subdivision before skinning in a way that
    preserves the vertex groups -- neither attempted here.
"""
import bpy, bmesh

bpy.ops.wm.read_factory_settings(use_empty=True)

# Each joint's (name, position in metres -- Blender is Z-up, feet near z=0, standing about 1.78m tall, and
# the Skin modifier's radius at that joint (half the body's width there).
verts_def = [
    ("pelvis",      (0, 0, 1.00), 0.135),
    ("spine",       (0, 0, 1.17), 0.145),
    ("chest",       (0, 0, 1.38), 0.19),
    ("neck",        (0, 0, 1.49), 0.065),
    ("headbase",    (0, 0, 1.545), 0.075),
    ("headmid",     (0, -0.01, 1.63), 0.105),
    ("headtop",     (0, 0.0, 1.715), 0.02),

    ("shoulderL",   (-0.185, 0, 1.40), 0.065),
    ("elbowL",      (-0.215, 0.02, 1.155), 0.044),
    ("wristL",      (-0.225, 0.03, 0.895), 0.033),
    ("handL",       (-0.23, 0.05, 0.775), 0.05),

    ("shoulderR",   (0.185, 0, 1.40), 0.065),
    ("elbowR",      (0.215, 0.02, 1.155), 0.044),
    ("wristR",      (0.225, 0.03, 0.895), 0.033),
    ("handR",       (0.23, 0.05, 0.775), 0.05),

    ("hipL",        (-0.095, 0, 0.93), 0.095),
    ("kneeL",       (-0.10, 0.01, 0.49), 0.058),
    ("ankleL",      (-0.10, 0.0, 0.085), 0.04),
    ("footL",       (-0.10, 0.12, 0.025), 0.06),
    ("toeL",        (-0.10, 0.19, 0.015), 0.045),

    ("hipR",        (0.095, 0, 0.93), 0.095),
    ("kneeR",       (0.10, 0.01, 0.49), 0.058),
    ("ankleR",      (0.10, 0.0, 0.085), 0.04),
    ("footR",       (0.10, 0.12, 0.025), 0.06),
    ("toeR",        (0.10, 0.19, 0.015), 0.045),
]
edges_def = [
    ("pelvis", "spine"), ("spine", "chest"), ("chest", "neck"), ("neck", "headbase"),
    ("headbase", "headmid"), ("headmid", "headtop"),
    ("chest", "shoulderL"), ("shoulderL", "elbowL"), ("elbowL", "wristL"), ("wristL", "handL"),
    ("chest", "shoulderR"), ("shoulderR", "elbowR"), ("elbowR", "wristR"), ("wristR", "handR"),
    ("pelvis", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankleL"), ("ankleL", "footL"), ("footL", "toeL"),
    ("pelvis", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankleR"), ("ankleR", "footR"), ("footR", "toeR"),
]
# The bone each edge should end up named as -- the joints setPose already knows how to pose.
BONE_NAME = {
    ("pelvis", "spine"): "torso", ("spine", "chest"): "chestBone", ("chest", "neck"): "neckBone",
    ("neck", "headbase"): "head", ("headbase", "headmid"): "headMid", ("headmid", "headtop"): "headTop",
    ("chest", "shoulderL"): "clavicleL", ("shoulderL", "elbowL"): "armL", ("elbowL", "wristL"): "elbowL", ("wristL", "handL"): "handL",
    ("chest", "shoulderR"): "clavicleR", ("shoulderR", "elbowR"): "armR", ("elbowR", "wristR"): "elbowR", ("wristR", "handR"): "handR",
    ("pelvis", "hipL"): "hipL", ("hipL", "kneeL"): "legL", ("kneeL", "ankleL"): "kneeL", ("ankleL", "footL"): "ankleL", ("footL", "toeL"): "toeL",
    ("pelvis", "hipR"): "hipR", ("hipR", "kneeR"): "legR", ("kneeR", "ankleR"): "kneeR", ("ankleR", "footR"): "ankleR", ("footR", "toeR"): "toeR",
}
pos_of = {name: pos for name, pos, r in verts_def}

mesh = bpy.data.meshes.new("Human")
obj = bpy.data.objects.new("Human", mesh)
bpy.context.collection.objects.link(obj)

bm = bmesh.new()
idx = {name: bm.verts.new(pos) for name, pos, r in verts_def}
bm.verts.ensure_lookup_table()
for a, b in edges_def:
    bm.edges.new((idx[a], idx[b]))
bm.to_mesh(mesh)
bm.free()

skin_mod = obj.modifiers.new(name="Skin", type='SKIN')
skin_mod.use_smooth_shade = True
skin_layer = mesh.skin_vertices[0].data
for i, (name, pos, r) in enumerate(verts_def):
    skin_layer[i].radius = (r, r)
pelvis_i = next(i for i, (n, _, _) in enumerate(verts_def) if n == "pelvis")
skin_layer[pelvis_i].use_root = True

bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.skin_armature_create(modifier="Skin")

arm_obj = obj.parent or next(o for o in bpy.data.objects if o.type == 'ARMATURE')
obj.parent = arm_obj
obj.matrix_parent_inverse = arm_obj.matrix_world.inverted()


def closest_name(p):
    return min(pos_of, key=lambda name: sum((p[i] - pos_of[name][i]) ** 2 for i in range(3)))


# Rename every bone to its joint name, and the mesh's matching vertex group alongside it -- before the Skin
# modifier is applied, while the base mesh is still just the 25 named vertices and the (pre-rename) vertex
# groups skin_armature_create made still match them one to one.
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode='EDIT')
rename = {}
for b in arm_obj.data.edit_bones:
    key = (closest_name(b.head), closest_name(b.tail))
    new_name = BONE_NAME.get(key) or BONE_NAME.get(key[::-1])
    if new_name:
        rename[b.name] = new_name
for old, new in rename.items():
    arm_obj.data.edit_bones[old].name = new
bpy.ops.object.mode_set(mode='OBJECT')
for old, new in rename.items():
    vg = obj.vertex_groups.get(old)
    if vg:
        vg.name = new

bpy.context.view_layer.objects.active = obj
bpy.ops.object.modifier_apply(modifier="Skin")
bpy.ops.object.shade_smooth()

mat = bpy.data.materials.new("Skin")
mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.86, 0.68, 0.55, 1.0)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.55
obj.data.materials.append(mat)

bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
arm_obj.select_set(True)
bpy.ops.export_scene.gltf(filepath="public/models/player.glb", export_format='GLB', use_selection=True)
print("Exported public/models/player.glb with bones:", sorted(b.name for b in arm_obj.data.bones))
