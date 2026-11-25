"""Tạo rig cá koi từ model tĩnh; chạy trong Blender qua MCP."""
import bpy
import math
from mathutils import Vector

ROOT = r"D:\GAMEREXI\assets\models\runtime"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def vertex_weight(x):
    """Chia weight theo trục dài X; vùng đuôi được uốn độc lập."""
    if x > 0.11:
        return {"head": 1.0}
    if x > -0.10:
        return {"spine": 1.0}
    if x > -0.22:
        t = (-0.10 - x) / 0.12
        return {"spine": 1.0 - t, "tail": t}
    t = min(1.0, (-0.22 - x) / 0.16)
    return {"tail": 1.0 - 0.72 * t, "tail_tip": 0.72 * t}


def rig_koi(source, target):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=f"{ROOT}\\{source}")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"Không có mesh trong {source}")

    arm_data = bpy.data.armatures.new("KoiRig")
    arm = bpy.data.objects.new("KoiRig", arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    specifications = {
        "root": ((0.0, 0.0, 0.07), (0.05, 0.0, 0.07), None),
        "spine": ((-0.12, 0.0, 0.07), (0.10, 0.0, 0.07), "root"),
        "head": ((0.10, 0.0, 0.07), (0.28, 0.0, 0.07), "spine"),
        "tail": ((-0.22, 0.0, 0.07), (-0.10, 0.0, 0.07), "spine"),
        "tail_tip": ((-0.38, 0.0, 0.07), (-0.22, 0.0, 0.07), "tail"),
    }
    for name, (head, tail, parent) in specifications.items():
        bone = arm_data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")

    for mesh in meshes:
        groups = {name: mesh.vertex_groups.new(name=name) for name in specifications}
        for vertex in mesh.data.vertices:
            world = mesh.matrix_world @ vertex.co
            weights = vertex_weight(world.x)
            for name, weight in weights.items():
                if weight > 0.0001:
                    groups[name].add([vertex.index], weight, "REPLACE")
        modifier = mesh.modifiers.new("Koi swim skeleton", "ARMATURE")
        modifier.object = arm
        mesh.parent = arm

    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    action = bpy.data.actions.new("Koi_Swim")
    arm.animation_data_create()
    arm.animation_data.action = action
    frames = [1, 5, 9, 13, 17, 21, 25]
    for frame in frames:
        phase = (frame - 1) / 24.0 * math.tau
        for name in ["spine", "head", "tail", "tail_tip"]:
            pose = arm.pose.bones[name]
            pose.rotation_mode = "XYZ"
            amplitude = {"spine": 0.045, "head": -0.055, "tail": 0.38, "tail_tip": 0.52}[name]
            offset = {"spine": 0.0, "head": 0.35, "tail": -0.65, "tail_tip": -1.0}[name]
            pose.rotation_euler.z = math.sin(phase + offset) * amplitude
            pose.keyframe_insert(data_path="rotation_euler", index=2, frame=frame, group=name)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 24
    bpy.context.scene.render.fps = 24
    bpy.context.scene.frame_set(1)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=f"{ROOT}\\{target}",
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_skins=True,
        export_yup=True,
    )
    print("RIGGED_EXPORT", target, "verts", sum(len(m.data.vertices) for m in meshes), "bones", len(specifications))


rig_koi("kohaku-koi.glb", "kohaku-koi-rigged.glb")
rig_koi("ogon-koi.glb", "ogon-koi-rigged.glb")
