extends Control

const BG := Color("#10141c")
const PANEL := Color("#181f2a")
const PANEL_2 := Color("#202a38")
const LINE := Color("#2d394a")
const TEXT := Color("#e8eef7")
const MUTED := Color("#91a0b5")
const ACCENT := Color("#42e3a4")

var scene_root: Node3D
var editor_camera: Camera3D
var objects: Array[MeshInstance3D] = []
var selected: MeshInstance3D
var hierarchy: VBoxContainer
var inspector: VBoxContainer
var viewport_box: SubViewportContainer
var play_mode := false
var dirty := false
var object_counter := 0
var orbit_yaw := 0.72
var orbit_pitch := 0.42
var orbit_distance := 9.0
var project_label: Label
var selection_label: Label
var status_label: Label
var pos_spins: Array[SpinBox] = []
var scale_spins: Array[SpinBox] = []

func _ready() -> void:
	_build_editor()
	_build_world()
	_add_object("Cube")
	_add_object("Sphere")
	_select_object(objects[0])
	_update_hierarchy()
	_refresh_inspector()

func _build_editor() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_PASS
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 0)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	var header := _panel(PANEL, LINE, 0)
	header.custom_minimum_size.y = 58
	root.add_child(header)
	var header_row := HBoxContainer.new()
	header_row.add_theme_constant_override("separation", 12)
	header_row.alignment = BoxContainer.ALIGNMENT_CENTER
	header.add_child(header_row)
	var brand := Label.new()
	brand.text = "◆  MOBIFORGE"
	brand.add_theme_color_override("font_color", ACCENT)
	brand.add_theme_font_size_override("font_size", 18)
	header_row.add_child(brand)
	var version := _label("3D  /  MOBILE EDITION", MUTED, 10)
	header_row.add_child(version)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_row.add_child(spacer)
	project_label = _label("MI PRIMER JUEGO   •   Sin guardar", MUTED, 12)
	header_row.add_child(project_label)
	header_row.add_child(_button("Guardar", _save_project, ACCENT))
	header_row.add_child(_button("▶  Probar", _toggle_play, Color("#f2f7fc")))

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 0)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(body)

	var left := _panel(PANEL, LINE, 0)
	left.custom_minimum_size.x = 194
	body.add_child(left)
	var left_col := VBoxContainer.new()
	left_col.add_theme_constant_override("separation", 7)
	left_col.add_theme_constant_override("margin_left", 10)
	left_col.add_theme_constant_override("margin_right", 10)
	left_col.add_theme_constant_override("margin_top", 12)
	left_col.add_theme_constant_override("margin_bottom", 10)
	left.add_child(left_col)
	left_col.add_child(_section_title("ESCENA"))
	var scene_name := _label("▾  Nivel principal", TEXT, 13)
	left_col.add_child(scene_name)
	left_col.add_child(_divider())
	var hierarchy_head := HBoxContainer.new()
	hierarchy_head.add_child(_section_title("JERARQUÍA"))
	var fill := Control.new()
	fill.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hierarchy_head.add_child(fill)
	hierarchy_head.add_child(_mini_button("＋", func(): _add_object("Cube")))
	left_col.add_child(hierarchy_head)
	hierarchy = VBoxContainer.new()
	hierarchy.add_theme_constant_override("separation", 3)
	left_col.add_child(hierarchy)
	var left_spacer := Control.new()
	left_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left_col.add_child(left_spacer)
	left_col.add_child(_divider())
	left_col.add_child(_label("OBJETOS", MUTED, 10))
	left_col.add_child(_button("＋  Añadir cubo", func(): _add_object("Cube")))
	left_col.add_child(_button("＋  Añadir esfera", func(): _add_object("Sphere")))
	left_col.add_child(_button("＋  Añadir luz", func(): _add_object("Light")))

	var center := VBoxContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	center.add_theme_constant_override("separation", 0)
	body.add_child(center)
	var toolbar := _panel(Color("#141a23"), LINE, 0)
	toolbar.custom_minimum_size.y = 44
	center.add_child(toolbar)
	var tools := HBoxContainer.new()
	tools.add_theme_constant_override("separation", 5)
	tools.alignment = BoxContainer.ALIGNMENT_CENTER
	toolbar.add_child(tools)
	tools.add_child(_tool_button("↖  Seleccionar", true))
	tools.add_child(_tool_button("✥  Mover", false))
	tools.add_child(_tool_button("⟳  Rotar", false))
	tools.add_child(_tool_button("▱  Escalar", false))
	var tool_fill := Control.new()
	tool_fill.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tools.add_child(tool_fill)
	tools.add_child(_label("Vista 3D   •   arrastra para orbitar", MUTED, 11))
	viewport_box = SubViewportContainer.new()
	viewport_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	viewport_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	viewport_box.stretch = true
	viewport_box.mouse_filter = Control.MOUSE_FILTER_STOP
	viewport_box.gui_input.connect(_on_viewport_input)
	center.add_child(viewport_box)
	var sub := SubViewport.new()
	sub.name = "WorldViewport"
	sub.size = Vector2i(1200, 680)
	sub.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	sub.handle_input_locally = false
	viewport_box.add_child(sub)
	var status := _panel(Color("#141a23"), LINE, 0)
	status.custom_minimum_size.y = 28
	center.add_child(status)
	var status_row := HBoxContainer.new()
	status_row.add_theme_constant_override("separation", 12)
	status_row.alignment = BoxContainer.ALIGNMENT_CENTER
	status.add_child(status_row)
	status_label = _label("●  LISTO", ACCENT, 10)
	status_row.add_child(status_label)
	status_row.add_child(_label("GL COMPATIBILITY  •  ANDROID", MUTED, 10))
	var status_spacer := Control.new()
	status_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status_row.add_child(status_spacer)
	status_row.add_child(_label("1280 × 720  |  Horizontal", MUTED, 10))

	var right := _panel(PANEL, LINE, 0)
	right.custom_minimum_size.x = 238
	body.add_child(right)
	var right_col := VBoxContainer.new()
	right_col.add_theme_constant_override("separation", 9)
	right_col.add_theme_constant_override("margin_left", 12)
	right_col.add_theme_constant_override("margin_right", 12)
	right_col.add_theme_constant_override("margin_top", 12)
	right_col.add_theme_constant_override("margin_bottom", 10)
	right.add_child(right_col)
	right_col.add_child(_section_title("INSPECTOR"))
	selection_label = _label("Sin selección", TEXT, 15)
	right_col.add_child(selection_label)
	right_col.add_child(_divider())
	inspector = right_col
	_refresh_inspector()

func _build_world() -> void:
	var sub := viewport_box.get_child(0) as SubViewport
	scene_root = Node3D.new()
	scene_root.name = "Level"
	sub.add_child(scene_root)
	var world_env := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("#172334")
	sky_mat.sky_horizon_color = Color("#4a6275")
	sky_mat.ground_bottom_color = Color("#111821")
	sky_mat.ground_horizon_color = Color("#303c49")
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#a8bad1")
	env.ambient_light_energy = 0.55
	world_env.environment = env
	scene_root.add_child(world_env)
	var sun := DirectionalLight3D.new()
	sun.name = "SunLight"
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.light_energy = 1.35
	sun.shadow_enabled = true
	scene_root.add_child(sun)
	var floor := MeshInstance3D.new()
	floor.name = "Ground"
	var plane := PlaneMesh.new()
	plane.size = Vector2(40, 40)
	floor.mesh = plane
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color("#252d36")
	floor_mat.roughness = 0.9
	floor.material_override = floor_mat
	floor.position.y = -0.04
	scene_root.add_child(floor)
	_add_grid()
	editor_camera = Camera3D.new()
	editor_camera.name = "EditorCamera"
	editor_camera.current = true
	scene_root.add_child(editor_camera)
	_update_camera()

func _add_grid() -> void:
	var mesh := ImmediateMesh.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color("#647486")
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.vertex_color_use_as_albedo = true
	mesh.surface_begin(Mesh.PRIMITIVE_LINES, mat)
	for i in range(-20, 21):
		var c := 0.28 if i % 5 == 0 else 0.12
		var col := Color(0.4, 0.53, 0.67, c)
		mesh.surface_set_color(col)
		mesh.surface_add_vertex(Vector3(i, 0.006, -20))
		mesh.surface_set_color(col)
		mesh.surface_add_vertex(Vector3(i, 0.006, 20))
		mesh.surface_set_color(col)
		mesh.surface_add_vertex(Vector3(-20, 0.006, i))
		mesh.surface_set_color(col)
		mesh.surface_add_vertex(Vector3(20, 0.006, i))
	mesh.surface_set_color(Color("#ee6b75"))
	mesh.surface_add_vertex(Vector3(-20, 0.01, 0))
	mesh.surface_add_vertex(Vector3(20, 0.01, 0))
	mesh.surface_set_color(Color("#55b5f4"))
	mesh.surface_add_vertex(Vector3(0, 0.01, -20))
	mesh.surface_add_vertex(Vector3(0, 0.01, 20))
	mesh.surface_end()
	var lines := MeshInstance3D.new()
	lines.name = "EditorGrid"
	lines.mesh = mesh
	scene_root.add_child(lines)

func _add_object(kind: String) -> void:
	object_counter += 1
	var obj := MeshInstance3D.new()
	var base_name := "Luz" if kind == "Light" else ("Esfera" if kind == "Sphere" else "Cubo")
	obj.name = "%s %02d" % [base_name, object_counter]
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("#49d7a2") if object_counter % 2 == 1 else Color("#57a6f7")
	material.metallic = 0.12
	material.roughness = 0.36
	if kind == "Sphere":
		var sphere := SphereMesh.new()
		sphere.radius = 0.72
		sphere.height = 1.44
		obj.mesh = sphere
	elif kind == "Light":
		var bulb := SphereMesh.new()
		bulb.radius = 0.24
		bulb.height = 0.48
		obj.mesh = bulb
		var point := OmniLight3D.new()
		point.name = "OmniLight"
		point.light_color = material.albedo_color
		point.light_energy = 2.0
		point.omni_range = 8.0
		obj.add_child(point)
	else:
		var box := BoxMesh.new()
		box.size = Vector3.ONE * 1.35
		obj.mesh = box
	obj.material_override = material
	obj.position = Vector3(float((object_counter - 1) % 3) * 1.7 - 1.5, 0.72, -float((object_counter - 1) / 3) * 1.7)
	scene_root.add_child(obj)
	objects.append(obj)
	dirty = true
	_update_hierarchy()
	_select_object(obj)

func _update_hierarchy() -> void:
	if hierarchy == null:
		return
	for child in hierarchy.get_children():
		child.queue_free()
	for obj in objects:
		var line := HBoxContainer.new()
		line.add_theme_constant_override("separation", 5)
		var glyph := _label("◈" if obj.name.begins_with("Luz") else ("●" if obj.name.begins_with("Esfera") else "■"), ACCENT if obj == selected else MUTED, 12)
		line.add_child(glyph)
		var item := Button.new()
		item.text = obj.name
		item.flat = true
		item.alignment = HORIZONTAL_ALIGNMENT_LEFT
		item.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		item.add_theme_font_size_override("font_size", 12)
		item.add_theme_color_override("font_color", TEXT if obj == selected else MUTED)
		item.pressed.connect(func(): _select_object(obj))
		line.add_child(item)
		hierarchy.add_child(line)

func _select_object(obj: MeshInstance3D) -> void:
	selected = obj
	_update_hierarchy()
	_refresh_inspector()

func _refresh_inspector() -> void:
	if inspector == null:
		return
	for i in range(3, inspector.get_child_count()):
		inspector.get_child(i).queue_free()
	pos_spins.clear()
	scale_spins.clear()
	if selected == null:
		return
	selection_label.text = selected.name
	inspector.add_child(_label("TRANSFORMACIÓN", MUTED, 10))
	inspector.add_child(_label("Posición", TEXT, 12))
	_add_vector_row(inspector, selected.position, pos_spins, "position")
	inspector.add_child(_label("Rotación", TEXT, 12))
	var rot := Vector3(selected.rotation_degrees.x, selected.rotation_degrees.y, selected.rotation_degrees.z)
	var rot_spins: Array[SpinBox] = []
	_add_vector_row(inspector, rot, rot_spins, "rotation")
	inspector.add_child(_label("Escala", TEXT, 12))
	_add_vector_row(inspector, selected.scale, scale_spins, "scale")
	inspector.add_child(_divider())
	inspector.add_child(_label("MATERIAL", MUTED, 10))
	var color_row := HBoxContainer.new()
	color_row.add_theme_constant_override("separation", 7)
	var color_box := ColorRect.new()
	color_box.custom_minimum_size = Vector2(26, 26)
	var standard := selected.material_override as StandardMaterial3D
	color_box.color = standard.albedo_color if standard else Color.WHITE
	color_row.add_child(color_box)
	color_row.add_child(_label("Color base", TEXT, 12))
	inspector.add_child(color_row)
	inspector.add_child(_divider())
	var remove := _button("Eliminar objeto", _delete_selected, Color("#ff8b8b"))
	inspector.add_child(remove)

func _add_vector_row(parent: VBoxContainer, value: Vector3, target: Array[SpinBox], property: String) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 4)
	var axes := ["X", "Y", "Z"]
	for index in range(3):
		var cell := VBoxContainer.new()
		cell.add_theme_constant_override("separation", 2)
		var axis := _label(axes[index], MUTED, 9)
		axis.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cell.add_child(axis)
		var spin := SpinBox.new()
		spin.min_value = -100.0
		spin.max_value = 100.0
		spin.step = 0.1
		spin.value = value[index]
		spin.custom_minimum_size.x = 62
		spin.add_theme_font_size_override("font_size", 11)
		spin.value_changed.connect(func(v: float): _on_transform_value(property, index, v))
		cell.add_child(spin)
		row.add_child(cell)
		target.append(spin)
	parent.add_child(row)

func _on_transform_value(property: String, axis: int, value: float) -> void:
	if selected == null:
		return
	var vector: Vector3
	if property == "position":
		vector = selected.position
		vector[axis] = value
		selected.position = vector
	elif property == "scale":
		vector = selected.scale
		vector[axis] = maxf(0.05, value)
		selected.scale = vector
	else:
		vector = selected.rotation_degrees
		vector[axis] = value
		selected.rotation_degrees = vector
	dirty = true

func _delete_selected() -> void:
	if selected == null:
		return
	objects.erase(selected)
	selected.queue_free()
	selected = objects.back() if not objects.is_empty() else null
	dirty = true
	_update_hierarchy()
	_refresh_inspector()

func _toggle_play() -> void:
	play_mode = not play_mode
	status_label.text = "●  EJECUTANDO" if play_mode else "●  LISTO"
	status_label.add_theme_color_override("font_color", Color("#ffcb70") if play_mode else ACCENT)

func _process(delta: float) -> void:
	if play_mode:
		for obj in objects:
			obj.rotate_y(delta * 0.65)

func _save_project() -> void:
	var data := {"name": "Mi primer juego", "objects": []}
	for obj in objects:
		var item := {"name": obj.name, "position": [obj.position.x, obj.position.y, obj.position.z], "rotation": [obj.rotation_degrees.x, obj.rotation_degrees.y, obj.rotation_degrees.z], "scale": [obj.scale.x, obj.scale.y, obj.scale.z], "type": "Sphere" if obj.name.begins_with("Esfera") else ("Light" if obj.name.begins_with("Luz") else "Cube")}
		var mat := obj.material_override as StandardMaterial3D
		if mat:
			item["color"] = mat.albedo_color.to_html(true)
		data.objects.append(item)
	var file := FileAccess.open("user://mi_primer_juego.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data, "  "))
		file.close()
		dirty = false
		project_label.text = "MI PRIMER JUEGO   •   Guardado"
		status_label.text = "●  PROYECTO GUARDADO"
	else:
		status_label.text = "●  ERROR AL GUARDAR"

func _on_viewport_input(event: InputEvent) -> void:
	if event is InputEventScreenDrag:
		orbit_yaw -= event.relative.x * 0.006
		orbit_pitch = clampf(orbit_pitch + event.relative.y * 0.005, 0.12, 1.25)
		_update_camera()
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		orbit_yaw -= event.relative.x * 0.006
		orbit_pitch = clampf(orbit_pitch + event.relative.y * 0.005, 0.12, 1.25)
		_update_camera()
	elif event is InputEventMagnifyGesture:
		orbit_distance = clampf(orbit_distance / event.factor, 3.0, 18.0)
		_update_camera()

func _update_camera() -> void:
	if editor_camera == null:
		return
	var offset := Vector3(cos(orbit_yaw) * cos(orbit_pitch), sin(orbit_pitch), sin(orbit_yaw) * cos(orbit_pitch)) * orbit_distance
	editor_camera.position = offset
	editor_camera.look_at(Vector3(0, 0.5, 0), Vector3.UP)

func _panel(color: Color, border: Color, radius: int) -> PanelContainer:
	var p := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	p.add_theme_stylebox_override("panel", style)
	return p

func _label(text_value: String, color: Color, size: int) -> Label:
	var l := Label.new()
	l.text = text_value
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_size_override("font_size", size)
	return l

func _section_title(text_value: String) -> Label:
	var l := _label(text_value, MUTED, 10)
	l.add_theme_font_size_override("font_size", 10)
	return l

func _button(text_value: String, action: Callable, color: Color = TEXT) -> Button:
	var b := Button.new()
	b.text = text_value
	b.custom_minimum_size = Vector2(0, 34)
	b.add_theme_font_size_override("font_size", 12)
	b.add_theme_color_override("font_color", color)
	b.pressed.connect(action)
	return b

func _mini_button(text_value: String, action: Callable) -> Button:
	var b := _button(text_value, action, ACCENT)
	b.custom_minimum_size = Vector2(30, 28)
	return b

func _tool_button(text_value: String, active: bool) -> Button:
	var b := Button.new()
	b.text = text_value
	b.custom_minimum_size = Vector2(108, 30)
	b.flat = true
	b.add_theme_font_size_override("font_size", 11)
	b.add_theme_color_override("font_color", ACCENT if active else MUTED)
	return b

func _divider() -> HSeparator:
	var line := HSeparator.new()
	line.add_theme_color_override("color", LINE)
	return line
