/* Opaque scene snapshot for MeshPhysicalMaterial-style screen-space refraction.
   Separate storage avoids sampling the active render target (WebGL feedback).
   This is not ray tracing: other transmissive objects are excluded. */
static struct {
   GLuint texture;
   int width, height;
   GLint format;
   bool ready, linear;
} transmission_gl;

static void destroy_transmission_resources(void)
{
   if (transmission_gl.texture && gles.DeleteTextures)
      gles.DeleteTextures(1, &transmission_gl.texture);
   memset(&transmission_gl, 0, sizeof(transmission_gl));
}

static void capture_transmission_background(void)
{
   typedef void (*copy_texture_t)(GLenum, GLint, GLint, GLint, GLint, GLint, GLsizei, GLsizei);
   typedef void (*generate_mipmap_t)(GLenum);
   copy_texture_t copy = (copy_texture_t)load_gles_proc("glCopyTexSubImage2D");
   generate_mipmap_t generate = (generate_mipmap_t)load_gles_proc("glGenerateMipmap");
   if (!copy || !generate) return;
   bool hdr = gles_scene_post_active && gles.post_hdr_enabled;
   GLint format = hdr ? (gles.post_hdr_is_float32 ? 0x8814 /* RGBA32F */ : GL_RGBA16F) : 0x8058 /* RGBA8 */;
   gles.ActiveTexture(GL_TEXTURE0+5);
   if (!transmission_gl.texture) gles.GenTextures(1, &transmission_gl.texture);
   gles.BindTexture(GL_TEXTURE_2D, transmission_gl.texture);
   if (transmission_gl.width != NOVA64_WIDTH || transmission_gl.height != NOVA64_HEIGHT || transmission_gl.format != format) {
      /* WebGL2 requires the copy destination to match the source bit depth. */
      gles.TexImage2D(GL_TEXTURE_2D, 0, format,
         NOVA64_WIDTH, NOVA64_HEIGHT, 0, GL_RGBA, hdr ? GL_FLOAT : GL_UNSIGNED_BYTE, NULL);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, 0x2703 /* LINEAR_MIPMAP_LINEAR */);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
      transmission_gl.width = NOVA64_WIDTH;
      transmission_gl.height = NOVA64_HEIGHT;
      transmission_gl.format = format;
   }
   copy(GL_TEXTURE_2D, 0, 0, 0, 0, 0, NOVA64_WIDTH, NOVA64_HEIGHT);
   generate(GL_TEXTURE_2D);
   transmission_gl.linear = gles_scene_post_active;
   transmission_gl.ready = true;
   gles.ActiveTexture(GL_TEXTURE0);
}

static void bind_transmission_buffer(GLuint program, const struct nova64_mesh *mesh, const float vp[16])
{
   bool enabled = transmission_gl.ready && mesh->transmission > 0;
   gles.Uniform1i(gles.GetUniformLocation(program, "u_has_transmission_buffer"), enabled ? 1 : 0);
   gles.Uniform1i(gles.GetUniformLocation(program, "u_transmission_linear"), transmission_gl.linear ? 1 : 0);
   gles.Uniform1f(gles.GetUniformLocation(program, "u_thickness"), mesh->thickness);
   gles.Uniform1f(gles.GetUniformLocation(program, "u_attenuation_distance"), mesh->attenuation_distance);
   gles.Uniform3f(gles.GetUniformLocation(program, "u_attenuation_color"),
      ((mesh->attenuation_color>>24)&255)/255.0f,
      ((mesh->attenuation_color>>16)&255)/255.0f,
      ((mesh->attenuation_color>>8)&255)/255.0f);
   gles.Uniform3f(gles.GetUniformLocation(program, "u_geometry_scale"),
      mesh->geometry_scale[0], mesh->geometry_scale[1], mesh->geometry_scale[2]);
   gles.UniformMatrix4fv(gles.GetUniformLocation(program, "u_transmission_vp"), 1, GL_FALSE, vp);
   /* Samplers of different types still require distinct units when inactive. */
   gles.Uniform1i(gles.GetUniformLocation(program, "u_transmission_buffer"), 5);
   if (enabled) {
      gles.ActiveTexture(GL_TEXTURE0+5);
      gles.BindTexture(GL_TEXTURE_2D, transmission_gl.texture);
      gles.ActiveTexture(GL_TEXTURE0);
   }
}
