static JSValue js_use_web_pipeline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   native_web_pipeline = native_web_composer = true;
   return JS_UNDEFINED;
}

/* QuickJS bindings for the shared web procedural sky shaders. */
static JSValue js_set_procedural_sky(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   free(procedural_sky.stars);
   free(procedural_sky.pixels);
   memset(&procedural_sky, 0, sizeof(procedural_sky));
   procedural_sky.stars_dirty = true;
   procedural_sky.environment_dirty = true;
   procedural_sky.intensity = 1;
   procedural_sky.kind = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   if (procedural_sky.kind) native_web_pipeline = nova64_compat_web_overlay_colors = true;
   g_skybox_tex_handle = 0;
   sky_color_enabled = false;
   if (!procedural_sky.kind || argc < 3) return JS_UNDEFINED;
   for (int i = 0; i < NOVA_SKY_UNIFORM_COUNT; i++) {
      JSValue value = JS_GetPropertyStr(ctx, argv[1], nova_sky_uniforms[i].name);
      if (JS_IsUndefined(value) || JS_IsNull(value)) { JS_FreeValue(ctx,value); continue; }
      for (int j = 0; j < nova_sky_uniforms[i].size; j++) {
         JSValue component = nova_sky_uniforms[i].size == 1 ? JS_DupValue(ctx, value) : JS_GetPropertyUint32(ctx, value, j);
         procedural_sky.values[i][j] = (float)double_from_js(ctx, component, 0);
         JS_FreeValue(ctx, component);
      }
      JS_FreeValue(ctx, value);
   }
   JSValue size = JS_GetPropertyStr(ctx, argv[1], "uSize");
   procedural_sky.star_size = (float)double_from_js(ctx, size, 0);
   JS_FreeValue(ctx, size);
   JSValue length = JS_GetPropertyStr(ctx, argv[2], "length");
   int count = int_from_js(ctx, length, 0) / 8;
   JS_FreeValue(ctx, length);
   /* Star indices use GL_UNSIGNED_SHORT; the web defaults need at most 3500. */
   if (count > 65535) count = 65535;
   if (count > 0) {
      procedural_sky.stars = malloc((size_t)count * 8 * sizeof(float));
      if (!procedural_sky.stars) return JS_ThrowOutOfMemory(ctx);
      procedural_sky.star_count = count;
      for (int i = 0; i < count * 8; i++) {
         JSValue value = JS_GetPropertyUint32(ctx, argv[2], i);
         procedural_sky.stars[i] = (float)double_from_js(ctx, value, 0);
         JS_FreeValue(ctx, value);
      }
   }
   procedural_sky.reflection_intensity = (float)double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   return JS_UNDEFINED;
}

static JSValue js_procedural_sky_time(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   procedural_sky.time = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   if (procedural_sky.kind != 3) procedural_sky.rotation = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   return JS_UNDEFINED;
}

/* Load sky assets from a packaged cart, or public assets in a source checkout. */
static float *load_sky_pixels(JSContext *ctx, JSValueConst value, int *width, int *height)
{
   const char *path = JS_ToCString(ctx, value);
   if (!path) return NULL;
   const char *relative = path;
   while (*relative == '/') relative++;
   const struct nova64_package_asset *asset = find_package_asset(path);
   if (!asset) asset = find_package_asset(relative);
   size_t size = asset ? asset->size : 0;
   char *owned = NULL;
   if (!asset) {
      owned = read_file_to_memory(relative, &size);
      if (!owned) {
         char public_path[1024];
         snprintf(public_path, sizeof(public_path), "public/%s", relative);
         owned = read_file_to_memory(public_path, &size);
      }
   }
   const unsigned char *data = asset ? asset->data : (unsigned char *)owned;
   int channels = 0;
   float *pixels = NULL;
   if (data) {
      if (stbi_is_hdr_from_memory(data, (int)size)) {
         pixels = stbi_loadf_from_memory(data, (int)size, width, height, &channels, 4);
      } else {
         uint8_t *rgba = stbi_load_from_memory(data, (int)size, width, height, &channels, 4);
         if (rgba) {
            size_t count = (size_t)*width * *height * 4;
            pixels = malloc(count * sizeof(float));
            if (pixels) for (size_t i = 0; i < count; i++)
               pixels[i] = (i % 4 == 3) ? rgba[i] / 255.0f : srgb_channel_to_linear(rgba[i] / 255.0f);
            free(rgba);
         }
      }
   }
   free(owned);
   JS_FreeCString(ctx, path);
   return pixels;
}

static JSValue js_set_image_sky(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_ThrowTypeError(ctx, "Sky asset required");
   int w = 0, h = 0;
   float *pixels = NULL;
   if (JS_IsArray(argv[0])) {
      float *faces[6] = {0}; int widths[6], heights[6]; bool ok = true;
      for (int i = 0; i < 6; i++) {
         JSValue path = JS_GetPropertyUint32(ctx, argv[0], i);
         faces[i] = load_sky_pixels(ctx, path, &widths[i], &heights[i]);
         JS_FreeValue(ctx, path);
         if (!faces[i]) ok = false;
      }
      if (ok) {
         w = 1024; h = 512;
         pixels = malloc((size_t)w * h * 4 * sizeof(float));
         if (pixels) for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            float lat = ((float)y / (h-1) - 0.5f) * (float)M_PI;
            float lon = ((float)x / (w-1) - 0.5f) * 2.0f * (float)M_PI;
            float dx = cosf(lat)*cosf(lon), dy = sinf(lat), dz = cosf(lat)*sinf(lon);
            /* Three flips X for CubeTextureLoader images (not HDR panoramas). */
            dx = -dx;
            float ax=fabsf(dx), ay=fabsf(dy), az=fabsf(dz), u, v, ma; int f;
            /* Three's CubeTextureLoader uses the OpenGL face convention. */
            if (ax >= ay && ax >= az) { f=dx>0?0:1; ma=ax; u=dx>0?-dz:dz; v=-dy; }
            else if (ay >= az) { f=dy>0?2:3; ma=ay; u=dx; v=dy>0?dz:-dz; }
            else { f=dz>0?4:5; ma=az; u=dz>0?dx:-dx; v=-dy; }
            int sx=(int)((u/ma*0.5f+0.5f)*(widths[f]-1));
            int sy=(int)((v/ma*0.5f+0.5f)*(heights[f]-1));
            memcpy(pixels+((size_t)y*w+x)*4, faces[f]+((size_t)sy*widths[f]+sx)*4, sizeof(float)*4);
         }
      }
      for (int i=0;i<6;i++) free(faces[i]);
   } else {
      pixels = load_sky_pixels(ctx, argv[0], &w, &h);
      /* stbi rows are top-down; sky textures use latitude increasing upwards. */
      if (pixels) for (int y=0;y<h/2;y++) for (int x=0;x<w*4;x++) {
         float t=pixels[(size_t)y*w*4+x];
         pixels[(size_t)y*w*4+x]=pixels[(size_t)(h-1-y)*w*4+x];
         pixels[(size_t)(h-1-y)*w*4+x]=t;
      }
   }
   if (!pixels) return JS_ThrowTypeError(ctx, "Unable to load sky asset(s)");
   free(procedural_sky.pixels);
   procedural_sky.pixels=pixels; procedural_sky.width=w; procedural_sky.height=h;
   procedural_sky.kind=3; procedural_sky.environment_dirty=true;
   procedural_sky.intensity=(float)double_from_js(ctx, argc>1?argv[1]:JS_UNDEFINED,1);
   procedural_sky.rotation=(float)double_from_js(ctx, argc>2?argv[2]:JS_UNDEFINED,0);
   procedural_sky.blur=(float)clamp_double(double_from_js(ctx, argc>3?argv[3]:JS_UNDEFINED,0),0,1);
   procedural_sky.reflection_intensity=procedural_sky.intensity;
   native_web_pipeline = nova64_compat_web_overlay_colors = true;
   return JS_NewBool(ctx, true);
}

static JSValue js_set_sky_pixels(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_ThrowTypeError(ctx,"Sky pixels and dimensions required");
   size_t length=0;
   uint8_t *bytes=JS_GetArrayBuffer(ctx,&length,argv[0]);
   int w=int_from_js(ctx,argv[1],0), h=int_from_js(ctx,argv[2],0);
   if (!bytes || w<1 || h<1 || w>2048 || h>2048 || length!=(size_t)w*h*4*sizeof(float))
      return JS_ThrowTypeError(ctx,"Invalid sky pixel buffer");
   float *pixels=malloc(length);
   if (!pixels) return JS_ThrowOutOfMemory(ctx);
   memcpy(pixels,bytes,length);
   free(procedural_sky.pixels);
   procedural_sky.pixels=pixels;procedural_sky.width=w;procedural_sky.height=h;
   procedural_sky.kind=3;procedural_sky.environment_dirty=true;
   procedural_sky.intensity=procedural_sky.reflection_intensity=1;
   procedural_sky.blur=(float)clamp_double(double_from_js(ctx,argc>3?argv[3]:JS_UNDEFINED,0),0,1);
   native_web_pipeline = nova64_compat_web_overlay_colors = true;
   return JS_NewBool(ctx,true);
}
