/* Native GL transport for shaders generated from runtime/sky-shaders.js. */
static struct {
   GLuint programs[5], stars_vbo, stars_ibo, source_texture, environment_texture, irradiance_texture, environment_fbo;
   bool attempted[5];
} sky_gl;

static GLuint create_procedural_sky_program(int index)
{
   static const char *vertex =
      "#version 300 es\nprecision highp float;\nin vec2 a_position;\nout vec2 v_ndc;\n"
      "void main(){v_ndc=a_position;gl_Position=vec4(a_position,0.999,1.0);}\n";
   static const char *image_fragment =
      "#version 300 es\nprecision highp float;\nin vec2 v_ndc;\n"
      "uniform mat4 u_inv_vp;uniform sampler2D u_environment;uniform float u_rotation;\n"
      "uniform float u_intensity;uniform float u_blur;uniform int u_output_srgb;out vec4 fragColor;\n"
      "vec3 encode(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));}\n"
      "void main(){vec4 w=u_inv_vp*vec4(v_ndc,1.0,1.0);vec3 d=normalize(w.xyz/w.w);\n"
      "vec2 uv=vec2(atan(d.z,d.x)/6.28318530718+0.5+u_rotation/6.28318530718,asin(clamp(d.y,-1.0,1.0))/3.14159265359+0.5);\n"
      "vec3 c=textureLod(u_environment,uv,u_blur*8.0).rgb*u_intensity;\n"
      "fragColor=vec4(u_output_srgb!=0?encode(c):c,1.0);}";
   static const char *filter_fragment =
      "#version 300 es\nprecision highp float;\nin vec2 v_ndc;uniform sampler2D u_source;uniform float u_roughness;out vec4 fragColor;\n"
      "vec3 sampleSky(vec3 d){return textureLod(u_source,vec2(atan(d.z,d.x)/6.28318530718+0.5,asin(clamp(d.y,-1.0,1.0))/3.14159265359+0.5),0.0).rgb;}\n"
      "float radicalInverse(uint bits){bits=(bits<<16u)|(bits>>16u);bits=((bits&0x55555555u)<<1u)|((bits&0xAAAAAAAAu)>>1u);bits=((bits&0x33333333u)<<2u)|((bits&0xCCCCCCCCu)>>2u);bits=((bits&0x0F0F0F0Fu)<<4u)|((bits&0xF0F0F0F0u)>>4u);bits=((bits&0x00FF00FFu)<<8u)|((bits&0xFF00FF00u)>>8u);return float(bits)*2.3283064365386963e-10;}\n"
      "void main(){float lon=v_ndc.x*3.14159265359,lat=v_ndc.y*1.57079632679;vec3 n=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));\n"
      "if(u_roughness==0.0){fragColor=vec4(sampleSky(n),1.0);return;}\n"
      "vec3 up=abs(n.y)<0.999?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);vec3 t=normalize(cross(up,n)),b=cross(n,t);vec3 sum=vec3(0.0);float weight=0.0;\n"
      "for(int i=0;i<128;i++){vec2 xi=vec2((float(i)+0.5)/128.0,radicalInverse(uint(i)));float phi=6.28318530718*xi.y;vec3 l;float w;\n"
      "if(u_roughness<0.0){float r=sqrt(xi.x);l=t*(r*cos(phi))+b*(r*sin(phi))+n*sqrt(1.0-xi.x);w=1.0;}\n"
      "else{float a=u_roughness*u_roughness;float ct=sqrt((1.0-xi.x)/(1.0+(a*a-1.0)*xi.x));float st=sqrt(1.0-ct*ct);vec3 h=t*(st*cos(phi))+b*(st*sin(phi))+n*ct;l=reflect(-n,h);w=max(dot(n,l),0.0);}\n"
      "sum+=sampleSky(l)*w;weight+=w;}fragColor=vec4(sum/max(weight,0.0001),1.0);}";
   const char *fragment = index == 4 ? filter_fragment : index == 3 ? image_fragment : index == 0 ? nova_sky_gradient_frag : index == 1 ? nova_sky_space_frag : nova_sky_star_frag;
   GLuint vs = gles_compile_shader(GL_VERTEX_SHADER, index == 2 ? nova_sky_star_vert : vertex);
   GLuint fs = gles_compile_shader(GL_FRAGMENT_SHADER, fragment);
   if (!vs || !fs) {
      if (vs) gles.DeleteShader(vs);
      if (fs) gles.DeleteShader(fs);
      return 0;
   }
   GLuint program = gles.CreateProgram();
   gles.AttachShader(program, vs);
   gles.AttachShader(program, fs);
   gles.LinkProgram(program);
   gles.DeleteShader(vs);
   gles.DeleteShader(fs);
   GLint linked = 0;
   gles.GetProgramiv(program, GL_LINK_STATUS, &linked);
   if (!linked) {
      char log[2048]; GLsizei length = 0;
      gles.GetProgramInfoLog(program, sizeof(log), &length, log);
      nova64_log_line(RETRO_LOG_ERROR, log);
      gles.DeleteProgram(program);
      return 0;
   }
   return program;
}

static void destroy_procedural_sky_resources(void)
{
   if (!gles.DeleteProgram) return;
   for (int i = 0; i < 5; i++)
      if (sky_gl.programs[i]) gles.DeleteProgram(sky_gl.programs[i]);
   if (sky_gl.stars_vbo) gles.DeleteBuffers(1, &sky_gl.stars_vbo);
   if (sky_gl.stars_ibo) gles.DeleteBuffers(1, &sky_gl.stars_ibo);
   if (sky_gl.source_texture) gles.DeleteTextures(1, &sky_gl.source_texture);
   if (sky_gl.irradiance_texture) gles.DeleteTextures(1, &sky_gl.irradiance_texture);
   if (sky_gl.environment_texture) gles.DeleteTextures(1, &sky_gl.environment_texture);
   if (sky_gl.environment_fbo) gles.DeleteFramebuffers(1, &sky_gl.environment_fbo);
   memset(&sky_gl, 0, sizeof(sky_gl));
   procedural_sky.environment_dirty = true;
   procedural_sky.stars_dirty = true;
}

static void sky_quad(GLuint program)
{
   GLint pos = gles.GetAttribLocation(program, "a_position");
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.overlay_vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.overlay_ibo);
   gles.EnableVertexAttribArray(pos);
   gles.VertexAttribPointer(pos, 2, GL_FLOAT, GL_FALSE, sizeof(float) * 4, NULL);
   gles.DrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, NULL);
   core_perf_frame_draw_calls++;
   gles.DisableVertexAttribArray(pos);
}

static void set_procedural_uniforms(GLuint program, bool bake)
{
   gles.Uniform1i(gles.GetUniformLocation(program, "u_bake"), bake ? 1 : 0);
   gles.Uniform1f(gles.GetUniformLocation(program, "u_rotation"), bake ? 0 : procedural_sky.rotation);
   gles.Uniform1i(gles.GetUniformLocation(program, "u_output_srgb"), gles_scene_post_active ? 0 : 1);
   for (int i = 0; i < NOVA_SKY_UNIFORM_COUNT; i++) {
      GLint loc = gles.GetUniformLocation(program, nova_sky_uniforms[i].name);
      if (loc < 0) continue;
      const float *v = procedural_sky.values[i];
      if (!strcmp(nova_sky_uniforms[i].name, "uTime")) gles.Uniform1f(loc, bake ? 0 : procedural_sky.time);
      else if (nova_sky_uniforms[i].size == 3) gles.Uniform3f(loc, v[0], v[1], v[2]);
      else gles.Uniform1f(loc, v[0]);
   }
}

static void update_sky_environment(GLuint program)
{
   if (!procedural_sky.environment_dirty) return;
   if (!sky_gl.source_texture) gles.GenTextures(1, &sky_gl.source_texture);
   gles.ActiveTexture(GL_TEXTURE0);
   gles.BindTexture(GL_TEXTURE_2D, sky_gl.source_texture);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, 0x2901 /* GL_REPEAT */);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, 0x2703 /* GL_LINEAR_MIPMAP_LINEAR */);
   if (procedural_sky.kind == 3) {
      gles.TexImage2D(GL_TEXTURE_2D,0,GL_RGBA16F,procedural_sky.width,procedural_sky.height,0,GL_RGBA,GL_FLOAT,procedural_sky.pixels);
   } else {
      typedef void (*get_int_t)(GLenum, GLint *);
      get_int_t get_int = (get_int_t)load_gles_proc("glGetIntegerv");
      GLint framebuffer = 0, viewport[4];
      get_int(0x8CA6 /* GL_FRAMEBUFFER_BINDING */, &framebuffer);
      get_int(0x0BA2 /* GL_VIEWPORT */, viewport);
      gles.TexImage2D(GL_TEXTURE_2D,0,GL_RGBA16F,512,256,0,GL_RGBA,GL_FLOAT,NULL);
      if (!sky_gl.environment_fbo) gles.GenFramebuffers(1,&sky_gl.environment_fbo);
      gles.BindFramebuffer(GL_FRAMEBUFFER,sky_gl.environment_fbo);
      gles.FramebufferTexture2D(GL_FRAMEBUFFER,GL_COLOR_ATTACHMENT0,GL_TEXTURE_2D,sky_gl.source_texture,0);
      if (gles.CheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE) {
         gles.Viewport(0,0,512,256);
         gles.UseProgram(program);
         set_procedural_uniforms(program,true);
         sky_quad(program);
      } else {
         nova64_log_line(RETRO_LOG_WARN,"[nova64] sky environment FBO incomplete; reflections disabled");
         procedural_sky.reflection_intensity = 0;
      }
      gles.BindFramebuffer(GL_FRAMEBUFFER,(GLuint)framebuffer);
      gles.Viewport(viewport[0],viewport[1],viewport[2],viewport[3]);
   }
   typedef void (*generate_mipmap_t)(GLenum);
   generate_mipmap_t generate = (generate_mipmap_t)load_gles_proc("glGenerateMipmap");
   generate(GL_TEXTURE_2D);
   /* Filter in direction space: ordinary equirectangular mipmaps overweight
      polar HDR lights and made rough/diffuse gold surfaces bloom white. */
   if (!sky_gl.programs[4]) sky_gl.programs[4]=create_procedural_sky_program(4);
   if (sky_gl.programs[4]) {
      typedef void (*get_int_t)(GLenum,GLint*);
      get_int_t get_int=(get_int_t)load_gles_proc("glGetIntegerv");
      GLint framebuffer=0,viewport[4];get_int(0x8CA6,&framebuffer);get_int(0x0BA2,viewport);
      if (!sky_gl.environment_fbo) gles.GenFramebuffers(1,&sky_gl.environment_fbo);
      if (!sky_gl.environment_texture) gles.GenTextures(1,&sky_gl.environment_texture);
      if (!sky_gl.irradiance_texture) gles.GenTextures(1,&sky_gl.irradiance_texture);
      gles.BindFramebuffer(GL_FRAMEBUFFER,sky_gl.environment_fbo);
      GLuint filter=sky_gl.programs[4];gles.UseProgram(filter);
      gles.Uniform1i(gles.GetUniformLocation(filter,"u_source"),0);
      for (int level=0;level<11;level++) {
         bool diffuse=level==10;GLuint target=diffuse?sky_gl.irradiance_texture:sky_gl.environment_texture;
         int w=diffuse?64:(512>>level),h=diffuse?32:(256>>level);if(w<1)w=1;if(h<1)h=1;
         gles.ActiveTexture(GL_TEXTURE0+4);gles.BindTexture(GL_TEXTURE_2D,target);
         gles.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,0x2901);
         gles.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_CLAMP_TO_EDGE);
         gles.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);
         gles.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,diffuse?GL_LINEAR:0x2703);
         gles.TexImage2D(GL_TEXTURE_2D,diffuse?0:level,GL_RGBA16F,w,h,0,GL_RGBA,GL_FLOAT,NULL);
         gles.FramebufferTexture2D(GL_FRAMEBUFFER,GL_COLOR_ATTACHMENT0,GL_TEXTURE_2D,target,diffuse?0:level);
         if (gles.CheckFramebufferStatus(GL_FRAMEBUFFER)!=GL_FRAMEBUFFER_COMPLETE) {
            procedural_sky.reflection_intensity=0;
            nova64_log_line(RETRO_LOG_WARN,"[nova64] filtered environment FBO incomplete");break;
         }
         gles.ActiveTexture(GL_TEXTURE0);gles.BindTexture(GL_TEXTURE_2D,sky_gl.source_texture);
         gles.Uniform1f(gles.GetUniformLocation(filter,"u_roughness"),diffuse?-1.0f:fminf(level/8.0f,1.0f));
         gles.Viewport(0,0,w,h);sky_quad(filter);
      }
      gles.BindFramebuffer(GL_FRAMEBUFFER,(GLuint)framebuffer);gles.Viewport(viewport[0],viewport[1],viewport[2],viewport[3]);
      gles.ActiveTexture(GL_TEXTURE0);
   }
   procedural_sky.environment_dirty = false;
}

static void bind_sky_environment(GLuint program)
{
   bool enabled = procedural_sky.kind && sky_gl.environment_texture && procedural_sky.reflection_intensity > 0;
   gles.Uniform1i(gles.GetUniformLocation(program,"u_has_environment"),enabled ? 1 : 0);
   if (!enabled) return;
   gles.ActiveTexture(GL_TEXTURE0+3);
   gles.BindTexture(GL_TEXTURE_2D,sky_gl.environment_texture);
   gles.Uniform1i(gles.GetUniformLocation(program,"u_environment"),3);
   gles.Uniform1f(gles.GetUniformLocation(program,"u_environment_intensity"),procedural_sky.reflection_intensity);
   // Procedural environments are baked at creation time, as in the web runtime.
   gles.Uniform1f(gles.GetUniformLocation(program,"u_environment_rotation"),procedural_sky.kind==3 ? procedural_sky.rotation : 0);
   gles.ActiveTexture(GL_TEXTURE0+4);
   gles.BindTexture(GL_TEXTURE_2D,sky_gl.irradiance_texture);
   gles.Uniform1i(gles.GetUniformLocation(program,"u_irradiance"),4);
   gles.ActiveTexture(GL_TEXTURE0);
}

static void render_procedural_sky(const float view[16], const float projection[16])
{
   int index = procedural_sky.kind == 3 ? 3 : procedural_sky.kind - 1;
   if (index < 0 || index > 3 || index == 2) return;
   if (!sky_gl.attempted[index]) {
      sky_gl.attempted[index] = true;
      sky_gl.programs[index] = create_procedural_sky_program(index);
   }
   GLuint program = sky_gl.programs[index];
   if (!program) return;
   float centered[16], vp[16], inv[16];
   memcpy(centered, view, sizeof(centered));
   centered[12] = centered[13] = centered[14] = 0;
   mat4_multiply(vp, projection, centered);
   mat4_inverse(inv, vp);
   gles.Disable(GL_DEPTH_TEST);
   gles.DepthMask(GL_FALSE);
   update_sky_environment(program);
   gles.UseProgram(program);
   set_procedural_uniforms(program,false);
   gles.UniformMatrix4fv(gles.GetUniformLocation(program, "u_inv_vp"), 1, GL_FALSE, inv);
   if (procedural_sky.kind == 3) {
      gles.ActiveTexture(GL_TEXTURE0);
      gles.BindTexture(GL_TEXTURE_2D,procedural_sky.blur>0?sky_gl.environment_texture:sky_gl.source_texture);
      gles.Uniform1i(gles.GetUniformLocation(program,"u_environment"),0);
      gles.Uniform1f(gles.GetUniformLocation(program,"u_intensity"),procedural_sky.intensity);
      gles.Uniform1f(gles.GetUniformLocation(program,"u_blur"),procedural_sky.blur);
   }
   sky_quad(program);

   if (procedural_sky.star_count) {
      if (!sky_gl.programs[2]) sky_gl.programs[2] = create_procedural_sky_program(2);
      program = sky_gl.programs[2];
      if (program) {
         if (!sky_gl.stars_vbo) gles.GenBuffers(1, &sky_gl.stars_vbo);
         if (!sky_gl.stars_ibo) gles.GenBuffers(1, &sky_gl.stars_ibo);
         gles.BindBuffer(GL_ARRAY_BUFFER, sky_gl.stars_vbo);
         gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, sky_gl.stars_ibo);
         if (procedural_sky.stars_dirty) {
            unsigned short *indices = malloc((size_t)procedural_sky.star_count * sizeof(unsigned short));
            if (indices) {
               for (int i = 0; i < procedural_sky.star_count; i++) indices[i] = (unsigned short)i;
               gles.BufferData(GL_ARRAY_BUFFER, (GLsizeiptr)procedural_sky.star_count * 8 * sizeof(float), procedural_sky.stars, GL_STATIC_DRAW);
               gles.BufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)procedural_sky.star_count * sizeof(unsigned short), indices, GL_STATIC_DRAW);
               free(indices);
               procedural_sky.stars_dirty = false;
            }
         }
         /* Web animateSkybox rotates the star field and dome together. */
         float rotation[16], mv[16];
         mat4_identity(rotation);
         rotation[0] = rotation[10] = cosf(procedural_sky.rotation);
         rotation[2] = -sinf(procedural_sky.rotation);
         rotation[8] = sinf(procedural_sky.rotation);
         mat4_multiply(mv, centered, rotation);
         gles.UseProgram(program);
         gles.UniformMatrix4fv(gles.GetUniformLocation(program, "modelViewMatrix"), 1, GL_FALSE, mv);
         gles.UniformMatrix4fv(gles.GetUniformLocation(program, "projectionMatrix"), 1, GL_FALSE, projection);
         gles.Uniform1f(gles.GetUniformLocation(program, "uSize"), procedural_sky.star_size);
         gles.Uniform1f(gles.GetUniformLocation(program, "uScale"), NOVA64_HEIGHT * 0.5f);
         gles.Uniform1f(gles.GetUniformLocation(program, "uTime"), procedural_sky.time);
         const char *names[] = {"position", "color", "aSize", "aPhase"};
         int widths[] = {3, 3, 1, 1}, offsets[] = {0, 3, 6, 7};
         GLint attributes[4];
         for (int i = 0; i < 4; i++) {
            attributes[i] = gles.GetAttribLocation(program, names[i]);
            gles.EnableVertexAttribArray(attributes[i]);
            gles.VertexAttribPointer(attributes[i], widths[i], GL_FLOAT, GL_FALSE, 8 * sizeof(float), (const void *)(uintptr_t)(offsets[i] * sizeof(float)));
         }
         if (hw_render.context_type == RETRO_HW_CONTEXT_OPENGL_CORE) gles.Enable(0x8642 /* GL_PROGRAM_POINT_SIZE */);
         gles.Enable(GL_BLEND);
         gles.BlendFunc(GL_SRC_ALPHA, GL_ONE);
         gles.DrawElements(0x0000 /* GL_POINTS */, procedural_sky.star_count, GL_UNSIGNED_SHORT, NULL);
         core_perf_frame_draw_calls++;
         gles.Disable(GL_BLEND);
         for (int i = 0; i < 4; i++) gles.DisableVertexAttribArray(attributes[i]);
      }
   }
   gles.DepthMask(GL_TRUE);
   gles.Enable(GL_DEPTH_TEST);
}
