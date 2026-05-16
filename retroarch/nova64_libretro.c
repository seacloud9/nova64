#include <math.h>
#include <errno.h>
#include <stddef.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#ifdef _WIN32
#include <direct.h>
#else
#include <dirent.h>
#include <sys/stat.h>
#include <sys/types.h>
#endif
#include <zlib.h>

#include "libretro.h"
#include "quickjs.h"

/* stb_vorbis: single-header OGG Vorbis decoder */
#define STB_VORBIS_NO_PUSHDATA_API
#define STB_VORBIS_NO_STDIO
#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmaybe-uninitialized"
#endif
#include "stb_vorbis.c"
#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic pop
#endif


#define NOVA64_WIDTH 640
#define NOVA64_HEIGHT 360
#define NOVA64_FPS 60.0
#define NOVA64_SAMPLE_RATE 44100.0
#define NOVA64_AUDIO_FRAME_SAMPLES 735
#define NOVA64_AUDIO_MAX_VOICES 8
#define NOVA64_CORE_VERSION "0.3.0"
#define NOVA64_MAX_MESHES 1024
#define NOVA64_MAX_POINT_LIGHTS 64
#define NOVA64_SAVE_MAGIC 0x5344364eU
#define NOVA64_SAVE_VERSION 3U
#define NOVA64_ZIP_EOCD_SIGNATURE 0x06054b50U
#define NOVA64_ZIP_CENTRAL_SIGNATURE 0x02014b50U
#define NOVA64_ZIP_LOCAL_SIGNATURE 0x04034b50U
#define NOVA64_ZIP_MAX_EOCD_SEARCH 65557U
#define NOVA64_MAX_PACKAGE_ASSETS 128
#define NOVA64_MAX_PERF_TIMERS 32
#define NOVA64_DEFAULT_ASSET_QUOTA_BYTES (16U * 1024U * 1024U)
#ifdef _WIN32
#define NOVA64_PATH_SEPARATOR "\\"
#else
#define NOVA64_PATH_SEPARATOR "/"
#endif
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

typedef unsigned int GLenum;
typedef unsigned int GLbitfield;
typedef unsigned int GLuint;
typedef unsigned char GLboolean;
typedef int GLint;
typedef int GLsizei;
typedef ptrdiff_t GLsizeiptr;
typedef float GLfloat;
typedef char GLchar;

#define GL_COLOR_BUFFER_BIT 0x00004000
#define GL_DEPTH_BUFFER_BIT 0x00000100
#define GL_DEPTH_TEST 0x0B71
#define GL_VERTEX_SHADER 0x8B31
#define GL_FRAGMENT_SHADER 0x8B30
#define GL_COMPILE_STATUS 0x8B81
#define GL_LINK_STATUS 0x8B82
#define GL_INFO_LOG_LENGTH 0x8B84
#define GL_ARRAY_BUFFER 0x8892
#define GL_ELEMENT_ARRAY_BUFFER 0x8893
#define GL_STATIC_DRAW 0x88E4
#define GL_FLOAT 0x1406
#define GL_FALSE 0
#define GL_TRIANGLES 0x0004
#define GL_UNSIGNED_SHORT 0x1403
#define GL_TEXTURE_2D 0x0DE1
#define GL_TEXTURE0 0x84C0
#define GL_TEXTURE1 0x84C1
#define GL_TEXTURE2 0x84C2
#define GL_TEXTURE_MIN_FILTER 0x2801
#define GL_TEXTURE_MAG_FILTER 0x2800
#define GL_TEXTURE_WRAP_S 0x2802
#define GL_TEXTURE_WRAP_T 0x2803
#define GL_NEAREST 0x2600
#define GL_LINEAR  0x2601
#define GL_CLAMP_TO_EDGE 0x812F
#define GL_RGBA 0x1908
#define GL_UNSIGNED_BYTE 0x1401
#define GL_BLEND 0x0BE2
#define GL_ZERO 0x0000
#define GL_ONE  0x0001
#define GL_SRC_ALPHA 0x0302
#define GL_ONE_MINUS_SRC_ALPHA 0x0303
#define GL_DST_COLOR 0x0306
/* FBO */
#define GL_FRAMEBUFFER 0x8D40
#define GL_RENDERBUFFER 0x8D41
#define GL_COLOR_ATTACHMENT0 0x8CE0
#define GL_DEPTH_ATTACHMENT 0x8D00
#define GL_FRAMEBUFFER_COMPLETE 0x8CD5
#define GL_DEPTH_COMPONENT16 0x81A5
#define GL_DEPTH_COMPONENT   0x1902
#define GL_RGB565            0x8D62

typedef void (*PFNGLVIEWPORTPROC)(GLint x, GLint y, GLsizei width, GLsizei height);
typedef void (*PFNGLCLEARCOLORPROC)(GLfloat red, GLfloat green, GLfloat blue, GLfloat alpha);
typedef void (*PFNGLCLEARPROC)(GLbitfield mask);
typedef void (*PFNGLENABLEPROC)(GLenum cap);
typedef void (*PFNGLDISABLEPROC)(GLenum cap);
typedef GLuint (*PFNGLCREATESHADERPROC)(GLenum type);
typedef void (*PFNGLSHADERSOURCEPROC)(GLuint shader, GLsizei count, const GLchar *const *string, const GLint *length);
typedef void (*PFNGLCOMPILESHADERPROC)(GLuint shader);
typedef void (*PFNGLGETSHADERIVPROC)(GLuint shader, GLenum pname, GLint *params);
typedef void (*PFNGLGETSHADERINFOLOGPROC)(GLuint shader, GLsizei bufSize, GLsizei *length, GLchar *infoLog);
typedef void (*PFNGLDELETESHADERPROC)(GLuint shader);
typedef GLuint (*PFNGLCREATEPROGRAMPROC)(void);
typedef void (*PFNGLATTACHSHADERPROC)(GLuint program, GLuint shader);
typedef void (*PFNGLLINKPROGRAMPROC)(GLuint program);
typedef void (*PFNGLGETPROGRAMIVPROC)(GLuint program, GLenum pname, GLint *params);
typedef void (*PFNGLGETPROGRAMINFOLOGPROC)(GLuint program, GLsizei bufSize, GLsizei *length, GLchar *infoLog);
typedef void (*PFNGLDELETEPROGRAMPROC)(GLuint program);
typedef void (*PFNGLUSEPROGRAMPROC)(GLuint program);
typedef GLint (*PFNGLGETATTRIBLOCATIONPROC)(GLuint program, const GLchar *name);
typedef GLint (*PFNGLGETUNIFORMLOCATIONPROC)(GLuint program, const GLchar *name);
typedef void (*PFNGLUNIFORMMATRIX4FVPROC)(GLint location, GLsizei count, GLboolean transpose, const GLfloat *value);
typedef void (*PFNGLUNIFORMMATRIX3FVPROC)(GLint location, GLsizei count, GLboolean transpose, const GLfloat *value);
typedef void (*PFNGLUNIFORM4FPROC)(GLint location, GLfloat v0, GLfloat v1, GLfloat v2, GLfloat v3);
typedef void (*PFNGLGENBUFFERSPROC)(GLsizei n, GLuint *buffers);
typedef void (*PFNGLBINDBUFFERPROC)(GLenum target, GLuint buffer);
typedef void (*PFNGLBUFFERDATAPROC)(GLenum target, GLsizeiptr size, const void *data, GLenum usage);
typedef void (*PFNGLDELETEBUFFERSPROC)(GLsizei n, const GLuint *buffers);
typedef void (*PFNGLENABLEVERTEXATTRIBARRAYPROC)(GLuint index);
typedef void (*PFNGLDISABLEVERTEXATTRIBARRAYPROC)(GLuint index);
typedef void (*PFNGLVERTEXATTRIBPOINTERPROC)(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void *pointer);
typedef void (*PFNGLDRAWELEMENTSPROC)(GLenum mode, GLsizei count, GLenum type, const void *indices);
typedef void (*PFNGLGENTEXTURESPROC)(GLsizei n, GLuint *textures);
typedef void (*PFNGLDELETETEXTURESPROC)(GLsizei n, const GLuint *textures);
typedef void (*PFNGLACTIVETEXTUREPROC)(GLenum texture);
typedef void (*PFNGLBINDTEXTUREPROC)(GLenum target, GLuint texture);
typedef void (*PFNGLTEXPARAMETERIPROC)(GLenum target, GLenum pname, GLint param);
typedef void (*PFNGLTEXIMAGE2DPROC)(GLenum target, GLint level, GLint internalformat, GLsizei width, GLsizei height, GLint border, GLenum format, GLenum type, const void *pixels);
typedef void (*PFNGLTEXSUBIMAGE2DPROC)(GLenum target, GLint level, GLint xoffset, GLint yoffset, GLsizei width, GLsizei height, GLenum format, GLenum type, const void *pixels);
typedef void (*PFNGLUNIFORM1IPROC)(GLint location, GLint v0);
typedef void (*PFNGLUNIFORM1FPROC)(GLint location, GLfloat v0);
typedef void (*PFNGLUNIFORM2FPROC)(GLint location, GLfloat v0, GLfloat v1);
typedef void (*PFNGLBLENDFUNCPROC)(GLenum sfactor, GLenum dfactor);
/* FBO */
typedef void (*PFNGLGENFRAMEBUFFERSPROC)(GLsizei n, GLuint *framebuffers);
typedef void (*PFNGLBINDFRAMEBUFFERPROC)(GLenum target, GLuint framebuffer);
typedef void (*PFNGLFRAMEBUFFERTEXTURE2DPROC)(GLenum target, GLenum attachment, GLenum textarget, GLuint texture, GLint level);
typedef GLenum (*PFNGLCHECKFRAMEBUFFERSTATUSPROC)(GLenum target);
typedef void (*PFNGLDELETEFRAMEBUFFERSPROC)(GLsizei n, const GLuint *framebuffers);
typedef void (*PFNGLGENRENDERBUFFERSPROC)(GLsizei n, GLuint *renderbuffers);
typedef void (*PFNGLBINDRENDERBUFFERPROC)(GLenum target, GLuint renderbuffer);
typedef void (*PFNGLRENDERBUFFERSTORAGEPROC)(GLenum target, GLenum internalformat, GLsizei width, GLsizei height);
typedef void (*PFNGLFRAMEBUFFERRENDERBUFFERPROC)(GLenum target, GLenum attachment, GLenum renderbuffertarget, GLuint renderbuffer);
typedef void (*PFNGLDELETERENDERBUFFERSPROC)(GLsizei n, const GLuint *renderbuffers);

enum nova64_button {
   NOVA64_BTN_LEFT = 0,
   NOVA64_BTN_RIGHT,
   NOVA64_BTN_UP,
   NOVA64_BTN_DOWN,
   NOVA64_BTN_Z,
   NOVA64_BTN_X,
   NOVA64_BTN_C,
   NOVA64_BTN_V,
   NOVA64_BUTTON_COUNT
};

enum nova64_mesh_type {
   NOVA64_MESH_NONE = 0,
   NOVA64_MESH_CUBE,
   NOVA64_MESH_SPHERE,
   NOVA64_MESH_PLANE,
   NOVA64_MESH_CAPSULE,
   NOVA64_MESH_CYLINDER,
   NOVA64_MESH_CUSTOM,
   NOVA64_MESH_INSTANCED
};

/* Mesh-level blend mode for 3D meshes */
enum nova64_mesh_blend {
   NOVA64_MESH_BLEND_OPAQUE = 0,
   NOVA64_MESH_BLEND_ADDITIVE,
   NOVA64_MESH_BLEND_MULTIPLY
};

struct nova64_mesh {
   bool used;
   bool visible;
   bool flat_shading;
   bool cast_shadow;
   bool receive_shadow;
   enum nova64_mesh_type type;
   float position[3];
   float rotation[3];
   float scale[3];
   float opacity;
   uint32_t color;
   int texture_handle;      /* 0 = no texture */
   int normal_map_handle;   /* 0 = no normal map */
   uint32_t emissive_color; /* 0 = none, else RGBA8 */
   float emissive_intensity; /* 0 = off */
   float roughness;         /* 0 = smooth, 1 = rough */
   float metalness;         /* 0 = non-metal, 1 = metal */
   float uv_offset[2];      /* UV scroll offset (u, v) */
   float uv_scale[2];       /* UV tiling scale (u, v) */
   enum nova64_mesh_blend mesh_blend;
   int parent_handle;       /* 0 = no parent (8A scene hierarchy) */
   /* Custom mesh geometry (NOVA64_MESH_CUSTOM) */
   float *custom_verts;       /* interleaved pos[3]+normal[3] per vertex, malloced */
   unsigned custom_vert_count;
   uint16_t *custom_indices;  /* triangle indices, malloced */
   unsigned custom_index_count;
   unsigned gl_custom_vbo;    /* GPU buffer handles, 0 = not uploaded */
   unsigned gl_custom_ibo;
   /* Instanced mesh (NOVA64_MESH_INSTANCED) */
   int instance_count;           /* number of instances */
   int instance_geometry;        /* 0=cube 1=sphere 2=plane 3=capsule 4=cylinder */
   float *instance_transforms;   /* instance_count * 16 floats (column-major mat4 per instance) */
};

struct nova64_camera {
   float position[3];
   float target[3];
   float fov;
   bool is_ortho;
   float ortho_width;
   float ortho_height;
};

struct nova64_light {
   uint32_t ambient;
   float ambient_intensity;
   uint32_t color;
   float intensity;
   float direction[3];
   bool fog_enabled;
   uint32_t fog_color;
   float fog_near;
   float fog_far;
};

struct nova64_point_light {
   bool used;
   uint32_t color;
   float intensity;
   float distance;
   float position[3];
};

#define NOVA64_MAX_TEXTURES 64
struct nova64_texture {
   bool used;
   bool borrowed; /* if true, gl_name is owned by a render target — don't delete */
   GLuint gl_name; /* 0 = not uploaded / software mode */
   int width;
   int height;
};

#define NOVA64_MAX_RENDER_TARGETS 8
struct nova64_render_target {
   bool used;
   int width, height;
   GLuint fbo;
   GLuint color_tex;
   GLuint depth_rbo;
   int texture_handle; /* borrowed nova64_texture handle; 0 = not yet created */
};

enum nova64_renderer_backend {
   NOVA64_RENDERER_GLES3 = 0,
   NOVA64_RENDERER_VULKAN12
};

enum nova64_audio_wave {
   NOVA64_AUDIO_SQUARE = 0,
   NOVA64_AUDIO_SINE,
   NOVA64_AUDIO_SAWTOOTH,
   NOVA64_AUDIO_TRIANGLE,
   NOVA64_AUDIO_NOISE,
   NOVA64_AUDIO_PCM
};

struct nova64_audio_voice {
   bool active;
   enum nova64_audio_wave wave;
   double phase;
   double freq;
   double dur;
   double vol;
   double sweep;
   size_t elapsed_samples;
   size_t total_samples;
   uint32_t noise_state;
   /* PCM playback fields (wave == NOVA64_AUDIO_PCM) */
   const int16_t *pcm_data;
   const struct nova64_package_asset *pcm_asset; /* source asset for stop-by-path */
   size_t pcm_frames;   /* total sample frames */
   size_t pcm_channels; /* 1 or 2 */
   double pcm_rate;     /* source sample rate */
   double pcm_pos;      /* fractional playback position */
   bool pcm_loop;
   int16_t *ogg_decoded_data; /* owned malloc'd PCM from OGG decode, NULL otherwise */
   char channel[32];          /* named channel for volume grouping (8C) */
   float pan;                 /* stereo pan: -1 left, 0 center, +1 right (8C batch4) */
   float pitch;               /* playback pitch multiplier: 1.0 = normal, 2.0 = octave up */
};

struct nova64_sfx_params {
   enum nova64_audio_wave wave;
   double freq;
   double dur;
   double vol;
   double sweep;
};

struct nova64_package_asset {
   bool used;
   char path[256];
   uint8_t *data;
   size_t size;
};

struct nova64_perf_timer {
   bool used;
   bool active;
   char label[64];
   double total;
   uint32_t count;
   clock_t started_at;
};

struct nova64_save_header {
   uint32_t magic;
   uint32_t version;
   uint32_t width;
   uint32_t height;
   uint64_t frame_count;
   uint32_t framebuffer_bytes;
   uint32_t mesh_bytes;
   uint8_t buttons[NOVA64_BUTTON_COUNT];
   uint8_t previous_buttons[NOVA64_BUTTON_COUNT];
};

struct nova64_js_host {
   JSRuntime *runtime;
   JSContext *context;
   JSValue init;
   JSValue update;
   JSValue draw;
   bool loaded;
};

struct nova64_gles_backend {
   bool requested;
   bool active;
   bool functions_loaded;
   bool resources_ready;
   PFNGLVIEWPORTPROC Viewport;
   PFNGLCLEARCOLORPROC ClearColor;
   PFNGLCLEARPROC Clear;
   PFNGLENABLEPROC Enable;
   PFNGLDISABLEPROC Disable;
   PFNGLCREATESHADERPROC CreateShader;
   PFNGLSHADERSOURCEPROC ShaderSource;
   PFNGLCOMPILESHADERPROC CompileShader;
   PFNGLGETSHADERIVPROC GetShaderiv;
   PFNGLGETSHADERINFOLOGPROC GetShaderInfoLog;
   PFNGLDELETESHADERPROC DeleteShader;
   PFNGLCREATEPROGRAMPROC CreateProgram;
   PFNGLATTACHSHADERPROC AttachShader;
   PFNGLLINKPROGRAMPROC LinkProgram;
   PFNGLGETPROGRAMIVPROC GetProgramiv;
   PFNGLGETPROGRAMINFOLOGPROC GetProgramInfoLog;
   PFNGLDELETEPROGRAMPROC DeleteProgram;
   PFNGLUSEPROGRAMPROC UseProgram;
   PFNGLGETATTRIBLOCATIONPROC GetAttribLocation;
   PFNGLGETUNIFORMLOCATIONPROC GetUniformLocation;
   PFNGLUNIFORMMATRIX4FVPROC UniformMatrix4fv;
   PFNGLUNIFORMMATRIX3FVPROC UniformMatrix3fv;
   PFNGLUNIFORM4FPROC Uniform4f;
   PFNGLGENBUFFERSPROC GenBuffers;
   PFNGLBINDBUFFERPROC BindBuffer;
   PFNGLBUFFERDATAPROC BufferData;
   PFNGLDELETEBUFFERSPROC DeleteBuffers;
   PFNGLENABLEVERTEXATTRIBARRAYPROC EnableVertexAttribArray;
   PFNGLDISABLEVERTEXATTRIBARRAYPROC DisableVertexAttribArray;
   PFNGLVERTEXATTRIBPOINTERPROC VertexAttribPointer;
   PFNGLDRAWELEMENTSPROC DrawElements;
   PFNGLGENTEXTURESPROC GenTextures;
   PFNGLDELETETEXTURESPROC DeleteTextures;
   PFNGLACTIVETEXTUREPROC ActiveTexture;
   PFNGLBINDTEXTUREPROC BindTexture;
   PFNGLTEXPARAMETERIPROC TexParameteri;
   PFNGLTEXIMAGE2DPROC TexImage2D;
   PFNGLTEXSUBIMAGE2DPROC TexSubImage2D;
   PFNGLUNIFORM1IPROC Uniform1i;
   PFNGLUNIFORM1FPROC Uniform1f;
   PFNGLUNIFORM2FPROC Uniform2f;
   PFNGLBLENDFUNCPROC BlendFunc;
   /* FBO procs */
   PFNGLGENFRAMEBUFFERSPROC GenFramebuffers;
   PFNGLBINDFRAMEBUFFERPROC BindFramebuffer;
   PFNGLFRAMEBUFFERTEXTURE2DPROC FramebufferTexture2D;
   PFNGLCHECKFRAMEBUFFERSTATUSPROC CheckFramebufferStatus;
   PFNGLDELETEFRAMEBUFFERSPROC DeleteFramebuffers;
   PFNGLGENRENDERBUFFERSPROC GenRenderbuffers;
   PFNGLBINDRENDERBUFFERPROC BindRenderbuffer;
   PFNGLRENDERBUFFERSTORAGEPROC RenderbufferStorage;
   PFNGLFRAMEBUFFERRENDERBUFFERPROC FramebufferRenderbuffer;
   PFNGLDELETERENDERBUFFERSPROC DeleteRenderbuffers;
   /* Post-processing resources */
   GLuint post_fbo;
   GLuint post_rbo;
   GLuint post_color_texture;
   GLuint post_program;
   bool post_resources_ready;
   GLint post_position_attrib;
   GLint post_uv_attrib;
   GLint post_scene_uniform;
   GLint post_crt_uniform;
   GLint post_vignette_uniform;
   GLint post_pixelate_uniform;
   GLint post_resolution_uniform;
   GLint post_bloom_uniform;
   GLint post_chromatic_uniform;
   GLint post_color_grade_uniform;
   GLint post_posterize_uniform;
   GLuint cube_vbo;
   GLuint cube_ibo;
   GLuint plane_vbo;
   GLuint plane_ibo;
   GLuint sphere_vbo;
   GLuint sphere_ibo;
   GLuint overlay_vbo;
   GLuint overlay_ibo;
   GLuint overlay_texture;
   GLuint cube_program;
   GLuint overlay_program;
   GLint cube_position_attrib;
   GLint cube_normal_attrib;
   GLint cube_mvp_uniform;
   GLint cube_normal_matrix_uniform;
   GLint cube_color_uniform;
   GLint cube_ambient_uniform;
   GLint cube_light_direction_uniform;
   GLint cube_fog_enabled_uniform;
   GLint cube_fog_color_uniform;
   GLint cube_fog_near_uniform;
   GLint cube_fog_far_uniform;
   GLint cube_has_texture_uniform;
   GLint cube_texture_uniform;
   GLint cube_has_normal_map_uniform;
   GLint cube_normal_map_uniform;
   GLint cube_emissive_color_uniform;
   GLint cube_emissive_intensity_uniform;
   GLint cube_roughness_uniform;
   GLint cube_metalness_uniform;
   GLint cube_uv_offset_uniform;
   GLint cube_uv_scale_uniform;
   /* Shadow map uniforms in cube program */
   GLint cube_shadow_map_uniform;
   GLint cube_shadow_mvp_uniform;
   GLint cube_shadow_texel_size_uniform;
   GLint cube_shadow_enabled_uniform;
   /* Shadow map resources */
   GLuint shadow_fbo;
   GLuint shadow_rbo;
   GLuint shadow_depth_tex;
   GLuint shadow_program;
   GLint  shadow_mvp_uniform;
   GLint  shadow_position_attrib;
   bool   shadow_resources_ready;
   GLint overlay_position_attrib;
   GLint overlay_uv_attrib;
   GLint overlay_texture_uniform;
   /* Equirectangular skybox program */
   GLuint skybox_program;
   GLint skybox_position_attrib;
   GLint skybox_inv_view_proj_uniform;
   GLint skybox_texture_uniform;
   bool skybox_resources_ready;
};

static retro_environment_t environ_cb;
static retro_video_refresh_t video_cb;
static retro_audio_sample_t audio_cb;
static retro_audio_sample_batch_t audio_batch_cb;
static retro_input_poll_t input_poll_cb;
static retro_input_state_t input_state_cb;
static retro_log_printf_t log_cb;

/* Rumble (retro_rumble_interface not in our local libretro.h stub) */
typedef bool (RETRO_CALLCONV *nova64_rumble_set_fn)(unsigned port, int effect, uint16_t strength);
struct nova64_rumble_iface { nova64_rumble_set_fn set_rumble_state; };
static nova64_rumble_set_fn rumble_fn;

/* Named audio channel volumes (8C) */
#define NOVA64_AUDIO_MAX_CHANNELS 16
struct nova64_audio_channel { char name[32]; float volume; float pitch; };
static struct nova64_audio_channel audio_channels[NOVA64_AUDIO_MAX_CHANNELS];

static float channel_volume(const char *name) {
   if (!name || !name[0]) return 1.0f;
   for (int i = 0; i < NOVA64_AUDIO_MAX_CHANNELS; i++)
      if (audio_channels[i].name[0] && !strcmp(audio_channels[i].name, name))
         return audio_channels[i].volume;
   return 1.0f;
}
static float channel_pitch(const char *name) {
   if (!name || !name[0]) return 1.0f;
   for (int i = 0; i < NOVA64_AUDIO_MAX_CHANNELS; i++)
      if (audio_channels[i].name[0] && !strcmp(audio_channels[i].name, name))
         return audio_channels[i].pitch > 0.01f ? audio_channels[i].pitch : 1.0f;
   return 1.0f;
}
static void channel_set_volume(const char *name, float vol) {
   if (!name || !name[0]) return;
   for (int i = 0; i < NOVA64_AUDIO_MAX_CHANNELS; i++) {
      if (audio_channels[i].name[0] && !strcmp(audio_channels[i].name, name)) {
         audio_channels[i].volume = vol; return;
      }
   }
   for (int i = 0; i < NOVA64_AUDIO_MAX_CHANNELS; i++) {
      if (!audio_channels[i].name[0]) {
         strncpy(audio_channels[i].name, name, sizeof(audio_channels[i].name)-1);
         audio_channels[i].volume = vol; return;
      }
   }
}
static void channel_set_pitch(const char *name, float pitch) {
   if (!name || !name[0]) return;
   for (int i = 0; i < NOVA64_AUDIO_MAX_CHANNELS; i++) {
      if (audio_channels[i].name[0] && !strcmp(audio_channels[i].name, name)) {
         audio_channels[i].pitch = pitch; return;
      }
   }
   for (int i = 0; i < NOVA64_AUDIO_MAX_CHANNELS; i++) {
      if (!audio_channels[i].name[0]) {
         strncpy(audio_channels[i].name, name, sizeof(audio_channels[i].name)-1);
         audio_channels[i].pitch = pitch; return;
      }
   }
}

static uint32_t *framebuffer;
static uint16_t *rgb565_framebuffer;
static uint8_t *overlay_rgba_framebuffer;
static uint32_t framebuffer_clear_color;
static char *cart_content;
static size_t cart_size;
static char cart_path[1024];
static char package_manifest_name[128];
static char package_manifest_title[128];
static char package_manifest_author[128];
static char package_manifest_version[64];
static char package_manifest_main[256];
static size_t package_manifest_asset_count;
static size_t package_manifest_missing_asset_count;
static size_t package_manifest_asset_bytes;
static size_t package_asset_quota_bytes = NOVA64_DEFAULT_ASSET_QUOTA_BYTES;
static size_t package_asset_quota_rejected_count;
static struct nova64_package_asset package_assets[NOVA64_MAX_PACKAGE_ASSETS];
static struct nova64_perf_timer perf_timers[NOVA64_MAX_PERF_TIMERS];
static char renderer_command_log_path[1024];
static char storage_save_directory[1024];
static char storage_cart_id[128];
static bool initialized;
static uint64_t frame_count;

static bool buttons[NOVA64_BUTTON_COUNT];
static bool previous_buttons[NOVA64_BUTTON_COUNT];
static bool pressed_buttons[NOVA64_BUTTON_COUNT];

#define NOVA64_KEY_TABLE_SIZE 512
static bool key_held[NOVA64_KEY_TABLE_SIZE];
static bool key_prev_held[NOVA64_KEY_TABLE_SIZE];

/* 2D clip region (0,0,0,0 = no clip) */
static int clip_x, clip_y, clip_w, clip_h;
static bool clip_active;

#define NOVA64_DRAW_STACK_MAX 16
struct nova64_clip_state {
   bool active;
   int x, y, w, h;
};
static struct nova64_clip_state clip_stack[NOVA64_DRAW_STACK_MAX];
static int clip_stack_depth;

/* 2D blend mode (reset on cart reload) */
enum nova64_blend_mode {
   NOVA64_BLEND_NORMAL = 0,
   NOVA64_BLEND_ALPHA,
   NOVA64_BLEND_ADDITIVE,
   NOVA64_BLEND_MULTIPLY,
   NOVA64_BLEND_SCREEN
};
static enum nova64_blend_mode blend_2d_mode = NOVA64_BLEND_NORMAL;
static enum nova64_blend_mode blend_stack[NOVA64_DRAW_STACK_MAX];
static int blend_stack_depth;

/* Shadow map configuration — 0 = disabled, power-of-2 size = enabled */
static int g_shadow_map_size = 1024;
static float g_shadow_light_vp[16];

/* Sky/background color — used as GLES clear color when enabled */
static bool sky_color_enabled = false;
static uint32_t sky_top_color    = 0x000000FFU;
static uint32_t sky_bottom_color = 0x000000FFU;
/* Equirectangular skybox texture handle; 0 = disabled (GLES only) */
static int g_skybox_tex_handle = 0;

/* 16-color draw palette plus one exact-color swap for retro palette tricks. */
static uint32_t draw_palette[16];
static bool palette_swap_enabled = false;
static uint32_t palette_swap_from = 0;
static uint32_t palette_swap_to = 0;
struct nova64_palette_state {
   uint32_t colors[16];
   bool swap_enabled;
   uint32_t swap_from;
   uint32_t swap_to;
};
static struct nova64_palette_state palette_stack[NOVA64_DRAW_STACK_MAX];
static int palette_stack_depth;

/* 2D camera offset — subtracted from all 2D draw coordinates */
static int cam2d_x = 0;
static int cam2d_y = 0;
static float cam2d_zoom = 1.0f;
static float cam2d_rotation = 0.0f;

/* Z-sorted sprite buffer — deferred draws flushed after draw() returns */
#define NOVA64_MAX_SORTED_SPRITES 256
struct nova64_sorted_sprite {
   const uint8_t *pixels;  /* points into asset data or owned_pixels */
   uint8_t *owned_pixels;  /* non-NULL for PNG-decoded; freed after flush */
   int dx, dy;
   int img_w, img_h;
   int sx, sy, bw, bh;
   int z;
};
static struct nova64_sorted_sprite sorted_sprites[NOVA64_MAX_SORTED_SPRITES];
static int sorted_sprite_count = 0;

struct nova64_camera2d_state {
   int x, y;
   float zoom;
   float rotation;
};
static struct nova64_camera2d_state camera2d_stack[NOVA64_DRAW_STACK_MAX];
static int camera2d_stack_depth;

/* Mouse */
#define NOVA64_MOUSE_X       0
#define NOVA64_MOUSE_Y       1
#define NOVA64_MOUSE_LEFT    2
#define NOVA64_MOUSE_RIGHT   3
#define NOVA64_MOUSE_MIDDLE  6
#define NOVA64_MOUSE_BTN_COUNT 3
#define NOVA64_POINTER_X     0
#define NOVA64_POINTER_Y     1
#define NOVA64_POINTER_PRESSED 2
#define NOVA64_POINTER_COUNT 3

static int32_t mouse_rel_x;
static int32_t mouse_rel_y;
static bool mouse_btns[NOVA64_MOUSE_BTN_COUNT];     /* left, right, middle */
static bool mouse_prev_btns[NOVA64_MOUSE_BTN_COUNT];
static int32_t touch_x;
static int32_t touch_y;
static int32_t touch_count;

/* Analog sticks (RETRO_DEVICE_ANALOG = 5) */
#define NOVA64_DEVICE_ANALOG       5
#define NOVA64_ANALOG_LEFT         0
#define NOVA64_ANALOG_RIGHT        1
#define NOVA64_ANALOG_BUTTON       2
#define NOVA64_ANALOG_X            0
#define NOVA64_ANALOG_Y            1
#define NOVA64_MAX_PORTS           4
/* RETRO joypad button ids for L2/R2 — same as in libretro spec */
#define NOVA64_RETRO_L2            10
#define NOVA64_RETRO_R2            11

/* Per-port analog axes [-1, 1] and triggers [0, 1] */
static float analog_axes[NOVA64_MAX_PORTS][2][2]; /* [port][side 0=L,1=R][axis 0=X,1=Y] */
static float analog_triggers[NOVA64_MAX_PORTS][2]; /* [port][0=L2,1=R2] */

/* Multi-port joypad state for ports 1-3 (port 0 uses the existing arrays) */
static bool mp_buttons[NOVA64_MAX_PORTS][NOVA64_BUTTON_COUNT];
static bool mp_prev_buttons[NOVA64_MAX_PORTS][NOVA64_BUTTON_COUNT];
static bool mp_pressed_buttons[NOVA64_MAX_PORTS][NOVA64_BUTTON_COUNT];

/* Tilemap subsystem */
#define NOVA64_MAX_TILEMAPS 16
#define NOVA64_MAX_SPRITESHEETS 32
struct nova64_tilemap {
   int tile_w, tile_h;
   int cols, rows;
   int *cells;
   bool active;
};
static struct nova64_tilemap tilemaps[NOVA64_MAX_TILEMAPS];

struct nova64_spritesheet {
   bool active;
   char path[256];
   char atlas_path[256];
   int frame_w;
   int frame_h;
   int image_w;
   int image_h;
};
static struct nova64_spritesheet spritesheets[NOVA64_MAX_SPRITESHEETS];

static void destroy_tilemap(int idx)
{
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS) return;
   free(tilemaps[idx].cells);
   memset(&tilemaps[idx], 0, sizeof(tilemaps[idx]));
}

static void destroy_all_tilemaps(void)
{
   for (int i = 0; i < NOVA64_MAX_TILEMAPS; i++)
      destroy_tilemap(i);
}

static void clear_all_spritesheets(void)
{
   memset(spritesheets, 0, sizeof(spritesheets));
}

/* Deterministic RNG — xorshift64 */
static uint64_t rng_state = 12345678901234567ULL;

static void rng_seed_impl(uint64_t seed) { rng_state = seed ? seed : 12345678901234567ULL; }

static void rng_seed_from_environment(void)
{
   const char *seed_text = getenv("NOVA64_SEED");
   if (!seed_text || !seed_text[0]) {
      rng_seed_impl(0);
      return;
   }
   char *end = NULL;
   uint64_t seed = (uint64_t)strtoull(seed_text, &end, 10);
   rng_seed_impl((end && *end == '\0') ? seed : 0);
}

static double rng_next_impl(void)
{
   rng_state ^= rng_state << 13;
   rng_state ^= rng_state >> 7;
   rng_state ^= rng_state << 17;
   return (double)(rng_state >> 11) / (double)(UINT64_C(1) << 53);
}

/* Physics AABB/Circle colliders (8H) */
#define NOVA64_MAX_COLLIDERS  64
#define NOVA64_COLLIDER_BOX    0
#define NOVA64_COLLIDER_CIRCLE 1

struct nova64_collider {
   bool     active;
   int      type;   /* NOVA64_COLLIDER_BOX or CIRCLE */
   float    x, y;   /* box: top-left; circle: center */
   float    w, h;   /* box: width/height; circle: w=h=radius */
};
static struct nova64_collider g_colliders[NOVA64_MAX_COLLIDERS];

static void reset_colliders(void) { memset(g_colliders, 0, sizeof(g_colliders)); }

/* ── 2D particle system ──────────────────────────────────────── */
#define NOVA64_MAX_PARTICLES  512
#define NOVA64_MAX_EMITTERS     8

struct nova64_particle {
   float x, y;
   float vx, vy;
   float age, lifetime;
   uint32_t color_start, color_end;
   float size_start, size_end;
   int active;
};

struct nova64_particle_emitter {
   int    used;
   int    active;         /* continuous emission */
   float  x, y;
   float  dir_x, dir_y;  /* normalized emission direction */
   float  spread;         /* cone half-angle radians */
   float  speed_min, speed_max;
   float  lifetime_min, lifetime_max;
   float  grav_x, grav_y;
   uint32_t color_start, color_end;
   float  size_start, size_end;
   float  rate;           /* particles/second; 0 = burst-only */
   float  rate_accum;
   int    max_count;      /* cap on active particles from this emitter */
};

static struct nova64_particle         g_particles[NOVA64_MAX_PARTICLES];
static struct nova64_particle_emitter g_emitters[NOVA64_MAX_EMITTERS];

static void reset_particles(void)
{
   memset(g_particles, 0, sizeof(g_particles));
   memset(g_emitters, 0, sizeof(g_emitters));
}

static uint32_t particle_lerp_color(uint32_t a, uint32_t b, float t)
{
   if (t <= 0.0f) return a;
   if (t >= 1.0f) return b;
   int ar = (int)((a >> 24) & 0xffu), ag = (int)((a >> 16) & 0xffu);
   int ab = (int)((a >>  8) & 0xffu), aa = (int)(a & 0xffu);
   int br = (int)((b >> 24) & 0xffu), bg = (int)((b >> 16) & 0xffu);
   int bb = (int)((b >>  8) & 0xffu), ba = (int)(b & 0xffu);
   uint32_t rr = (uint32_t)(ar + (int)((float)(br - ar) * t));
   uint32_t rg = (uint32_t)(ag + (int)((float)(bg - ag) * t));
   uint32_t rb = (uint32_t)(ab + (int)((float)(bb - ab) * t));
   uint32_t ra = (uint32_t)(aa + (int)((float)(ba - aa) * t));
   return (rr << 24) | (rg << 16) | (rb << 8) | ra;
}

/* spawn one particle from emitter e_idx */
static void spawn_particle(int e_idx)
{
   struct nova64_particle_emitter *em = &g_emitters[e_idx];
   /* find a free slot — prefer slots hashed to this emitter */
   int slot = -1;
   for (int pass = 0; pass < 2 && slot < 0; pass++) {
      for (int i = 0; i < NOVA64_MAX_PARTICLES; i++) {
         if (!g_particles[i].active) { slot = i; break; }
      }
   }
   if (slot < 0) return;

   struct nova64_particle *p = &g_particles[slot];
   p->x = em->x; p->y = em->y;

   /* random angle within spread cone */
   float rng = (float)rng_next_impl();
   float angle = atan2f(em->dir_y, em->dir_x) + (rng - 0.5f) * em->spread;
   float speed = em->speed_min + (float)rng_next_impl() * (em->speed_max - em->speed_min);
   p->vx = cosf(angle) * speed;
   p->vy = sinf(angle) * speed;

   p->age = 0.0f;
   p->lifetime = em->lifetime_min + (float)rng_next_impl() * (em->lifetime_max - em->lifetime_min);
   if (p->lifetime < 0.001f) p->lifetime = 0.001f;
   p->color_start = em->color_start;
   p->color_end   = em->color_end;
   p->size_start  = em->size_start;
   p->size_end    = em->size_end;
   p->active = 1;
}

/* ── Bitmap font store ──────────────────────────────────────── */
#define NOVA64_MAX_FONTS 8
struct nova64_bitmap_font { bool active; uint8_t *pixels; int glyph_w, glyph_h, atlas_w, atlas_h; };
static struct nova64_bitmap_font g_fonts[NOVA64_MAX_FONTS];
static void reset_fonts(void) {
   for (int i = 0; i < NOVA64_MAX_FONTS; i++) {
      if (g_fonts[i].active) free(g_fonts[i].pixels);
   }
   memset(g_fonts, 0, sizeof(g_fonts));
}

static int alloc_collider(void) {
   for (int i = 1; i < NOVA64_MAX_COLLIDERS; i++)
      if (!g_colliders[i].active) { g_colliders[i].active = true; return i; }
   return 0;
}
static struct nova64_collider *collider_ptr(int h) {
   return (h >= 1 && h < NOVA64_MAX_COLLIDERS && g_colliders[h].active) ? &g_colliders[h] : NULL;
}
static bool colliders_overlap(const struct nova64_collider *a, const struct nova64_collider *b) {
   if (!a || !b) return false;
   if (a->type == NOVA64_COLLIDER_BOX && b->type == NOVA64_COLLIDER_BOX)
      return a->x < b->x+b->w && a->x+a->w > b->x && a->y < b->y+b->h && a->y+a->h > b->y;
   if (a->type == NOVA64_COLLIDER_CIRCLE && b->type == NOVA64_COLLIDER_CIRCLE) {
      float dx = a->x - b->x, dy = a->y - b->y, r = a->w + b->w;
      return dx*dx + dy*dy < r*r;
   }
   /* box vs circle */
   const struct nova64_collider *box = (a->type == NOVA64_COLLIDER_BOX) ? a : b;
   const struct nova64_collider *cir = (a->type == NOVA64_COLLIDER_CIRCLE) ? a : b;
   float cx = cir->x, cy = cir->y;
   float nx = cx < box->x ? box->x : (cx > box->x+box->w ? box->x+box->w : cx);
   float ny = cy < box->y ? box->y : (cy > box->y+box->h ? box->y+box->h : cy);
   float dx = cx-nx, dy = cy-ny;
   return dx*dx + dy*dy < cir->w * cir->w;
}

/* Standard RETROK key codes (from libretro spec) */
#define NOVA64_RETROK_BACKSPACE  8
#define NOVA64_RETROK_TAB        9
#define NOVA64_RETROK_RETURN     13
#define NOVA64_RETROK_ESCAPE     27
#define NOVA64_RETROK_SPACE      32
#define NOVA64_RETROK_UP         273
#define NOVA64_RETROK_DOWN       274
#define NOVA64_RETROK_RIGHT      275
#define NOVA64_RETROK_LEFT       276
#define NOVA64_RETROK_F1         282
#define NOVA64_RETROK_LSHIFT     304
#define NOVA64_RETROK_RSHIFT     303
#define NOVA64_RETROK_LCTRL      306
#define NOVA64_RETROK_RCTRL      305
#define NOVA64_RETROK_LALT       308
#define NOVA64_RETROK_RALT       307

/* Keys we poll each frame — kept small to avoid unnecessary input queries */
static const int nova64_tracked_keys[] = {
   NOVA64_RETROK_BACKSPACE, NOVA64_RETROK_TAB, NOVA64_RETROK_RETURN,
   NOVA64_RETROK_ESCAPE, NOVA64_RETROK_SPACE,
   48,49,50,51,52,53,54,55,56,57, /* 0-9 */
   97,98,99,100,101,102,103,104,105,106,107,108,109, /* a-m */
   110,111,112,113,114,115,116,117,118,119,120,121,122, /* n-z */
   NOVA64_RETROK_UP, NOVA64_RETROK_DOWN, NOVA64_RETROK_RIGHT, NOVA64_RETROK_LEFT,
   /* F1-F12 */
   282,283,284,285,286,287,288,289,290,291,292,293,
   NOVA64_RETROK_LSHIFT, NOVA64_RETROK_RSHIFT,
   NOVA64_RETROK_LCTRL, NOVA64_RETROK_RCTRL,
   NOVA64_RETROK_LALT, NOVA64_RETROK_RALT,
};

static struct nova64_mesh meshes[NOVA64_MAX_MESHES];
static struct nova64_point_light point_lights[NOVA64_MAX_POINT_LIGHTS];
static struct nova64_texture textures[NOVA64_MAX_TEXTURES];
static struct nova64_render_target render_targets[NOVA64_MAX_RENDER_TARGETS];
static struct nova64_camera camera_state;
static struct nova64_light light_state;

/* ── Camera shake ─────────────────────────────────────────── */
static float g_shake_intensity = 0.0f;  /* current intensity (pixels/units) */
static float g_shake_timer     = 0.0f;  /* seconds remaining */
static float g_shake_duration  = 0.0f;  /* total duration of current shake */

/* ── Tween system ─────────────────────────────────────────── */
#define NOVA64_MAX_TWEENS 16
#define NOVA64_TWEEN_LINEAR     0
#define NOVA64_TWEEN_QUAD_IN    1
#define NOVA64_TWEEN_QUAD_OUT   2
#define NOVA64_TWEEN_QUAD_INOUT 3
#define NOVA64_TWEEN_SINE_IN    4
#define NOVA64_TWEEN_SINE_OUT   5
#define NOVA64_TWEEN_BOUNCE_OUT 6
#define NOVA64_TWEEN_ELASTIC_OUT 7
#define NOVA64_TWEEN_CUBIC_IN   8
#define NOVA64_TWEEN_CUBIC_OUT  9

struct nova64_tween {
   int    used;
   int    done;
   float  from, to;
   float  duration;
   float  elapsed;
   int    easing;
};
static struct nova64_tween g_tweens[NOVA64_MAX_TWEENS];
static struct nova64_audio_voice audio_voices[NOVA64_AUDIO_MAX_VOICES];
static int16_t audio_mix_buffer[NOVA64_AUDIO_FRAME_SAMPLES * 2];
static double audio_master_volume = 0.4;

/* ── Off-screen canvas ────────────────────────────────────── */
#define NOVA64_MAX_CANVASES 4
struct nova64_canvas {
   int used;
   int w, h;
   uint32_t *pixels;
};
static struct nova64_canvas g_canvases[NOVA64_MAX_CANVASES];
static void reset_canvases(void) {
   for (int i = 0; i < NOVA64_MAX_CANVASES; i++) {
      free(g_canvases[i].pixels);
      memset(&g_canvases[i], 0, sizeof(g_canvases[i]));
   }
}

/* ── Timer system ─────────────────────────────────────────── */
#define NOVA64_MAX_TIMERS 32
struct nova64_timer { int used; float duration; float elapsed; };
static struct nova64_timer g_timers[NOVA64_MAX_TIMERS];

/* ── Logical grid ─────────────────────────────────────────── */
#define NOVA64_MAX_GRIDS 8
#define NOVA64_MAX_GRID_CELLS 4096
struct nova64_grid {
   int used;
   int cols, rows;
   int cell_w, cell_h;
   int data[NOVA64_MAX_GRID_CELLS];
};
static struct nova64_grid g_grids[NOVA64_MAX_GRIDS];

/* ── Screen flash ─────────────────────────────────────────── */
static uint32_t g_flash_color    = 0;
static float    g_flash_timer    = 0.0f;
static float    g_flash_duration = 0.0f;

/* ── Path drawing ─────────────────────────────────────────── */
#define NOVA64_MAX_PATH_PTS 128
static float g_path_pts[NOVA64_MAX_PATH_PTS * 2]; /* x0,y0, x1,y1 ... */
static int   g_path_count  = 0;
static int   g_path_closed = 0;

/* ── Sprite animation ────────────────────────────────────── */
#define NOVA64_MAX_ANIMS 16
struct nova64_anim {
   int used;
   char path[256];
   int frame_w, frame_h;
   int frame_count;
   float fps;
   float elapsed;
   int img_w, img_h;
};
static struct nova64_anim g_anims[NOVA64_MAX_ANIMS];

/* ── Floating text ───────────────────────────────────────── */
#define NOVA64_MAX_FLOAT_TEXTS 32
struct nova64_float_text {
   int used;
   char text[64];
   float x, y, vy, life;
   uint32_t color;
};
static struct nova64_float_text g_float_texts[NOVA64_MAX_FLOAT_TEXTS];

/* ── Typewriter dialog ───────────────────────────────────── */
#define NOVA64_MAX_DIALOGS 4
struct nova64_dialog {
   int used;
   char text[512];
   int len;
   float speed;
   float elapsed;
};
static struct nova64_dialog g_dialogs[NOVA64_MAX_DIALOGS];

/* ── Simple FSM ──────────────────────────────────────────── */
#define NOVA64_MAX_FSM 8
struct nova64_fsm { int used; int state; int prev; float elapsed; };
static struct nova64_fsm g_fsm[NOVA64_MAX_FSM];

/* ── Seeded RNG ──────────────────────────────────────────── */
#define NOVA64_MAX_RNGS 8
struct nova64_rng { int used; uint32_t seed; };
static struct nova64_rng g_rngs[NOVA64_MAX_RNGS];

/* ── Scrolling text ──────────────────────────────────────── */
#define NOVA64_MAX_SCROLL_TEXTS 8
#define NOVA64_SCROLL_TEXT_MAX  512
struct nova64_scroll_text {
   int used;
   char text[NOVA64_SCROLL_TEXT_MAX];
   float speed;
   float pos;
   int   total_w;
};
static struct nova64_scroll_text g_scroll_texts[NOVA64_MAX_SCROLL_TEXTS];

/* ── Button auto-repeat ──────────────────────────────────── */
struct nova64_btn_repeat_state { int count; };
static struct nova64_btn_repeat_state g_btn_repeat[NOVA64_BUTTON_COUNT];

/* ── AABB hotspots ───────────────────────────────────────── */
#define NOVA64_MAX_HOTSPOTS 32
struct nova64_hotspot { int used; int x, y, w, h; };
static struct nova64_hotspot g_hotspots[NOVA64_MAX_HOTSPOTS];

/* ── Flood fill queue ────────────────────────────────────── */
#define NOVA64_FLOOD_QUEUE_SIZE 16384
static struct { int16_t x, y; } g_flood_queue[NOVA64_FLOOD_QUEUE_SIZE];

/* ── Echo / delay ────────────────────────────────────────── */
#define NOVA64_ECHO_BUF_SIZE 44100   /* 1-second ring buffer */
static int16_t echo_buf[NOVA64_ECHO_BUF_SIZE * 2]; /* L,R interleaved */
static size_t echo_write_pos = 0;
static int echo_delay_frames = 0;  /* 0 = echo off */
static float echo_decay = 0.5f;
static float echo_wet   = 0.5f;

/* ── Positional audio ─────────────────────────────────────── */
static float listener_pos[3]; /* defaults 0,0,0; update with setListenerPos */
static bool g_developer_mode = false;
static unsigned g_res_width  = NOVA64_WIDTH;
static unsigned g_res_height = NOVA64_HEIGHT;

/* RetroAchievements cart RAM (8J) — 256 bytes exposed via SET_MEMORY_MAPS */
#define NOVA64_CHEEVOS_RAM_SIZE 256
static uint8_t g_cheevos_ram[NOVA64_CHEEVOS_RAM_SIZE];

/* Minimal memory-map structs (not present in all libretro.h versions) */
#ifndef RETRO_MEMDESC_SYSTEM_RAM
#define RETRO_MEMDESC_SYSTEM_RAM (1 << 0)
struct retro_memory_descriptor {
   uint64_t flags;
   void    *ptr;
   size_t   offset;
   size_t   start;
   size_t   select;
   size_t   disconnect;
   size_t   len;
   const char *addrspace;
};
struct retro_memory_map {
   const struct retro_memory_descriptor *descriptors;
   unsigned num_descriptors;
};
#endif

/* In-cart developer console (8J) */
#define NOVA64_DEV_CON_LINES 12
#define NOVA64_DEV_CON_COLS  80
static char g_dev_con[NOVA64_DEV_CON_LINES][NOVA64_DEV_CON_COLS];
static int  g_dev_con_count = 0;
static int  g_dev_con_head  = 0;

/* Dedicated music state — looping background track, one at a time */
struct nova64_music_state {
   bool active;
   bool paused;
   float vol;
   const int16_t *pcm_data;
   int16_t *ogg_decoded_data;  /* owned malloc'd PCM from OGG decode */
   size_t pcm_frames;
   size_t pcm_channels;
   double pcm_rate;
   double pcm_pos;
   const struct nova64_package_asset *pcm_asset;
};
static struct nova64_music_state music_state;
static struct nova64_js_host js_host;
static struct nova64_gles_backend gles;
static enum nova64_renderer_backend renderer_preference = NOVA64_RENDERER_GLES3;
static struct retro_hw_render_callback hw_render;
static enum retro_pixel_format pixel_format = RETRO_PIXEL_FORMAT_RGB565;
static bool drawing_scene_preview;

/* Post-processing state — persists across frames, reset on cart reload */
struct nova64_post_state {
   bool crt_enabled;
   float vignette;       /* 0.0 = off, 1.0 = full */
   int pixelate;         /* 0 = off, 1+ = block size in pixels */
   float bloom;          /* 0.0 = off, 0.0-1.0 intensity */
   float chromatic;      /* 0.0 = off, offset amount (try 0.003-0.01) */
   float color_grade[3]; /* RGB multipliers, default 1.0 each */
   int posterize;        /* 0 = off, 2-8 = quantize levels */
};
static struct nova64_post_state post_state;

static void reset_post_state(void)
{
   post_state.crt_enabled = false;
   post_state.vignette = 0.0f;
   post_state.pixelate = 0;
   post_state.bloom = 0.0f;
   post_state.chromatic = 0.0f;
   post_state.color_grade[0] = post_state.color_grade[1] = post_state.color_grade[2] = 1.0f;
   post_state.posterize = 0;
}

static bool post_is_active(void)
{
   return post_state.crt_enabled || post_state.vignette > 0.0f || post_state.pixelate > 0
      || post_state.bloom > 0.0f || post_state.chromatic > 0.0f || post_state.posterize > 0
      || post_state.color_grade[0] != 1.0f || post_state.color_grade[1] != 1.0f
      || post_state.color_grade[2] != 1.0f;
}

static void reset_palette_state(void)
{
   static const uint32_t defaults[16] = {
      0x000000FFU, 0x1D2B53FFU, 0x7E2553FFU, 0x008751FFU,
      0xAB5236FFU, 0x5F574FFFU, 0xC2C3C7FFU, 0xFFF1E8FFU,
      0xFF004DFFU, 0xFFA300FFU, 0xFFEC27FFU, 0x00E436FFU,
      0x29ADFFFFU, 0x83769CFFU, 0xFF77A8FFU, 0xFFCCAAFFU
   };
   memcpy(draw_palette, defaults, sizeof(draw_palette));
   palette_swap_enabled = false;
   palette_swap_from = 0;
   palette_swap_to = 0;
}

static uint32_t apply_palette_swap(uint32_t color)
{
   return (palette_swap_enabled && color == palette_swap_from) ? palette_swap_to : color;
}

static void transform_2d_point(int world_x, int world_y, int *screen_x, int *screen_y)
{
   float x = (float)(world_x - cam2d_x);
   float y = (float)(world_y - cam2d_y);
   if (cam2d_zoom != 1.0f || cam2d_rotation != 0.0f) {
      float cx = (float)NOVA64_WIDTH * 0.5f;
      float cy = (float)NOVA64_HEIGHT * 0.5f;
      float dx = (x - cx) * cam2d_zoom;
      float dy = (y - cy) * cam2d_zoom;
      float s = sinf(cam2d_rotation);
      float c = cosf(cam2d_rotation);
      x = cx + dx * c - dy * s;
      y = cy + dx * s + dy * c;
   }
   *screen_x = (int)lrintf(x);
   *screen_y = (int)lrintf(y);
}

static int transform_2d_size(int size)
{
   int out = (int)lrintf((float)size * cam2d_zoom);
   if (size > 0 && out < 1)
      out = 1;
   if (size < 0 && out > -1)
      out = -1;
   return out;
}

static bool scene_has_visible_meshes(void);
static void render_software_scene(void);
static char *read_file_to_memory(const char *path, size_t *out_size);
static bool storage_path_for_key(const char *key, char *out, size_t out_size);
static bool storage_root_dir(char *out, size_t out_size);
static void update_storage_cart_id(void);
static void audio_mix_frame(void);
static void reset_audio_state(void);
static const struct nova64_package_asset *find_package_asset(const char *path);
static void sanitize_identifier(const char *input, char *out, size_t out_size, const char *fallback);
static char *js_module_normalize(JSContext *ctx, const char *module_base_name,
      const char *module_name, void *opaque);
static JSModuleDef *js_module_loader(JSContext *ctx, const char *module_name, void *opaque);

static void nova64_log_line(enum retro_log_level level, const char *message)
{
   if (log_cb)
      log_cb(level, "%s\n", message);
   else
      fprintf(stderr, "%s\n", message);
}

static const char *renderer_backend_name(enum nova64_renderer_backend backend)
{
   switch (backend) {
      case NOVA64_RENDERER_VULKAN12:
         return "vulkan12";
      case NOVA64_RENDERER_GLES3:
      default:
         return "opengles3";
   }
}

static char ascii_lower_char(char c)
{
   if (c >= 'A' && c <= 'Z')
      return (char)(c + ('a' - 'A'));
   return c;
}

static bool ascii_equals_ignore_case(const char *left, const char *right)
{
   if (!left || !right)
      return false;
   while (*left && *right) {
      if (ascii_lower_char(*left) != ascii_lower_char(*right))
         return false;
      left++;
      right++;
   }
   return *left == '\0' && *right == '\0';
}

static enum nova64_renderer_backend parse_renderer_backend(const char *value)
{
   if (!value || !value[0])
      return NOVA64_RENDERER_GLES3;
   if (ascii_equals_ignore_case(value, "vulkan") || ascii_equals_ignore_case(value, "vulkan12") ||
         ascii_equals_ignore_case(value, "vulkan1.2") || ascii_equals_ignore_case(value, "vulkan 1.2"))
      return NOVA64_RENDERER_VULKAN12;
   return NOVA64_RENDERER_GLES3;
}

static void set_core_variables(void)
{
   if (!environ_cb)
      return;

   static struct retro_variable variables[] = {
      {"nova64_renderer",       "Renderer backend; opengles3|vulkan12"},
      {"nova64_resolution",     "Resolution; 640x360|320x180|1280x720"},
      {"nova64_developer_mode", "Developer mode; disable|enable"},
      {"nova64_audio_latency",  "Audio latency; normal|low|high"},
      {NULL, NULL},
   };
   environ_cb(RETRO_ENVIRONMENT_SET_VARIABLES, variables);
}

static enum nova64_renderer_backend read_renderer_preference(void)
{
   const char *env_backend = getenv("NOVA64_RENDERER");
   if (env_backend && env_backend[0])
      return parse_renderer_backend(env_backend);

   if (environ_cb) {
      struct retro_variable variable;
      variable.key = "nova64_renderer";
      variable.value = NULL;
      if (environ_cb(RETRO_ENVIRONMENT_GET_VARIABLE, &variable) && variable.value)
         return parse_renderer_backend(variable.value);
   }
   return NOVA64_RENDERER_GLES3;
}

/* Parse a "WxH" resolution string into w/h; returns false if unrecognised. */
static bool parse_resolution(const char *s, unsigned *w, unsigned *h)
{
   if (!s) return false;
   if (!strcmp(s, "640x360"))  { *w = 640; *h = 360; return true; }
   if (!strcmp(s, "320x180"))  { *w = 320; *h = 180; return true; }
   if (!strcmp(s, "1280x720")) { *w = 1280; *h = 720; return true; }
   return false;
}

/* Return the preferred audio latency in ms (0 = default / let frontend decide). */
static unsigned read_audio_latency_ms(void)
{
   if (environ_cb) {
      struct retro_variable v = { "nova64_audio_latency", NULL };
      if (environ_cb(RETRO_ENVIRONMENT_GET_VARIABLE, &v) && v.value) {
         if (v.value[0] == 'l') return 32;  /* "low"  */
         if (v.value[0] == 'h') return 128; /* "high" */
      }
   }
   return 0; /* "normal" — let frontend choose */
}

static uint32_t rgba8(uint32_t r, uint32_t g, uint32_t b, uint32_t a)
{
   return ((r & 0xffU) << 24) | ((g & 0xffU) << 16) | ((b & 0xffU) << 8) | (a & 0xffU);
}

static uint32_t color_from_js(JSContext *ctx, JSValueConst value, uint32_t fallback)
{
   int64_t out = 0;
   if (JS_IsUndefined(value) || JS_IsNull(value))
      return fallback;
   if (JS_ToInt64(ctx, &out, value) < 0)
      return fallback;
   return (uint32_t)out;
}

static int int_from_js(JSContext *ctx, JSValueConst value, int fallback)
{
   int32_t out = 0;
   if (JS_IsUndefined(value) || JS_IsNull(value))
      return fallback;
   if (JS_ToInt32(ctx, &out, value) < 0)
      return fallback;
   return out;
}

static double double_from_js(JSContext *ctx, JSValueConst value, double fallback)
{
   double out = 0.0;
   if (JS_IsUndefined(value) || JS_IsNull(value))
      return fallback;
   if (JS_ToFloat64(ctx, &out, value) < 0)
      return fallback;
   return out;
}

static double clamp_double(double value, double min_value, double max_value)
{
   if (value < min_value)
      return min_value;
   if (value > max_value)
      return max_value;
   return value;
}

static bool set_vec3_from_js_property(JSContext *ctx, JSValueConst value, const char *name, float *target)
{
   JSValue property = JS_GetPropertyStr(ctx, value, name);
   if (JS_IsUndefined(property) || JS_IsNull(property)) {
      JS_FreeValue(ctx, property);
      return false;
   }
   double number = 0.0;
   bool ok = JS_ToFloat64(ctx, &number, property) == 0;
   JS_FreeValue(ctx, property);
   if (ok)
      *target = (float)number;
   return ok;
}

static bool set_vec3_from_js_index(JSContext *ctx, JSValueConst value, uint32_t index, float *target)
{
   JSValue property = JS_GetPropertyUint32(ctx, value, index);
   if (JS_IsUndefined(property) || JS_IsNull(property)) {
      JS_FreeValue(ctx, property);
      return false;
   }
   double number = 0.0;
   bool ok = JS_ToFloat64(ctx, &number, property) == 0;
   JS_FreeValue(ctx, property);
   if (ok)
      *target = (float)number;
   return ok;
}

static bool set_position_from_js(JSContext *ctx, JSValueConst value, float target[3])
{
   if (JS_IsUndefined(value) || JS_IsNull(value))
      return false;

   float next[3] = {target[0], target[1], target[2]};
   bool has_array_values =
      set_vec3_from_js_index(ctx, value, 0, &next[0]) |
      set_vec3_from_js_index(ctx, value, 1, &next[1]) |
      set_vec3_from_js_index(ctx, value, 2, &next[2]);
   if (!has_array_values) {
      bool has_object_values =
         set_vec3_from_js_property(ctx, value, "x", &next[0]) |
         set_vec3_from_js_property(ctx, value, "y", &next[1]) |
         set_vec3_from_js_property(ctx, value, "z", &next[2]);
      if (!has_object_values)
         return false;
   }

   target[0] = next[0];
   target[1] = next[1];
   target[2] = next[2];
   return true;
}

static void clear_scene_objects(void)
{
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (meshes[i].custom_verts)  { free(meshes[i].custom_verts);  meshes[i].custom_verts = NULL; }
      if (meshes[i].custom_indices){ free(meshes[i].custom_indices); meshes[i].custom_indices = NULL; }
      if (meshes[i].instance_transforms) { free(meshes[i].instance_transforms); meshes[i].instance_transforms = NULL; }
      if (meshes[i].gl_custom_vbo && gles.active && gles.DeleteBuffers)
         gles.DeleteBuffers(1, &meshes[i].gl_custom_vbo);
      if (meshes[i].gl_custom_ibo && gles.active && gles.DeleteBuffers)
         gles.DeleteBuffers(1, &meshes[i].gl_custom_ibo);
   }
   memset(meshes, 0, sizeof(meshes));
   memset(point_lights, 0, sizeof(point_lights));
}

static int allocate_texture(void)
{
   for (int i = 0; i < NOVA64_MAX_TEXTURES; i++) {
      if (!textures[i].used) {
         textures[i].used = true;
         textures[i].borrowed = false;
         textures[i].gl_name = 0;
         textures[i].width = 0;
         textures[i].height = 0;
         return i + 1;
      }
   }
   return 0;
}

static struct nova64_texture *texture_from_handle(int handle)
{
   if (handle <= 0 || handle > NOVA64_MAX_TEXTURES)
      return NULL;
   struct nova64_texture *tex = &textures[handle - 1];
   return tex->used ? tex : NULL;
}

static void free_texture_gl(struct nova64_texture *tex)
{
   if (tex && tex->gl_name && !tex->borrowed && gles.active && gles.DeleteTextures)
      gles.DeleteTextures(1, &tex->gl_name);
   if (tex)
      tex->gl_name = 0;
}

static void clear_textures(void)
{
   for (int i = 0; i < NOVA64_MAX_TEXTURES; i++) {
      free_texture_gl(&textures[i]);
      memset(&textures[i], 0, sizeof(textures[i]));
   }
}

static void rt_destroy_gl(struct nova64_render_target *rt);

static void clear_render_targets(void)
{
   for (int i = 0; i < NOVA64_MAX_RENDER_TARGETS; i++)
      rt_destroy_gl(&render_targets[i]);
}

static float clamp_float(float value, float min_value, float max_value)
{
   if (value < min_value)
      return min_value;
   if (value > max_value)
      return max_value;
   return value;
}

static uint32_t color_add_emissive(uint32_t base, uint32_t emissive, float intensity)
{
   if (intensity <= 0.0f || (emissive >> 8) == 0)
      return base;
   uint32_t r = ((base >> 24) & 0xffU) + (uint32_t)fminf(255.0f, (float)((emissive >> 24) & 0xffU) * intensity);
   uint32_t g = ((base >> 16) & 0xffU) + (uint32_t)fminf(255.0f, (float)((emissive >> 16) & 0xffU) * intensity);
   uint32_t b = ((base >>  8) & 0xffU) + (uint32_t)fminf(255.0f, (float)((emissive >>  8) & 0xffU) * intensity);
   return ((r > 255 ? 255 : r) << 24) | ((g > 255 ? 255 : g) << 16) | ((b > 255 ? 255 : b) << 8) | (base & 0xffU);
}

static uint32_t color_with_intensity(uint32_t color, float intensity)
{
   intensity = clamp_float(intensity, 0.0f, 4.0f);
   uint32_t r = (uint32_t)fminf(255.0f, (float)((color >> 24) & 0xffU) * intensity);
   uint32_t g = (uint32_t)fminf(255.0f, (float)((color >> 16) & 0xffU) * intensity);
   uint32_t b = (uint32_t)fminf(255.0f, (float)((color >> 8) & 0xffU) * intensity);
   uint32_t a = color & 0xffU;
   return rgba8(r, g, b, a);
}

static uint32_t color_with_opacity(uint32_t color, float opacity)
{
   opacity = clamp_float(opacity, 0.0f, 1.0f);
   uint32_t a = (uint32_t)fminf(255.0f, (float)(color & 0xffU) * opacity);
   return (color & 0xffffff00U) | (a & 0xffU);
}

static uint32_t lerp_color(uint32_t top, uint32_t bottom, float t)
{
   t = clamp_float(t, 0.0f, 1.0f);
   uint32_t tr = (top >> 24) & 0xffU;
   uint32_t tg = (top >> 16) & 0xffU;
   uint32_t tb = (top >> 8) & 0xffU;
   uint32_t ta = top & 0xffU;
   uint32_t br = (bottom >> 24) & 0xffU;
   uint32_t bg = (bottom >> 16) & 0xffU;
   uint32_t bb = (bottom >> 8) & 0xffU;
   uint32_t ba = bottom & 0xffU;
   uint32_t r = (uint32_t)((float)tr + ((float)br - (float)tr) * t);
   uint32_t g = (uint32_t)((float)tg + ((float)bg - (float)tg) * t);
   uint32_t b = (uint32_t)((float)tb + ((float)bb - (float)tb) * t);
   uint32_t a = (uint32_t)((float)ta + ((float)ba - (float)ta) * t);
   return rgba8(r, g, b, a);
}

static int allocate_point_light(void)
{
   for (int i = 0; i < NOVA64_MAX_POINT_LIGHTS; i++) {
      if (!point_lights[i].used) {
         point_lights[i].used = true;
         point_lights[i].color = rgba8(255, 255, 255, 255);
         point_lights[i].intensity = 1.0f;
         point_lights[i].distance = 20.0f;
         point_lights[i].position[0] = 0.0f;
         point_lights[i].position[1] = 5.0f;
         point_lights[i].position[2] = 0.0f;
         return i + 1;
      }
   }
   return 0;
}

static struct nova64_point_light *point_light_from_handle(int handle)
{
   if (handle <= 0 || handle > NOVA64_MAX_POINT_LIGHTS)
      return NULL;
   struct nova64_point_light *light = &point_lights[handle - 1];
   return light->used ? light : NULL;
}

static uint16_t read_u16_le(const uint8_t *data)
{
   return (uint16_t)data[0] | ((uint16_t)data[1] << 8);
}

static uint32_t read_u32_le(const uint8_t *data)
{
   return (uint32_t)data[0] | ((uint32_t)data[1] << 8) |
          ((uint32_t)data[2] << 16) | ((uint32_t)data[3] << 24);
}

static bool bytes_equal_name(const uint8_t *name, uint16_t name_len, const char *expected)
{
   size_t expected_len = strlen(expected);
   return name_len == expected_len && memcmp(name, expected, expected_len) == 0;
}

static void reset_scene_state(void)
{
   clear_scene_objects();
   camera_state.position[0] = 0.0f;
   camera_state.position[1] = 1.5f;
   camera_state.position[2] = 6.0f;
   camera_state.target[0] = 0.0f;
   camera_state.target[1] = 0.0f;
   camera_state.target[2] = 0.0f;
   camera_state.fov = 60.0f;
   light_state.ambient = rgba8(48, 48, 56, 255);
   light_state.ambient_intensity = 1.0f;
   light_state.color = rgba8(255, 255, 255, 255);
   light_state.intensity = 1.0f;
   light_state.direction[0] = -0.4f;
   light_state.direction[1] = -0.8f;
   light_state.direction[2] = -0.3f;
   light_state.fog_enabled = false;
   light_state.fog_color = rgba8(0, 0, 0, 255);
   light_state.fog_near = 10.0f;
   light_state.fog_far = 50.0f;
   camera_state.is_ortho = false;
   camera_state.ortho_width = 10.0f;
   camera_state.ortho_height = 5.625f; /* 16:9 at ortho_width=10 */
   sky_color_enabled = false;
   sky_top_color    = 0x000000FFU;
   sky_bottom_color = 0x000000FFU;
   /* Discard any buffered z-sorted sprites from the previous cart */
   for (int _i = 0; _i < sorted_sprite_count; _i++)
      free(sorted_sprites[_i].owned_pixels);
   sorted_sprite_count = 0;
}

static enum nova64_audio_wave audio_wave_from_name(const char *name, enum nova64_audio_wave fallback)
{
   if (!name)
      return fallback;
   if (!strcmp(name, "sine"))
      return NOVA64_AUDIO_SINE;
   if (!strcmp(name, "sawtooth") || !strcmp(name, "saw"))
      return NOVA64_AUDIO_SAWTOOTH;
   if (!strcmp(name, "triangle"))
      return NOVA64_AUDIO_TRIANGLE;
   if (!strcmp(name, "noise"))
      return NOVA64_AUDIO_NOISE;
   if (!strcmp(name, "square"))
      return NOVA64_AUDIO_SQUARE;
   return fallback;
}

static void audio_default_params(struct nova64_sfx_params *params)
{
   params->wave = NOVA64_AUDIO_SQUARE;
   params->freq = 440.0;
   params->dur = 0.2;
   params->vol = 0.5;
   params->sweep = 0.0;
}

static void audio_apply_preset(const char *name, struct nova64_sfx_params *params)
{
   if (!name)
      return;

   if (!strcmp(name, "0")) {
      params->wave = NOVA64_AUDIO_SQUARE;
      params->freq = 880.0;
      params->dur = 0.1;
      params->vol = 0.4;
   } else if (!strcmp(name, "1")) {
      params->wave = NOVA64_AUDIO_SINE;
      params->freq = 220.0;
      params->dur = 0.3;
      params->vol = 0.3;
      params->sweep = -100.0;
   } else if (!strcmp(name, "2")) {
      params->wave = NOVA64_AUDIO_NOISE;
      params->dur = 0.2;
      params->vol = 0.3;
   } else if (!strcmp(name, "jump")) {
      params->wave = NOVA64_AUDIO_SQUARE;
      params->freq = 300.0;
      params->dur = 0.12;
      params->vol = 0.4;
      params->sweep = 200.0;
   } else if (!strcmp(name, "land")) {
      params->wave = NOVA64_AUDIO_NOISE;
      params->dur = 0.08;
      params->vol = 0.3;
   } else if (!strcmp(name, "coin")) {
      params->wave = NOVA64_AUDIO_SINE;
      params->freq = 1046.0;
      params->dur = 0.15;
      params->vol = 0.5;
      params->sweep = 400.0;
   } else if (!strcmp(name, "powerup")) {
      params->wave = NOVA64_AUDIO_SINE;
      params->freq = 440.0;
      params->dur = 0.4;
      params->vol = 0.5;
      params->sweep = 880.0;
   } else if (!strcmp(name, "explosion")) {
      params->wave = NOVA64_AUDIO_NOISE;
      params->dur = 0.4;
      params->vol = 0.8;
   } else if (!strcmp(name, "laser")) {
      params->wave = NOVA64_AUDIO_SQUARE;
      params->freq = 1200.0;
      params->dur = 0.1;
      params->vol = 0.4;
      params->sweep = -800.0;
   } else if (!strcmp(name, "hit")) {
      params->wave = NOVA64_AUDIO_SQUARE;
      params->freq = 200.0;
      params->dur = 0.15;
      params->vol = 0.5;
      params->sweep = -100.0;
   } else if (!strcmp(name, "death")) {
      params->wave = NOVA64_AUDIO_SAWTOOTH;
      params->freq = 440.0;
      params->dur = 0.6;
      params->vol = 0.5;
      params->sweep = -400.0;
   } else if (!strcmp(name, "select")) {
      params->wave = NOVA64_AUDIO_SINE;
      params->freq = 660.0;
      params->dur = 0.08;
      params->vol = 0.3;
   } else if (!strcmp(name, "confirm")) {
      params->wave = NOVA64_AUDIO_SINE;
      params->freq = 880.0;
      params->dur = 0.12;
      params->vol = 0.3;
      params->sweep = 220.0;
   } else if (!strcmp(name, "error")) {
      params->wave = NOVA64_AUDIO_SQUARE;
      params->freq = 180.0;
      params->dur = 0.3;
      params->vol = 0.4;
      params->sweep = -30.0;
   } else if (!strcmp(name, "blip")) {
      params->wave = NOVA64_AUDIO_SQUARE;
      params->freq = 440.0;
      params->dur = 0.06;
      params->vol = 0.3;
   }
}

static bool js_get_number_property(JSContext *ctx, JSValueConst object, const char *name, double *out)
{
   JSValue value = JS_GetPropertyStr(ctx, object, name);
   if (JS_IsUndefined(value) || JS_IsNull(value)) {
      JS_FreeValue(ctx, value);
      return false;
   }
   double number = 0.0;
   bool ok = JS_ToFloat64(ctx, &number, value) == 0;
   JS_FreeValue(ctx, value);
   if (ok)
      *out = number;
   return ok;
}

static void audio_apply_js_options(JSContext *ctx, JSValueConst value, struct nova64_sfx_params *params)
{
   JSValue wave_value = JS_GetPropertyStr(ctx, value, "wave");
   const char *wave_name = JS_ToCString(ctx, wave_value);
   if (wave_name) {
      params->wave = audio_wave_from_name(wave_name, params->wave);
      JS_FreeCString(ctx, wave_name);
   }
   JS_FreeValue(ctx, wave_value);

   js_get_number_property(ctx, value, "freq", &params->freq);
   js_get_number_property(ctx, value, "dur", &params->dur);
   js_get_number_property(ctx, value, "vol", &params->vol);
   js_get_number_property(ctx, value, "sweep", &params->sweep);
}

/* Returns 1-based voice handle, or 0 on failure. */
static int audio_start_sfx(const struct nova64_sfx_params *input)
{
   struct nova64_sfx_params params = *input;
   params.freq = clamp_double(params.freq, 1.0, 20000.0);
   params.dur = clamp_double(params.dur, 0.001, 10.0);
   params.vol = clamp_double(params.vol, 0.0, 1.0);

   size_t slot = 0;
   for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++) {
      if (!audio_voices[i].active) {
         slot = i;
         break;
      }
   }

   struct nova64_audio_voice *voice = &audio_voices[slot];
   memset(voice, 0, sizeof(*voice));
   voice->active = true;
   voice->wave = params.wave;
   voice->freq = params.freq;
   voice->dur = params.dur;
   voice->vol = params.vol;
   voice->sweep = params.sweep;
   voice->total_samples = (size_t)(params.dur * NOVA64_SAMPLE_RATE);
   if (voice->total_samples == 0)
      voice->total_samples = 1;
   voice->noise_state = 0x6e6f7661U ^ (uint32_t)(params.freq * 17.0) ^
      ((uint32_t)voice->total_samples << 1);
   return (int)(slot + 1);
}

static double audio_sample_voice(struct nova64_audio_voice *voice)
{
   if (voice->wave == NOVA64_AUDIO_PCM) {
      if (!voice->pcm_data || voice->pcm_frames == 0) {
         voice->active = false;
         return 0.0;
      }
      size_t frame = (size_t)voice->pcm_pos;
      if (frame >= voice->pcm_frames) {
         if (voice->pcm_loop) {
            voice->pcm_pos = fmod(voice->pcm_pos, (double)voice->pcm_frames);
            frame = (size_t)voice->pcm_pos;
         } else {
            voice->active = false;
            return 0.0;
         }
      }
      /* Simple nearest-neighbor — left channel only for mono or stereo mix */
      size_t ch = voice->pcm_channels > 1 ? voice->pcm_channels : 1;
      double left  = (double)voice->pcm_data[frame * ch] / 32768.0;
      double right = ch > 1 ? (double)voice->pcm_data[frame * ch + 1] / 32768.0 : left;
      double advance = voice->pcm_rate / NOVA64_SAMPLE_RATE;
      if (voice->pitch > 0.01f && voice->pitch != 1.0f)
         advance *= (double)voice->pitch;
      float ch_p = channel_pitch(voice->channel);
      if (ch_p > 0.01f && ch_p != 1.0f)
         advance *= (double)ch_p;
      voice->pcm_pos += advance;
      return ((left + right) * 0.5) * voice->vol * channel_volume(voice->channel);
   }

   double value = 0.0;
   switch (voice->wave) {
      case NOVA64_AUDIO_SINE:
         value = sin(voice->phase * 2.0 * M_PI);
         break;
      case NOVA64_AUDIO_SAWTOOTH:
         value = voice->phase * 2.0 - 1.0;
         break;
      case NOVA64_AUDIO_TRIANGLE:
         value = 1.0 - fabs(voice->phase * 4.0 - 2.0);
         break;
      case NOVA64_AUDIO_NOISE:
         voice->noise_state = voice->noise_state * 1664525U + 1013904223U;
         value = ((double)((voice->noise_state >> 9) & 0x7fffff) / 4194303.5) - 1.0;
         break;
      case NOVA64_AUDIO_SQUARE:
      default:
         value = voice->phase < 0.5 ? 1.0 : -1.0;
         break;
   }

   double t = voice->dur > 0.0 ? (double)voice->elapsed_samples / (voice->dur * NOVA64_SAMPLE_RATE) : 1.0;
   double current_freq = clamp_double(voice->freq + voice->sweep * t, 1.0, 20000.0);
   if (voice->pitch > 0.01f && voice->pitch != 1.0f)
      current_freq = clamp_double(current_freq * (double)voice->pitch, 1.0, 20000.0);
   {
      float ch_p = channel_pitch(voice->channel);
      if (ch_p > 0.01f && ch_p != 1.0f)
         current_freq = clamp_double(current_freq * (double)ch_p, 1.0, 20000.0);
   }
   voice->phase += current_freq / NOVA64_SAMPLE_RATE;
   voice->phase -= floor(voice->phase);
   voice->elapsed_samples++;
   if (voice->elapsed_samples >= voice->total_samples)
      voice->active = false;
   return value * voice->vol * channel_volume(voice->channel);
}

static void audio_mix_frame(void)
{
   if (!audio_batch_cb)
      return;

   for (size_t i = 0; i < NOVA64_AUDIO_FRAME_SAMPLES; i++) {
      double mixed_l = 0.0, mixed_r = 0.0;

      /* Mix voices with per-voice panning */
      for (size_t v = 0; v < NOVA64_AUDIO_MAX_VOICES; v++) {
         if (!audio_voices[v].active) continue;
         double s = audio_sample_voice(&audio_voices[v]);
         double p = (double)audio_voices[v].pan;
         /* Constant-power panning: pan in [-1,+1] */
         double angle = (p + 1.0) * (3.14159265 / 4.0); /* 0..PI/2 */
         mixed_l += s * cos(angle);
         mixed_r += s * sin(angle);
      }

      /* Mix music track (center, no panning) */
      if (music_state.active && !music_state.paused && music_state.pcm_data) {
         size_t mi = (size_t)music_state.pcm_pos;
         if (mi < music_state.pcm_frames) {
            double s0 = (double)music_state.pcm_data[mi * music_state.pcm_channels] / 32768.0;
            double s1 = (mi + 1 < music_state.pcm_frames)
               ? (double)music_state.pcm_data[(mi + 1) * music_state.pcm_channels] / 32768.0
               : s0;
            double frac = music_state.pcm_pos - (double)mi;
            double ms = (s0 + (s1 - s0) * frac) * music_state.vol;
            mixed_l += ms;
            mixed_r += ms;
         }
         music_state.pcm_pos += music_state.pcm_rate / NOVA64_SAMPLE_RATE;
         if ((size_t)music_state.pcm_pos >= music_state.pcm_frames)
            music_state.pcm_pos = 0.0;
      }

      mixed_l = clamp_double(mixed_l * audio_master_volume, -1.0, 1.0);
      mixed_r = clamp_double(mixed_r * audio_master_volume, -1.0, 1.0);

      /* Echo / delay feedback */
      if (echo_delay_frames > 0) {
         int rp = ((int)echo_write_pos - echo_delay_frames + NOVA64_ECHO_BUF_SIZE) % NOVA64_ECHO_BUF_SIZE;
         double old_l = echo_buf[rp * 2 + 0] / 32767.0;
         double old_r = echo_buf[rp * 2 + 1] / 32767.0;
         /* Write feedback (dry + decay*old) into ring buffer */
         echo_buf[echo_write_pos * 2 + 0] = (int16_t)(clamp_double(mixed_l + echo_decay * old_l, -1.0, 1.0) * 32767.0);
         echo_buf[echo_write_pos * 2 + 1] = (int16_t)(clamp_double(mixed_r + echo_decay * old_r, -1.0, 1.0) * 32767.0);
         echo_write_pos = (echo_write_pos + 1) % (size_t)NOVA64_ECHO_BUF_SIZE;
         /* Add wet echo to output */
         mixed_l = clamp_double(mixed_l + echo_wet * old_l, -1.0, 1.0);
         mixed_r = clamp_double(mixed_r + echo_wet * old_r, -1.0, 1.0);
      }

      audio_mix_buffer[i * 2 + 0] = (int16_t)(mixed_l * 32767.0);
      audio_mix_buffer[i * 2 + 1] = (int16_t)(mixed_r * 32767.0);
   }
   audio_batch_cb(audio_mix_buffer, NOVA64_AUDIO_FRAME_SAMPLES);
}

static void reset_audio_state(void)
{
   for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++) {
      if (audio_voices[i].ogg_decoded_data)
         free(audio_voices[i].ogg_decoded_data);
   }
   memset(audio_voices, 0, sizeof(audio_voices));
   memset(audio_mix_buffer, 0, sizeof(audio_mix_buffer));
   audio_master_volume = 0.4;
   if (music_state.ogg_decoded_data)
      free(music_state.ogg_decoded_data);
   memset(&music_state, 0, sizeof(music_state));
   music_state.vol = 1.0f;
   memset(echo_buf, 0, sizeof(echo_buf));
   echo_write_pos = 0;
   echo_delay_frames = 0;
   echo_decay = 0.5f;
   echo_wet   = 0.5f;
   memset(listener_pos, 0, sizeof(listener_pos));
}

static void clear_framebuffer(uint32_t color)
{
   if (!framebuffer)
      return;
   framebuffer_clear_color = color;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++)
      framebuffer[i] = color;
}

static void clear_framebuffer_sky_gradient(void)
{
   if (!framebuffer)
      return;
   framebuffer_clear_color = sky_top_color;
   for (int y = 0; y < NOVA64_HEIGHT; y++) {
      float t = NOVA64_HEIGHT > 1 ? (float)y / (float)(NOVA64_HEIGHT - 1) : 0.0f;
      uint32_t color = lerp_color(sky_top_color, sky_bottom_color, t);
      for (int x = 0; x < NOVA64_WIDTH; x++)
         framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = color;
   }
}

static void set_pixel(int x, int y, uint32_t color)
{
   if (!framebuffer)
      return;
   color = apply_palette_swap(color);
   if (x < 0 || y < 0 || x >= NOVA64_WIDTH || y >= NOVA64_HEIGHT)
      return;
   if (clip_active) {
      if (x < clip_x || y < clip_y || x >= clip_x + clip_w || y >= clip_y + clip_h)
         return;
   }
   if (blend_2d_mode == NOVA64_BLEND_NORMAL) {
      framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = color;
   } else {
      uint32_t dst = framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x];
      uint8_t sr = (color >> 24) & 0xff;
      uint8_t sg = (color >> 16) & 0xff;
      uint8_t sb = (color >>  8) & 0xff;
      uint8_t sa = color & 0xff;
      uint8_t dr = (dst   >> 24) & 0xff;
      uint8_t dg = (dst   >> 16) & 0xff;
      uint8_t db = (dst   >>  8) & 0xff;
      uint8_t nr, ng, nb;
      if (blend_2d_mode == NOVA64_BLEND_ALPHA) {
         uint32_t inv = 255U - sa;
         nr = (uint8_t)(((uint32_t)sr * sa + (uint32_t)dr * inv) / 255U);
         ng = (uint8_t)(((uint32_t)sg * sa + (uint32_t)dg * inv) / 255U);
         nb = (uint8_t)(((uint32_t)sb * sa + (uint32_t)db * inv) / 255U);
      } else if (blend_2d_mode == NOVA64_BLEND_ADDITIVE) {
         nr = (uint8_t)(sr + dr > 255 ? 255 : sr + dr);
         ng = (uint8_t)(sg + dg > 255 ? 255 : sg + dg);
         nb = (uint8_t)(sb + db > 255 ? 255 : sb + db);
      } else if (blend_2d_mode == NOVA64_BLEND_MULTIPLY) {
         nr = (uint8_t)((sr * dr) / 255);
         ng = (uint8_t)((sg * dg) / 255);
         nb = (uint8_t)((sb * db) / 255);
      } else { /* SCREEN */
         nr = (uint8_t)(255 - (((255 - sr) * (255 - dr)) / 255));
         ng = (uint8_t)(255 - (((255 - sg) * (255 - dg)) / 255));
         nb = (uint8_t)(255 - (((255 - sb) * (255 - db)) / 255));
      }
      framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = rgba8(nr, ng, nb, 255);
   }
}

static void draw_line_pixels(int x0, int y0, int x1, int y1, uint32_t color)
{
   int dx = abs(x1 - x0);
   int sx = x0 < x1 ? 1 : -1;
   int dy = -abs(y1 - y0);
   int sy = y0 < y1 ? 1 : -1;
   int err = dx + dy;

   for (;;) {
      set_pixel(x0, y0, color);
      if (x0 == x1 && y0 == y1)
         break;
      int e2 = err * 2;
      if (e2 >= dy) {
         err += dy;
         x0 += sx;
      }
      if (e2 <= dx) {
         err += dx;
         y0 += sy;
      }
   }
}

static void draw_thick_line_pixels(int x0, int y0, int x1, int y1, uint32_t color, int thickness)
{
   if (thickness <= 1) {
      draw_line_pixels(x0, y0, x1, y1, color);
      return;
   }
   int radius = thickness / 2;
   for (int oy = -radius; oy <= radius; oy++) {
      for (int ox = -radius; ox <= radius; ox++) {
         if (ox * ox + oy * oy <= radius * radius)
            draw_line_pixels(x0 + ox, y0 + oy, x1 + ox, y1 + oy, color);
      }
   }
}

static void draw_line_gradient_pixels(int x0, int y0, int x1, int y1,
      uint32_t a, uint32_t b, int thickness)
{
   int dx = abs(x1 - x0);
   int dy = abs(y1 - y0);
   int steps = dx > dy ? dx : dy;
   if (steps <= 0) {
      set_pixel(x0, y0, a);
      return;
   }
   int radius = thickness > 1 ? thickness / 2 : 0;
   for (int i = 0; i <= steps; i++) {
      float t = (float)i / (float)steps;
      int x = (int)lrintf((float)x0 + (float)(x1 - x0) * t);
      int y = (int)lrintf((float)y0 + (float)(y1 - y0) * t);
      uint32_t color = lerp_color(a, b, t);
      if (radius <= 0) {
         set_pixel(x, y, color);
      } else {
         for (int oy = -radius; oy <= radius; oy++)
            for (int ox = -radius; ox <= radius; ox++)
               if (ox * ox + oy * oy <= radius * radius)
                  set_pixel(x + ox, y + oy, color);
      }
   }
}

static void draw_rect_pixels(int x, int y, int w, int h, uint32_t color, bool filled)
{
   if (w < 0) {
      x += w;
      w = -w;
   }
   if (h < 0) {
      y += h;
      h = -h;
   }
   if (w <= 0 || h <= 0)
      return;

   if (filled) {
      for (int yy = 0; yy < h; yy++)
         for (int xx = 0; xx < w; xx++)
            set_pixel(x + xx, y + yy, color);
      return;
   }

   draw_line_pixels(x, y, x + w - 1, y, color);
   draw_line_pixels(x, y + h - 1, x + w - 1, y + h - 1, color);
   draw_line_pixels(x, y, x, y + h - 1, color);
   draw_line_pixels(x + w - 1, y, x + w - 1, y + h - 1, color);
}

static void draw_rect_gradient_pixels(int x, int y, int w, int h, uint32_t a, uint32_t b, bool vertical)
{
   if (w < 0) {
      x += w;
      w = -w;
   }
   if (h < 0) {
      y += h;
      h = -h;
   }
   if (w <= 0 || h <= 0)
      return;
   for (int yy = 0; yy < h; yy++) {
      for (int xx = 0; xx < w; xx++) {
         float denom = (float)((vertical ? h : w) - 1);
         float t = denom > 0.0f ? (float)(vertical ? yy : xx) / denom : 0.0f;
         set_pixel(x + xx, y + yy, lerp_color(a, b, t));
      }
   }
}

static void draw_ellipse_pixels(int cx, int cy, int rx, int ry, uint32_t color, bool filled)
{
   rx = abs(rx);
   ry = abs(ry);
   if (rx <= 0 || ry <= 0)
      return;
   if (filled) {
      for (int y = -ry; y <= ry; y++) {
         float frac = (float)(y * y) / (float)(ry * ry);
         int span = (int)(sqrtf(fmaxf(0.0f, 1.0f - frac)) * (float)rx);
         for (int x = -span; x <= span; x++)
            set_pixel(cx + x, cy + y, color);
      }
      return;
   }
   for (int i = 0; i < 360; i++) {
      float r = (float)i * (float)M_PI / 180.0f;
      int x = cx + (int)lrintf(cosf(r) * (float)rx);
      int y = cy + (int)lrintf(sinf(r) * (float)ry);
      set_pixel(x, y, color);
   }
}

static void draw_triangle_outline_pixels(int x0, int y0, int x1, int y1,
      int x2, int y2, uint32_t color)
{
   draw_line_pixels(x0, y0, x1, y1, color);
   draw_line_pixels(x1, y1, x2, y2, color);
   draw_line_pixels(x2, y2, x0, y0, color);
}

static float edge_function(int ax, int ay, int bx, int by, int px, int py)
{
   return (float)(px - ax) * (float)(by - ay) - (float)(py - ay) * (float)(bx - ax);
}

static void draw_triangle_filled_pixels(int x0, int y0, int x1, int y1,
      int x2, int y2, uint32_t color)
{
   int min_x = x0 < x1 ? (x0 < x2 ? x0 : x2) : (x1 < x2 ? x1 : x2);
   int max_x = x0 > x1 ? (x0 > x2 ? x0 : x2) : (x1 > x2 ? x1 : x2);
   int min_y = y0 < y1 ? (y0 < y2 ? y0 : y2) : (y1 < y2 ? y1 : y2);
   int max_y = y0 > y1 ? (y0 > y2 ? y0 : y2) : (y1 > y2 ? y1 : y2);
   if (min_x < 0) min_x = 0;
   if (min_y < 0) min_y = 0;
   if (max_x >= NOVA64_WIDTH) max_x = NOVA64_WIDTH - 1;
   if (max_y >= NOVA64_HEIGHT) max_y = NOVA64_HEIGHT - 1;
   float area = edge_function(x0, y0, x1, y1, x2, y2);
   if (area == 0.0f)
      return;
   for (int y = min_y; y <= max_y; y++) {
      for (int x = min_x; x <= max_x; x++) {
         float w0 = edge_function(x1, y1, x2, y2, x, y);
         float w1 = edge_function(x2, y2, x0, y0, x, y);
         float w2 = edge_function(x0, y0, x1, y1, x, y);
         if ((w0 >= 0.0f && w1 >= 0.0f && w2 >= 0.0f) ||
               (w0 <= 0.0f && w1 <= 0.0f && w2 <= 0.0f))
            set_pixel(x, y, color);
      }
   }
}

static void draw_round_rect_fill_pixels(int x, int y, int w, int h, int r, uint32_t color)
{
   if (w < 0) { x += w; w = -w; }
   if (h < 0) { y += h; h = -h; }
   if (w <= 0 || h <= 0)
      return;
   r = abs(r);
   int max_r = (w < h ? w : h) / 2;
   if (r > max_r) r = max_r;
   if (r <= 0) {
      draw_rect_pixels(x, y, w, h, color, true);
      return;
   }
   draw_rect_pixels(x + r, y, w - r * 2, h, color, true);
   draw_rect_pixels(x, y + r, r, h - r * 2, color, true);
   draw_rect_pixels(x + w - r, y + r, r, h - r * 2, color, true);
   draw_ellipse_pixels(x + r, y + r, r, r, color, true);
   draw_ellipse_pixels(x + w - r - 1, y + r, r, r, color, true);
   draw_ellipse_pixels(x + r, y + h - r - 1, r, r, color, true);
   draw_ellipse_pixels(x + w - r - 1, y + h - r - 1, r, r, color, true);
}

static void draw_round_rect_outline_pixels(int x, int y, int w, int h, int r, uint32_t color)
{
   if (w < 0) { x += w; w = -w; }
   if (h < 0) { y += h; h = -h; }
   if (w <= 0 || h <= 0)
      return;
   r = abs(r);
   int max_r = (w < h ? w : h) / 2;
   if (r > max_r) r = max_r;
   if (r <= 0) {
      draw_rect_pixels(x, y, w, h, color, false);
      return;
   }
   draw_line_pixels(x + r, y, x + w - r - 1, y, color);
   draw_line_pixels(x + r, y + h - 1, x + w - r - 1, y + h - 1, color);
   draw_line_pixels(x, y + r, x, y + h - r - 1, color);
   draw_line_pixels(x + w - 1, y + r, x + w - 1, y + h - r - 1, color);
   draw_ellipse_pixels(x + r, y + r, r, r, color, false);
   draw_ellipse_pixels(x + w - r - 1, y + r, r, r, color, false);
   draw_ellipse_pixels(x + r, y + h - r - 1, r, r, color, false);
   draw_ellipse_pixels(x + w - r - 1, y + h - r - 1, r, r, color, false);
}

static uint8_t glyph_row(char ch, int row)
{
   static const uint8_t digits[10][7] = {
      {0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e},
      {0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e},
      {0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f},
      {0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e},
      {0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02},
      {0x1f, 0x10, 0x10, 0x1e, 0x01, 0x01, 0x1e},
      {0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e},
      {0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08},
      {0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e},
      {0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c},
   };
   static const uint8_t letters[26][7] = {
      {0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11},
      {0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e},
      {0x0f, 0x10, 0x10, 0x10, 0x10, 0x10, 0x0f},
      {0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e},
      {0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f},
      {0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10},
      {0x0f, 0x10, 0x10, 0x13, 0x11, 0x11, 0x0f},
      {0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11},
      {0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e},
      {0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0e},
      {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11},
      {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f},
      {0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11},
      {0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11},
      {0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e},
      {0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10},
      {0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d},
      {0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11},
      {0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e},
      {0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04},
      {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e},
      {0x11, 0x11, 0x11, 0x11, 0x0a, 0x0a, 0x04},
      {0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11},
      {0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11},
      {0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04},
      {0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f},
   };

   if (row < 0 || row >= 7)
      return 0;
   if (ch >= '0' && ch <= '9')
      return digits[ch - '0'][row];
   if (ch >= 'a' && ch <= 'z')
      ch = (char)(ch - 'a' + 'A');
   if (ch >= 'A' && ch <= 'Z')
      return letters[ch - 'A'][row];
   if (ch == '-')
      return row == 3 ? 0x1f : 0x00;
   if (ch == '.')
      return row == 6 ? 0x04 : 0x00;
   if (ch == ':')
      return row == 2 || row == 5 ? 0x04 : 0x00;
   if (ch == '/')
      return (uint8_t)(0x01 << (6 - row > 4 ? 4 : 6 - row));
   return ch == ' ' ? 0x00 : 0x1f;
}

static void draw_text_pixels(const char *text, int x, int y, uint32_t color)
{
   if (!text)
      return;
   int cursor = x;
   for (const char *p = text; *p; p++) {
      if (*p == '\n') {
         cursor = x;
         y += 9;
         continue;
      }
      for (int row = 0; row < 7; row++) {
         uint8_t bits = glyph_row(*p, row);
         for (int col = 0; col < 5; col++) {
            if (bits & (1U << (4 - col)))
               set_pixel(cursor + col, y + row, color);
         }
      }
      cursor += 6;
   }
}

static int text_pixel_width(const char *text)
{
   if (!text || !text[0])
      return 0;
   int max_w = 0, cur_w = 0;
   for (const char *p = text; *p; p++) {
      if (*p == '\n') {
         if (cur_w > max_w) max_w = cur_w;
         cur_w = 0;
      } else {
         cur_w += 6;
      }
   }
   if (cur_w > max_w) max_w = cur_w;
   return max_w > 0 ? max_w - 1 : 0; /* trim trailing space */
}

static int text_line_count(const char *text)
{
   if (!text || !text[0])
      return 0;
   int lines = 1;
   for (const char *p = text; *p; p++)
      if (*p == '\n')
         lines++;
   return lines;
}

static int text_pixel_height(const char *text)
{
   int lines = text_line_count(text);
   return lines > 0 ? (lines - 1) * 9 + 7 : 0;
}

static void draw_text_aligned(const char *text, int x, int y, uint32_t color, int align)
{
   /* align: 0=left, 1=center, 2=right */
   if (align == 1)
      x -= text_pixel_width(text) / 2;
   else if (align == 2)
      x -= text_pixel_width(text);
   draw_text_pixels(text, x, y, color);
}

static uint32_t get_pixel(int x, int y)
{
   if (!framebuffer || x < 0 || y < 0 || x >= NOVA64_WIDTH || y >= NOVA64_HEIGHT)
      return 0;
   return framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x];
}

static void blit_rgba(const uint8_t *rgba, int img_w, int img_h,
                      int dx, int dy, int sx, int sy, int sw, int sh)
{
   if (!rgba) return;
   for (int row = 0; row < sh; row++) {
      int src_y = sy + row;
      if (src_y < 0 || src_y >= img_h) continue;
      for (int col = 0; col < sw; col++) {
         int src_x = sx + col;
         if (src_x < 0 || src_x >= img_w) continue;
         size_t si = ((size_t)src_y * (size_t)img_w + (size_t)src_x) * 4;
         uint8_t r = rgba[si], g = rgba[si+1], b = rgba[si+2], a = rgba[si+3];
         if (a == 0) continue;
         if (a == 255) {
            set_pixel(dx + col, dy + row, rgba8(r, g, b, 255));
         } else {
            /* Alpha blend over existing pixel */
            uint32_t dst = get_pixel(dx + col, dy + row);
            uint8_t dr = (uint8_t)((dst >> 24) & 0xff);
            uint8_t dg = (uint8_t)((dst >> 16) & 0xff);
            uint8_t db = (uint8_t)((dst >>  8) & 0xff);
            float fa = (float)a / 255.0f;
            uint8_t or2 = (uint8_t)(r * fa + dr * (1.0f - fa));
            uint8_t og  = (uint8_t)(g * fa + dg * (1.0f - fa));
            uint8_t ob  = (uint8_t)(b * fa + db * (1.0f - fa));
            set_pixel(dx + col, dy + row, rgba8(or2, og, ob, 255));
         }
      }
   }
}

static void draw_circle_pixels(int cx, int cy, int r, uint32_t color, bool filled)
{
   if (r < 0) return;
   int x = 0, y = r, d = 1 - r;
   while (x <= y) {
      if (filled) {
         for (int i = cx - y; i <= cx + y; i++) { set_pixel(i, cy - x, color); set_pixel(i, cy + x, color); }
         for (int i = cx - x; i <= cx + x; i++) { set_pixel(i, cy - y, color); set_pixel(i, cy + y, color); }
      } else {
         set_pixel(cx + x, cy - y, color); set_pixel(cx - x, cy - y, color);
         set_pixel(cx + x, cy + y, color); set_pixel(cx - x, cy + y, color);
         set_pixel(cx + y, cy - x, color); set_pixel(cx - y, cy - x, color);
         set_pixel(cx + y, cy + x, color); set_pixel(cx - y, cy + x, color);
      }
      if (d < 0) d += 2 * x + 3;
      else { d += 2 * (x - y) + 5; y--; }
      x++;
   }
}

static uint32_t shade_color(uint32_t color, float amount)
{
   if (amount < 0.0f)
      amount = 0.0f;
   if (amount > 2.0f)
      amount = 2.0f;
   uint32_t r = (uint32_t)fminf(255.0f, (float)((color >> 24) & 0xffU) * amount);
   uint32_t g = (uint32_t)fminf(255.0f, (float)((color >> 16) & 0xffU) * amount);
   uint32_t b = (uint32_t)fminf(255.0f, (float)((color >> 8) & 0xffU) * amount);
   uint32_t a = color & 0xffU;
   return rgba8(r, g, b, a);
}

static bool scene_has_visible_meshes(void)
{
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (meshes[i].used && meshes[i].visible && meshes[i].opacity > 0.0f)
         return true;
   }
   return false;
}

static void normalize3(float v[3])
{
   float length = sqrtf(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
   if (length <= 0.00001f) {
      v[0] = 0.0f;
      v[1] = 0.0f;
      v[2] = 1.0f;
      return;
   }
   v[0] /= length;
   v[1] /= length;
   v[2] /= length;
}

static void cross3(const float a[3], const float b[3], float out[3])
{
   out[0] = a[1] * b[2] - a[2] * b[1];
   out[1] = a[2] * b[0] - a[0] * b[2];
   out[2] = a[0] * b[1] - a[1] * b[0];
}

static float dot3(const float a[3], const float b[3])
{
   return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

static void rotate_xyz(const float input[3], const float rotation[3], float out[3])
{
   float cx = cosf(rotation[0]);
   float sx = sinf(rotation[0]);
   float cy = cosf(rotation[1]);
   float sy = sinf(rotation[1]);
   float cz = cosf(rotation[2]);
   float sz = sinf(rotation[2]);

   float x = input[0];
   float y = input[1] * cx - input[2] * sx;
   float z = input[1] * sx + input[2] * cx;

   float x2 = x * cy + z * sy;
   float z2 = -x * sy + z * cy;
   float y2 = y;

   out[0] = x2 * cz - y2 * sz;
   out[1] = x2 * sz + y2 * cz;
   out[2] = z2;
}

static bool project_world_point(const float world[3], int *sx, int *sy, float *depth)
{
   float forward[3] = {
      camera_state.target[0] - camera_state.position[0],
      camera_state.target[1] - camera_state.position[1],
      camera_state.target[2] - camera_state.position[2],
   };
   normalize3(forward);

   float world_up[3] = {0.0f, 1.0f, 0.0f};
   float right[3];
   cross3(forward, world_up, right);
   normalize3(right);
   float up[3];
   cross3(right, forward, up);
   normalize3(up);

   float rel[3] = {
      world[0] - camera_state.position[0],
      world[1] - camera_state.position[1],
      world[2] - camera_state.position[2],
   };
   float view_x = dot3(rel, right);
   float view_y = dot3(rel, up);
   float view_z = dot3(rel, forward);
   if (view_z <= 0.05f)
      return false;

   float fov = camera_state.fov;
   if (fov < 15.0f)
      fov = 15.0f;
   if (fov > 120.0f)
      fov = 120.0f;
   float focal = ((float)NOVA64_HEIGHT * 0.5f) / tanf((fov * 0.5f) * (float)M_PI / 180.0f);
   *sx = (int)((float)NOVA64_WIDTH * 0.5f + view_x * focal / view_z);
   *sy = (int)((float)NOVA64_HEIGHT * 0.5f - view_y * focal / view_z);
   if (depth)
      *depth = view_z;
   return true;
}

static void mesh_local_to_world(const struct nova64_mesh *mesh, const float local[3], float world[3])
{
   float scaled[3] = {
      local[0] * mesh->scale[0],
      local[1] * mesh->scale[1],
      local[2] * mesh->scale[2],
   };
   float rotated[3];
   rotate_xyz(scaled, mesh->rotation, rotated);
   world[0] = rotated[0] + mesh->position[0];
   world[1] = rotated[1] + mesh->position[1];
   world[2] = rotated[2] + mesh->position[2];
}

static void mat4_identity(float m[16])
{
   memset(m, 0, sizeof(float) * 16);
   m[0] = 1.0f;
   m[5] = 1.0f;
   m[10] = 1.0f;
   m[15] = 1.0f;
}

static void mat4_multiply(float out[16], const float a[16], const float b[16])
{
   float r[16];
   for (int col = 0; col < 4; col++) {
      for (int row = 0; row < 4; row++) {
         r[col * 4 + row] =
            a[0 * 4 + row] * b[col * 4 + 0] +
            a[1 * 4 + row] * b[col * 4 + 1] +
            a[2 * 4 + row] * b[col * 4 + 2] +
            a[3 * 4 + row] * b[col * 4 + 3];
      }
   }
   memcpy(out, r, sizeof(r));
}

static void mat4_perspective(float out[16], float fov_degrees, float aspect, float near_z, float far_z)
{
   float fov = fov_degrees;
   if (fov < 15.0f)
      fov = 15.0f;
   if (fov > 120.0f)
      fov = 120.0f;
   float f = 1.0f / tanf((fov * 0.5f) * (float)M_PI / 180.0f);
   memset(out, 0, sizeof(float) * 16);
   out[0] = f / aspect;
   out[5] = f;
   out[10] = (far_z + near_z) / (near_z - far_z);
   out[11] = -1.0f;
   out[14] = (2.0f * far_z * near_z) / (near_z - far_z);
}

static void mat4_ortho(float out[16], float left, float right, float bottom, float top, float near_z, float far_z)
{
   memset(out, 0, sizeof(float) * 16);
   out[0]  =  2.0f / (right - left);
   out[5]  =  2.0f / (top - bottom);
   out[10] = -2.0f / (far_z - near_z);
   out[12] = -(right + left) / (right - left);
   out[13] = -(top + bottom) / (top - bottom);
   out[14] = -(far_z + near_z) / (far_z - near_z);
   out[15] =  1.0f;
}

static void mat4_look_at(float out[16], const float eye[3], const float target[3], const float up_hint[3])
{
   float f[3] = {target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]};
   normalize3(f);
   float up[3] = {up_hint[0], up_hint[1], up_hint[2]};
   normalize3(up);
   float s[3];
   cross3(f, up, s);
   normalize3(s);
   float u[3];
   cross3(s, f, u);

   mat4_identity(out);
   out[0] = s[0];
   out[4] = s[1];
   out[8] = s[2];
   out[1] = u[0];
   out[5] = u[1];
   out[9] = u[2];
   out[2] = -f[0];
   out[6] = -f[1];
   out[10] = -f[2];
   out[12] = -dot3(s, eye);
   out[13] = -dot3(u, eye);
   out[14] = dot3(f, eye);
}

static void mat4_from_mesh(float out[16], const struct nova64_mesh *mesh)
{
   float cx = cosf(mesh->rotation[0]);
   float sx = sinf(mesh->rotation[0]);
   float cy = cosf(mesh->rotation[1]);
   float sy = sinf(mesh->rotation[1]);
   float cz = cosf(mesh->rotation[2]);
   float sz = sinf(mesh->rotation[2]);

   float rx[16] = {
      1, 0, 0, 0,
      0, cx, sx, 0,
      0, -sx, cx, 0,
      0, 0, 0, 1,
   };
   float ry[16] = {
      cy, 0, -sy, 0,
      0, 1, 0, 0,
      sy, 0, cy, 0,
      0, 0, 0, 1,
   };
   float rz[16] = {
      cz, sz, 0, 0,
      -sz, cz, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
   };
   float scale[16];
   mat4_identity(scale);
   scale[0] = mesh->scale[0];
   scale[5] = mesh->scale[1];
   scale[10] = mesh->scale[2];

   float tmp1[16];
   float tmp2[16];
   float tmp3[16];
   mat4_multiply(tmp1, rx, scale);
   mat4_multiply(tmp2, ry, tmp1);
   mat4_multiply(tmp3, rz, tmp2);
   memcpy(out, tmp3, sizeof(tmp3));
   out[12] = mesh->position[0];
   out[13] = mesh->position[1];
   out[14] = mesh->position[2];
}

/* Build world transform by composing parent chain (max depth 16 for cycle protection) */
static void mat4_world_transform(float out[16], const struct nova64_mesh *mesh)
{
   mat4_from_mesh(out, mesh);
   int depth = 0;
   int ph = mesh->parent_handle;
   while (ph > 0 && ph <= NOVA64_MAX_MESHES && depth < 16) {
      const struct nova64_mesh *parent = &meshes[ph - 1];
      if (!parent->used) break;
      float parent_mat[16];
      mat4_from_mesh(parent_mat, parent);
      float tmp[16];
      mat4_multiply(tmp, parent_mat, out);
      memcpy(out, tmp, sizeof(tmp));
      ph = parent->parent_handle;
      depth++;
   }
}

/* Standard 4×4 matrix inverse via cofactor/adjugate expansion.
   Column-major layout (same convention as the rest of the engine).
   Returns identity if the determinant is ~zero. */
static void mat4_inverse(float out[16], const float m[16])
{
   float t[16];
   t[ 0] =  m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15]
           + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
   t[ 4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15]
           - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
   t[ 8] =  m[4]*m[9]*m[15]  - m[4]*m[11]*m[13] - m[8]*m[5]*m[15]
           + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
   t[12] = -m[4]*m[9]*m[14]  + m[4]*m[10]*m[13] + m[8]*m[5]*m[14]
           - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
   t[ 1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15]
           - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
   t[ 5] =  m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15]
           + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
   t[ 9] = -m[0]*m[9]*m[15]  + m[0]*m[11]*m[13] + m[8]*m[1]*m[15]
           - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
   t[13] =  m[0]*m[9]*m[14]  - m[0]*m[10]*m[13] - m[8]*m[1]*m[14]
           + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
   t[ 2] =  m[1]*m[6]*m[15]  - m[1]*m[7]*m[14]  - m[5]*m[2]*m[15]
           + m[5]*m[3]*m[14] + m[13]*m[2]*m[7]  - m[13]*m[3]*m[6];
   t[ 6] = -m[0]*m[6]*m[15]  + m[0]*m[7]*m[14]  + m[4]*m[2]*m[15]
           - m[4]*m[3]*m[14] - m[12]*m[2]*m[7]  + m[12]*m[3]*m[6];
   t[10] =  m[0]*m[5]*m[15]  - m[0]*m[7]*m[13]  - m[4]*m[1]*m[15]
           + m[4]*m[3]*m[13] + m[12]*m[1]*m[7]  - m[12]*m[3]*m[5];
   t[14] = -m[0]*m[5]*m[14]  + m[0]*m[6]*m[13]  + m[4]*m[1]*m[14]
           - m[4]*m[2]*m[13] - m[12]*m[1]*m[6]  + m[12]*m[2]*m[5];
   t[ 3] = -m[1]*m[6]*m[11]  + m[1]*m[7]*m[10]  + m[5]*m[2]*m[11]
           - m[5]*m[3]*m[10] - m[9]*m[2]*m[7]   + m[9]*m[3]*m[6];
   t[ 7] =  m[0]*m[6]*m[11]  - m[0]*m[7]*m[10]  - m[4]*m[2]*m[11]
           + m[4]*m[3]*m[10] + m[8]*m[2]*m[7]   - m[8]*m[3]*m[6];
   t[11] = -m[0]*m[5]*m[11]  + m[0]*m[7]*m[9]   + m[4]*m[1]*m[11]
           - m[4]*m[3]*m[9]  - m[8]*m[1]*m[7]   + m[8]*m[3]*m[5];
   t[15] =  m[0]*m[5]*m[10]  - m[0]*m[6]*m[9]   - m[4]*m[1]*m[10]
           + m[4]*m[2]*m[9]  + m[8]*m[1]*m[6]   - m[8]*m[2]*m[5];

   float det = m[0]*t[0] + m[1]*t[4] + m[2]*t[8] + m[3]*t[12];
   if (det > -1e-8f && det < 1e-8f) {
      mat4_identity(out);
      return;
   }
   float inv_det = 1.0f / det;
   for (int i = 0; i < 16; i++)
      out[i] = t[i] * inv_det;
}

static void mat3_normal_from_mesh(float out[9], const struct nova64_mesh *mesh)
{
   struct nova64_mesh rotation_only = *mesh;
   rotation_only.position[0] = 0.0f;
   rotation_only.position[1] = 0.0f;
   rotation_only.position[2] = 0.0f;
   rotation_only.scale[0] = 1.0f;
   rotation_only.scale[1] = 1.0f;
   rotation_only.scale[2] = 1.0f;

   float rotation[16];
   mat4_from_mesh(rotation, &rotation_only);
   out[0] = rotation[0];
   out[1] = rotation[1];
   out[2] = rotation[2];
   out[3] = rotation[4];
   out[4] = rotation[5];
   out[5] = rotation[6];
   out[6] = rotation[8];
   out[7] = rotation[9];
   out[8] = rotation[10];
}

static float edge2d(float ax, float ay, float bx, float by, float cx, float cy)
{
   return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
}

static void draw_filled_quad(const int points[4][2], uint32_t color)
{
   int min_x = points[0][0];
   int max_x = points[0][0];
   int min_y = points[0][1];
   int max_y = points[0][1];
   for (int i = 1; i < 4; i++) {
      if (points[i][0] < min_x) min_x = points[i][0];
      if (points[i][0] > max_x) max_x = points[i][0];
      if (points[i][1] < min_y) min_y = points[i][1];
      if (points[i][1] > max_y) max_y = points[i][1];
   }

   min_x -= 1;
   min_y -= 1;
   max_x += 1;
   max_y += 1;
   if (min_x < 0) min_x = 0;
   if (min_y < 0) min_y = 0;
   if (max_x >= NOVA64_WIDTH) max_x = NOVA64_WIDTH - 1;
   if (max_y >= NOVA64_HEIGHT) max_y = NOVA64_HEIGHT - 1;

   for (int y = min_y; y <= max_y; y++) {
      for (int x = min_x; x <= max_x; x++) {
         float px = (float)x + 0.5f;
         float py = (float)y + 0.5f;
         bool has_positive = false;
         bool has_negative = false;
         for (int i = 0; i < 4; i++) {
            const int *a = points[i];
            const int *b = points[(i + 1) & 3];
            float edge = edge2d((float)a[0], (float)a[1], (float)b[0], (float)b[1], px, py);
            if (edge > 0.01f)
               has_positive = true;
            if (edge < -0.01f)
               has_negative = true;
            if (has_positive && has_negative)
               break;
         }
         if (!(has_positive && has_negative))
            set_pixel(x, y, color);
      }
   }
}

static uint32_t lit_face_color(uint32_t base, const float a[3], const float b[3], const float c[3])
{
   float ab[3] = {b[0] - a[0], b[1] - a[1], b[2] - a[2]};
   float ac[3] = {c[0] - a[0], c[1] - a[1], c[2] - a[2]};
   float normal[3];
   cross3(ab, ac, normal);
   normalize3(normal);

   float light[3] = {
      -light_state.direction[0],
      -light_state.direction[1],
      -light_state.direction[2],
   };
   normalize3(light);

   float diffuse = dot3(normal, light);
   if (diffuse < 0.0f)
      diffuse = -diffuse * 0.35f;
   float shade = 0.62f + diffuse * 0.32f;
   return shade_color(base, shade);
}

static void draw_software_cube(const struct nova64_mesh *mesh)
{
   static const float vertices[8][3] = {
      {-0.5f, -0.5f, -0.5f}, {0.5f, -0.5f, -0.5f}, {0.5f, 0.5f, -0.5f}, {-0.5f, 0.5f, -0.5f},
      {-0.5f, -0.5f, 0.5f},  {0.5f, -0.5f, 0.5f},  {0.5f, 0.5f, 0.5f},  {-0.5f, 0.5f, 0.5f},
   };
   static const int faces[6][4] = {
      {0, 1, 2, 3},
      {4, 7, 6, 5},
      {0, 4, 5, 1},
      {3, 2, 6, 7},
      {1, 5, 6, 2},
      {0, 3, 7, 4},
   };
   float world[8][3];
   int screen[8][2];
   float depths[8];
   bool visible[8];
   for (int i = 0; i < 8; i++) {
      mesh_local_to_world(mesh, vertices[i], world[i]);
      visible[i] = project_world_point(world[i], &screen[i][0], &screen[i][1], &depths[i]);
   }

   struct cube_face_order {
      int index;
      float depth;
   } order[6];
   for (int i = 0; i < 6; i++) {
      order[i].index = i;
      order[i].depth = 0.0f;
      for (int j = 0; j < 4; j++)
         order[i].depth += depths[faces[i][j]];
      order[i].depth *= 0.25f;
   }
   for (int i = 0; i < 5; i++) {
      for (int j = i + 1; j < 6; j++) {
         if (order[i].depth < order[j].depth) {
            struct cube_face_order tmp = order[i];
            order[i] = order[j];
            order[j] = tmp;
         }
      }
   }

   for (int i = 0; i < 6; i++) {
      const int *face = faces[order[i].index];
      if (!visible[face[0]] || !visible[face[1]] || !visible[face[2]] || !visible[face[3]])
         continue;
      uint32_t face_color = color_add_emissive(
            lit_face_color(color_with_opacity(mesh->color, mesh->opacity), world[face[0]], world[face[1]], world[face[2]]),
            mesh->emissive_color, mesh->emissive_intensity);
      int quad[4][2] = {
         {screen[face[0]][0], screen[face[0]][1]},
         {screen[face[1]][0], screen[face[1]][1]},
         {screen[face[2]][0], screen[face[2]][1]},
         {screen[face[3]][0], screen[face[3]][1]},
      };
      draw_filled_quad(quad, face_color);
   }
}

static void draw_software_plane(const struct nova64_mesh *mesh)
{
   static const float corners[] = {
      -0.5f, 0.0f, -0.5f,
       0.5f, 0.0f, -0.5f,
       0.5f, 0.0f,  0.5f,
      -0.5f, 0.0f,  0.5f,
   };

   int screen[4][2];
   bool visible = true;
   for (int i = 0; i < 4; i++) {
      float world[3];
      mesh_local_to_world(mesh, &corners[i * 3], world);
      if (!project_world_point(world, &screen[i][0], &screen[i][1], NULL)) {
         visible = false;
         break;
      }
   }
   if (!visible)
      return;

   draw_filled_quad(screen, color_add_emissive(
      shade_color(color_with_opacity(mesh->color, mesh->opacity), 0.72f),
      mesh->emissive_color, mesh->emissive_intensity));
}

static void draw_software_sphere(const struct nova64_mesh *mesh)
{
   float center[3];
   mesh_local_to_world(mesh, (float[3]){0.0f, 0.0f, 0.0f}, center);
   int sx = 0;
   int sy = 0;
   float depth = 1.0f;
   if (!project_world_point(center, &sx, &sy, &depth))
      return;

   float radius_scale = (fabsf(mesh->scale[0]) + fabsf(mesh->scale[1]) + fabsf(mesh->scale[2])) / 3.0f;
   float focal = ((float)NOVA64_HEIGHT * 0.5f) / tanf((camera_state.fov * 0.5f) * (float)M_PI / 180.0f);
   int radius = (int)(radius_scale * 0.5f * focal / depth);
   if (radius < 2)
      radius = 2;
   uint32_t base_color = color_with_opacity(mesh->color, mesh->opacity);
   uint32_t color = color_add_emissive(shade_color(base_color, 1.15f), mesh->emissive_color, mesh->emissive_intensity);
   uint32_t highlight = color_add_emissive(shade_color(base_color, 1.25f), mesh->emissive_color, mesh->emissive_intensity);
   for (int y = -radius; y <= radius; y++) {
      int span = (int)sqrtf((float)(radius * radius - y * y));
      for (int x = -span; x <= span; x++) {
         float nx = radius > 0 ? (float)x / (float)radius : 0.0f;
         float ny = radius > 0 ? (float)y / (float)radius : 0.0f;
         float light = 0.78f + (-nx * 0.25f) + (-ny * 0.18f);
         uint32_t shaded = shade_color(color, light);
         set_pixel(sx + x, sy + y, shaded);
      }
   }
   int gleam = radius / 4;
   if (gleam < 2)
      gleam = 2;
   for (int y = -gleam; y <= gleam; y++) {
      int span = (int)sqrtf((float)(gleam * gleam - y * y));
      for (int x = -span; x <= span; x++)
         set_pixel(sx - radius / 3 + x, sy - radius / 3 + y, highlight);
   }
}

/* Capsule: scale[0]=scale[2]=diameter, scale[1]=total height */
static void draw_software_capsule(const struct nova64_mesh *mesh)
{
   float center[3];
   mesh_local_to_world(mesh, (float[3]){0.0f, 0.0f, 0.0f}, center);
   int sx = 0, sy = 0;
   float depth = 1.0f;
   if (!project_world_point(center, &sx, &sy, &depth))
      return;

   float radius_world = fabsf(mesh->scale[0]) * 0.5f;
   float half_height  = fabsf(mesh->scale[1]) * 0.5f;
   float focal = ((float)NOVA64_HEIGHT * 0.5f) / tanf((camera_state.fov * 0.5f) * (float)M_PI / 180.0f);
   int r  = (int)(radius_world * focal / depth);
   int hh = (int)(half_height  * focal / depth);
   if (r < 2) r = 2;
   if (hh < r) hh = r;

   uint32_t base_color = color_with_opacity(mesh->color, mesh->opacity);
   uint32_t color = color_add_emissive(shade_color(base_color, 1.10f), mesh->emissive_color, mesh->emissive_intensity);

   /* Body rectangle */
   int body_top    = sy - hh + r;
   int body_bottom = sy + hh - r;
   for (int py = body_top; py <= body_bottom; py++) {
      for (int px = sx - r; px <= sx + r; px++) {
         float nx = r > 0 ? (float)(px - sx) / (float)r : 0.0f;
         float light = 0.78f + (-nx * 0.25f);
         set_pixel(px, py, shade_color(color, light));
      }
   }
   /* Top cap */
   for (int y = -r; y <= 0; y++) {
      int span = (int)sqrtf((float)(r * r - y * y));
      for (int x = -span; x <= span; x++) {
         float nx = r > 0 ? (float)x / (float)r : 0.0f;
         float light = 0.78f + (-nx * 0.25f) + 0.1f;
         set_pixel(sx + x, body_top + y, shade_color(color, light));
      }
   }
   /* Bottom cap */
   for (int y = 0; y <= r; y++) {
      int span = (int)sqrtf((float)(r * r - y * y));
      for (int x = -span; x <= span; x++) {
         float nx = r > 0 ? (float)x / (float)r : 0.0f;
         float light = 0.78f + (-nx * 0.25f) - 0.1f;
         set_pixel(sx + x, body_bottom + y, shade_color(color, light));
      }
   }
}

/* Cylinder: scale[0]=2*radiusTop, scale[2]=2*radiusBottom, scale[1]=height */
static void draw_software_cylinder(const struct nova64_mesh *mesh)
{
   float center[3];
   mesh_local_to_world(mesh, (float[3]){0.0f, 0.0f, 0.0f}, center);
   int sx = 0, sy = 0;
   float depth = 1.0f;
   if (!project_world_point(center, &sx, &sy, &depth))
      return;

   float r_top    = fabsf(mesh->scale[0]) * 0.5f;
   float r_bottom = fabsf(mesh->scale[2]) * 0.5f;
   float half_h   = fabsf(mesh->scale[1]) * 0.5f;
   float focal = ((float)NOVA64_HEIGHT * 0.5f) / tanf((camera_state.fov * 0.5f) * (float)M_PI / 180.0f);
   int rt = (int)(r_top    * focal / depth);
   int rb = (int)(r_bottom * focal / depth);
   int sh = (int)(half_h   * focal / depth);
   if (rt < 1) rt = 1;
   if (rb < 1) rb = 1;
   if (sh < 1) sh = 1;

   uint32_t base_color = color_with_opacity(mesh->color, mesh->opacity);
   uint32_t color = color_add_emissive(shade_color(base_color, 1.10f), mesh->emissive_color, mesh->emissive_intensity);

   /* Draw body as a trapezoid */
   for (int row = -sh; row <= sh; row++) {
      float t = (sh > 0) ? (float)(row + sh) / (float)(2 * sh) : 0.5f;
      int half_w = (int)(rt + (rb - rt) * t);
      if (half_w < 1) half_w = 1;
      for (int px = sx - half_w; px <= sx + half_w; px++) {
         float nx = half_w > 0 ? (float)(px - sx) / (float)half_w : 0.0f;
         float light = 0.78f + (-nx * 0.30f);
         set_pixel(px, sy + row, shade_color(color, light));
      }
   }
   /* Top ellipse outline */
   {
      int ell_b = rt / 3 + 1;
      for (int px = -rt; px <= rt; px++) {
         float frac = (rt > 0) ? (float)px / (float)rt : 0.0f;
         int ey = (int)(sqrtf(1.0f - frac * frac) * (float)ell_b);
         set_pixel(sx + px, sy - sh - ey, shade_color(color, 1.2f));
         set_pixel(sx + px, sy - sh + ey, shade_color(color, 0.9f));
      }
   }
}

static void render_software_scene(void)
{
   bool has_visible_meshes = scene_has_visible_meshes();
   if (!has_visible_meshes && !sky_color_enabled)
      return;

   drawing_scene_preview = true;
   if (sky_color_enabled)
      clear_framebuffer_sky_gradient();
   if (!has_visible_meshes) {
      drawing_scene_preview = false;
      return;
   }
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      const struct nova64_mesh *mesh = &meshes[i];
      if (!mesh->used || !mesh->visible || mesh->opacity <= 0.0f)
         continue;
      switch (mesh->type) {
         case NOVA64_MESH_CUBE:
            draw_software_cube(mesh);
            break;
         case NOVA64_MESH_SPHERE:
            draw_software_sphere(mesh);
            break;
         case NOVA64_MESH_PLANE:
            draw_software_plane(mesh);
            break;
         case NOVA64_MESH_CAPSULE:
            draw_software_capsule(mesh);
            break;
         case NOVA64_MESH_CYLINDER:
            draw_software_cylinder(mesh);
            break;
         case NOVA64_MESH_CUSTOM:
            /* software preview: draw a sphere proxy at mesh origin */
            draw_software_sphere(mesh);
            break;
         case NOVA64_MESH_INSTANCED: {
            /* Software fallback: draw a proxy cube at each instance's translation */
            for (int j = 0; j < mesh->instance_count; j++) {
               const float *m = mesh->instance_transforms + j * 16;
               struct nova64_mesh proxy = *mesh;
               proxy.type = NOVA64_MESH_CUBE;
               proxy.position[0] = m[12];
               proxy.position[1] = m[13];
               proxy.position[2] = m[14];
               /* scale from column vector lengths */
               proxy.scale[0] = sqrtf(m[0]*m[0] + m[1]*m[1] + m[2]*m[2]);
               proxy.scale[1] = sqrtf(m[4]*m[4] + m[5]*m[5] + m[6]*m[6]);
               proxy.scale[2] = sqrtf(m[8]*m[8] + m[9]*m[9] + m[10]*m[10]);
               proxy.instance_count = 0;
               proxy.instance_transforms = NULL;
               draw_software_cube(&proxy);
            }
            break;
         }
         default:
            break;
      }
   }
   drawing_scene_preview = false;
}

static const char *mesh_type_name(enum nova64_mesh_type type)
{
   switch (type) {
      case NOVA64_MESH_CUBE:
         return "cube";
      case NOVA64_MESH_SPHERE:
         return "sphere";
      case NOVA64_MESH_PLANE:
         return "plane";
      case NOVA64_MESH_CAPSULE:
         return "capsule";
      case NOVA64_MESH_CYLINDER:
         return "cylinder";
      case NOVA64_MESH_CUSTOM:
         return "custom";
      case NOVA64_MESH_INSTANCED:
         return "instanced";
      default:
         return "none";
   }
}

static size_t count_overlay_pixels(void)
{
   if (!framebuffer)
      return 0;

   size_t count = 0;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t color = framebuffer[i];
      uint8_t alpha = (uint8_t)(color & 0xffU);
      if (color != framebuffer_clear_color && alpha)
         count++;
   }
   return count;
}

static void write_renderer_command_log(void)
{
   if (!renderer_command_log_path[0])
      return;

   FILE *file = fopen(renderer_command_log_path, "ab");
   if (!file) {
      renderer_command_log_path[0] = '\0';
      nova64_log_line(RETRO_LOG_WARN, "[nova64] disabled renderer command log after open failure");
      return;
   }

   fprintf(file, "frame=%llu\n", (unsigned long long)frame_count);
   fprintf(file, "renderer preference=%s hardware_gles_requested=%d hardware_gles_active=%d\n",
         renderer_backend_name(renderer_preference), gles.requested ? 1 : 0, gles.active ? 1 : 0);
   if (package_manifest_name[0] || package_manifest_main[0] || package_manifest_asset_count) {
      fprintf(file, "package name=\"%s\" main=\"%s\" asset_count=%zu missing_assets=%zu asset_bytes=%zu\n",
            package_manifest_name, package_manifest_main, package_manifest_asset_count,
            package_manifest_missing_asset_count, package_manifest_asset_bytes);
   }
   fprintf(file, "camera position=%.4f,%.4f,%.4f target=%.4f,%.4f,%.4f fov=%.4f\n",
         camera_state.position[0], camera_state.position[1], camera_state.position[2],
         camera_state.target[0], camera_state.target[1], camera_state.target[2],
         camera_state.fov);
   fprintf(file,
         "light ambient=%08x ambient_intensity=%.4f color=%08x intensity=%.4f direction=%.4f,%.4f,%.4f fog=%d fog_color=%08x fog_near=%.4f fog_far=%.4f\n",
         light_state.ambient, light_state.ambient_intensity, light_state.color, light_state.intensity,
         light_state.direction[0], light_state.direction[1], light_state.direction[2],
         light_state.fog_enabled ? 1 : 0, light_state.fog_color,
         light_state.fog_near, light_state.fog_far);
   fprintf(file, "overlay clear=%08x visible_pixels=%zu\n",
         framebuffer_clear_color, count_overlay_pixels());
   fprintf(file,
         "post crt=%d vignette=%.4f pixelate=%d bloom=%.4f chromatic=%.4f colorgrade=%.4f,%.4f,%.4f posterize=%d\n",
         post_state.crt_enabled ? 1 : 0, post_state.vignette, post_state.pixelate,
         post_state.bloom, post_state.chromatic,
         post_state.color_grade[0], post_state.color_grade[1], post_state.color_grade[2],
         post_state.posterize);

   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      const struct nova64_mesh *mesh = &meshes[i];
      if (!mesh->used)
         continue;
      fprintf(file,
            "mesh id=%d type=%s visible=%d opacity=%.4f flat=%d cast_shadow=%d receive_shadow=%d color=%08x emissive=%08x emissive_intensity=%.4f position=%.4f,%.4f,%.4f rotation=%.4f,%.4f,%.4f scale=%.4f,%.4f,%.4f\n",
            i + 1, mesh_type_name(mesh->type), mesh->visible ? 1 : 0, mesh->opacity,
            mesh->flat_shading ? 1 : 0, mesh->cast_shadow ? 1 : 0,
            mesh->receive_shadow ? 1 : 0, mesh->color,
            mesh->emissive_color, mesh->emissive_intensity,
            mesh->position[0], mesh->position[1], mesh->position[2],
            mesh->rotation[0], mesh->rotation[1], mesh->rotation[2],
            mesh->scale[0], mesh->scale[1], mesh->scale[2]);
   }
   for (int i = 0; i < NOVA64_MAX_POINT_LIGHTS; i++) {
      const struct nova64_point_light *light = &point_lights[i];
      if (!light->used)
         continue;
      fprintf(file,
            "point_light id=%d color=%08x intensity=%.4f distance=%.4f position=%.4f,%.4f,%.4f\n",
            i + 1, light->color, light->intensity, light->distance,
            light->position[0], light->position[1], light->position[2]);
   }
   fprintf(file, "\n");
   fclose(file);
}

static void convert_framebuffer_to_rgb565(void)
{
   if (!framebuffer || !rgb565_framebuffer)
      return;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t color = framebuffer[i];
      uint16_t r = (uint16_t)((color >> 24) & 0xffU);
      uint16_t g = (uint16_t)((color >> 16) & 0xffU);
      uint16_t b = (uint16_t)((color >> 8) & 0xffU);
      rgb565_framebuffer[i] = (uint16_t)(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3));
   }
}

static bool convert_framebuffer_to_overlay_rgba(void)
{
   if (!framebuffer || !overlay_rgba_framebuffer)
      return false;
   bool has_visible_pixels = false;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t color = framebuffer[i];
      uint8_t alpha = (uint8_t)(color & 0xffU);
      if (color == framebuffer_clear_color)
         alpha = 0;
      if (alpha)
         has_visible_pixels = true;
      overlay_rgba_framebuffer[i * 4 + 0] = (uint8_t)((color >> 24) & 0xffU);
      overlay_rgba_framebuffer[i * 4 + 1] = (uint8_t)((color >> 16) & 0xffU);
      overlay_rgba_framebuffer[i * 4 + 2] = (uint8_t)((color >> 8) & 0xffU);
      overlay_rgba_framebuffer[i * 4 + 3] = alpha;
   }
   return has_visible_pixels;
}

static int allocate_mesh(enum nova64_mesh_type type)
{
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (!meshes[i].used) {
         meshes[i].used = true;
         meshes[i].visible = true;
         meshes[i].type = type;
         meshes[i].position[0] = 0.0f;
         meshes[i].position[1] = 0.0f;
         meshes[i].position[2] = 0.0f;
         meshes[i].rotation[0] = 0.0f;
         meshes[i].rotation[1] = 0.0f;
         meshes[i].rotation[2] = 0.0f;
         meshes[i].scale[0] = 1.0f;
         meshes[i].scale[1] = 1.0f;
         meshes[i].scale[2] = 1.0f;
         meshes[i].opacity = 1.0f;
         meshes[i].flat_shading = false;
         meshes[i].cast_shadow = false;
         meshes[i].receive_shadow = false;
         meshes[i].color = rgba8(255, 255, 255, 255);
         meshes[i].emissive_color = 0;
         meshes[i].emissive_intensity = 0.0f;
         meshes[i].roughness = 0.5f;
         meshes[i].metalness = 0.0f;
         meshes[i].uv_offset[0] = 0.0f;
         meshes[i].uv_offset[1] = 0.0f;
         meshes[i].uv_scale[0] = 1.0f;
         meshes[i].uv_scale[1] = 1.0f;
         meshes[i].mesh_blend = NOVA64_MESH_BLEND_OPAQUE;
         meshes[i].texture_handle = 0;
         meshes[i].normal_map_handle = 0;
         return i + 1;
      }
   }
   return 0;
}

static struct nova64_mesh *mesh_from_handle(int handle)
{
   if (handle <= 0 || handle > NOVA64_MAX_MESHES)
      return NULL;
   struct nova64_mesh *mesh = &meshes[handle - 1];
   return mesh->used ? mesh : NULL;
}

static size_t mesh_triangle_count(enum nova64_mesh_type type)
{
   switch (type) {
      case NOVA64_MESH_CUBE:
         return 12;
      case NOVA64_MESH_PLANE:
         return 2;
      case NOVA64_MESH_SPHERE:
         return 96;
      case NOVA64_MESH_CAPSULE:
         return 128;
      case NOVA64_MESH_CYLINDER:
         return 64;
      case NOVA64_MESH_INSTANCED:
         return 12; /* per instance, approximate */
      default:
         return 0;
   }
}

static void log_exception_source_context(const char *stack_text);

static void js_log_exception(JSContext *ctx, const char *where)
{
   JSValue exception = JS_GetException(ctx);
   const char *message = JS_ToCString(ctx, exception);
   if (message) {
      if (log_cb)
         log_cb(RETRO_LOG_ERROR, "[nova64] JS exception in %s: %s\n", where, message);
      else
         fprintf(stderr, "[nova64] JS exception in %s: %s\n", where, message);
      JS_FreeCString(ctx, message);
   }

   JSValue stack = JS_GetPropertyStr(ctx, exception, "stack");
   if (!JS_IsUndefined(stack)) {
      const char *stack_text = JS_ToCString(ctx, stack);
      if (stack_text) {
         if (log_cb)
            log_cb(RETRO_LOG_ERROR, "%s\n", stack_text);
         else
            fprintf(stderr, "%s\n", stack_text);
         log_exception_source_context(stack_text);
         JS_FreeCString(ctx, stack_text);
      }
   }
   JS_FreeValue(ctx, stack);
   JS_FreeValue(ctx, exception);
}

static bool source_line_from_text(const char *source, size_t source_size, int line,
      const char **out_start, size_t *out_len)
{
   if (!source || line <= 0 || !out_start || !out_len)
      return false;
   const char *cursor = source;
   const char *end = source + source_size;
   int current = 1;
   while (cursor < end && current < line) {
      if (*cursor++ == '\n')
         current++;
   }
   if (current != line)
      return false;
   const char *start = cursor;
   while (cursor < end && *cursor != '\n' && *cursor != '\r')
      cursor++;
   *out_start = start;
   *out_len = (size_t)(cursor - start);
   return true;
}

static bool lookup_source_line(const char *filename, int line, const char **out_start, size_t *out_len)
{
   if (!filename || line <= 0)
      return false;
   const struct nova64_package_asset *asset = find_package_asset(filename);
   if (asset)
      return source_line_from_text((const char *)asset->data, asset->size, line, out_start, out_len);
   if ((package_manifest_main[0] && !strcmp(filename, package_manifest_main)) ||
         (cart_path[0] && !strcmp(filename, cart_path)) ||
         strstr(filename, "<nova64-cart>")) {
      return source_line_from_text(cart_content, cart_size, line, out_start, out_len);
   }
   return false;
}

static void log_exception_source_context(const char *stack_text)
{
   if (!stack_text)
      return;
   const char *open = strchr(stack_text, '(');
   const char *close = open ? strchr(open, ')') : NULL;
   if (!open || !close || close <= open + 1)
      return;
   char location[512];
   size_t len = (size_t)(close - open - 1);
   if (len >= sizeof(location))
      len = sizeof(location) - 1;
   memcpy(location, open + 1, len);
   location[len] = '\0';

   char *last_colon = strrchr(location, ':');
   if (!last_colon)
      return;
   *last_colon = '\0';
   char *line_colon = strrchr(location, ':');
   if (!line_colon)
      return;
   *line_colon = '\0';
   int line = (int)strtol(line_colon + 1, NULL, 10);
   const char *source_line = NULL;
   size_t source_len = 0;
   if (!lookup_source_line(location, line, &source_line, &source_len))
      return;
   if (source_len > 160)
      source_len = 160;
   if (log_cb)
      log_cb(RETRO_LOG_ERROR, "[nova64] source %s:%d: %.*s\n", location, line,
            (int)source_len, source_line);
   else
      fprintf(stderr, "[nova64] source %s:%d: %.*s\n", location, line,
            (int)source_len, source_line);
}

static JSValue js_console_log(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   for (int i = 0; i < argc; i++) {
      const char *text = JS_ToCString(ctx, argv[i]);
      if (text) {
         if (log_cb)
            log_cb(RETRO_LOG_INFO, "%s%s", i ? " " : "[nova64] ", text);
         else
            fprintf(stderr, "%s%s", i ? " " : "[nova64] ", text);
         JS_FreeCString(ctx, text);
      }
   }
   if (log_cb)
      log_cb(RETRO_LOG_INFO, "\n");
   else
      fprintf(stderr, "\n");
   return JS_UNDEFINED;
}

static JSValue js_rgba8(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   uint32_t r = (uint32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 255);
   uint32_t g = (uint32_t)int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 255);
   uint32_t b = (uint32_t)int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 255);
   uint32_t a = (uint32_t)int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 255);
   return JS_NewUint32(ctx, rgba8(r, g, b, a));
}

static JSValue js_color_lerp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t a = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   uint32_t b = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   float t = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.5);
   return JS_NewUint32(ctx, lerp_color(a, b, t));
}

static JSValue js_color_r(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, (int)((c >> 24) & 0xffU));
}

static JSValue js_color_g(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, (int)((c >> 16) & 0xffU));
}

static JSValue js_color_b(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, (int)((c >> 8) & 0xffU));
}

static JSValue js_color_a(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, (int)(c & 0xffU));
}

static JSValue js_screen_width(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, NOVA64_WIDTH);
}

static JSValue js_screen_height(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, NOVA64_HEIGHT);
}

static void spr_sorted_flush(void);

static JSValue js_cls(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   /* Flush any pending z-sorted sprites before clearing so they are not lost silently */
   spr_sorted_flush();
   clear_framebuffer(color);
   if (!drawing_scene_preview && (scene_has_visible_meshes() || sky_color_enabled))
      render_software_scene();
   return JS_UNDEFINED;
}

static JSValue js_cls_gradient(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t a = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   uint32_t b = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, a);
   bool vertical = argc > 2 ? JS_ToBool(ctx, argv[2]) : true;
   framebuffer_clear_color = a;
   draw_rect_gradient_pixels(0, 0, NOVA64_WIDTH, NOVA64_HEIGHT, a, b, vertical);
   if (!drawing_scene_preview && scene_has_visible_meshes())
      render_software_scene();
   return JS_UNDEFINED;
}

static JSValue js_pset(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   uint32_t color = color_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   set_pixel(x, y, color);
   return JS_UNDEFINED;
}

static JSValue js_pget(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   return JS_NewUint32(ctx, get_pixel(x, y));
}

static JSValue js_replace_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t from = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   uint32_t to = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int count = 0;
   if (!framebuffer)
      return JS_NewInt32(ctx, 0);
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      if (framebuffer[i] == from) {
         framebuffer[i] = to;
         count++;
      }
   }
   return JS_NewInt32(ctx, count);
}

static JSValue js_screen_fade(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   float amount = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.5), 0.0, 1.0);
   if (framebuffer)
      for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++)
         framebuffer[i] = lerp_color(framebuffer[i], color, amount);
   return JS_UNDEFINED;
}

static JSValue js_screen_tint(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t tint = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   float amount = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.5), 0.0, 1.0);
   float tr = (float)((tint >> 24) & 0xffU) / 255.0f;
   float tg = (float)((tint >> 16) & 0xffU) / 255.0f;
   float tb = (float)((tint >> 8) & 0xffU) / 255.0f;
   if (!framebuffer)
      return JS_UNDEFINED;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t c = framebuffer[i];
      uint32_t r = (c >> 24) & 0xffU;
      uint32_t g = (c >> 16) & 0xffU;
      uint32_t b = (c >> 8) & 0xffU;
      uint32_t a = c & 0xffU;
      uint32_t nr = (uint32_t)((float)r * (1.0f - amount) + (float)r * tr * amount);
      uint32_t ng = (uint32_t)((float)g * (1.0f - amount) + (float)g * tg * amount);
      uint32_t nb = (uint32_t)((float)b * (1.0f - amount) + (float)b * tb * amount);
      framebuffer[i] = rgba8(nr, ng, nb, a);
   }
   return JS_UNDEFINED;
}

static JSValue js_screen_invert(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (!framebuffer)
      return JS_UNDEFINED;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t c = framebuffer[i];
      framebuffer[i] = rgba8(255U - ((c >> 24) & 0xffU),
            255U - ((c >> 16) & 0xffU), 255U - ((c >> 8) & 0xffU), c & 0xffU);
   }
   return JS_UNDEFINED;
}

static JSValue js_screen_grayscale(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (!framebuffer)
      return JS_UNDEFINED;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t c = framebuffer[i];
      uint32_t l = (((c >> 24) & 0xffU) * 30U + ((c >> 16) & 0xffU) * 59U + ((c >> 8) & 0xffU) * 11U) / 100U;
      framebuffer[i] = rgba8(l, l, l, c & 0xffU);
   }
   return JS_UNDEFINED;
}

static JSValue js_screen_posterize(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int levels = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 4);
   if (levels < 2) levels = 2;
   if (levels > 32) levels = 32;
   if (!framebuffer)
      return JS_UNDEFINED;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t c = framebuffer[i];
      uint32_t r = (((c >> 24) & 0xffU) * (uint32_t)(levels - 1) + 127U) / 255U;
      uint32_t g = (((c >> 16) & 0xffU) * (uint32_t)(levels - 1) + 127U) / 255U;
      uint32_t b = (((c >> 8) & 0xffU) * (uint32_t)(levels - 1) + 127U) / 255U;
      framebuffer[i] = rgba8((r * 255U) / (uint32_t)(levels - 1),
            (g * 255U) / (uint32_t)(levels - 1),
            (b * 255U) / (uint32_t)(levels - 1), c & 0xffU);
   }
   return JS_UNDEFINED;
}

static JSValue js_screen_threshold(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int threshold = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 128);
   uint32_t low = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   uint32_t high = color_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   if (!framebuffer)
      return JS_UNDEFINED;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
      uint32_t c = framebuffer[i];
      uint32_t l = (((c >> 24) & 0xffU) * 30U + ((c >> 16) & 0xffU) * 59U + ((c >> 8) & 0xffU) * 11U) / 100U;
      framebuffer[i] = (int)l >= threshold ? high : low;
   }
   return JS_UNDEFINED;
}

static JSValue js_screen_scanlines(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   float amount = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.35), 0.0, 1.0);
   int step = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 2);
   if (step < 2) step = 2;
   if (!framebuffer)
      return JS_UNDEFINED;
   for (int y = 0; y < NOVA64_HEIGHT; y++) {
      if ((y % step) != step - 1)
         continue;
      for (int x = 0; x < NOVA64_WIDTH; x++) {
         size_t i = (size_t)y * NOVA64_WIDTH + (size_t)x;
         framebuffer[i] = lerp_color(framebuffer[i], color, amount);
      }
   }
   return JS_UNDEFINED;
}

static JSValue js_screen_vignette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float amount = (float)clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.5), 0.0, 1.0);
   uint32_t color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   if (!framebuffer)
      return JS_UNDEFINED;
   float cx = (float)(NOVA64_WIDTH - 1) * 0.5f;
   float cy = (float)(NOVA64_HEIGHT - 1) * 0.5f;
   float max_d = sqrtf(cx * cx + cy * cy);
   for (int y = 0; y < NOVA64_HEIGHT; y++) {
      for (int x = 0; x < NOVA64_WIDTH; x++) {
         float dx = ((float)x - cx);
         float dy = ((float)y - cy);
         float t = sqrtf(dx * dx + dy * dy) / max_d;
         t = clamp_float((t - 0.45f) / 0.55f, 0.0f, 1.0f) * amount;
         size_t i = (size_t)y * NOVA64_WIDTH + (size_t)x;
         framebuffer[i] = lerp_color(framebuffer[i], color, t);
      }
   }
   return JS_UNDEFINED;
}

static JSValue js_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x0, &y0);
   transform_2d_point(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0), &x1, &y1);
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   int thickness = transform_2d_size(argc > 5 ? int_from_js(ctx, argv[5], 1) : 1);
   draw_thick_line_pixels(x0, y0, x1, y1, color, abs(thickness));
   return JS_UNDEFINED;
}

static JSValue js_hline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
   int y = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0), y, &x0, &y0);
   transform_2d_point(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0), y, &x1, &y1);
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_line_pixels(x0, y0, x1, y1, color);
   return JS_UNDEFINED;
}

static JSValue js_vline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
   int x = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   transform_2d_point(x, int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x0, &y0);
   transform_2d_point(x, int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0), &x1, &y1);
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_line_pixels(x0, y0, x1, y1, color);
   return JS_UNDEFINED;
}

static JSValue js_line_gradient(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x0, &y0);
   transform_2d_point(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0), &x1, &y1);
   uint32_t a = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   uint32_t b = color_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, a);
   int thickness = transform_2d_size(argc > 6 ? int_from_js(ctx, argv[6], 1) : 1);
   draw_line_gradient_pixels(x0, y0, x1, y1, a, b, abs(thickness));
   return JS_UNDEFINED;
}

static JSValue js_rect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   int w = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int h = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0));
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   bool filled = argc > 5 ? JS_ToBool(ctx, argv[5]) : true;
   draw_rect_pixels(x, y, w, h, color, filled);
   return JS_UNDEFINED;
}

static JSValue js_rect_gradient(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   int w = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int h = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0));
   uint32_t a = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   uint32_t b = color_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   bool vertical = argc > 6 ? JS_ToBool(ctx, argv[6]) : true;
   draw_rect_gradient_pixels(x, y, w, h, a, b, vertical);
   return JS_UNDEFINED;
}

static JSValue js_rectfill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   int w = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int h = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0));
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_rect_pixels(x, y, w, h, color, true);
   return JS_UNDEFINED;
}

static JSValue js_round_rect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   int w = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int h = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0));
   int r = transform_2d_size(int_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 4));
   uint32_t color = color_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_round_rect_outline_pixels(x, y, w, h, r, color);
   return JS_UNDEFINED;
}

static JSValue js_round_rect_fill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x, &y);
   int w = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int h = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0));
   int r = transform_2d_size(int_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 4));
   uint32_t color = color_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_round_rect_fill_pixels(x, y, w, h, r, color);
   return JS_UNDEFINED;
}

static int text_align_from_js(JSContext *ctx, JSValueConst value)
{
   if (JS_IsUndefined(value) || JS_IsNull(value))
      return 0;
   if (JS_IsNumber(value))
      return int_from_js(ctx, value, 0);
   const char *s = JS_ToCString(ctx, value);
   if (!s) return 0;
   int align = 0;
   if (!strcmp(s, "center") || !strcmp(s, "c")) align = 1;
   else if (!strcmp(s, "right") || !strcmp(s, "r")) align = 2;
   JS_FreeCString(ctx, s);
   return align;
}

static JSValue js_draw_print(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 3)
      return js_console_log(ctx, this_val, argc, argv);
   const char *text = JS_ToCString(ctx, argv[0]);
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argv[1], 0), int_from_js(ctx, argv[2], 0), &x, &y);
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   int align = argc > 4 ? text_align_from_js(ctx, argv[4]) : 0;
   draw_text_aligned(text, x, y, color, align);
   if (text)
      JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

static JSValue js_text_width(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *text = JS_ToCString(ctx, argv[0]);
   int w;
   int fhandle = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   if (fhandle >= 1 && fhandle <= NOVA64_MAX_FONTS && g_fonts[fhandle-1].active) {
      /* measure using custom font glyph width */
      size_t len = text ? strlen(text) : 0;
      w = (int)(len * (size_t)g_fonts[fhandle-1].glyph_w);
   } else {
      w = text_pixel_width(text);
   }
   if (text) JS_FreeCString(ctx, text);
   return JS_NewInt32(ctx, w);
}

static JSValue js_text_height(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *text = JS_ToCString(ctx, argv[0]);
   int h = text_pixel_height(text);
   if (text) JS_FreeCString(ctx, text);
   return JS_NewInt32(ctx, h);
}

static JSValue js_text_size(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   const char *text = argc > 0 ? JS_ToCString(ctx, argv[0]) : NULL;
   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "w", JS_NewInt32(ctx, text_pixel_width(text)));
   JS_SetPropertyStr(ctx, object, "h", JS_NewInt32(ctx, text_pixel_height(text)));
   JS_SetPropertyStr(ctx, object, "lines", JS_NewInt32(ctx, text_line_count(text)));
   if (text) JS_FreeCString(ctx, text);
   return object;
}

static JSValue js_print_shadow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 3)
      return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argv[1], 0), int_from_js(ctx, argv[2], 0), &x, &y);
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   uint32_t shadow = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   int dx = argc > 5 ? int_from_js(ctx, argv[5], 1) : 1;
   int dy = argc > 6 ? int_from_js(ctx, argv[6], 1) : 1;
   int align = argc > 7 ? text_align_from_js(ctx, argv[7]) : 0;
   draw_text_aligned(text, x + dx, y + dy, shadow, align);
   draw_text_aligned(text, x, y, color, align);
   if (text) JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

static JSValue js_print_outline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 3)
      return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   int x = 0, y = 0;
   transform_2d_point(int_from_js(ctx, argv[1], 0), int_from_js(ctx, argv[2], 0), &x, &y);
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   uint32_t outline = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   int align = argc > 5 ? text_align_from_js(ctx, argv[5]) : 0;
   draw_text_aligned(text, x - 1, y, outline, align);
   draw_text_aligned(text, x + 1, y, outline, align);
   draw_text_aligned(text, x, y - 1, outline, align);
   draw_text_aligned(text, x, y + 1, outline, align);
   draw_text_aligned(text, x, y, color, align);
   if (text) JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

static JSValue js_circ(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int cx = 0, cy = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &cx, &cy);
   int r  = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_circle_pixels(cx, cy, r, color, false);
   return JS_UNDEFINED;
}

static JSValue js_circfill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int cx = 0, cy = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &cx, &cy);
   int r  = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_circle_pixels(cx, cy, r, color, true);
   return JS_UNDEFINED;
}

static JSValue js_oval(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int cx = 0, cy = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &cx, &cy);
   int rx = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int ry = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rx));
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_ellipse_pixels(cx, cy, rx, ry, color, false);
   return JS_UNDEFINED;
}

static JSValue js_ovalfill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int cx = 0, cy = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &cx, &cy);
   int rx = transform_2d_size(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0));
   int ry = transform_2d_size(int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rx));
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_ellipse_pixels(cx, cy, rx, ry, color, true);
   return JS_UNDEFINED;
}

static JSValue js_tri(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x0, &y0);
   transform_2d_point(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0), &x1, &y1);
   transform_2d_point(int_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, 0), &x2, &y2);
   uint32_t color = color_from_js(ctx, argc > 6 ? argv[6] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_triangle_outline_pixels(x0, y0, x1, y1, x2, y2, color);
   return JS_UNDEFINED;
}

static JSValue js_trifill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0;
   transform_2d_point(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0), &x0, &y0);
   transform_2d_point(int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0), &x1, &y1);
   transform_2d_point(int_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 0),
         int_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, 0), &x2, &y2);
   uint32_t color = color_from_js(ctx, argc > 6 ? argv[6] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_triangle_filled_pixels(x0, y0, x1, y1, x2, y2, color);
   return JS_UNDEFINED;
}

/* ---- PNG decode (8F) — supports RGB/RGBA 8-bit non-interlaced via zlib ---- */
static bool path_is_png(const char *path)
{
   if (!path) return false;
   size_t len = strlen(path);
   if (len < 4) return false;
   const char *ext = path + len - 4;
   return ext[0] == '.' &&
          (ext[1] == 'p' || ext[1] == 'P') &&
          (ext[2] == 'n' || ext[2] == 'N') &&
          (ext[3] == 'g' || ext[3] == 'G');
}

/* Returns malloc'd RGBA buffer (4 bytes/pixel); caller must free(). */
static uint8_t *decode_png_asset(const uint8_t *png, size_t png_size, int *out_w, int *out_h)
{
   static const uint8_t SIG[8] = {0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A};
   if (!png || png_size < 33 || memcmp(png, SIG, 8) != 0) return NULL;

   int w = 0, h = 0, depth = 0, ctype = 0;
   size_t idat_total = 0;

   /* First pass: parse IHDR and count IDAT bytes */
   const uint8_t *p = png + 8;
   const uint8_t *end = png + png_size;
   while (p + 12 <= end) {
      uint32_t len = ((uint32_t)p[0]<<24)|((uint32_t)p[1]<<16)|((uint32_t)p[2]<<8)|p[3];
      if (p + 12 + len > end) break;
      if (memcmp(p+4, "IHDR", 4) == 0 && len >= 13) {
         const uint8_t *d = p + 8;
         w = (int)(((uint32_t)d[0]<<24)|((uint32_t)d[1]<<16)|((uint32_t)d[2]<<8)|d[3]);
         h = (int)(((uint32_t)d[4]<<24)|((uint32_t)d[5]<<16)|((uint32_t)d[6]<<8)|d[7]);
         depth = d[8]; ctype = d[9];
         if (d[12] != 0) return NULL; /* no interlace support */
      } else if (memcmp(p+4, "IDAT", 4) == 0) {
         idat_total += len;
      }
      p += 12 + len;
   }
   if (w <= 0 || h <= 0 || depth != 8 || idat_total == 0) return NULL;
   if (ctype != 2 && ctype != 6) return NULL; /* RGB or RGBA only */
   int src_bpp = (ctype == 6) ? 4 : 3;

   /* Collect IDAT chunks */
   uint8_t *idat = (uint8_t *)malloc(idat_total);
   if (!idat) return NULL;
   size_t idat_off = 0;
   p = png + 8;
   while (p + 12 <= end) {
      uint32_t len = ((uint32_t)p[0]<<24)|((uint32_t)p[1]<<16)|((uint32_t)p[2]<<8)|p[3];
      if (memcmp(p+4, "IDAT", 4) == 0 && p + 12 + len <= end) {
         memcpy(idat + idat_off, p + 8, len);
         idat_off += len;
      }
      p += 12 + len;
   }

   /* Decompress zlib */
   uLong raw_cap = (uLong)(h * (1 + w * src_bpp));
   uint8_t *raw = (uint8_t *)malloc(raw_cap);
   if (!raw) { free(idat); return NULL; }
   uLong raw_size = raw_cap;
   if (uncompress(raw, &raw_size, idat, (uLong)idat_total) != Z_OK) {
      free(idat); free(raw); return NULL;
   }
   free(idat);

   /* Decode scanline filters + convert to RGBA */
   uint8_t *rgba = (uint8_t *)malloc((size_t)w * h * 4);
   if (!rgba) { free(raw); return NULL; }
   int stride = w * src_bpp;
   const uint8_t *src = raw;
   uint8_t *dst = rgba;
   uint8_t *prev = NULL;
   for (int y = 0; y < h; y++) {
      uint8_t filter = *src++;
      uint8_t *row = (uint8_t *)src;
      for (int x = 0; x < stride; x++) {
         int a = x >= src_bpp ? (int)row[x - src_bpp] : 0;
         int b = prev ? (int)prev[x] : 0;
         int c = (x >= src_bpp && prev) ? (int)prev[x - src_bpp] : 0;
         switch (filter) {
            case 1: row[x] = (uint8_t)(row[x] + a); break;
            case 2: row[x] = (uint8_t)(row[x] + b); break;
            case 3: row[x] = (uint8_t)(row[x] + ((a + b) >> 1)); break;
            case 4: { int pa=abs(a+b-c-a),pb=abs(a+b-c-b),pc=abs(a+b-c-c);
                      int pr=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
                      row[x]=(uint8_t)(row[x]+pr); break; }
            default: break;
         }
      }
      for (int x = 0; x < w; x++, dst += 4) {
         dst[0] = row[x*src_bpp];   dst[1] = row[x*src_bpp+1];
         dst[2] = row[x*src_bpp+2]; dst[3] = src_bpp==4 ? row[x*src_bpp+3] : 255;
      }
      prev = row;
      src += stride;
   }
   free(raw);
   *out_w = w; *out_h = h;
   return rgba;
}

static int sorted_sprite_z_cmp(const void *a, const void *b) {
   return ((const struct nova64_sorted_sprite *)a)->z -
          ((const struct nova64_sorted_sprite *)b)->z;
}

static void spr_sorted_flush(void)
{
   if (sorted_sprite_count <= 0) return;
   qsort(sorted_sprites, (size_t)sorted_sprite_count, sizeof(sorted_sprites[0]),
         sorted_sprite_z_cmp);
   for (int i = 0; i < sorted_sprite_count; i++) {
      struct nova64_sorted_sprite *s = &sorted_sprites[i];
      if (s->bw > 0 && s->bh > 0)
         blit_rgba(s->pixels, s->img_w, s->img_h, s->dx, s->dy,
                   s->sx, s->sy, s->bw, s->bh);
      free(s->owned_pixels);
   }
   sorted_sprite_count = 0;
}

/* spr(path, dx, dy [, imgw, imgh [, sx, sy [, bw, bh [, z]]]]) — blit RGBA asset */
static JSValue js_spr(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewBool(ctx, false);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewBool(ctx, false);

   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;

   /* Decode PNG on the fly; fallback to raw RGBA */
   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int img_w = argc > 3 ? int_from_js(ctx, argv[3], 0) : 0;
   int img_h = argc > 4 ? int_from_js(ctx, argv[4], 0) : 0;

   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_NewBool(ctx, false);
      pixels = png_pixels;
      if (img_w <= 0) img_w = pw;
      if (img_h <= 0) img_h = ph;
   }
   if (img_w <= 0 || img_h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      img_w = side > 0 ? side : 1;
      img_h = (int)((asset->size / 4) / (size_t)img_w);
      if (img_h <= 0) img_h = img_w;
   }

   int sx = argc > 5 ? int_from_js(ctx, argv[5], 0) : 0;
   int sy = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   int bw = argc > 7 ? int_from_js(ctx, argv[7], 0) : (img_w - sx);
   int bh = argc > 8 ? int_from_js(ctx, argv[8], 0) : (img_h - sy);
   /* z arg: queue for painter's sort, flushed after draw() */
   if (argc > 9 && !JS_IsUndefined(argv[9]) && sorted_sprite_count < NOVA64_MAX_SORTED_SPRITES) {
      int z = int_from_js(ctx, argv[9], 0);
      struct nova64_sorted_sprite *s = &sorted_sprites[sorted_sprite_count++];
      s->pixels = pixels;
      s->owned_pixels = png_pixels;
      png_pixels = NULL; /* ownership transferred */
      s->dx = dx; s->dy = dy;
      s->img_w = img_w; s->img_h = img_h;
      s->sx = sx; s->sy = sy; s->bw = bw; s->bh = bh;
      s->z = z;
      return JS_NewBool(ctx, bw > 0 && bh > 0);
   }
   if (bw > 0 && bh > 0)
      blit_rgba(pixels, img_w, img_h, dx, dy, sx, sy, bw, bh);
   free(png_pixels);
   return JS_NewBool(ctx, bw > 0 && bh > 0);
}

static void atlas_path_for_image(const char *path, char *out, size_t out_size)
{
   if (!path || !out || out_size == 0)
      return;
   snprintf(out, out_size, "%s", path);
   char *dot = strrchr(out, '.');
   if (dot)
      snprintf(dot, out_size - (size_t)(dot - out), ".json");
   else
      snprintf(out + strlen(out), out_size - strlen(out), ".json");
}

static char *asset_text_copy(const struct nova64_package_asset *asset)
{
   if (!asset || !asset->data)
      return NULL;
   char *text = (char *)malloc(asset->size + 1);
   if (!text)
      return NULL;
   memcpy(text, asset->data, asset->size);
   text[asset->size] = '\0';
   return text;
}

static bool json_get_int_between(const char *start, const char *end, const char *key, int *out)
{
   if (!start || !key || !out)
      return false;
   char pattern[64];
   snprintf(pattern, sizeof(pattern), "\"%s\"", key);
   size_t pattern_len = strlen(pattern);
   for (const char *p = strstr(start, pattern); p && (!end || p < end); p = strstr(p + pattern_len, pattern)) {
      const char *colon = strchr(p + pattern_len, ':');
      if (!colon || (end && colon >= end))
         continue;
      char *after = NULL;
      long value = strtol(colon + 1, &after, 10);
      if (after && after != colon + 1 && (!end || after <= end)) {
         *out = (int)value;
         return true;
      }
   }
   return false;
}

static bool spritesheet_named_region(const struct nova64_spritesheet *sheet, const char *name,
      int *sx, int *sy, int *w, int *h)
{
   if (!sheet || !name || !sheet->atlas_path[0])
      return false;
   const struct nova64_package_asset *asset = find_package_asset(sheet->atlas_path);
   char *json = asset_text_copy(asset);
   if (!json)
      return false;

   char quoted[128];
   snprintf(quoted, sizeof(quoted), "\"%s\"", name);
   char *found = strstr(json, quoted);
   if (!found) {
      free(json);
      return false;
   }
   char *object_start = strchr(found, '{');
   char *object_end = object_start ? strchr(object_start, '}') : NULL;
   bool ok = object_start && object_end &&
      json_get_int_between(object_start, object_end, "x", sx) &&
      json_get_int_between(object_start, object_end, "y", sy);
   if (ok) {
      int parsed_w = 0;
      int parsed_h = 0;
      *w = json_get_int_between(object_start, object_end, "w", &parsed_w) ? parsed_w : sheet->frame_w;
      *h = json_get_int_between(object_start, object_end, "h", &parsed_h) ? parsed_h : sheet->frame_h;
   }
   free(json);
   return ok;
}

static bool configure_spritesheet_dimensions(struct nova64_spritesheet *sheet,
      const struct nova64_package_asset *image_asset)
{
   if (!sheet || !image_asset || sheet->frame_w <= 0 || sheet->frame_h <= 0)
      return false;

   const struct nova64_package_asset *atlas = find_package_asset(sheet->atlas_path);
   char *json = asset_text_copy(atlas);
   if (json) {
      json_get_int_between(json, NULL, "imageWidth", &sheet->image_w);
      json_get_int_between(json, NULL, "imageHeight", &sheet->image_h);
      free(json);
   }

   size_t pixels = image_asset->size / 4;
   if (sheet->image_w <= 0 || sheet->image_h <= 0 ||
         (size_t)sheet->image_w * (size_t)sheet->image_h > pixels) {
      if (pixels % (size_t)sheet->frame_h == 0) {
         sheet->image_h = sheet->frame_h;
         sheet->image_w = (int)(pixels / (size_t)sheet->frame_h);
      } else {
         int side = (int)sqrt((double)pixels);
         sheet->image_w = side > 0 ? side : sheet->frame_w;
         sheet->image_h = side > 0 ? side : sheet->frame_h;
      }
   }

   return sheet->image_w >= sheet->frame_w && sheet->image_h >= sheet->frame_h &&
      (size_t)sheet->image_w * (size_t)sheet->image_h <= pixels;
}

static struct nova64_spritesheet *spritesheet_from_handle(int handle)
{
   if (handle < 0 || handle >= NOVA64_MAX_SPRITESHEETS)
      return NULL;
   return spritesheets[handle].active ? &spritesheets[handle] : NULL;
}

static JSValue js_create_spritesheet(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3)
      return JS_NewInt32(ctx, -1);
   const char *path = JS_ToCString(ctx, argv[0]);
   int frame_w = int_from_js(ctx, argv[1], 0);
   int frame_h = int_from_js(ctx, argv[2], 0);
   const struct nova64_package_asset *asset = find_package_asset(path);
   if (!path || !asset || !asset->data || frame_w <= 0 || frame_h <= 0) {
      JS_FreeCString(ctx, path);
      return JS_NewInt32(ctx, -1);
   }

   for (int i = 0; i < NOVA64_MAX_SPRITESHEETS; i++) {
      if (spritesheets[i].active)
         continue;
      struct nova64_spritesheet *sheet = &spritesheets[i];
      memset(sheet, 0, sizeof(*sheet));
      sheet->active = true;
      sheet->frame_w = frame_w;
      sheet->frame_h = frame_h;
      snprintf(sheet->path, sizeof(sheet->path), "%s", path);
      atlas_path_for_image(path, sheet->atlas_path, sizeof(sheet->atlas_path));
      JS_FreeCString(ctx, path);
      if (!configure_spritesheet_dimensions(sheet, asset)) {
         memset(sheet, 0, sizeof(*sheet));
         return JS_NewInt32(ctx, -1);
      }
      return JS_NewInt32(ctx, i);
   }

   JS_FreeCString(ctx, path);
   return JS_NewInt32(ctx, -1);
}

static JSValue js_spr_frame(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4)
      return JS_NewBool(ctx, false);
   struct nova64_spritesheet *sheet = spritesheet_from_handle(int_from_js(ctx, argv[0], -1));
   int frame = int_from_js(ctx, argv[1], 0);
   int dx = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[3], 0) - cam2d_y;
   if (!sheet || frame < 0)
      return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(sheet->path);
   if (!asset || !asset->data)
      return JS_NewBool(ctx, false);

   int frames_per_row = sheet->image_w / sheet->frame_w;
   if (frames_per_row <= 0)
      return JS_NewBool(ctx, false);
   int sx = (frame % frames_per_row) * sheet->frame_w;
   int sy = (frame / frames_per_row) * sheet->frame_h;
   if (sx + sheet->frame_w > sheet->image_w || sy + sheet->frame_h > sheet->image_h)
      return JS_NewBool(ctx, false);

   blit_rgba((const uint8_t *)asset->data, sheet->image_w, sheet->image_h,
         dx, dy, sx, sy, sheet->frame_w, sheet->frame_h);
   return JS_NewBool(ctx, true);
}

static JSValue js_spr_named(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4)
      return JS_NewBool(ctx, false);
   struct nova64_spritesheet *sheet = spritesheet_from_handle(int_from_js(ctx, argv[0], -1));
   const char *name = JS_ToCString(ctx, argv[1]);
   int dx = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[3], 0) - cam2d_y;
   int sx = 0, sy = 0, w = 0, h = 0;
   bool ok = sheet && name && spritesheet_named_region(sheet, name, &sx, &sy, &w, &h);
   JS_FreeCString(ctx, name);
   if (!ok || w <= 0 || h <= 0 || sx < 0 || sy < 0 ||
         sx + w > sheet->image_w || sy + h > sheet->image_h)
      return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(sheet->path);
   if (!asset || !asset->data)
      return JS_NewBool(ctx, false);
   blit_rgba((const uint8_t *)asset->data, sheet->image_w, sheet->image_h,
         dx, dy, sx, sy, w, h);
   return JS_NewBool(ctx, true);
}

static JSValue js_set_clip(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) { clip_active = false; return JS_UNDEFINED; }
   clip_x = int_from_js(ctx, argv[0], 0);
   clip_y = int_from_js(ctx, argv[1], 0);
   clip_w = int_from_js(ctx, argv[2], 0);
   clip_h = int_from_js(ctx, argv[3], 0);
   clip_active = (clip_w > 0 && clip_h > 0);
   return JS_UNDEFINED;
}

static JSValue js_clear_clip(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   clip_active = false;
   return JS_UNDEFINED;
}

static JSValue js_get_clip(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "active", JS_NewBool(ctx, clip_active));
   JS_SetPropertyStr(ctx, object, "x", JS_NewInt32(ctx, clip_x));
   JS_SetPropertyStr(ctx, object, "y", JS_NewInt32(ctx, clip_y));
   JS_SetPropertyStr(ctx, object, "w", JS_NewInt32(ctx, clip_w));
   JS_SetPropertyStr(ctx, object, "h", JS_NewInt32(ctx, clip_h));
   return object;
}

static JSValue js_push_clip(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (clip_stack_depth >= NOVA64_DRAW_STACK_MAX)
      return JS_NewBool(ctx, false);
   clip_stack[clip_stack_depth++] = (struct nova64_clip_state){clip_active, clip_x, clip_y, clip_w, clip_h};
   return JS_NewBool(ctx, true);
}

static JSValue js_pop_clip(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (clip_stack_depth <= 0)
      return JS_NewBool(ctx, false);
   struct nova64_clip_state state = clip_stack[--clip_stack_depth];
   clip_active = state.active;
   clip_x = state.x;
   clip_y = state.y;
   clip_w = state.w;
   clip_h = state.h;
   return JS_NewBool(ctx, true);
}

/* setCamera2D(x, y [, zoom [, rotation]]) — 2D camera transform */
static JSValue js_set_camera2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   cam2d_x = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   cam2d_y = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   cam2d_zoom = (float)clamp_double(double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0), 0.05, 16.0);
   cam2d_rotation = (float)double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0.0);
   return JS_UNDEFINED;
}

static JSValue js_clear_camera2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   cam2d_x = cam2d_y = 0;
   cam2d_zoom = 1.0f;
   cam2d_rotation = 0.0f;
   return JS_UNDEFINED;
}

static JSValue js_get_camera2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "x", JS_NewInt32(ctx, cam2d_x));
   JS_SetPropertyStr(ctx, object, "y", JS_NewInt32(ctx, cam2d_y));
   JS_SetPropertyStr(ctx, object, "zoom", JS_NewFloat64(ctx, cam2d_zoom));
   JS_SetPropertyStr(ctx, object, "rotation", JS_NewFloat64(ctx, cam2d_rotation));
   return object;
}

static JSValue js_push_camera2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (camera2d_stack_depth >= NOVA64_DRAW_STACK_MAX)
      return JS_NewBool(ctx, false);
   camera2d_stack[camera2d_stack_depth++] =
      (struct nova64_camera2d_state){cam2d_x, cam2d_y, cam2d_zoom, cam2d_rotation};
   return JS_NewBool(ctx, true);
}

static JSValue js_pop_camera2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (camera2d_stack_depth <= 0)
      return JS_NewBool(ctx, false);
   struct nova64_camera2d_state state = camera2d_stack[--camera2d_stack_depth];
   cam2d_x = state.x;
   cam2d_y = state.y;
   cam2d_zoom = state.zoom;
   cam2d_rotation = state.rotation;
   return JS_NewBool(ctx, true);
}

/* axis(side, axis [, port]) — analog stick value -1..1 */
static JSValue js_axis(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewFloat64(ctx, 0.0);
   const char *side_s = JS_ToCString(ctx, argv[0]);
   const char *axis_s = JS_ToCString(ctx, argv[1]);
   int port = argc > 2 ? int_from_js(ctx, argv[2], 0) : 0;
   if (!side_s || !axis_s) {
      JS_FreeCString(ctx, side_s);
      JS_FreeCString(ctx, axis_s);
      return JS_NewFloat64(ctx, 0.0);
   }
   if (port < 0 || port >= NOVA64_MAX_PORTS) port = 0;
   int side = (!strcmp(side_s, "right")) ? 1 : 0;
   int ax   = (!strcmp(axis_s, "y"))     ? 1 : 0;
   JS_FreeCString(ctx, side_s);
   JS_FreeCString(ctx, axis_s);
   return JS_NewFloat64(ctx, analog_axes[port][side][ax]);
}

/* trigger('left'|'right' [, port]) — trigger value 0..1 */
static JSValue js_trigger(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewFloat64(ctx, 0.0);
   const char *side_s = JS_ToCString(ctx, argv[0]);
   int port = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   if (!side_s) return JS_NewFloat64(ctx, 0.0);
   if (port < 0 || port >= NOVA64_MAX_PORTS) port = 0;
   int side = (!strcmp(side_s, "right")) ? 1 : 0;
   JS_FreeCString(ctx, side_s);
   float val = analog_triggers[port][side];
   if (val < 0.0f) val = 0.0f;
   if (val > 1.0f) val = 1.0f;
   return JS_NewFloat64(ctx, val);
}

/* Tilemap bindings */

static JSValue js_create_tilemap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int tw = argc > 0 ? int_from_js(ctx, argv[0], 8) : 8;
   int th = argc > 1 ? int_from_js(ctx, argv[1], 8) : 8;
   int cols = argc > 2 ? int_from_js(ctx, argv[2], 16) : 16;
   int rows = argc > 3 ? int_from_js(ctx, argv[3], 16) : 16;
   if (tw <= 0 || th <= 0 || cols <= 0 || rows <= 0) return JS_NewInt32(ctx, -1);
   for (int i = 0; i < NOVA64_MAX_TILEMAPS; i++) {
      if (!tilemaps[i].active) {
         tilemaps[i].cells = (int *)calloc((size_t)(cols * rows), sizeof(int));
         if (!tilemaps[i].cells) return JS_NewInt32(ctx, -1);
         tilemaps[i].tile_w = tw;
         tilemaps[i].tile_h = th;
         tilemaps[i].cols   = cols;
         tilemaps[i].rows   = rows;
         tilemaps[i].active = true;
         return JS_NewInt32(ctx, i);
      }
   }
   return JS_NewInt32(ctx, -1);
}

static JSValue js_set_tile(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int idx  = int_from_js(ctx, argv[0], -1);
   int col  = int_from_js(ctx, argv[1], 0);
   int row  = int_from_js(ctx, argv[2], 0);
   int tile = int_from_js(ctx, argv[3], 0);
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active) return JS_UNDEFINED;
   struct nova64_tilemap *tm = &tilemaps[idx];
   if (col < 0 || col >= tm->cols || row < 0 || row >= tm->rows) return JS_UNDEFINED;
   tm->cells[row * tm->cols + col] = tile;
   return JS_UNDEFINED;
}

static JSValue js_draw_tilemap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_NewBool(ctx, false);
   int idx = int_from_js(ctx, argv[0], -1);
   int dx  = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy  = int_from_js(ctx, argv[2], 0) - cam2d_y;
   const char *path = JS_ToCString(ctx, argv[3]);
   if (!path || idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active) {
      JS_FreeCString(ctx, path);
      return JS_NewBool(ctx, false);
   }
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4) return JS_NewBool(ctx, false);

   struct nova64_tilemap *tm = &tilemaps[idx];
   /* Tilesheet is a horizontal strip: width = tile_w * N, height = tile_h */
   int sheet_h = tm->tile_h;
   int sheet_w = (sheet_h > 0) ? (int)(asset->size / (size_t)(4 * sheet_h)) : 0;
   if (sheet_w <= 0 || sheet_h <= 0) return JS_NewBool(ctx, false);
   int tiles_per_row = sheet_w / tm->tile_w;
   if (tiles_per_row <= 0) tiles_per_row = 1;

   for (int r = 0; r < tm->rows; r++) {
      for (int c = 0; c < tm->cols; c++) {
         int tile = tm->cells[r * tm->cols + c];
         if (tile < 0) continue;
         int sx = (tile % tiles_per_row) * tm->tile_w;
         int sy = (tile / tiles_per_row) * tm->tile_h;
         blit_rgba((const uint8_t *)asset->data, sheet_w, sheet_h,
                   dx + c * tm->tile_w, dy + r * tm->tile_h,
                   sx, sy, tm->tile_w, tm->tile_h);
      }
   }
   return JS_NewBool(ctx, true);
}

static JSValue js_clear_tilemap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = argc > 0 ? int_from_js(ctx, argv[0], -1) : -1;
   if (idx >= 0 && idx < NOVA64_MAX_TILEMAPS && tilemaps[idx].active)
      memset(tilemaps[idx].cells, 0, (size_t)(tilemaps[idx].cols * tilemaps[idx].rows) * sizeof(int));
   return JS_UNDEFINED;
}

static JSValue js_destroy_tilemap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = argc > 0 ? int_from_js(ctx, argv[0], -1) : -1;
   destroy_tilemap(idx);
   return JS_UNDEFINED;
}

/* RNG bindings */

static JSValue js_rng_seed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double seed = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   rng_seed_impl((uint64_t)(seed >= 0 ? seed : -seed));
   return JS_UNDEFINED;
}

static JSValue js_rng_next(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewFloat64(ctx, rng_next_impl());
}

static JSValue js_rng_int(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int lo = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int hi = argc > 1 ? int_from_js(ctx, argv[1], 1) : 1;
   if (hi <= lo) return JS_NewInt32(ctx, lo);
   int range = hi - lo + 1;
   double r = rng_next_impl();
   return JS_NewInt32(ctx, lo + (int)(r * range));
}

/* ---------- Perlin gradient noise ----------
 * Classic 256-entry permutation table with 2D/3D gradient noise.
 * noise(x), noise(x,y), noise(x,y,z) → approximately [-1, 1].
 * fbm(x, y [, octaves [, lacunarity [, gain]]]) → fractal Brownian motion.
 */

static const int PERM_SRC[256] = {
   151,160,137, 91, 90, 15,131, 13,201, 95, 96, 53,194,233,  7,225,
   140, 36,103, 30, 69,142,  8, 99, 37,240, 21, 10, 23,190,  6,148,
   247,120,234, 75,  0, 26,197, 62, 94,252,219,203,117, 35, 11, 32,
    57,177, 33, 88,237,149, 56, 87,174, 20,125,136,171,168, 68,175,
    74,165, 71,134,139, 48, 27,166, 77,146,158,231, 83,111,229,122,
    60,211,133,230,220,105, 92, 41, 55, 46,245, 40,244,102,143, 54,
    65, 25, 63,161,  1,216, 80, 73,209, 76,132,187,208, 89, 18,169,
   200,196,135,130,116,188,159, 86,164,100,109,198,173,186,  3, 64,
    52,217,226,250,124,123,  5,202, 38,147,118,126,255, 82, 85,212,
   207,206, 59,227, 47, 16, 58, 17,182,189, 28, 42,223,183,170,213,
   119,248,152,  2, 44,154,163, 70,221,153,101,155,167, 43,172,  9,
   129, 22, 39,253, 19, 98,108,110, 79,113,224,232,178,185,112,104,
   218,246, 97,228,251, 34,242,193,238,210,144, 12,191,179,162,241,
    81, 51,145,235,249, 14,239,107, 49,192,214, 31,181,199,106,157,
   184, 84,204,176,115,121, 50, 45,127,  4,150,254,138,236,205, 93,
   222,114, 67, 29, 24, 72,243,141,128,195, 78, 66,215, 61,156,180
};

static int g_perm[512];
static int g_noise_init_done = 0;

static void noise_ensure_init(void)
{
   if (g_noise_init_done) return;
   for (int i = 0; i < 256; i++) g_perm[i] = g_perm[i + 256] = PERM_SRC[i];
   g_noise_init_done = 1;
}

static double noise_fade(double t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
static double noise_lerp(double t, double a, double b) { return a + t * (b - a); }

static double noise_grad2(int hash, double x, double y)
{
   switch (hash & 7) {
      case 0: return  x + y; case 1: return -x + y;
      case 2: return  x - y; case 3: return -x - y;
      case 4: return  x;     case 5: return -x;
      case 6: return  y;     case 7: return -y;
      default: return 0.0;
   }
}

static double noise_grad3(int hash, double x, double y, double z)
{
   int h = hash & 15;
   double u = h < 8 ? x : y;
   double v = h < 4 ? y : (h == 12 || h == 14 ? x : z);
   return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

static double perlin_noise_2d(double x, double y)
{
   noise_ensure_init();
   int ix = (int)floor(x) & 255, iy = (int)floor(y) & 255;
   double fx = x - floor(x), fy = y - floor(y);
   double u = noise_fade(fx), v = noise_fade(fy);
   int aa = g_perm[g_perm[ix    ] + iy];
   int ab = g_perm[g_perm[ix    ] + iy + 1];
   int ba = g_perm[g_perm[ix + 1] + iy];
   int bb = g_perm[g_perm[ix + 1] + iy + 1];
   return noise_lerp(v,
      noise_lerp(u, noise_grad2(aa, fx, fy),     noise_grad2(ba, fx - 1, fy)),
      noise_lerp(u, noise_grad2(ab, fx, fy - 1), noise_grad2(bb, fx - 1, fy - 1)));
}

static double perlin_noise_3d(double x, double y, double z)
{
   noise_ensure_init();
   int ix = (int)floor(x) & 255, iy = (int)floor(y) & 255, iz = (int)floor(z) & 255;
   double fx = x - floor(x), fy = y - floor(y), fz = z - floor(z);
   double u = noise_fade(fx), v = noise_fade(fy), w = noise_fade(fz);
   int aaa = g_perm[g_perm[g_perm[ix    ] + iy    ] + iz    ];
   int aab = g_perm[g_perm[g_perm[ix    ] + iy    ] + iz + 1];
   int aba = g_perm[g_perm[g_perm[ix    ] + iy + 1] + iz    ];
   int abb = g_perm[g_perm[g_perm[ix    ] + iy + 1] + iz + 1];
   int baa = g_perm[g_perm[g_perm[ix + 1] + iy    ] + iz    ];
   int bab = g_perm[g_perm[g_perm[ix + 1] + iy    ] + iz + 1];
   int bba = g_perm[g_perm[g_perm[ix + 1] + iy + 1] + iz    ];
   int bbb = g_perm[g_perm[g_perm[ix + 1] + iy + 1] + iz + 1];
   double x1 = noise_lerp(u, noise_grad3(aaa, fx, fy, fz),     noise_grad3(baa, fx-1, fy,   fz));
   double x2 = noise_lerp(u, noise_grad3(aba, fx, fy-1, fz),   noise_grad3(bba, fx-1, fy-1, fz));
   double x3 = noise_lerp(u, noise_grad3(aab, fx, fy,   fz-1), noise_grad3(bab, fx-1, fy,   fz-1));
   double x4 = noise_lerp(u, noise_grad3(abb, fx, fy-1, fz-1), noise_grad3(bbb, fx-1, fy-1, fz-1));
   return noise_lerp(w, noise_lerp(v, x1, x2), noise_lerp(v, x3, x4));
}

static JSValue js_noise(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc == 0) return JS_NewFloat64(ctx, 0.0);
   double x = double_from_js(ctx, argv[0], 0.0);
   if (argc == 1) return JS_NewFloat64(ctx, perlin_noise_2d(x, 0.0));
   double y = double_from_js(ctx, argv[1], 0.0);
   if (argc == 2) return JS_NewFloat64(ctx, perlin_noise_2d(x, y));
   double z = double_from_js(ctx, argv[2], 0.0);
   return JS_NewFloat64(ctx, perlin_noise_3d(x, y, z));
}

static JSValue js_fbm(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewFloat64(ctx, 0.0);
   double x = double_from_js(ctx, argv[0], 0.0);
   double y = double_from_js(ctx, argv[1], 0.0);
   int    octaves    = argc > 2 ? int_from_js(ctx, argv[2], 6)         : 6;
   double lacunarity = argc > 3 ? double_from_js(ctx, argv[3], 2.0)    : 2.0;
   double gain       = argc > 4 ? double_from_js(ctx, argv[4], 0.5)    : 0.5;
   if (octaves < 1) octaves = 1;
   if (octaves > 16) octaves = 16;
   double value = 0.0, amplitude = 0.5, frequency = 1.0, max_val = 0.0;
   for (int i = 0; i < octaves; i++) {
      value    += perlin_noise_2d(x * frequency, y * frequency) * amplitude;
      max_val  += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
   }
   return JS_NewFloat64(ctx, max_val > 0.0 ? value / max_val : 0.0);
}

/* ---------- Game math utilities ---------- */

static JSValue js_lerp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double a = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double b = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double t = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   return JS_NewFloat64(ctx, a + (b - a) * t);
}

static JSValue js_clamp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v  = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double lo = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double hi = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0);
   return JS_NewFloat64(ctx, v < lo ? lo : (v > hi ? hi : v));
}

static JSValue js_map(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v  = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double a  = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double b  = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0);
   double c  = double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0.0);
   double d  = double_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 1.0);
   if (b == a) return JS_NewFloat64(ctx, c);
   return JS_NewFloat64(ctx, c + (v - a) / (b - a) * (d - c));
}

static JSValue js_smoothstep(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double lo = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double hi = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
   double x  = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   double t  = (hi != lo) ? (x - lo) / (hi - lo) : 0.0;
   t = t < 0.0 ? 0.0 : (t > 1.0 ? 1.0 : t);
   return JS_NewFloat64(ctx, t * t * (3.0 - 2.0 * t));
}

static JSValue js_wrap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v  = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double lo = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double hi = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0);
   double range = hi - lo;
   if (range <= 0.0) return JS_NewFloat64(ctx, lo);
   double r = fmod(v - lo, range);
   return JS_NewFloat64(ctx, lo + (r < 0.0 ? r + range : r));
}

static JSValue js_approach(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double cur    = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double target = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double step   = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   if (step <= 0.0) return JS_NewFloat64(ctx, cur);
   double diff = target - cur;
   double absdiff = diff < 0.0 ? -diff : diff;
   if (absdiff <= step) return JS_NewFloat64(ctx, target);
   return JS_NewFloat64(ctx, cur + (diff > 0.0 ? step : -step));
}

static JSValue js_between(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v  = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double lo = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double hi = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   return JS_NewBool(ctx, v >= lo && v <= hi);
}

/* ---------- Camera orbit ---------- */

static JSValue js_set_camera_orbit(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float tx  = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   float ty  = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   float tz  = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   float dist = (float)double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 5.0);
   float az  = (float)(double_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 0.0) * M_PI / 180.0);
   float el  = (float)(double_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, 0.0) * M_PI / 180.0);
   float cosEl = cosf(el), sinEl = sinf(el);
   camera_state.position[0] = tx + dist * cosEl * sinf(az);
   camera_state.position[1] = ty + dist * sinEl;
   camera_state.position[2] = tz + dist * cosEl * cosf(az);
   camera_state.target[0] = tx;
   camera_state.target[1] = ty;
   camera_state.target[2] = tz;
   return JS_UNDEFINED;
}

/* ---------- Camera shake ---------- */

static JSValue js_add_camera_shake(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   float intensity = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.1);
   float duration  = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.3);
   if (intensity > g_shake_intensity) g_shake_intensity = intensity;
   if (duration  > g_shake_timer)     g_shake_timer     = duration;
   g_shake_duration = g_shake_timer;
   return JS_UNDEFINED;
}

static JSValue js_stop_camera_shake(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx; (void)argc; (void)argv;
   g_shake_intensity = 0.0f; g_shake_timer = 0.0f; g_shake_duration = 0.0f;
   return JS_UNDEFINED;
}

/* ---------- Tween system ---------- */

static double tween_ease(int easing, double t)
{
   switch (easing) {
      case NOVA64_TWEEN_QUAD_IN:     return t * t;
      case NOVA64_TWEEN_QUAD_OUT:    return t * (2.0 - t);
      case NOVA64_TWEEN_QUAD_INOUT:  return t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;
      case NOVA64_TWEEN_SINE_IN:     return 1.0 - cos(t * M_PI * 0.5);
      case NOVA64_TWEEN_SINE_OUT:    return sin(t * M_PI * 0.5);
      case NOVA64_TWEEN_CUBIC_IN:    return t * t * t;
      case NOVA64_TWEEN_CUBIC_OUT:   { double s = 1.0 - t; return 1.0 - s*s*s; }
      case NOVA64_TWEEN_BOUNCE_OUT: {
         if (t < 1.0/2.75)       return 7.5625*t*t;
         else if (t < 2.0/2.75)  { t -= 1.5/2.75;  return 7.5625*t*t+0.75; }
         else if (t < 2.5/2.75)  { t -= 2.25/2.75; return 7.5625*t*t+0.9375; }
         else                     { t -= 2.625/2.75;return 7.5625*t*t+0.984375; }
      }
      case NOVA64_TWEEN_ELASTIC_OUT: {
         if (t == 0.0 || t == 1.0) return t;
         return pow(2.0, -10.0*t) * sin((t*10.0-0.75)*(2.0*M_PI/3.0)) + 1.0;
      }
      default: return t; /* linear */
   }
}

static int tween_easing_id(JSContext *ctx, JSValueConst v)
{
   if (!JS_IsString(v)) return NOVA64_TWEEN_LINEAR;
   const char *s = JS_ToCString(ctx, v);
   int id = NOVA64_TWEEN_LINEAR;
   if      (!strcmp(s, "quadIn"))    id = NOVA64_TWEEN_QUAD_IN;
   else if (!strcmp(s, "quadOut"))   id = NOVA64_TWEEN_QUAD_OUT;
   else if (!strcmp(s, "quadInOut")) id = NOVA64_TWEEN_QUAD_INOUT;
   else if (!strcmp(s, "sineIn"))    id = NOVA64_TWEEN_SINE_IN;
   else if (!strcmp(s, "sineOut"))   id = NOVA64_TWEEN_SINE_OUT;
   else if (!strcmp(s, "cubicIn"))   id = NOVA64_TWEEN_CUBIC_IN;
   else if (!strcmp(s, "cubicOut"))  id = NOVA64_TWEEN_CUBIC_OUT;
   else if (!strcmp(s, "bounceOut")) id = NOVA64_TWEEN_BOUNCE_OUT;
   else if (!strcmp(s, "elasticOut"))id = NOVA64_TWEEN_ELASTIC_OUT;
   JS_FreeCString(ctx, s);
   return id;
}

static JSValue js_create_tween(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int slot = -1;
   for (int i = 0; i < NOVA64_MAX_TWEENS; i++) {
      if (!g_tweens[i].used) { slot = i; break; }
   }
   if (slot < 0) return JS_NewInt32(ctx, 0);
   struct nova64_tween *tw = &g_tweens[slot];
   tw->from     = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   tw->to       = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   tw->duration = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0);
   tw->easing   = argc > 3 ? tween_easing_id(ctx, argv[3]) : NOVA64_TWEEN_LINEAR;
   tw->elapsed  = 0.0f;
   tw->done     = 0;
   tw->used     = 1;
   return JS_NewInt32(ctx, slot + 1);
}

static JSValue js_get_tween_value(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int idx = handle - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TWEENS || !g_tweens[idx].used)
      return JS_NewFloat64(ctx, 0.0);
   struct nova64_tween *tw = &g_tweens[idx];
   double t = (tw->duration > 0.0f) ? (double)(tw->elapsed / tw->duration) : 1.0;
   t = t < 0.0 ? 0.0 : (t > 1.0 ? 1.0 : t);
   double et = tween_ease(tw->easing, t);
   return JS_NewFloat64(ctx, (double)tw->from + ((double)tw->to - (double)tw->from) * et);
}

static JSValue js_tween_done(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int idx = handle - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TWEENS || !g_tweens[idx].used) return JS_TRUE;
   return JS_NewBool(ctx, g_tweens[idx].done);
}

static JSValue js_destroy_tween(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int idx = handle - 1;
   if (idx >= 0 && idx < NOVA64_MAX_TWEENS) memset(&g_tweens[idx], 0, sizeof(g_tweens[idx]));
   return JS_UNDEFINED;
}

static JSValue js_reset_tween(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int idx = handle - 1;
   if (idx >= 0 && idx < NOVA64_MAX_TWEENS && g_tweens[idx].used) {
      g_tweens[idx].elapsed = 0.0f; g_tweens[idx].done = 0;
   }
   return JS_UNDEFINED;
}

/* ── sprTransform — rotated/scaled sprite blit ─────────────────────────── */
/* sprTransform(path, cx, cy, angle_deg, scaleX, scaleY
               [, imgw, imgh [, srcx, srcy [, bw, bh]]]) */
static JSValue js_spr_transform(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_NewBool(ctx, false);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewBool(ctx, false);

   float cx2  = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_x;
   float cy2  = (float)double_from_js(ctx, argv[2], 0.0) - (float)cam2d_y;
   float adeg = (float)double_from_js(ctx, argv[3], 0.0);
   float scx  = (float)double_from_js(ctx, argv[4], 1.0);
   float scy  = (float)double_from_js(ctx, argv[5], 1.0);
   if (scx == 0.0f) scx = 0.0001f;
   if (scy == 0.0f) scy = 0.0001f;

   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int img_w = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   int img_h = argc > 7 ? int_from_js(ctx, argv[7], 0) : 0;

   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_NewBool(ctx, false);
      pixels = png_pixels;
      if (img_w <= 0) img_w = pw;
      if (img_h <= 0) img_h = ph;
   }
   if (img_w <= 0 || img_h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      img_w = side > 0 ? side : 1;
      img_h = (int)((asset->size / 4) / (size_t)img_w);
      if (img_h <= 0) img_h = img_w;
   }

   int srcx = argc > 8  ? int_from_js(ctx, argv[8],  0) : 0;
   int srcy = argc > 9  ? int_from_js(ctx, argv[9],  0) : 0;
   int bw   = argc > 10 ? int_from_js(ctx, argv[10], 0) : (img_w - srcx);
   int bh   = argc > 11 ? int_from_js(ctx, argv[11], 0) : (img_h - srcy);
   if (bw <= 0 || bh <= 0) { free(png_pixels); return JS_NewBool(ctx, false); }

   /* Inverse-transform sampling */
   float arad  = adeg * (float)(3.14159265358979323846 / 180.0);
   float cosA  =  cosf(arad);
   float sinA  =  sinf(arad);

   /* Bounding box: radius of the circumscribed rectangle */
   float hw = (float)bw * fabsf(scx) * 0.5f;
   float hh = (float)bh * fabsf(scy) * 0.5f;
   float rad = sqrtf(hw * hw + hh * hh) + 1.0f;
   int x0 = (int)floorf(cx2 - rad);
   int x1 = (int)ceilf(cx2 + rad);
   int y0 = (int)floorf(cy2 - rad);
   int y1 = (int)ceilf(cy2 + rad);

   for (int py = y0; py <= y1; py++) {
      float dy2 = (float)py - cy2;
      for (int px = x0; px <= x1; px++) {
         float dx2 = (float)px - cx2;
         /* Inverse rotate */
         float rx =  dx2 * cosA + dy2 * sinA;
         float ry = -dx2 * sinA + dy2 * cosA;
         /* Inverse scale */
         float fx = rx / scx + (float)bw  * 0.5f + (float)srcx;
         float fy = ry / scy + (float)bh  * 0.5f + (float)srcy;
         int si_x = (int)floorf(fx);
         int si_y = (int)floorf(fy);
         if (si_x < srcx || si_x >= srcx + bw) continue;
         if (si_y < srcy || si_y >= srcy + bh)  continue;
         if (si_x < 0 || si_x >= img_w || si_y < 0 || si_y >= img_h) continue;
         size_t off = ((size_t)si_y * (size_t)img_w + (size_t)si_x) * 4;
         uint8_t r = pixels[off], g = pixels[off+1], b = pixels[off+2], a = pixels[off+3];
         if (a == 0) continue;
         if (a == 255) {
            set_pixel(px, py, rgba8(r, g, b, 255));
         } else {
            uint32_t dst = get_pixel(px, py);
            uint8_t dr = (uint8_t)((dst >> 24) & 0xff);
            uint8_t dg = (uint8_t)((dst >> 16) & 0xff);
            uint8_t db = (uint8_t)((dst >>  8) & 0xff);
            float fa = (float)a / 255.0f;
            set_pixel(px, py, rgba8(
               (uint8_t)(r * fa + dr * (1.0f - fa)),
               (uint8_t)(g * fa + dg * (1.0f - fa)),
               (uint8_t)(b * fa + db * (1.0f - fa)), 255));
         }
      }
   }
   free(png_pixels);
   return JS_NewBool(ctx, true);
}

/* ── Path drawing ─────────────────────────────────────────────────────── */
static JSValue js_begin_path(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   g_path_count = 0; g_path_closed = 0;
   return JS_UNDEFINED;
}
static JSValue js_move_to(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || g_path_count >= NOVA64_MAX_PATH_PTS) return JS_UNDEFINED;
   g_path_pts[g_path_count * 2    ] = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   g_path_pts[g_path_count * 2 + 1] = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   g_path_count++;
   return JS_UNDEFINED;
}
static JSValue js_line_to(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || g_path_count >= NOVA64_MAX_PATH_PTS) return JS_UNDEFINED;
   g_path_pts[g_path_count * 2    ] = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   g_path_pts[g_path_count * 2 + 1] = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   g_path_count++;
   return JS_UNDEFINED;
}
static JSValue js_close_path(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   g_path_closed = 1;
   return JS_UNDEFINED;
}

static void path_draw_line_segment(float x0f, float y0f, float x1f, float y1f, uint32_t color)
{
   int x0 = (int)roundf(x0f), y0 = (int)roundf(y0f);
   int x1 = (int)roundf(x1f), y1 = (int)roundf(y1f);
   int dx = abs(x1 - x0), dy = abs(y1 - y0);
   int sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
   int err = dx - dy;
   while (1) {
      set_pixel(x0, y0, color);
      if (x0 == x1 && y0 == y1) break;
      int e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 <  dx) { err += dx; y0 += sy; }
   }
}

static JSValue js_stroke_path(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (g_path_count < 2) return JS_UNDEFINED;
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(255,255,255,255));
   int segs = g_path_count - 1;
   for (int i = 0; i < segs; i++)
      path_draw_line_segment(g_path_pts[i*2], g_path_pts[i*2+1],
                             g_path_pts[(i+1)*2], g_path_pts[(i+1)*2+1], color);
   if (g_path_closed && g_path_count >= 2)
      path_draw_line_segment(g_path_pts[(g_path_count-1)*2], g_path_pts[(g_path_count-1)*2+1],
                             g_path_pts[0], g_path_pts[1], color);
   return JS_UNDEFINED;
}

/* Scanline polygon fill — even-odd rule */
static JSValue js_fill_path(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (g_path_count < 3) return JS_UNDEFINED;
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(255,255,255,255));
   int n = g_path_count;
   float y_min = g_path_pts[1], y_max = g_path_pts[1];
   for (int i = 1; i < n; i++) {
      float y = g_path_pts[i*2+1];
      if (y < y_min) y_min = y;
      if (y > y_max) y_max = y;
   }
   float xs[NOVA64_MAX_PATH_PTS];
   for (int scanY = (int)floorf(y_min); scanY <= (int)ceilf(y_max); scanY++) {
      float fy = (float)scanY + 0.5f;
      int cnt = 0;
      for (int i = 0; i < n; i++) {
         int j = (i + 1) % n;
         float ay = g_path_pts[i*2+1], by = g_path_pts[j*2+1];
         float ax = g_path_pts[i*2],   bx = g_path_pts[j*2];
         if ((ay <= fy && by > fy) || (by <= fy && ay > fy)) {
            float t = (fy - ay) / (by - ay);
            xs[cnt++] = ax + t * (bx - ax);
         }
      }
      /* bubble sort xs */
      for (int a = 0; a < cnt - 1; a++)
         for (int b = a+1; b < cnt; b++)
            if (xs[a] > xs[b]) { float tmp = xs[a]; xs[a] = xs[b]; xs[b] = tmp; }
      for (int k = 0; k + 1 < cnt; k += 2) {
         int xL = (int)ceilf(xs[k]), xR = (int)floorf(xs[k+1]);
         for (int xp = xL; xp <= xR; xp++)
            set_pixel(xp, scanY, color);
      }
   }
   return JS_UNDEFINED;
}

/* forward declarations needed by batch-8/9 functions */
static int button_index_from_js(JSContext *ctx, JSValueConst value);

/* ── Sprite animation ────────────────────────────────────────────────── */
/* createAnim(path, frameW, frameH, frameCount, fps [, imgW, imgH]) */
static JSValue js_create_anim(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_NewInt32(ctx, 0);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewInt32(ctx, 0);
   for (int i = 0; i < NOVA64_MAX_ANIMS; i++) {
      if (!g_anims[i].used) {
         g_anims[i].used = 1;
         strncpy(g_anims[i].path, path, 255);
         g_anims[i].path[255] = '\0';
         g_anims[i].frame_w    = int_from_js(ctx, argv[1], 16);
         g_anims[i].frame_h    = int_from_js(ctx, argv[2], 16);
         g_anims[i].frame_count = int_from_js(ctx, argv[3], 1);
         g_anims[i].fps        = (float)clamp_double(double_from_js(ctx, argv[4], 12.0), 0.1, 120.0);
         g_anims[i].img_w      = argc > 5 ? int_from_js(ctx, argv[5], 0) : 0;
         g_anims[i].img_h      = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
         g_anims[i].elapsed    = 0.0f;
         JS_FreeCString(ctx, path);
         return JS_NewInt32(ctx, i + 1);
      }
   }
   JS_FreeCString(ctx, path);
   return JS_NewInt32(ctx, 0);
}
static JSValue js_draw_anim(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_ANIMS || !g_anims[idx].used) return JS_UNDEFINED;
   struct nova64_anim *a = &g_anims[idx];
   const struct nova64_package_asset *asset = find_package_asset(a->path);
   if (!asset || !asset->data) return JS_UNDEFINED;
   bool is_png = path_is_png(a->path);
   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int iw = a->img_w, ih = a->img_h;
   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_UNDEFINED;
      pixels = png_pixels;
      if (iw <= 0) iw = pw;
      if (ih <= 0) ih = ph;
   }
   if (iw <= 0 || ih <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      iw = side > 0 ? side : 1;
      ih = (int)((asset->size / 4) / (size_t)iw);
      if (ih <= 0) ih = iw;
   }
   int total_frames = a->frame_count > 0 ? a->frame_count : 1;
   int frame = (int)(a->elapsed * a->fps) % total_frames;
   int tiles_x = iw / a->frame_w;
   if (tiles_x < 1) tiles_x = 1;
   int sx = (frame % tiles_x) * a->frame_w;
   int sy = (frame / tiles_x) * a->frame_h;
   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;
   blit_rgba(pixels, iw, ih, dx, dy, sx, sy, a->frame_w, a->frame_h);
   free(png_pixels);
   return JS_UNDEFINED;
}
static JSValue js_anim_frame(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_ANIMS || !g_anims[idx].used) return JS_NewInt32(ctx, 0);
   int total = g_anims[idx].frame_count > 0 ? g_anims[idx].frame_count : 1;
   return JS_NewInt32(ctx, (int)(g_anims[idx].elapsed * g_anims[idx].fps) % total);
}
static JSValue js_anim_done(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_ANIMS || !g_anims[idx].used) return JS_NewBool(ctx, true);
   struct nova64_anim *a = &g_anims[idx];
   int total = a->frame_count > 0 ? a->frame_count : 1;
   return JS_NewBool(ctx, a->elapsed * a->fps >= (float)total);
}
static JSValue js_set_anim_fps(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_ANIMS || !g_anims[idx].used) return JS_UNDEFINED;
   g_anims[idx].fps = (float)clamp_double(double_from_js(ctx, argv[1], 12.0), 0.1, 120.0);
   return JS_UNDEFINED;
}
static JSValue js_reset_anim(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_ANIMS && g_anims[idx].used) g_anims[idx].elapsed = 0.0f;
   return JS_UNDEFINED;
}
static JSValue js_destroy_anim(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_ANIMS) memset(&g_anims[idx], 0, sizeof(g_anims[idx]));
   return JS_UNDEFINED;
}

/* ── Floating text ───────────────────────────────────────────────────── */
/* createFloatText(text, x, y, vy, life, color) */
static JSValue js_create_float_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   for (int i = 0; i < NOVA64_MAX_FLOAT_TEXTS; i++) {
      if (!g_float_texts[i].used) {
         g_float_texts[i].used  = 1;
         strncpy(g_float_texts[i].text, text, 63);
         g_float_texts[i].text[63] = '\0';
         g_float_texts[i].x    = (float)double_from_js(ctx, argv[1], 0.0);
         g_float_texts[i].y    = (float)double_from_js(ctx, argv[2], 0.0);
         g_float_texts[i].vy   = (float)double_from_js(ctx, argv[3], -30.0);
         g_float_texts[i].life = (float)clamp_double(double_from_js(ctx, argv[4], 1.0), 0.01, 10.0);
         g_float_texts[i].color = color_from_js(ctx, argv[5], rgba8(255, 255, 255, 255));
         break;
      }
   }
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}
static JSValue js_draw_float_texts(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   for (int i = 0; i < NOVA64_MAX_FLOAT_TEXTS; i++) {
      if (!g_float_texts[i].used) continue;
      draw_text_pixels(g_float_texts[i].text,
                       (int)g_float_texts[i].x - cam2d_x,
                       (int)g_float_texts[i].y - cam2d_y,
                       g_float_texts[i].color);
   }
   return JS_UNDEFINED;
}
static JSValue js_clear_float_texts(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx; (void)argc; (void)argv;
   memset(g_float_texts, 0, sizeof(g_float_texts));
   return JS_UNDEFINED;
}
static JSValue js_float_text_count(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   int n = 0;
   for (int i = 0; i < NOVA64_MAX_FLOAT_TEXTS; i++) if (g_float_texts[i].used) n++;
   return JS_NewInt32(ctx, n);
}

/* ── Typewriter dialog ───────────────────────────────────────────────── */
/* createDialog(text, charsPerSec) */
static JSValue js_create_dialog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_NewInt32(ctx, 0);
   float speed = argc > 1 ? (float)clamp_double(double_from_js(ctx, argv[1], 20.0), 0.5, 1000.0) : 20.0f;
   for (int i = 0; i < NOVA64_MAX_DIALOGS; i++) {
      if (!g_dialogs[i].used) {
         g_dialogs[i].used    = 1;
         strncpy(g_dialogs[i].text, text, 511);
         g_dialogs[i].text[511] = '\0';
         g_dialogs[i].len     = (int)strlen(g_dialogs[i].text);
         g_dialogs[i].speed   = speed;
         g_dialogs[i].elapsed = 0.0f;
         JS_FreeCString(ctx, text);
         return JS_NewInt32(ctx, i + 1);
      }
   }
   JS_FreeCString(ctx, text);
   return JS_NewInt32(ctx, 0);
}
static JSValue js_draw_dialog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_DIALOGS || !g_dialogs[idx].used) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int y = int_from_js(ctx, argv[2], 0) - cam2d_y;
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   struct nova64_dialog *d = &g_dialogs[idx];
   int revealed = (int)(d->elapsed * d->speed);
   if (revealed > d->len) revealed = d->len;
   /* draw only `revealed` characters by temporarily truncating */
   char buf[512];
   memcpy(buf, d->text, (size_t)revealed);
   buf[revealed] = '\0';
   draw_text_pixels(buf, x, y, color);
   return JS_UNDEFINED;
}
static JSValue js_dialog_done(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_DIALOGS || !g_dialogs[idx].used) return JS_NewBool(ctx, true);
   struct nova64_dialog *d = &g_dialogs[idx];
   return JS_NewBool(ctx, d->elapsed * d->speed >= (float)d->len);
}
static JSValue js_advance_dialog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_DIALOGS && g_dialogs[idx].used)
      g_dialogs[idx].elapsed = (float)(g_dialogs[idx].len + 1) / g_dialogs[idx].speed;
   return JS_UNDEFINED;
}
static JSValue js_destroy_dialog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_DIALOGS) memset(&g_dialogs[idx], 0, sizeof(g_dialogs[idx]));
   return JS_UNDEFINED;
}
static JSValue js_dialog_char_count(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_DIALOGS || !g_dialogs[idx].used) return JS_NewInt32(ctx, 0);
   struct nova64_dialog *d = &g_dialogs[idx];
   int revealed = (int)(d->elapsed * d->speed);
   if (revealed > d->len) revealed = d->len;
   return JS_NewInt32(ctx, revealed);
}

/* ── Simple FSM ──────────────────────────────────────────────────────── */
static JSValue js_create_fsm(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int init_state = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   for (int i = 0; i < NOVA64_MAX_FSM; i++) {
      if (!g_fsm[i].used) {
         g_fsm[i].used    = 1;
         g_fsm[i].state   = init_state;
         g_fsm[i].prev    = init_state;
         g_fsm[i].elapsed = 0.0f;
         return JS_NewInt32(ctx, i + 1);
      }
   }
   return JS_NewInt32(ctx, 0);
}
static JSValue js_fsm_set(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_FSM || !g_fsm[idx].used) return JS_UNDEFINED;
   int ns = int_from_js(ctx, argv[1], 0);
   if (ns != g_fsm[idx].state) {
      g_fsm[idx].prev    = g_fsm[idx].state;
      g_fsm[idx].state   = ns;
      g_fsm[idx].elapsed = 0.0f;
   }
   return JS_UNDEFINED;
}
static JSValue js_fsm_get(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_FSM || !g_fsm[idx].used) return JS_NewInt32(ctx, -1);
   return JS_NewInt32(ctx, g_fsm[idx].state);
}
static JSValue js_fsm_prev(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_FSM || !g_fsm[idx].used) return JS_NewInt32(ctx, -1);
   return JS_NewInt32(ctx, g_fsm[idx].prev);
}
static JSValue js_fsm_elapsed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_FSM || !g_fsm[idx].used) return JS_NewFloat64(ctx, 0.0);
   return JS_NewFloat64(ctx, (double)g_fsm[idx].elapsed);
}
static JSValue js_destroy_fsm(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_FSM) memset(&g_fsm[idx], 0, sizeof(g_fsm[idx]));
   return JS_UNDEFINED;
}

/* ── Virtual stick ───────────────────────────────────────────────────── */
static JSValue js_vstick_x(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   float ax = analog_axes[0][NOVA64_ANALOG_LEFT][NOVA64_ANALOG_X];
   if (buttons[NOVA64_BTN_LEFT])  ax = -1.0f;
   if (buttons[NOVA64_BTN_RIGHT]) ax =  1.0f;
   return JS_NewFloat64(ctx, (double)ax);
}
static JSValue js_vstick_y(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   float ay = analog_axes[0][NOVA64_ANALOG_LEFT][NOVA64_ANALOG_Y];
   if (buttons[NOVA64_BTN_UP])   ay = -1.0f;
   if (buttons[NOVA64_BTN_DOWN]) ay =  1.0f;
   return JS_NewFloat64(ctx, (double)ay);
}
static JSValue js_vstick_angle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   float ax = analog_axes[0][NOVA64_ANALOG_LEFT][NOVA64_ANALOG_X];
   float ay = analog_axes[0][NOVA64_ANALOG_LEFT][NOVA64_ANALOG_Y];
   if (buttons[NOVA64_BTN_LEFT])  ax = -1.0f;
   if (buttons[NOVA64_BTN_RIGHT]) ax =  1.0f;
   if (buttons[NOVA64_BTN_UP])    ay = -1.0f;
   if (buttons[NOVA64_BTN_DOWN])  ay =  1.0f;
   return JS_NewFloat64(ctx, (double)(atan2f(ay, ax) * (float)(180.0 / 3.14159265358979)));
}
static JSValue js_vstick_length(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   float ax = analog_axes[0][NOVA64_ANALOG_LEFT][NOVA64_ANALOG_X];
   float ay = analog_axes[0][NOVA64_ANALOG_LEFT][NOVA64_ANALOG_Y];
   if (buttons[NOVA64_BTN_LEFT] || buttons[NOVA64_BTN_RIGHT]) ax = buttons[NOVA64_BTN_RIGHT] ? 1.0f : -1.0f;
   if (buttons[NOVA64_BTN_UP]   || buttons[NOVA64_BTN_DOWN])  ay = buttons[NOVA64_BTN_DOWN]  ? 1.0f : -1.0f;
   float len = sqrtf(ax * ax + ay * ay);
   return JS_NewFloat64(ctx, (double)(len > 1.0f ? 1.0f : len));
}

/* ── Seeded RNG ──────────────────────────────────────────────────────── */
/* LCG: next = (seed * 1664525 + 1013904223) & 0xffffffff */
static JSValue js_create_rng(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t seed = (uint32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 12345);
   for (int i = 0; i < NOVA64_MAX_RNGS; i++) {
      if (!g_rngs[i].used) {
         g_rngs[i].used = 1;
         g_rngs[i].seed = seed;
         return JS_NewInt32(ctx, i + 1);
      }
   }
   return JS_NewInt32(ctx, 0);
}
static JSValue js_seeded_rng_next(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_RNGS || !g_rngs[idx].used) return JS_NewFloat64(ctx, 0.0);
   g_rngs[idx].seed = g_rngs[idx].seed * 1664525u + 1013904223u;
   return JS_NewFloat64(ctx, (double)(g_rngs[idx].seed >> 8) / (double)0x00ffffffu);
}
static JSValue js_seeded_rng_range(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewFloat64(ctx, 0.0);
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_RNGS || !g_rngs[idx].used) return JS_NewFloat64(ctx, 0.0);
   double lo = double_from_js(ctx, argv[1], 0.0);
   double hi = double_from_js(ctx, argv[2], 1.0);
   g_rngs[idx].seed = g_rngs[idx].seed * 1664525u + 1013904223u;
   double t = (double)(g_rngs[idx].seed >> 8) / (double)0x00ffffffu;
   return JS_NewFloat64(ctx, lo + t * (hi - lo));
}
static JSValue js_destroy_rng(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_RNGS) memset(&g_rngs[idx], 0, sizeof(g_rngs[idx]));
   return JS_UNDEFINED;
}

/* ── drawGrid ────────────────────────────────────────────────────────── */
/* drawGrid(x1, y1, x2, y2, cols, rows, color) */
static JSValue js_draw_grid_lines(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int x1v = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int y1v = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int x2v = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int y2v = int_from_js(ctx, argv[3], 0) - cam2d_y;
   int cols = int_from_js(ctx, argv[4], 4);
   int rows = int_from_js(ctx, argv[5], 4);
   uint32_t color = color_from_js(ctx, argv[6], rgba8(128, 128, 128, 255));
   if (cols < 1) cols = 1; if (rows < 1) rows = 1;
   int tw = (x2v - x1v), th = (y2v - y1v);
   /* vertical lines */
   for (int c = 0; c <= cols; c++) {
      int x = x1v + c * tw / cols;
      path_draw_line_segment(x, y1v, x, y2v, color);
   }
   /* horizontal lines */
   for (int r = 0; r <= rows; r++) {
      int y = y1v + r * th / rows;
      path_draw_line_segment(x1v, y, x2v, y, color);
   }
   return JS_UNDEFINED;
}

/* ── Math globals ────────────────────────────────────────────────────── */
static JSValue js_math_floor(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   return JS_NewFloat64(ctx, floor(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0)));
}
static JSValue js_math_ceil(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   return JS_NewFloat64(ctx, ceil(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0)));
}
static JSValue js_math_round(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   return JS_NewFloat64(ctx, floor(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0) + 0.5));
}
static JSValue js_math_fract(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   return JS_NewFloat64(ctx, v - floor(v));
}
static JSValue js_math_sign(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   return JS_NewFloat64(ctx, v > 0.0 ? 1.0 : v < 0.0 ? -1.0 : 0.0);
}
static JSValue js_math_pow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double b2 = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double e  = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 2.0);
   return JS_NewFloat64(ctx, pow(b2, e));
}
static JSValue js_math_abs(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   return JS_NewFloat64(ctx, fabs(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0)));
}
static JSValue js_math_sqrt(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   return JS_NewFloat64(ctx, sqrt(fabs(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0))));
}

/* ── screenMosaic ────────────────────────────────────────────────────── */
/* screenMosaic(n) — scale down by n (nearest pixel) then scale back up */
static JSValue js_screen_mosaic(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int n = argc > 0 ? int_from_js(ctx, argv[0], 4) : 4;
   if (n < 2) { return JS_UNDEFINED; }
   if (n > 64) n = 64;
   if (!framebuffer) return JS_UNDEFINED;
   for (int y = 0; y < NOVA64_HEIGHT; y += n) {
      for (int x = 0; x < NOVA64_WIDTH; x += n) {
         uint32_t c = (x < NOVA64_WIDTH && y < NOVA64_HEIGHT)
            ? framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x]
            : rgba8(0, 0, 0, 255);
         for (int dy2 = 0; dy2 < n && y + dy2 < NOVA64_HEIGHT; dy2++)
            for (int dx2 = 0; dx2 < n && x + dx2 < NOVA64_WIDTH; dx2++)
               framebuffer[(size_t)(y + dy2) * NOVA64_WIDTH + (size_t)(x + dx2)] = c;
      }
   }
   return JS_UNDEFINED;
}

/* ── Color inspection ────────────────────────────────────────────────── */
static JSValue js_color_invert(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   uint8_t rv = (uint8_t)(255 - ((c >> 24) & 0xff));
   uint8_t gv = (uint8_t)(255 - ((c >> 16) & 0xff));
   uint8_t bv = (uint8_t)(255 - ((c >>  8) & 0xff));
   return JS_NewInt32(ctx, (int32_t)rgba8(rv, gv, bv, 255));
}
static JSValue js_color_grayscale_val(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int rv = (int)((c >> 24) & 0xff);
   int gv = (int)((c >> 16) & 0xff);
   int bv = (int)((c >>  8) & 0xff);
   int gray = (rv * 77 + gv * 150 + bv * 29) >> 8; /* BT.601 */
   return JS_NewInt32(ctx, gray);
}
static JSValue js_color_to_hsv(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   float rv = (float)((c >> 24) & 0xff) / 255.0f;
   float gv = (float)((c >> 16) & 0xff) / 255.0f;
   float bv = (float)((c >>  8) & 0xff) / 255.0f;
   float cmax = rv > gv ? (rv > bv ? rv : bv) : (gv > bv ? gv : bv);
   float cmin = rv < gv ? (rv < bv ? rv : bv) : (gv < bv ? gv : bv);
   float delta = cmax - cmin;
   float hv = 0.0f;
   if (delta > 0.0001f) {
      if (cmax == rv)      hv = 60.0f * fmodf((gv - bv) / delta, 6.0f);
      else if (cmax == gv) hv = 60.0f * ((bv - rv) / delta + 2.0f);
      else                 hv = 60.0f * ((rv - gv) / delta + 4.0f);
      if (hv < 0.0f) hv += 360.0f;
   }
   float sv = cmax > 0.0001f ? delta / cmax : 0.0f;
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "h", JS_NewFloat64(ctx, (double)hv));
   JS_SetPropertyStr(ctx, obj, "s", JS_NewFloat64(ctx, (double)sv));
   JS_SetPropertyStr(ctx, obj, "v", JS_NewFloat64(ctx, (double)cmax));
   return obj;
}

/* ── drawStarBurst / fillStarBurst ───────────────────────────────────── */
static void draw_star_shape(int cx2, int cy2, int spokes, float ir, float or2, uint32_t color, bool filled)
{
   if (spokes < 3) spokes = 3;
   float step = (float)(3.14159265358979323846 * 2.0) / (float)(spokes * 2);
   float pts[64];
   int npts = spokes * 2;
   if (npts > 32) npts = 32;
   for (int i = 0; i < npts; i++) {
      float ang = (float)i * step - (float)(3.14159265358979323846 / 2.0);
      float r = (i % 2 == 0) ? or2 : ir;
      pts[i * 2    ] = (float)cx2 + cosf(ang) * r;
      pts[i * 2 + 1] = (float)cy2 + sinf(ang) * r;
   }
   if (!filled) {
      for (int i = 0; i < npts; i++) {
         int j = (i + 1) % npts;
         path_draw_line_segment((int)pts[i*2], (int)pts[i*2+1], (int)pts[j*2], (int)pts[j*2+1], color);
      }
   } else {
      /* scanline fill using even-odd rule */
      float ymin = pts[1], ymax = pts[1];
      for (int i = 1; i < npts; i++) {
         if (pts[i*2+1] < ymin) ymin = pts[i*2+1];
         if (pts[i*2+1] > ymax) ymax = pts[i*2+1];
      }
      float xs[32];
      for (int scanY = (int)ymin; scanY <= (int)ymax; scanY++) {
         float fy = (float)scanY + 0.5f;
         int cnt = 0;
         for (int i = 0; i < npts && cnt < 32; i++) {
            int j = (i + 1) % npts;
            float ay = pts[i*2+1], by = pts[j*2+1];
            float ax = pts[i*2  ], bx = pts[j*2  ];
            if ((ay <= fy && by > fy) || (by <= fy && ay > fy)) {
               float t = (fy - ay) / (by - ay);
               xs[cnt++] = ax + t * (bx - ax);
            }
         }
         for (int a = 0; a < cnt - 1; a++)
            for (int b = a+1; b < cnt; b++)
               if (xs[a] > xs[b]) { float tmp = xs[a]; xs[a] = xs[b]; xs[b] = tmp; }
         for (int k = 0; k + 1 < cnt; k += 2) {
            int xL = (int)ceilf(xs[k]), xR = (int)floorf(xs[k+1]);
            for (int xp = xL; xp <= xR; xp++) set_pixel(xp, scanY, color);
         }
      }
   }
}
static JSValue js_draw_star_burst(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int cx2 = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int cy2 = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int spokes = int_from_js(ctx, argv[2], 5);
   float ir = (float)double_from_js(ctx, argv[3], 10.0);
   float or2 = (float)double_from_js(ctx, argv[4], 20.0);
   uint32_t color = color_from_js(ctx, argv[5], rgba8(255, 255, 255, 255));
   draw_star_shape(cx2, cy2, spokes, ir, or2, color, false);
   return JS_UNDEFINED;
}
static JSValue js_fill_star_burst(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int cx2 = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int cy2 = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int spokes = int_from_js(ctx, argv[2], 5);
   float ir = (float)double_from_js(ctx, argv[3], 10.0);
   float or2 = (float)double_from_js(ctx, argv[4], 20.0);
   uint32_t color = color_from_js(ctx, argv[5], rgba8(255, 255, 255, 255));
   draw_star_shape(cx2, cy2, spokes, ir, or2, color, true);
   return JS_UNDEFINED;
}

/* ── colorRainbow / colorTemperature ─────────────────────────────────── */
static JSValue js_color_rainbow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float t = (float)clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   /* HSV: hue 0-360, full saturation+value */
   float hue = t * 360.0f;
   float sv = 1.0f;
   /* HSV to RGB */
   float hh = hue / 60.0f;
   int sector = (int)hh;
   float frac = hh - (float)sector;
   float p = 0.0f, q2 = 1.0f - frac, tv = frac;
   float rv2 = 0.0f, gv2 = 0.0f, bv2 = 0.0f;
   (void)p; (void)sv;
   switch (sector % 6) {
      case 0: rv2 = 1.0f; gv2 = tv;   bv2 = 0.0f; break;
      case 1: rv2 = q2;   gv2 = 1.0f; bv2 = 0.0f; break;
      case 2: rv2 = 0.0f; gv2 = 1.0f; bv2 = tv;   break;
      case 3: rv2 = 0.0f; gv2 = q2;   bv2 = 1.0f; break;
      case 4: rv2 = tv;   gv2 = 0.0f; bv2 = 1.0f; break;
      default: rv2 = 1.0f; gv2 = 0.0f; bv2 = q2;  break;
   }
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)(rv2*255), (uint8_t)(gv2*255), (uint8_t)(bv2*255), 255));
}
static JSValue js_color_temperature(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   /* t=0→blue, t=0.5→white, t=1→red (thermal colormap) */
   float t = (float)clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.5), 0.0, 1.0);
   uint8_t rv2, gv2, bv2;
   if (t < 0.5f) {
      float u = t * 2.0f;
      rv2 = (uint8_t)(u * 255);
      gv2 = (uint8_t)(u * 255);
      bv2 = 255;
   } else {
      float u = (t - 0.5f) * 2.0f;
      rv2 = 255;
      gv2 = (uint8_t)((1.0f - u) * 255);
      bv2 = (uint8_t)((1.0f - u) * 255);
   }
   return JS_NewInt32(ctx, (int32_t)rgba8(rv2, gv2, bv2, 255));
}

/* ── Batch 10: curves, math, geometry, text, color, string ──────────── */

/* drawBezier(x0,y0, cx,cy, x1,y1, color [,steps]) — quadratic Bezier */
static JSValue js_draw_bezier(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   double x0 = double_from_js(ctx, argv[0], 0.0);
   double y0 = double_from_js(ctx, argv[1], 0.0);
   double cx2 = double_from_js(ctx, argv[2], 0.0);
   double cy2 = double_from_js(ctx, argv[3], 0.0);
   double x1 = double_from_js(ctx, argv[4], 0.0);
   double y1 = double_from_js(ctx, argv[5], 0.0);
   uint32_t color = color_from_js(ctx, argv[6], 0xffffffff);
   int steps = argc > 7 ? int_from_js(ctx, argv[7], 32) : 32;
   if (steps < 2) steps = 2;
   if (steps > 256) steps = 256;
   double px = x0, py = y0;
   for (int i = 1; i <= steps; i++) {
      double t = (double)i / (double)steps;
      double mt = 1.0 - t;
      double nx = mt*mt*x0 + 2.0*mt*t*cx2 + t*t*x1;
      double ny = mt*mt*y0 + 2.0*mt*t*cy2 + t*t*y1;
      path_draw_line_segment((int)round(px), (int)round(py), (int)round(nx), (int)round(ny), color);
      px = nx; py = ny;
   }
   return JS_UNDEFINED;
}

/* polyline(points, color [,closed]) — array of x,y pairs connected by lines */
static JSValue js_polyline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   if (!JS_IsArray(argv[0])) return JS_UNDEFINED;
   uint32_t color = color_from_js(ctx, argv[1], 0xffffffff);
   int closed = argc > 2 ? JS_ToBool(ctx, argv[2]) : 0;
   JSValue len_v = JS_GetPropertyStr(ctx, argv[0], "length");
   int len = 0;
   JS_ToInt32(ctx, &len, len_v);
   JS_FreeValue(ctx, len_v);
   if (len < 4) return JS_UNDEFINED;
   double px = 0, py = 0, fx = 0, fy = 0;
   for (int i = 0; i + 1 < len; i += 2) {
      JSValue xv = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)i);
      JSValue yv = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)(i+1));
      double x = double_from_js(ctx, xv, 0.0);
      double y = double_from_js(ctx, yv, 0.0);
      JS_FreeValue(ctx, xv); JS_FreeValue(ctx, yv);
      if (i == 0) { fx = x; fy = y; }
      else { path_draw_line_segment((int)round(px),(int)round(py),(int)round(x),(int)round(y),color); }
      px = x; py = y;
   }
   if (closed) path_draw_line_segment((int)round(px),(int)round(py),(int)round(fx),(int)round(fy),color);
   return JS_UNDEFINED;
}

/* printWrap(text, x, y, maxWidth, color [,lineH]) — word-wrap text */
static JSValue js_print_wrap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0);
   int y = int_from_js(ctx, argv[2], 0);
   int maxW = int_from_js(ctx, argv[3], 100);
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   int lineH = argc > 5 ? int_from_js(ctx, argv[5], 10) : 10;
   if (lineH < 1) lineH = 1;
   /* word-wrap: split on spaces, measure with text_pixel_width */
   char line[512]; line[0] = '\0';
   char word[128];
   int curY = y;
   const char *p = text;
   while (*p) {
      int wi = 0;
      while (*p && *p != ' ' && *p != '\n' && wi < 127) word[wi++] = *p++;
      word[wi] = '\0';
      if (*p == ' ') p++;
      if (wi == 0) { if (*p == '\n') { p++; draw_text_pixels(line, x + (int)cam2d_x, curY + (int)cam2d_y, color); line[0]='\0'; curY += lineH; } continue; }
      char test[512];
      snprintf(test, sizeof(test), "%s%s%s", line, line[0] ? " " : "", word);
      if (text_pixel_width(test) > maxW && line[0]) {
         draw_text_pixels(line, x + (int)cam2d_x, curY + (int)cam2d_y, color);
         curY += lineH;
         snprintf(line, sizeof(line), "%s", word);
      } else {
         snprintf(line, sizeof(line), "%s", test);
      }
      if (*p == '\n') { p++; draw_text_pixels(line, x + (int)cam2d_x, curY + (int)cam2d_y, color); line[0]='\0'; curY += lineH; }
   }
   if (line[0]) draw_text_pixels(line, x + (int)cam2d_x, curY + (int)cam2d_y, color);
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* mapRange(v, inLo, inHi, outLo, outHi) */
static JSValue js_map_range(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_NewFloat64(ctx, 0.0);
   double v    = double_from_js(ctx, argv[0], 0.0);
   double inLo = double_from_js(ctx, argv[1], 0.0);
   double inHi = double_from_js(ctx, argv[2], 1.0);
   double outLo= double_from_js(ctx, argv[3], 0.0);
   double outHi= double_from_js(ctx, argv[4], 1.0);
   double t = (inHi != inLo) ? (v - inLo) / (inHi - inLo) : 0.0;
   return JS_NewFloat64(ctx, outLo + t * (outHi - outLo));
}

/* inverseLerp(a, b, v) — returns t such that lerp(a,b,t)=v */
static JSValue js_inverse_lerp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewFloat64(ctx, 0.0);
   double a = double_from_js(ctx, argv[0], 0.0);
   double b = double_from_js(ctx, argv[1], 1.0);
   double v = double_from_js(ctx, argv[2], 0.0);
   return JS_NewFloat64(ctx, (b != a) ? (v - a) / (b - a) : 0.0);
}

/* pingPong(t, len) — triangular oscillation 0..len..0 */
static JSValue js_ping_pong(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t   = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   double len = argc > 1 ? double_from_js(ctx, argv[1], 1.0) : 1.0;
   if (len <= 0.0) return JS_NewFloat64(ctx, 0.0);
   double cycle = fmod(t, len * 2.0);
   if (cycle < 0.0) cycle += len * 2.0;
   return JS_NewFloat64(ctx, cycle < len ? cycle : len * 2.0 - cycle);
}

/* pointInRect(px, py, rx, ry, rw, rh) */
static JSValue js_point_in_rect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_FALSE;
   double px2 = double_from_js(ctx, argv[0], 0.0);
   double py2 = double_from_js(ctx, argv[1], 0.0);
   double rx  = double_from_js(ctx, argv[2], 0.0);
   double ry  = double_from_js(ctx, argv[3], 0.0);
   double rw  = double_from_js(ctx, argv[4], 0.0);
   double rh  = double_from_js(ctx, argv[5], 0.0);
   return JS_NewBool(ctx, px2 >= rx && px2 < rx+rw && py2 >= ry && py2 < ry+rh);
}

/* pointInCirc(px, py, cx, cy, r) */
static JSValue js_point_in_circ(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_FALSE;
   double px2 = double_from_js(ctx, argv[0], 0.0);
   double py2 = double_from_js(ctx, argv[1], 0.0);
   double cx2 = double_from_js(ctx, argv[2], 0.0);
   double cy2 = double_from_js(ctx, argv[3], 0.0);
   double r2  = double_from_js(ctx, argv[4], 0.0);
   double dx  = px2 - cx2, dy = py2 - cy2;
   return JS_NewBool(ctx, dx*dx + dy*dy <= r2*r2);
}

/* rectIntersects(ax,ay,aw,ah, bx,by,bw,bh) */
static JSValue js_rect_intersects(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 8) return JS_FALSE;
   double ax = double_from_js(ctx, argv[0], 0.0), ay = double_from_js(ctx, argv[1], 0.0);
   double aw = double_from_js(ctx, argv[2], 0.0), ah = double_from_js(ctx, argv[3], 0.0);
   double bx = double_from_js(ctx, argv[4], 0.0), by = double_from_js(ctx, argv[5], 0.0);
   double bw = double_from_js(ctx, argv[6], 0.0), bh = double_from_js(ctx, argv[7], 0.0);
   return JS_NewBool(ctx, ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by);
}

/* circIntersects(ax,ay,ar, bx,by,br) */
static JSValue js_circ_intersects(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_FALSE;
   double ax = double_from_js(ctx, argv[0], 0.0), ay = double_from_js(ctx, argv[1], 0.0);
   double ar = double_from_js(ctx, argv[2], 0.0);
   double bx = double_from_js(ctx, argv[3], 0.0), by = double_from_js(ctx, argv[4], 0.0);
   double br = double_from_js(ctx, argv[5], 0.0);
   double dx = ax - bx, dy = ay - by, sum = ar + br;
   return JS_NewBool(ctx, dx*dx + dy*dy <= sum*sum);
}

/* colorBlend(c1, c2, mode) — modes: 'add','multiply','screen','overlay' */
static JSValue js_color_blend_mode(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewInt32(ctx, 0);
   uint32_t c1 = (uint32_t)color_from_js(ctx, argv[0], 0);
   uint32_t c2 = (uint32_t)color_from_js(ctx, argv[1], 0);
   const char *mode = JS_ToCString(ctx, argv[2]);
   if (!mode) return JS_NewInt32(ctx, (int32_t)c1);
   uint8_t r1=(uint8_t)(c1>>24),g1=(uint8_t)(c1>>16),b1=(uint8_t)(c1>>8),a1=(uint8_t)c1;
   uint8_t r2=(uint8_t)(c2>>24),g2=(uint8_t)(c2>>16),b2=(uint8_t)(c2>>8),a2=(uint8_t)c2;
   uint8_t ro,go,bo,ao;
   (void)a2;
   ao = a1;
   if (strcmp(mode, "add") == 0) {
      ro = (uint8_t)(r1+r2 > 255 ? 255 : r1+r2);
      go = (uint8_t)(g1+g2 > 255 ? 255 : g1+g2);
      bo = (uint8_t)(b1+b2 > 255 ? 255 : b1+b2);
   } else if (strcmp(mode, "multiply") == 0) {
      ro = (uint8_t)(r1*r2/255); go = (uint8_t)(g1*g2/255); bo = (uint8_t)(b1*b2/255);
   } else if (strcmp(mode, "screen") == 0) {
      ro = (uint8_t)(255 - (255-r1)*(255-r2)/255);
      go = (uint8_t)(255 - (255-g1)*(255-g2)/255);
      bo = (uint8_t)(255 - (255-b1)*(255-b2)/255);
   } else if (strcmp(mode, "overlay") == 0) {
      ro = r1 < 128 ? (uint8_t)(2*r1*r2/255) : (uint8_t)(255 - 2*(255-r1)*(255-r2)/255);
      go = g1 < 128 ? (uint8_t)(2*g1*g2/255) : (uint8_t)(255 - 2*(255-g1)*(255-g2)/255);
      bo = b1 < 128 ? (uint8_t)(2*b1*b2/255) : (uint8_t)(255 - 2*(255-b1)*(255-b2)/255);
   } else {
      ro=r1; go=g1; bo=b1;
   }
   JS_FreeCString(ctx, mode);
   return JS_NewInt32(ctx, (int32_t)((ro<<24)|(go<<16)|(bo<<8)|ao));
}

/* floodFill(x, y, color) — BFS flood fill on the 2D framebuffer */
static JSValue js_flood_fill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3 || !framebuffer) return JS_UNDEFINED;
   int fx = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int fy = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   uint32_t fill_col = (uint32_t)color_from_js(ctx, argv[2], 0xffffffff);
   if (fx < 0 || fx >= NOVA64_WIDTH || fy < 0 || fy >= NOVA64_HEIGHT) return JS_UNDEFINED;
   uint32_t target = framebuffer[fy * NOVA64_WIDTH + fx];
   if (target == fill_col) return JS_UNDEFINED;
   int head = 0, tail = 0;
   g_flood_queue[tail].x = (int16_t)fx; g_flood_queue[tail].y = (int16_t)fy;
   tail = (tail + 1) & (NOVA64_FLOOD_QUEUE_SIZE - 1);
   framebuffer[fy * NOVA64_WIDTH + fx] = fill_col;
   static const int dx4[4] = {1,-1,0,0};
   static const int dy4[4] = {0,0,1,-1};
   while (head != tail) {
      int cx2 = g_flood_queue[head].x, cy2 = g_flood_queue[head].y;
      head = (head + 1) & (NOVA64_FLOOD_QUEUE_SIZE - 1);
      for (int d = 0; d < 4; d++) {
         int nx = cx2 + dx4[d], ny = cy2 + dy4[d];
         if (nx < 0 || nx >= NOVA64_WIDTH || ny < 0 || ny >= NOVA64_HEIGHT) continue;
         if (framebuffer[ny * NOVA64_WIDTH + nx] != target) continue;
         framebuffer[ny * NOVA64_WIDTH + nx] = fill_col;
         int next = (tail + 1) & (NOVA64_FLOOD_QUEUE_SIZE - 1);
         if (next != head) {
            g_flood_queue[tail].x = (int16_t)nx; g_flood_queue[tail].y = (int16_t)ny;
            tail = next;
         }
      }
   }
   return JS_UNDEFINED;
}

/* strReplace(str, from, to) */
static JSValue js_str_replace(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewString(ctx, "");
   const char *s   = JS_ToCString(ctx, argv[0]);
   const char *from= JS_ToCString(ctx, argv[1]);
   const char *to  = JS_ToCString(ctx, argv[2]);
   if (!s || !from || !to) {
      if (s) JS_FreeCString(ctx, s); if (from) JS_FreeCString(ctx, from); if (to) JS_FreeCString(ctx, to);
      return JS_NewString(ctx, s ? s : "");
   }
   size_t flen = strlen(from);
   char buf[1024]; int bi = 0;
   const char *p = s;
   while (*p && bi < 1020) {
      if (flen > 0 && strncmp(p, from, flen) == 0) {
         for (int j = 0; to[j] && bi < 1020; j++) buf[bi++] = to[j];
         p += flen;
      } else { buf[bi++] = *p++; }
   }
   buf[bi] = '\0';
   JS_FreeCString(ctx, s); JS_FreeCString(ctx, from); JS_FreeCString(ctx, to);
   return JS_NewString(ctx, buf);
}

/* strContains(str, sub) */
static JSValue js_str_contains(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_FALSE;
   const char *s   = JS_ToCString(ctx, argv[0]);
   const char *sub = JS_ToCString(ctx, argv[1]);
   if (!s || !sub) { if(s) JS_FreeCString(ctx,s); if(sub) JS_FreeCString(ctx,sub); return JS_FALSE; }
   int r = strstr(s, sub) != NULL;
   JS_FreeCString(ctx, s); JS_FreeCString(ctx, sub);
   return JS_NewBool(ctx, r);
}

/* strUpper(str) */
static JSValue js_str_upper(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "");
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s) return JS_NewString(ctx, "");
   char buf[512]; int i;
   for (i = 0; s[i] && i < 511; i++) buf[i] = (char)toupper((unsigned char)s[i]);
   buf[i] = '\0';
   JS_FreeCString(ctx, s);
   return JS_NewString(ctx, buf);
}

/* strLower(str) */
static JSValue js_str_lower(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "");
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s) return JS_NewString(ctx, "");
   char buf[512]; int i;
   for (i = 0; s[i] && i < 511; i++) buf[i] = (char)tolower((unsigned char)s[i]);
   buf[i] = '\0';
   JS_FreeCString(ctx, s);
   return JS_NewString(ctx, buf);
}

/* wrapAngle(a) — wraps angle to [0, 360) */
static JSValue js_wrap_angle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double a = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   a = fmod(a, 360.0);
   if (a < 0.0) a += 360.0;
   return JS_NewFloat64(ctx, a);
}

/* angleDiff(a, b) — shortest angular difference in degrees, signed */
static JSValue js_angle_diff(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewFloat64(ctx, 0.0);
   double a = double_from_js(ctx, argv[0], 0.0);
   double b = double_from_js(ctx, argv[1], 0.0);
   double d = fmod(b - a + 360.0, 360.0);
   if (d > 180.0) d -= 360.0;
   return JS_NewFloat64(ctx, d);
}

/* angleLerp(a, b, t) — lerp angles (shortest path) */
static JSValue js_angle_lerp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewFloat64(ctx, 0.0);
   double a = double_from_js(ctx, argv[0], 0.0);
   double b = double_from_js(ctx, argv[1], 0.0);
   double t = double_from_js(ctx, argv[2], 0.0);
   double d = fmod(b - a + 360.0, 360.0);
   if (d > 180.0) d -= 360.0;
   double r = fmod(a + d * t + 360.0, 360.0);
   return JS_NewFloat64(ctx, r);
}

/* moveToward(from, to, step) — move from toward to by at most step */
static JSValue js_move_toward(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewFloat64(ctx, 0.0);
   double from = double_from_js(ctx, argv[0], 0.0);
   double to   = double_from_js(ctx, argv[1], 0.0);
   double step = fabs(double_from_js(ctx, argv[2], 1.0));
   double diff = to - from;
   if (fabs(diff) <= step) return JS_NewFloat64(ctx, to);
   return JS_NewFloat64(ctx, from + (diff > 0 ? step : -step));
}

/* vecLen(x, y) */
static JSValue js_vec_len(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double x = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   double y = argc > 1 ? double_from_js(ctx, argv[1], 0.0) : 0.0;
   return JS_NewFloat64(ctx, sqrt(x*x + y*y));
}

/* vecNorm(x, y) → {x, y} */
static JSValue js_vec_norm(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double x = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   double y = argc > 1 ? double_from_js(ctx, argv[1], 0.0) : 0.0;
   double len = sqrt(x*x + y*y);
   JSValue obj = JS_NewObject(ctx);
   if (len > 1e-12) {
      JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, x/len));
      JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, y/len));
   } else {
      JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, 0.0));
      JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, 0.0));
   }
   return obj;
}

/* vecDot(x1,y1, x2,y2) */
static JSValue js_vec_dot(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_NewFloat64(ctx, 0.0);
   double x1 = double_from_js(ctx, argv[0], 0.0), y1 = double_from_js(ctx, argv[1], 0.0);
   double x2 = double_from_js(ctx, argv[2], 0.0), y2 = double_from_js(ctx, argv[3], 0.0);
   return JS_NewFloat64(ctx, x1*x2 + y1*y2);
}

/* vecCross(x1,y1, x2,y2) — 2D cross (z component) */
static JSValue js_vec_cross(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_NewFloat64(ctx, 0.0);
   double x1 = double_from_js(ctx, argv[0], 0.0), y1 = double_from_js(ctx, argv[1], 0.0);
   double x2 = double_from_js(ctx, argv[2], 0.0), y2 = double_from_js(ctx, argv[3], 0.0);
   return JS_NewFloat64(ctx, x1*y2 - y1*x2);
}

/* vecLerp(x1,y1, x2,y2, t) → {x,y} */
static JSValue js_vec_lerp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_NewObject(ctx);
   double x1 = double_from_js(ctx, argv[0], 0.0), y1 = double_from_js(ctx, argv[1], 0.0);
   double x2 = double_from_js(ctx, argv[2], 0.0), y2 = double_from_js(ctx, argv[3], 0.0);
   double t  = double_from_js(ctx, argv[4], 0.0);
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, x1 + (x2-x1)*t));
   JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, y1 + (y2-y1)*t));
   return obj;
}

/* ── Batch 21: nested rects, parallelogram, trapezoid, polygon, duotone ─── */

/* drawNestedRects(x,y,w,h,n,gap,color) */
static JSValue js_draw_nested_rects(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int nx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int ny=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int nw=(int)double_from_js(ctx,argv[2],100.0);
   int nh=(int)double_from_js(ctx,argv[3],80.0);
   int nn=(int)double_from_js(ctx,argv[4],4.0);
   int ng=(int)double_from_js(ctx,argv[5],5.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   for (int i=0;i<nn;i++){
      int rw=nw-i*ng*2, rh=nh-i*ng*2;
      if (rw<2||rh<2) break;
      int rx=nx+i*ng, ry=ny+i*ng;
      for (int x2=rx;x2<rx+rw;x2++) { set_pixel(x2,ry,col); set_pixel(x2,ry+rh-1,col); }
      for (int y2=ry;y2<ry+rh;y2++) { set_pixel(rx,y2,col); set_pixel(rx+rw-1,y2,col); }
   }
   return JS_UNDEFINED;
}

/* fillNestedRects(x,y,w,h,n,gap,c1,c2) — alternating fill */
static JSValue js_fill_nested_rects(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 8) return JS_UNDEFINED;
   int nx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int ny=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int nw=(int)double_from_js(ctx,argv[2],100.0);
   int nh=(int)double_from_js(ctx,argv[3],80.0);
   int nn=(int)double_from_js(ctx,argv[4],4.0);
   int ng=(int)double_from_js(ctx,argv[5],5.0);
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[7],0xFF000000u);
   /* fill outermost to innermost */
   for (int i=nn-1;i>=0;i--){
      int rw=nw-i*ng*2, rh=nh-i*ng*2;
      if (rw<1||rh<1) continue;
      int rx=nx+i*ng, ry=ny+i*ng;
      uint32_t col=(i%2==0)?c1:c2;
      for (int y2=ry;y2<ry+rh;y2++)
         for (int x2=rx;x2<rx+rw;x2++) set_pixel(x2,y2,col);
   }
   return JS_UNDEFINED;
}

/* drawParallelogram(x,y,w,h,skew,color) — outline parallelogram */
static JSValue js_draw_parallelogram(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int px=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int py=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int pw=(int)double_from_js(ctx,argv[2],80.0);
   int ph=(int)double_from_js(ctx,argv[3],40.0);
   int sk=(int)double_from_js(ctx,argv[4],20.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   /* corners: top-left=(px+sk,py), top-right=(px+sk+pw,py),
               bottom-left=(px,py+ph), bottom-right=(px+pw,py+ph) */
   path_draw_line_segment(px+sk, py,    px+sk+pw, py,    col);
   path_draw_line_segment(px+sk+pw,py,  px+pw,   py+ph, col);
   path_draw_line_segment(px+pw,  py+ph,px,      py+ph, col);
   path_draw_line_segment(px,     py+ph,px+sk,   py,    col);
   return JS_UNDEFINED;
}

/* fillParallelogram(x,y,w,h,skew,color) */
static JSValue js_fill_parallelogram(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int px=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int py=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int pw=(int)double_from_js(ctx,argv[2],80.0);
   int ph=(int)double_from_js(ctx,argv[3],40.0);
   int sk=(int)double_from_js(ctx,argv[4],20.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   for (int y2=py;y2<py+ph;y2++){
      double t=(double)(y2-py)/ph;
      int x0=px+(int)(sk*(1.0-t));
      for (int x2=x0;x2<x0+pw;x2++) set_pixel(x2,y2,col);
   }
   return JS_UNDEFINED;
}

/* drawTrapezoid(x,y,w1,w2,h,color) — top width w1, bottom width w2 */
static JSValue js_draw_trapezoid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int tx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int ty=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int w1=(int)double_from_js(ctx,argv[2],80.0);
   int w2=(int)double_from_js(ctx,argv[3],60.0);
   int th=(int)double_from_js(ctx,argv[4],40.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   int off=(w2-w1)/2;
   /* top edge */
   path_draw_line_segment(tx,    ty,    tx+w1, ty,    col);
   /* bottom edge */
   path_draw_line_segment(tx+off,ty+th, tx+off+w2,ty+th, col);
   /* sides */
   path_draw_line_segment(tx,    ty,    tx+off,    ty+th, col);
   path_draw_line_segment(tx+w1, ty,    tx+off+w2, ty+th, col);
   return JS_UNDEFINED;
}

/* fillTrapezoid(x,y,w1,w2,h,color) */
static JSValue js_fill_trapezoid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int tx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int ty=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int w1=(int)double_from_js(ctx,argv[2],80.0);
   int w2=(int)double_from_js(ctx,argv[3],60.0);
   int th=(int)double_from_js(ctx,argv[4],40.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   if (th<=0) return JS_UNDEFINED;
   for (int y2=ty;y2<ty+th;y2++){
      double t=(double)(y2-ty)/th;
      int cw=(int)(w1+(w2-w1)*t);
      int off=(w2-w1)/2;
      int x0=(int)(tx+off*(1.0-t));
      for (int x2=x0;x2<x0+cw;x2++) set_pixel(x2,y2,col);
   }
   return JS_UNDEFINED;
}

/* drawConcentricPolygons(cx,cy,sides,r,n,gap,color) */
static JSValue js_draw_concentric_polygons(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int pcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int pcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int sides=(int)double_from_js(ctx,argv[2],6.0);
   double pr =double_from_js(ctx,argv[3],50.0);
   int pn  =(int)double_from_js(ctx,argv[4],4.0);
   double pg=double_from_js(ctx,argv[5],8.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   if (sides<3) sides=3; if (pn<1) pn=1;
   for (int i=0;i<pn;i++){
      double ri=pr-i*pg;
      if (ri<=0) break;
      for (int s=0;s<sides;s++){
         double a1=s*2.0*M_PI/sides, a2=(s+1)*2.0*M_PI/sides;
         path_draw_line_segment((int)(pcx+cos(a1)*ri),(int)(pcy+sin(a1)*ri),
                                (int)(pcx+cos(a2)*ri),(int)(pcy+sin(a2)*ri),col);
      }
   }
   return JS_UNDEFINED;
}

/* fillCheckerCircle(cx,cy,r,step,c1,c2) — checkerboard clipped to circle */
static JSValue js_fill_checker_circle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int ccx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int ccy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int cr =(int)double_from_js(ctx,argv[2],40.0);
   int cs =(int)double_from_js(ctx,argv[3],8.0);
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[4],0xFFFFFFFFu);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[5],0xFF000000u);
   if (cs<1) cs=1;
   for (int y2=ccy-cr;y2<=ccy+cr;y2++)
      for (int x2=ccx-cr;x2<=ccx+cr;x2++){
         double dist=sqrt((double)(x2-ccx)*(x2-ccx)+(double)(y2-ccy)*(y2-ccy));
         if (dist>cr) continue;
         int tx=((x2-ccx+cr)/cs), ty=((y2-ccy+cr)/cs);
         set_pixel(x2,y2,((tx+ty)%2==0)?c1:c2);
      }
   return JS_UNDEFINED;
}

/* colorFromRandom(seed) — seeded color (Xorshift32) */
static JSValue js_color_from_random(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t seed=(uint32_t)(argc>0?double_from_js(ctx,argv[0],1.0):1.0);
   if (!seed) seed=1;
   seed^=seed<<13; seed^=seed>>17; seed^=seed<<5;
   uint32_t r2=(seed>>24)&0xFF, g2=(seed>>16)&0xFF, b2=(seed>>8)&0xFF;
   return JS_NewInt32(ctx,(int32_t)((r2<<24)|(g2<<16)|(b2<<8)|0xFF));
}

/* drawNeonLine(x1,y1,x2,y2,glow,color) — line with additive glow */
static JSValue js_draw_neon_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   float nx1=(float)double_from_js(ctx,argv[0],0.0)-(float)cam2d_x;
   float ny1=(float)double_from_js(ctx,argv[1],0.0)-(float)cam2d_y;
   float nx2=(float)double_from_js(ctx,argv[2],100.0)-(float)cam2d_x;
   float ny2=(float)double_from_js(ctx,argv[3],0.0)-(float)cam2d_y;
   int   glow=(int)double_from_js(ctx,argv[4],3.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   if (glow<0) glow=0; if (glow>10) glow=10;
   uint32_t cr=(col>>24)&0xFF,cg=(col>>16)&0xFF,cb=(col>>8)&0xFF;
   int steps=(int)(sqrtf((nx2-nx1)*(nx2-nx1)+(ny2-ny1)*(ny2-ny1))+1);
   for (int s=0;s<=steps;s++){
      float t=(float)s/steps;
      int px2=(int)(nx1+(nx2-nx1)*t), py2=(int)(ny1+(ny2-ny1)*t);
      /* core */
      set_pixel(px2,py2,col);
      /* glow layers */
      for (int g2=1;g2<=glow;g2++){
         double falloff=1.0-(double)g2/(glow+1);
         uint32_t gr=(uint32_t)(cr*falloff), gg=(uint32_t)(cg*falloff), gb2=(uint32_t)(cb*falloff);
         uint32_t gc2=(gr<<24)|(gg<<16)|(gb2<<8)|((uint32_t)(200*falloff));
         for (int dy=-g2;dy<=g2;dy++)
            for (int dx=-g2;dx<=g2;dx++){
               if (dx==0&&dy==0) continue;
               if (abs(dx)+abs(dy)>g2+1) continue;
               int sx=px2+dx, sy=py2+dy;
               if (sx<0||sx>=NOVA64_WIDTH||sy<0||sy>=NOVA64_HEIGHT) continue;
               uint32_t ep=framebuffer[sy*NOVA64_WIDTH+sx];
               int er=(int)((ep>>24)&0xFF)+(int)gr;
               int eg=(int)((ep>>16)&0xFF)+(int)gg;
               int eb=(int)((ep>> 8)&0xFF)+(int)gb2;
               if(er>255)er=255;if(eg>255)eg=255;if(eb>255)eb=255;
               framebuffer[sy*NOVA64_WIDTH+sx]=((uint32_t)er<<24)|((uint32_t)eg<<16)|((uint32_t)eb<<8)|((ep)&0xFF);
               (void)gc2;
            }
      }
   }
   return JS_UNDEFINED;
}

/* screenDuotone(c1,c2) — map dark tones → c1, light tones → c2 */
static JSValue js_screen_duotone(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t dc1=(uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t dc2=(uint32_t)color_from_js(ctx,argv[1],0xFFFFFFFFu);

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH) x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;

   for (int y=y1;y<=y2;y++){
      for (int x=x1;x<=x2;x++){
         uint32_t p=framebuffer[y*NOVA64_WIDTH+x];
         int lum=((int)((p>>24)&0xFF)*299+(int)((p>>16)&0xFF)*587+(int)((p>>8)&0xFF)*114)/1000;
         double t=lum/255.0;
         double it=1.0-t;
         uint32_t r=(uint32_t)(((dc1>>24)&0xFF)*it+((dc2>>24)&0xFF)*t+0.5);
         uint32_t g=(uint32_t)(((dc1>>16)&0xFF)*it+((dc2>>16)&0xFF)*t+0.5);
         uint32_t b=(uint32_t)(((dc1>> 8)&0xFF)*it+((dc2>> 8)&0xFF)*t+0.5);
         framebuffer[y*NOVA64_WIDTH+x]=(r<<24)|(g<<16)|(b<<8)|((p)&0xFF);
      }
   }
   return JS_UNDEFINED;
}

/* gradientCircle(cx,cy,r,c1,c2,angle) — linear gradient clipped to circle */
static JSValue js_gradient_circle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int gcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int gcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int gr =(int)double_from_js(ctx,argv[2],40.0);
   uint32_t gc1=(uint32_t)color_from_js(ctx,argv[3],0xFF000000u);
   uint32_t gc2=(uint32_t)color_from_js(ctx,argv[4],0xFFFFFFFFu);
   double ang=(argc>5?double_from_js(ctx,argv[5],0.0):0.0)*M_PI/180.0;
   double ca=cos(ang),sa=sin(ang);
   for (int y2=gcy-gr;y2<=gcy+gr;y2++){
      for (int x2=gcx-gr;x2<=gcx+gr;x2++){
         double dist=sqrt((double)(x2-gcx)*(x2-gcx)+(double)(y2-gcy)*(y2-gcy));
         if (dist>gr) continue;
         double dot=((x2-gcx)*ca+(y2-gcy)*sa)/gr;
         double t2=(dot+1.0)*0.5;
         if(t2<0)t2=0;if(t2>1)t2=1;
         double it2=1.0-t2;
         uint32_t r=(uint32_t)(((gc1>>24)&0xFF)*it2+((gc2>>24)&0xFF)*t2+0.5);
         uint32_t g=(uint32_t)(((gc1>>16)&0xFF)*it2+((gc2>>16)&0xFF)*t2+0.5);
         uint32_t b=(uint32_t)(((gc1>> 8)&0xFF)*it2+((gc2>> 8)&0xFF)*t2+0.5);
         uint32_t a=(uint32_t)(((gc1    )&0xFF)*it2+((gc2    )&0xFF)*t2+0.5);
         set_pixel(x2,y2,(r<<24)|(g<<16)|(b<<8)|a);
      }
   }
   return JS_UNDEFINED;
}

/* ── Batch 20: target, spider web, brick, wave shape, flame, zoom, util ─── */

/* drawTarget(cx,cy,r,rings,color) — concentric ring target */
static JSValue js_draw_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int tcx =(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int tcy =(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int tr  =(int)double_from_js(ctx,argv[2],40.0);
   int rings=(int)double_from_js(ctx,argv[3],4.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[4],0xFFFFFFFFu);
   if (rings<1) rings=1;
   for (int i=1;i<=rings;i++){
      int ri=tr*i/rings;
      for (int y2=tcy-ri;y2<=tcy+ri;y2++)
         for (int x2=tcx-ri;x2<=tcx+ri;x2++){
            double d=sqrt((double)(x2-tcx)*(x2-tcx)+(double)(y2-tcy)*(y2-tcy));
            if (d>ri-1&&d<=ri) set_pixel(x2,y2,col);
         }
   }
   return JS_UNDEFINED;
}

/* fillTarget(cx,cy,r,rings,c1,c2) — alternating color bullseye */
static JSValue js_fill_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int tcx  =(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int tcy  =(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int tr   =(int)double_from_js(ctx,argv[2],40.0);
   int rings=(int)double_from_js(ctx,argv[3],4.0);
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[4],0xFFFFFFFFu);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[5],0xFF0000FFu);
   if (rings<1) rings=1;
   for (int y2=tcy-tr;y2<=tcy+tr;y2++)
      for (int x2=tcx-tr;x2<=tcx+tr;x2++){
         double d=sqrt((double)(x2-tcx)*(x2-tcx)+(double)(y2-tcy)*(y2-tcy));
         if (d>tr) continue;
         int ring=(int)(d*rings/tr);
         set_pixel(x2,y2,(ring%2==0)?c1:c2);
      }
   return JS_UNDEFINED;
}

/* drawSpiderWeb(cx,cy,r,rings,spokes,color) */
static JSValue js_draw_spider_web(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int wcx   =(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int wcy   =(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   double wr =double_from_js(ctx,argv[2],40.0);
   int rings =(int)double_from_js(ctx,argv[3],4.0);
   int spokes=(int)double_from_js(ctx,argv[4],8.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   if (rings<1) rings=1; if (spokes<3) spokes=3;
   /* draw spokes */
   for (int s=0;s<spokes;s++){
      double a=s*2.0*M_PI/spokes;
      path_draw_line_segment(wcx,wcy,(int)(wcx+cos(a)*wr),(int)(wcy+sin(a)*wr),col);
   }
   /* draw rings */
   for (int ri=1;ri<=rings;ri++){
      double rr=wr*ri/rings;
      int prevX=(int)(wcx+rr), prevY=wcy;
      for (int s=1;s<=spokes;s++){
         double a=s*2.0*M_PI/spokes;
         int nx2=(int)(wcx+cos(a)*rr), ny2=(int)(wcy+sin(a)*rr);
         path_draw_line_segment(prevX,prevY,nx2,ny2,col);
         prevX=nx2; prevY=ny2;
      }
   }
   return JS_UNDEFINED;
}

/* drawBrickPattern(x,y,w,h,bw,bh,color) */
static JSValue js_draw_brick_pattern(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int bx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int by=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int bw=(int)double_from_js(ctx,argv[2],100.0);
   int bh=(int)double_from_js(ctx,argv[3],100.0);
   int tw=(int)double_from_js(ctx,argv[4],20.0);
   int th=(int)double_from_js(ctx,argv[5],10.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   if (tw<2)tw=2; if (th<2)th=2;
   /* horizontal mortar lines */
   for (int y2=by;y2<by+bh;y2+=th)
      for (int x2=bx;x2<bx+bw;x2++) set_pixel(x2,y2,col);
   /* vertical mortar, offset per row */
   for (int row=0;;row++){
      int y2=by+row*th;
      if (y2>=by+bh) break;
      int offset=(row%2==0)?0:tw/2;
      for (int x2=bx+offset;x2<bx+bw;x2+=tw)
         for (int y3=y2;y3<y2+th&&y3<by+bh;y3++) set_pixel(x2,y3,col);
   }
   return JS_UNDEFINED;
}

/* fillWaveShape(x,y,w,h,amp,freq,color) — wave-topped filled shape */
static JSValue js_fill_wave_shape(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int wx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int wy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int ww=(int)double_from_js(ctx,argv[2],100.0);
   int wh=(int)double_from_js(ctx,argv[3],60.0);
   double wamp =double_from_js(ctx,argv[4],10.0);
   double wfreq=double_from_js(ctx,argv[5],2.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   for (int x2=wx;x2<wx+ww;x2++){
      double t=(double)(x2-wx)/ww;
      int yTop=wy+(int)(wamp*sin(t*wfreq*2.0*M_PI));
      for (int y2=yTop;y2<wy+wh;y2++) set_pixel(x2,y2,col);
   }
   return JS_UNDEFINED;
}

/* CIE Lab → RGB helper (D65 illuminant) */
static uint32_t lab_to_rgba(double Llab, double astar, double bstar, uint8_t alpha)
{
   /* Lab → XYZ */
   double fy=(Llab+16.0)/116.0;
   double fx=astar/500.0+fy;
   double fz=fy-bstar/200.0;
   double x=(fx*fx*fx>0.008856)?fx*fx*fx:(fx-16.0/116.0)/7.787;
   double y=(fy*fy*fy>0.008856)?fy*fy*fy:(fy-16.0/116.0)/7.787;
   double z=(fz*fz*fz>0.008856)?fz*fz*fz:(fz-16.0/116.0)/7.787;
   /* D65 reference */
   x*=0.95047; z*=1.08883;
   /* XYZ → linear sRGB */
   double rl= 3.2406*x - 1.5372*y - 0.4986*z;
   double gl=-0.9689*x + 1.8758*y + 0.0415*z;
   double bl= 0.0557*x - 0.2040*y + 1.0570*z;
   /* gamma */
#define SRGB(v) ((v)<=0.0031308?12.92*(v):1.055*pow((v),1.0/2.4)-0.055)
   rl=SRGB(rl); gl=SRGB(gl); bl=SRGB(bl);
#undef SRGB
   if(rl<0)rl=0;if(rl>1)rl=1;
   if(gl<0)gl=0;if(gl>1)gl=1;
   if(bl<0)bl=0;if(bl>1)bl=1;
   return ((uint32_t)(rl*255+0.5)<<24)|((uint32_t)(gl*255+0.5)<<16)|((uint32_t)(bl*255+0.5)<<8)|alpha;
}

/* colorFromLab(Llab,alab,blab) → color */
static JSValue js_color_from_lab(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double Lv=argc>0?double_from_js(ctx,argv[0],50.0):50.0;
   double av=argc>1?double_from_js(ctx,argv[1],0.0):0.0;
   double bv=argc>2?double_from_js(ctx,argv[2],0.0):0.0;
   return JS_NewInt32(ctx,(int32_t)lab_to_rgba(Lv,av,bv,255));
}

/* drawFlame(cx,cy,h,color) — flame outline (teardrop) */
static JSValue js_draw_flame(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int fcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int fcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int fh =(int)double_from_js(ctx,argv[2],40.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[3],0xFFFFFFFFu);
   int fw=fh/3;
   /* draw outer flame profile using parametric curve */
   int steps=60;
   int prevX=fcx,prevY=fcy;
   for (int i=0;i<=steps;i++){
      double t=(double)i/steps * 2.0 * M_PI;
      /* flame parametric: x = fw*sin(t)*(1-0.4*sin(t/2)), y = -fh*0.5*(1-cos(t)) */
      double xo=(double)fw*sin(t)*(1.0-0.3*sin(t*0.5));
      double yo=-(double)fh*0.5*(1.0-cos(t));
      int px2=fcx+(int)xo, py2=fcy+(int)yo;
      if (i>0) path_draw_line_segment(prevX,prevY,px2,py2,col);
      prevX=px2; prevY=py2;
   }
   return JS_UNDEFINED;
}

/* fillFlame(cx,cy,h,color) — filled flame */
static JSValue js_fill_flame(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int fcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int fcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int fh =(int)double_from_js(ctx,argv[2],40.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[3],0xFFFFFFFFu);
   int fw=fh/3;
   for (int y2=fcy-fh;y2<=fcy;y2++){
      double trel=(double)(fcy-y2)/(double)fh; /* 1 at top, 0 at base */
      /* width narrows toward top */
      int xw=(int)(fw*sin(trel*M_PI)*(1.0-0.2*trel));
      for (int x2=fcx-xw;x2<=fcx+xw;x2++) set_pixel(x2,y2,col);
   }
   return JS_UNDEFINED;
}

/* screenZoom(factor,cx,cy) — zoom toward a point */
static JSValue js_screen_zoom(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double factor = argc>0 ? double_from_js(ctx,argv[0],1.2) : 1.2;
   double zcx    = argc>1 ? double_from_js(ctx,argv[1],NOVA64_WIDTH*0.5)  : NOVA64_WIDTH*0.5;
   double zcy    = argc>2 ? double_from_js(ctx,argv[2],NOVA64_HEIGHT*0.5) : NOVA64_HEIGHT*0.5;
   if (factor<=0.01) factor=0.01;

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH) x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;
   int W=x2-x1+1,H=y2-y1+1;
   if (W<=0||H<=0) return JS_UNDEFINED;

   uint32_t *src=(uint32_t*)malloc((size_t)(W*H)*sizeof(uint32_t));
   if (!src) return JS_UNDEFINED;
   for (int r=0;r<H;r++)
      for (int c=0;c<W;c++)
         src[r*W+c]=framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)];

   for (int r=0;r<H;r++){
      for (int c=0;c<W;c++){
         double sx=(c+x1-zcx)/factor+zcx-x1;
         double sy=(r+y1-zcy)/factor+zcy-y1;
         int si=(int)(sx+0.5), sj=(int)(sy+0.5);
         if (si>=0&&si<W&&sj>=0&&sj<H)
            framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)]=src[sj*W+si];
         else
            framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)]=0xFF000000u;
      }
   }
   free(src);
   return JS_UNDEFINED;
}

/* drawDotLine(x1,y1,x2,y2,spacing,r,color) — dots along a line */
static JSValue js_draw_dot_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   double dx1=double_from_js(ctx,argv[0],0.0)-(double)cam2d_x;
   double dy1=double_from_js(ctx,argv[1],0.0)-(double)cam2d_y;
   double dx2=double_from_js(ctx,argv[2],100.0)-(double)cam2d_x;
   double dy2=double_from_js(ctx,argv[3],0.0)-(double)cam2d_y;
   int spacing=(int)double_from_js(ctx,argv[4],8.0);
   int dr  =(int)double_from_js(ctx,argv[5],2.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   if (spacing<1) spacing=1;
   double ddx=dx2-dx1,ddy=dy2-dy1;
   double len=sqrt(ddx*ddx+ddy*ddy);
   if (len<0.5) return JS_UNDEFINED;
   double ux=ddx/len,uy=ddy/len;
   for (double d=0;d<=len;d+=spacing){
      int cx2=(int)(dx1+ux*d), cy2=(int)(dy1+uy*d);
      for (int y2=cy2-dr;y2<=cy2+dr;y2++)
         for (int x2=cx2-dr;x2<=cx2+dr;x2++){
            double dist=sqrt((double)(x2-cx2)*(x2-cx2)+(double)(y2-cy2)*(y2-cy2));
            if (dist<=dr) set_pixel(x2,y2,col);
         }
   }
   return JS_UNDEFINED;
}

/* oscillate(t,freq,lo,hi) — sine oscillation between lo and hi */
static JSValue js_oscillate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t  = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   double fr = argc>1 ? double_from_js(ctx,argv[1],1.0) : 1.0;
   double lo = argc>2 ? double_from_js(ctx,argv[2],0.0) : 0.0;
   double hi = argc>3 ? double_from_js(ctx,argv[3],1.0) : 1.0;
   double v  = (sin(t*fr*2.0*M_PI)*0.5+0.5)*(hi-lo)+lo;
   return JS_NewFloat64(ctx,v);
}

/* pulseValue(t,period) → t mod period normalized to 0-1 */
static JSValue js_pulse_value(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t  = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   double per= argc>1 ? double_from_js(ctx,argv[1],1.0) : 1.0;
   if (per<=0.0) per=1.0;
   double v=fmod(t,per)/per;
   if (v<0.0) v+=1.0;
   return JS_NewFloat64(ctx,v);
}

/* ── Batch 19: color blends, screen effects, wave draw, bubble, connector ─── */

/* colorLighten(c1,c2) — lighten blend: max per channel */
static JSValue js_color_lighten(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define MAX_CH(a,b) ((uint32_t)((a)>(b)?(a):(b)))
   uint32_t r=MAX_CH((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g=MAX_CH((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b=MAX_CH((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a=(c1)&0xFF;
#undef MAX_CH
   return JS_NewInt32(ctx,(int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* colorDarken(c1,c2) — darken blend: min per channel */
static JSValue js_color_darken(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0xFFFFFFFFu);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[1],0xFFFFFFFFu);
#define MIN_CH(a,b) ((uint32_t)((a)<(b)?(a):(b)))
   uint32_t r=MIN_CH((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g=MIN_CH((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b=MIN_CH((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a=(c1)&0xFF;
#undef MIN_CH
   return JS_NewInt32(ctx,(int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* colorDifference(c1,c2) — absolute difference per channel */
static JSValue js_color_difference(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define DIFF_CH(a,b) ((uint32_t)abs((int)(a)-(int)(b)))
   uint32_t r=DIFF_CH((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g=DIFF_CH((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b=DIFF_CH((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a=(c1)&0xFF;
#undef DIFF_CH
   return JS_NewInt32(ctx,(int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* screenBrightnessContrast(brightness, contrast) — adjust levels */
static JSValue js_screen_brightness_contrast(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double bright = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   double cont   = argc>1 ? double_from_js(ctx,argv[1],1.0) : 1.0;

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH) x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;

   for (int y=y1;y<=y2;y++){
      for (int x=x1;x<=x2;x++){
         uint32_t p=framebuffer[y*NOVA64_WIDTH+x];
         int r=(p>>24)&0xFF,g=(p>>16)&0xFF,b=(p>>8)&0xFF,a=(p)&0xFF;
         /* apply brightness (additive) then contrast (scale around 128) */
         int nr=(int)((r+bright*255-128)*cont+128+0.5);
         int ng=(int)((g+bright*255-128)*cont+128+0.5);
         int nb=(int)((b+bright*255-128)*cont+128+0.5);
         if(nr<0)nr=0;if(nr>255)nr=255;
         if(ng<0)ng=0;if(ng>255)ng=255;
         if(nb<0)nb=0;if(nb>255)nb=255;
         framebuffer[y*NOVA64_WIDTH+x]=((uint32_t)nr<<24)|((uint32_t)ng<<16)|((uint32_t)nb<<8)|(uint32_t)a;
      }
   }
   return JS_UNDEFINED;
}

/* drawSineWave(x,y,w,amp,freq,phase,color) — draw a sine curve */
static JSValue js_draw_sine_wave(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int sx   =(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int sy   =(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int sw   =(int)double_from_js(ctx,argv[2],100.0);
   double amp  =double_from_js(ctx,argv[3],20.0);
   double freq =double_from_js(ctx,argv[4],1.0);
   double phase=double_from_js(ctx,argv[5],0.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   int prevX=sx, prevY=sy;
   for (int i=0;i<=sw;i++){
      double t=(double)i/sw;
      int cx2=sx+i;
      int cy2=sy-(int)(amp*sin(freq*t*2.0*M_PI+phase));
      if (i>0) path_draw_line_segment(prevX,prevY,cx2,cy2,col);
      prevX=cx2; prevY=cy2;
   }
   return JS_UNDEFINED;
}

/* drawSquiggle(x1,y1,x2,y2,amp,freq,color) — perpendicular sine along line */
static JSValue js_draw_squiggle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   double qx1=double_from_js(ctx,argv[0],0.0)-(double)cam2d_x;
   double qy1=double_from_js(ctx,argv[1],0.0)-(double)cam2d_y;
   double qx2=double_from_js(ctx,argv[2],100.0)-(double)cam2d_x;
   double qy2=double_from_js(ctx,argv[3],0.0)-(double)cam2d_y;
   double amp =double_from_js(ctx,argv[4],8.0);
   double freq=double_from_js(ctx,argv[5],3.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   double dx=qx2-qx1,dy=qy2-qy1;
   double len=sqrt(dx*dx+dy*dy);
   if (len<0.5) return JS_UNDEFINED;
   double ux=dx/len,uy=dy/len;
   double nx=-uy,ny=ux;
   int steps=(int)len;
   int prevX=(int)qx1,prevY=(int)qy1;
   for (int i=1;i<=steps;i++){
      double t=(double)i/steps;
      double off=amp*sin(t*freq*2.0*M_PI);
      int cx2=(int)(qx1+ux*len*t+nx*off);
      int cy2=(int)(qy1+uy*len*t+ny*off);
      path_draw_line_segment(prevX,prevY,cx2,cy2,col);
      prevX=cx2; prevY=cy2;
   }
   return JS_UNDEFINED;
}

/* screenGlitch(amount) — RGB channel displacement */
static JSValue js_screen_glitch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int amt=(int)(argc>0?double_from_js(ctx,argv[0],4.0):4.0);
   if (amt<1) amt=1; if (amt>20) amt=20;

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH) x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;
   int W=x2-x1+1,H=y2-y1+1;
   if (W<=0||H<=0) return JS_UNDEFINED;

   uint32_t *src=(uint32_t*)malloc((size_t)(W*H)*sizeof(uint32_t));
   if (!src) return JS_UNDEFINED;
   for (int r=0;r<H;r++)
      for (int c=0;c<W;c++)
         src[r*W+c]=framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)];

   for (int r=0;r<H;r++){
      int shift=((r*7+13)%17<9)?amt:0;
      for (int c=0;c<W;c++){
         int rc=c-shift; if(rc<0)rc=0; if(rc>=W)rc=W-1;
         int gc=c;
         int bc=c+shift; if(bc>=W)bc=W-1;
         uint32_t rp=src[r*W+rc], gp=src[r*W+gc], bp=src[r*W+bc];
         uint32_t rch=(rp>>24)&0xFF, gch=(gp>>16)&0xFF, bch=(bp>>8)&0xFF;
         uint32_t ach=(src[r*W+c])&0xFF;
         framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)]=(rch<<24)|(gch<<16)|(bch<<8)|ach;
      }
   }
   free(src);
   return JS_UNDEFINED;
}

/* drawBubble(cx,cy,r,color) — bubble outline with highlight arc */
static JSValue js_draw_bubble(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int bcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int bcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int br =(int)double_from_js(ctx,argv[2],20.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[3],0xFFFFFFFFu);
   /* draw main circle */
   for (int y2=bcy-br;y2<=bcy+br;y2++){
      for (int x2=bcx-br;x2<=bcx+br;x2++){
         double dist=sqrt((double)(x2-bcx)*(x2-bcx)+(double)(y2-bcy)*(y2-bcy));
         if (dist>br-1&&dist<=br) set_pixel(x2,y2,col);
      }
   }
   /* specular arc highlight (upper-left) */
   uint32_t hl=(col&0xFFFFFF00u)|((col&0xFF)+40>255?255:(col&0xFF)+40);
   int hr=(int)(br*0.45), hcx=bcx-(int)(br*0.3), hcy=bcy-(int)(br*0.3);
   for (int y2=hcy-hr;y2<=hcy+hr;y2++){
      for (int x2=hcx-hr;x2<=hcx+hr;x2++){
         double d=sqrt((double)(x2-hcx)*(x2-hcx)+(double)(y2-hcy)*(y2-hcy));
         if (d>hr-1&&d<=hr) set_pixel(x2,y2,hl);
      }
   }
   return JS_UNDEFINED;
}

/* fillBubble(cx,cy,r,color) — filled bubble with radial gradient */
static JSValue js_fill_bubble(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int bcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int bcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int br =(int)double_from_js(ctx,argv[2],20.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[3],0xFFFFFFFFu);
   uint32_t ri=(col>>24)&0xFF, gi=(col>>16)&0xFF, bi=(col>>8)&0xFF, ai=(col)&0xFF;
   for (int y2=bcy-br;y2<=bcy+br;y2++){
      for (int x2=bcx-br;x2<=bcx+br;x2++){
         double dist=sqrt((double)(x2-bcx)*(x2-bcx)+(double)(y2-bcy)*(y2-bcy));
         if (dist>br) continue;
         double t=dist/br;
         uint32_t nr=(uint32_t)(ri*(1.0-t*0.3)+0.5);
         uint32_t ng=(uint32_t)(gi*(1.0-t*0.3)+0.5);
         uint32_t nb=(uint32_t)(bi*(1.0-t*0.3)+255*t*0.1+0.5);
         if(nr>255)nr=255;if(ng>255)ng=255;if(nb>255)nb=255;
         set_pixel(x2,y2,(nr<<24)|(ng<<16)|(nb<<8)|ai);
      }
   }
   /* specular dot */
   int hx=bcx-(int)(br*0.3), hy=bcy-(int)(br*0.3), hr=(int)(br*0.25);
   for (int y2=hy-hr;y2<=hy+hr;y2++)
      for (int x2=hx-hr;x2<=hx+hr;x2++){
         double d=sqrt((double)(x2-hx)*(x2-hx)+(double)(y2-hy)*(y2-hy));
         if (d<=hr) set_pixel(x2,y2,rgba8(255,255,255,(uint8_t)(200*(1.0-d/hr))));
      }
   return JS_UNDEFINED;
}

/* colorPinLight(c1,c2) — pin light blend */
static JSValue js_color_pin_light(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define PIN(a,b) ((int)(b)<128 ? ((int)(a)<2*(int)(b)?(int)(a):2*(int)(b)) : ((int)(a)>2*(int)(b)-255?(int)(a):2*(int)(b)-255))
   uint32_t r=(uint32_t)PIN((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g=(uint32_t)PIN((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b=(uint32_t)PIN((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a=(c1)&0xFF;
#undef PIN
   if(r>255)r=255; if(g>255)g=255; if(b>255)b=255;
   return JS_NewInt32(ctx,(int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* drawConnector(x1,y1,x2,y2,color) — smooth S-curve connector */
static JSValue js_draw_connector(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   double nx1=double_from_js(ctx,argv[0],0.0)-(double)cam2d_x;
   double ny1=double_from_js(ctx,argv[1],0.0)-(double)cam2d_y;
   double nx2=double_from_js(ctx,argv[2],100.0)-(double)cam2d_x;
   double ny2=double_from_js(ctx,argv[3],0.0)-(double)cam2d_y;
   uint32_t col=(uint32_t)color_from_js(ctx,argv[4],0xFFFFFFFFu);
   /* cubic bezier with horizontal tangents */
   double cx1=nx1+(nx2-nx1)*0.5, cy1=ny1;
   double cx2=nx1+(nx2-nx1)*0.5, cy2=ny2;
   int steps=80;
   int prevX=(int)nx1,prevY=(int)ny1;
   for (int i=1;i<=steps;i++){
      double t=(double)i/steps, it=1.0-t;
      double bx=it*it*it*nx1+3*it*it*t*cx1+3*it*t*t*cx2+t*t*t*nx2;
      double by=it*it*it*ny1+3*it*it*t*cy1+3*it*t*t*cy2+t*t*t*ny2;
      path_draw_line_segment(prevX,prevY,(int)bx,(int)by,col);
      prevX=(int)bx; prevY=(int)by;
   }
   return JS_UNDEFINED;
}

/* drawHatch(x,y,w,h,angle,spacing,color) — hatching over a rect */
static JSValue js_draw_hatch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int hx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int hy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int hw=(int)double_from_js(ctx,argv[2],100.0);
   int hh=(int)double_from_js(ctx,argv[3],100.0);
   double ang  =double_from_js(ctx,argv[4],45.0)*M_PI/180.0;
   int spacing =(int)double_from_js(ctx,argv[5],8.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   if (spacing<1) spacing=1;
   double ca=cos(ang), sa=sin(ang);
   int diag=(int)sqrt((double)(hw*hw+hh*hh))+spacing;
   for (int d=-diag; d<=diag+hw+hh; d+=spacing){
      /* line in direction (ca,sa) passing through (hx+d*(-sa), hy+d*ca) */
      double ox=hx+d*(-sa), oy=hy+d*ca;
      int lx1=(int)(ox - ca*diag), ly1=(int)(oy - sa*diag);
      int lx2=(int)(ox + ca*diag), ly2=(int)(oy + sa*diag);
      /* clip to rect and draw */
      for (int s=0; s<=diag*2; s++){
         double t=(double)s/(diag*2);
         int px2=(int)(lx1+(lx2-lx1)*t);
         int py2=(int)(ly1+(ly2-ly1)*t);
         if (px2>=hx&&px2<hx+hw&&py2>=hy&&py2<hy+hh)
            set_pixel(px2,py2,col);
      }
   }
   return JS_UNDEFINED;
}

/* ── Batch 18: vector utils, color blends, trail, gradients, gear, CRT ─── */

/* vecFromAngle(degrees) → {x,y} unit vector */
static JSValue js_vec_from_angle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double deg = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   double rad = deg * M_PI / 180.0;
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, cos(rad)));
   JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, sin(rad)));
   return obj;
}

/* closestPointOnLine(px,py,x1,y1,x2,y2) → {x,y} nearest point on segment */
static JSValue js_closest_point_on_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   double px=double_from_js(ctx,argv[0],0.0), py=double_from_js(ctx,argv[1],0.0);
   double x1=double_from_js(ctx,argv[2],0.0), y1=double_from_js(ctx,argv[3],0.0);
   double x2=double_from_js(ctx,argv[4],0.0), y2=double_from_js(ctx,argv[5],0.0);
   double dx=x2-x1, dy=y2-y1;
   double lenSq=dx*dx+dy*dy;
   double rx=x1, ry=y1;
   if (lenSq > 1e-12) {
      double t=((px-x1)*dx+(py-y1)*dy)/lenSq;
      if (t<0.0) t=0.0; if (t>1.0) t=1.0;
      rx=x1+t*dx; ry=y1+t*dy;
   }
   JSValue obj=JS_NewObject(ctx);
   JS_SetPropertyStr(ctx,obj,"x",JS_NewFloat64(ctx,rx));
   JS_SetPropertyStr(ctx,obj,"y",JS_NewFloat64(ctx,ry));
   return obj;
}

/* distToLine(px,py,x1,y1,x2,y2) → distance from point to segment */
static JSValue js_dist_to_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_NewFloat64(ctx,0.0);
   double px=double_from_js(ctx,argv[0],0.0), py=double_from_js(ctx,argv[1],0.0);
   double x1=double_from_js(ctx,argv[2],0.0), y1=double_from_js(ctx,argv[3],0.0);
   double x2=double_from_js(ctx,argv[4],0.0), y2=double_from_js(ctx,argv[5],0.0);
   double dx=x2-x1, dy=y2-y1;
   double lenSq=dx*dx+dy*dy;
   double cx=x1,cy=y1;
   if (lenSq > 1e-12) {
      double t=((px-x1)*dx+(py-y1)*dy)/lenSq;
      if (t<0.0) t=0.0; if (t>1.0) t=1.0;
      cx=x1+t*dx; cy=y1+t*dy;
   }
   double ex=px-cx, ey=py-cy;
   return JS_NewFloat64(ctx, sqrt(ex*ex+ey*ey));
}

/* drawTrail(x1,y1,x2,y2,w1,w2,color) — tapered line (filled trapezoid) */
static JSValue js_draw_trail(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   float fx1=(float)double_from_js(ctx,argv[0],0.0)-(float)cam2d_x;
   float fy1=(float)double_from_js(ctx,argv[1],0.0)-(float)cam2d_y;
   float fx2=(float)double_from_js(ctx,argv[2],0.0)-(float)cam2d_x;
   float fy2=(float)double_from_js(ctx,argv[3],0.0)-(float)cam2d_y;
   float w1 =(float)double_from_js(ctx,argv[4],4.0)*0.5f;
   float w2 =(float)double_from_js(ctx,argv[5],1.0)*0.5f;
   uint32_t col=(uint32_t)color_from_js(ctx,argv[6],0xFFFFFFFFu);
   float dx=fx2-fx1, dy=fy2-fy1;
   float len=sqrtf(dx*dx+dy*dy);
   if (len<0.5f) return JS_UNDEFINED;
   float nx=-dy/len, ny=dx/len;
   /* render as quads along line using scanline fill */
   /* 4 corners of trapezoid */
   float ax=fx1+nx*w1, ay=fy1+ny*w1;
   float bx=fx1-nx*w1, by=fy1-ny*w1;
   float cx2=fx2+nx*w2, cy2=fy2+ny*w2;
   float dx2=fx2-nx*w2, dy2=fy2-ny*w2;
   /* draw as two triangles */
   /* triangle 1: a, b, c */
   int minY=(int)fminf(fminf(ay,by),fminf(cy2,dy2));
   int maxY=(int)fmaxf(fmaxf(ay,by),fmaxf(cy2,dy2));
   for (int y=minY; y<=maxY; y++) {
      /* for each y, find x extents via edge intersections */
      float xmin=1e9f, xmax=-1e9f;
      float edges[4][4]={{ax,ay,cx2,cy2},{ax,ay,bx,by},{bx,by,dx2,dy2},{cx2,cy2,dx2,dy2}};
      for (int e=0;e<4;e++) {
         float ey0=edges[e][1], ey1=edges[e][3];
         if ((ey0<=y&&y<=ey1)||(ey1<=y&&y<=ey0)) {
            float t=(ey0==ey1)?0.0f:(float)(y-ey0)/(ey1-ey0);
            float xi=edges[e][0]+(edges[e][2]-edges[e][0])*t;
            if (xi<xmin) xmin=xi;
            if (xi>xmax) xmax=xi;
         }
      }
      for (int x=(int)xmin; x<=(int)xmax; x++) set_pixel(x,y,col);
   }
   return JS_UNDEFINED;
}

/* colorDodge(c1,c2) — color dodge blend */
static JSValue js_color_dodge(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define DODGE(a,b) ((int)(b)==255 ? 255 : (int)fmin(255.0,(int)(a)*255/(255-(int)(b))))
   uint32_t r=(uint32_t)DODGE((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g=(uint32_t)DODGE((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b=(uint32_t)DODGE((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a=(c1)&0xFF;
#undef DODGE
   return JS_NewInt32(ctx,(int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* colorBurn(c1,c2) — color burn blend */
static JSValue js_color_burn(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2=(uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define BURN(a,b) ((int)(b)==0 ? 0 : (int)fmax(0.0,255-(255-(int)(a))*255/(int)(b)))
   uint32_t r=(uint32_t)BURN((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g=(uint32_t)BURN((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b=(uint32_t)BURN((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a=(c1)&0xFF;
#undef BURN
   return JS_NewInt32(ctx,(int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* fillRadialGradient(cx,cy,r,c1,c2) — radial gradient from center to edge */
static JSValue js_fill_radial_gradient(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int rcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int rcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   double rad=double_from_js(ctx,argv[2],50.0);
   uint32_t col1=(uint32_t)color_from_js(ctx,argv[3],0xFFFFFFFFu);
   uint32_t col2=(uint32_t)color_from_js(ctx,argv[4],0x00000000u);
   int ir=(int)rad+1;
   for (int y=rcy-ir;y<=rcy+ir;y++){
      for (int x=rcx-ir;x<=rcx+ir;x++){
         double dist=sqrt((double)(x-rcx)*(x-rcx)+(double)(y-rcy)*(y-rcy));
         if (dist>rad) continue;
         double t=dist/rad;
         double it=1.0-t;
         uint32_t r=(uint32_t)((col1>>24&0xFF)*it+(col2>>24&0xFF)*t);
         uint32_t g=(uint32_t)((col1>>16&0xFF)*it+(col2>>16&0xFF)*t);
         uint32_t b=(uint32_t)((col1>> 8&0xFF)*it+(col2>> 8&0xFF)*t);
         uint32_t a=(uint32_t)((col1    &0xFF)*it+(col2    &0xFF)*t);
         set_pixel(x,y,(r<<24)|(g<<16)|(b<<8)|a);
      }
   }
   return JS_UNDEFINED;
}

/* screenCRTWarp(strength) — barrel lens distortion */
static JSValue js_screen_crt_warp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double k = argc>0 ? double_from_js(ctx,argv[0],0.3) : 0.3;

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH) x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;
   int W=x2-x1+1,H=y2-y1+1;
   if (W<=0||H<=0) return JS_UNDEFINED;

   uint32_t *tmp=(uint32_t*)malloc((size_t)(W*H)*sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   for (int r=0;r<H;r++)
      for (int c=0;c<W;c++)
         tmp[r*W+c]=framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)];

   double hw=W*0.5, hh=H*0.5;
   for (int r=0;r<H;r++){
      for (int c=0;c<W;c++){
         double nx2=(c-hw)/hw, ny2=(r-hh)/hh;
         double r2=nx2*nx2+ny2*ny2;
         double scale=1.0+k*r2;
         double sx=(nx2*scale)*hw+hw;
         double sy=(ny2*scale)*hh+hh;
         int si=(int)sx,sj=(int)sy;
         if (si>=0&&si<W&&sj>=0&&sj<H)
            framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)]=tmp[sj*W+si];
         else
            framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)]=0x00000000u;
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* screenOilPaint(radius) — Kuwahara-style painterly effect */
static JSValue js_screen_oil_paint(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int radius=(int)(argc>0?double_from_js(ctx,argv[0],2.0):2.0);
   if (radius<1) radius=1; if (radius>6) radius=6;

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH) x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;
   int W=x2-x1+1,H=y2-y1+1;
   if (W<=0||H<=0) return JS_UNDEFINED;

   uint32_t *src=(uint32_t*)malloc((size_t)(W*H)*sizeof(uint32_t));
   if (!src) return JS_UNDEFINED;
   for (int r=0;r<H;r++)
      for (int c=0;c<W;c++)
         src[r*W+c]=framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)];

   /* 4 quadrant Kuwahara */
   for (int r=0;r<H;r++){
      for (int c=0;c<W;c++){
         double bestVar=1e18; uint32_t bestColor=src[r*W+c];
         int qx[4]={0,-radius,0,-radius}, qy[4]={0,0,-radius,-radius};
         for (int q=0;q<4;q++){
            long sumR=0,sumG=0,sumB=0; int cnt=0;
            for (int dy=qy[q];dy<=qy[q]+radius;dy++)
               for (int dx=qx[q];dx<=qx[q]+radius;dx++){
                  int sr=r+dy,sc=c+dx;
                  if (sr<0||sr>=H||sc<0||sc>=W) continue;
                  uint32_t p=src[sr*W+sc];
                  sumR+=(p>>24)&0xFF; sumG+=(p>>16)&0xFF; sumB+=(p>>8)&0xFF; cnt++;
               }
            if (!cnt) continue;
            double mr=sumR/cnt, mg=sumG/cnt, mb=sumB/cnt;
            double var=0;
            for (int dy=qy[q];dy<=qy[q]+radius;dy++)
               for (int dx=qx[q];dx<=qx[q]+radius;dx++){
                  int sr=r+dy,sc=c+dx;
                  if (sr<0||sr>=H||sc<0||sc>=W) continue;
                  uint32_t p=src[sr*W+sc];
                  double dr=((p>>24)&0xFF)-mr;
                  double dg=((p>>16)&0xFF)-mg;
                  double db=((p>> 8)&0xFF)-mb;
                  var+=dr*dr+dg*dg+db*db;
               }
            if (var<bestVar){
               bestVar=var;
               bestColor=((uint32_t)(mr+0.5)<<24)|((uint32_t)(mg+0.5)<<16)|((uint32_t)(mb+0.5)<<8)|(src[r*W+c]&0xFF);
            }
         }
         framebuffer[(y1+r)*NOVA64_WIDTH+(x1+c)]=bestColor;
      }
   }
   free(src);
   return JS_UNDEFINED;
}

/* drawGear(cx,cy,r,teeth,toothH,color) — gear outline */
static JSValue js_draw_gear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int gcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int gcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   double gr   =double_from_js(ctx,argv[2],30.0);
   int    teeth=(int)double_from_js(ctx,argv[3],8.0);
   double toothH=double_from_js(ctx,argv[4],6.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   if (teeth<4) teeth=4;
   int segs=teeth*4;
   double outerR=gr+toothH, innerR=gr;
   int prevX=0,prevY=0;
   for (int i=0;i<=segs;i++){
      double a=i*2.0*M_PI/segs;
      int qi=i%4;
      double r2=(qi==1||qi==2)?outerR:innerR;
      int nx2=(int)(gcx+cos(a)*r2), ny2=(int)(gcy+sin(a)*r2);
      if (i>0) path_draw_line_segment(prevX,prevY,nx2,ny2,col);
      prevX=nx2; prevY=ny2;
   }
   return JS_UNDEFINED;
}

/* fillGear(cx,cy,r,teeth,toothH,color) — filled gear */
static JSValue js_fill_gear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int gcx=(int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int gcy=(int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   double gr   =double_from_js(ctx,argv[2],30.0);
   int    teeth=(int)double_from_js(ctx,argv[3],8.0);
   double toothH=double_from_js(ctx,argv[4],6.0);
   uint32_t col=(uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   if (teeth<4) teeth=4;
   double outerR=gr+toothH;
   int maxR=(int)(outerR+2);
   for (int py=gcy-maxR;py<=gcy+maxR;py++){
      for (int px=gcx-maxR;px<=gcx+maxR;px++){
         double dx=(double)(px-gcx), dy=(double)(py-gcy);
         double dist=sqrt(dx*dx+dy*dy);
         if (dist>outerR+1.0) continue;
         if (dist<gr){set_pixel(px,py,col);continue;}
         /* check if in a tooth */
         double angle=atan2(dy,dx);
         if (angle<0) angle+=2.0*M_PI;
         double toothAngle=fmod(angle,2.0*M_PI/teeth)*teeth/(2.0*M_PI);
         /* toothAngle in [0,1] per tooth; tooth occupies [0.25,0.75] */
         if (toothAngle>=0.25&&toothAngle<=0.75&&dist<=outerR)
            set_pixel(px,py,col);
      }
   }
   return JS_UNDEFINED;
}

/* colorFromFloats(r,g,b,a) — create color from 0.0-1.0 float components */
static JSValue js_color_from_floats(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double r=argc>0?double_from_js(ctx,argv[0],0.0):0.0;
   double g=argc>1?double_from_js(ctx,argv[1],0.0):0.0;
   double b=argc>2?double_from_js(ctx,argv[2],0.0):0.0;
   double a=argc>3?double_from_js(ctx,argv[3],1.0):1.0;
   if(r<0)r=0;if(r>1)r=1; if(g<0)g=0;if(g>1)g=1;
   if(b<0)b=0;if(b>1)b=1; if(a<0)a=0;if(a>1)a=1;
   uint32_t ri=(uint32_t)(r*255+0.5), gi=(uint32_t)(g*255+0.5);
   uint32_t bi=(uint32_t)(b*255+0.5), ai=(uint32_t)(a*255+0.5);
   return JS_NewInt32(ctx,(int32_t)((ri<<24)|(gi<<16)|(bi<<8)|ai));
}

/* ── Batch 17: vector math, color blends, trig helpers, glow, ruler ─── */

/* reflectVector(vx,vy,nx,ny) → {x,y} — reflect v off unit normal n */
static JSValue js_reflect_vector(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   double vx   = double_from_js(ctx,argv[0],0.0);
   double vy   = double_from_js(ctx,argv[1],0.0);
   double nx   = double_from_js(ctx,argv[2],0.0);
   double ny   = double_from_js(ctx,argv[3],1.0);
   double dot2 = 2.0*(vx*nx + vy*ny);
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, vx - dot2*nx));
   JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, vy - dot2*ny));
   return obj;
}

/* rotateVector(vx,vy,angle) → {x,y} — rotate by degrees */
static JSValue js_rotate_vector(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   double vx  = double_from_js(ctx,argv[0],0.0);
   double vy  = double_from_js(ctx,argv[1],0.0);
   double deg = double_from_js(ctx,argv[2],0.0);
   double rad = deg * M_PI / 180.0;
   double c   = cos(rad), s = sin(rad);
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, vx*c - vy*s));
   JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, vx*s + vy*c));
   return obj;
}

/* colorMultiply(c1,c2) — multiply blend */
static JSValue js_color_multiply(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1 = (uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2 = (uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
   uint32_t r  = ((c1>>24)&0xFF)*((c2>>24)&0xFF)/255;
   uint32_t g  = ((c1>>16)&0xFF)*((c2>>16)&0xFF)/255;
   uint32_t b  = ((c1>> 8)&0xFF)*((c2>> 8)&0xFF)/255;
   uint32_t a  = ((c1    )&0xFF)*((c2    )&0xFF)/255;
   return JS_NewInt32(ctx, (int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* colorScreen(c1,c2) — screen blend */
static JSValue js_color_screen(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1 = (uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2 = (uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define SCR(a,b) (255-(255-(int)(a))*(255-(int)(b))/255)
   uint32_t r = (uint32_t)SCR((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g = (uint32_t)SCR((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b = (uint32_t)SCR((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a = (uint32_t)SCR((c1    )&0xFF,(c2    )&0xFF);
#undef SCR
   return JS_NewInt32(ctx, (int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* colorOverlay(c1,c2) — overlay blend */
static JSValue js_color_overlay(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t c1 = (uint32_t)color_from_js(ctx,argv[0],0xFF000000u);
   uint32_t c2 = (uint32_t)color_from_js(ctx,argv[1],0xFF000000u);
#define OVL(a,b) ((int)(a)<128 ? 2*(int)(a)*(int)(b)/255 : 255-2*(255-(int)(a))*(255-(int)(b))/255)
   uint32_t r = (uint32_t)OVL((c1>>24)&0xFF,(c2>>24)&0xFF);
   uint32_t g = (uint32_t)OVL((c1>>16)&0xFF,(c2>>16)&0xFF);
   uint32_t b = (uint32_t)OVL((c1>> 8)&0xFF,(c2>> 8)&0xFF);
   uint32_t a = (c1)&0xFF;
#undef OVL
   return JS_NewInt32(ctx, (int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* sinD(degrees) */
static JSValue js_sin_d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double d = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   return JS_NewFloat64(ctx, sin(d*M_PI/180.0));
}

/* cosD(degrees) */
static JSValue js_cos_d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double d = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   return JS_NewFloat64(ctx, cos(d*M_PI/180.0));
}

/* atan2D(y,x) → degrees */
static JSValue js_atan2_d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewFloat64(ctx, 0.0);
   double y = double_from_js(ctx,argv[0],0.0);
   double x = double_from_js(ctx,argv[1],1.0);
   return JS_NewFloat64(ctx, atan2(y,x)*180.0/M_PI);
}

/* degToRad(d) */
static JSValue js_deg_to_rad(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double d = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   return JS_NewFloat64(ctx, d*M_PI/180.0);
}

/* radToDeg(r) */
static JSValue js_rad_to_deg(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double r = argc>0 ? double_from_js(ctx,argv[0],0.0) : 0.0;
   return JS_NewFloat64(ctx, r*180.0/M_PI);
}

/* screenGlow(radius, intensity) — box-blur + additive blend back */
static JSValue js_screen_glow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int    radius = (int)(argc>0 ? double_from_js(ctx,argv[0],3.0) : 3.0);
   double intens = argc>1 ? double_from_js(ctx,argv[1],0.8) : 0.8;
   if (radius<1) radius=1; if (radius>16) radius=16;
   if (intens<0.0) intens=0.0; if (intens>2.0) intens=2.0;

   int cx0=0,cy0=0,cw=NOVA64_WIDTH,ch=NOVA64_HEIGHT;
   if (clip_active){cx0=clip_x;cy0=clip_y;cw=clip_w;ch=clip_h;}
   int x1=cx0,y1=cy0,x2=cx0+cw-1,y2=cy0+ch-1;
   if (x2>=NOVA64_WIDTH)  x2=NOVA64_WIDTH-1;
   if (y2>=NOVA64_HEIGHT) y2=NOVA64_HEIGHT-1;
   int W=x2-x1+1,H=y2-y1+1;
   if (W<=0||H<=0) return JS_UNDEFINED;

   uint32_t *tmp = (uint32_t*)malloc((size_t)(W*H)*sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;

   /* horizontal box blur into tmp */
   for (int row=0;row<H;row++){
      for (int col=0;col<W;col++){
         long rr=0,gg=0,bb=0,cnt=0;
         for (int k=-radius;k<=radius;k++){
            int sc=col+k; if(sc<0||sc>=W) continue;
            uint32_t p=framebuffer[(y1+row)*NOVA64_WIDTH+(x1+sc)];
            rr+=(p>>24)&0xFF; gg+=(p>>16)&0xFF; bb+=(p>>8)&0xFF; cnt++;
         }
         tmp[row*W+col]=((uint32_t)(rr/cnt)<<24)|((uint32_t)(gg/cnt)<<16)|((uint32_t)(bb/cnt)<<8)|0xFF;
      }
   }
   /* vertical blur + additive blend back */
   for (int row=0;row<H;row++){
      for (int col=0;col<W;col++){
         long rr=0,gg=0,bb=0,cnt=0;
         for (int k=-radius;k<=radius;k++){
            int sr=row+k; if(sr<0||sr>=H) continue;
            uint32_t p=tmp[sr*W+col];
            rr+=(p>>24)&0xFF; gg+=(p>>16)&0xFF; bb+=(p>>8)&0xFF; cnt++;
         }
         uint32_t orig=framebuffer[(y1+row)*NOVA64_WIDTH+(x1+col)];
         int nr=(int)((orig>>24)&0xFF)+(int)((rr/cnt)*intens);
         int ng=(int)((orig>>16)&0xFF)+(int)((gg/cnt)*intens);
         int nb=(int)((orig>> 8)&0xFF)+(int)((bb/cnt)*intens);
         if(nr>255)nr=255; if(ng>255)ng=255; if(nb>255)nb=255;
         framebuffer[(y1+row)*NOVA64_WIDTH+(x1+col)]=
            ((uint32_t)nr<<24)|((uint32_t)ng<<16)|((uint32_t)nb<<8)|((orig)&0xFF);
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* drawRuler(x,y,len,vertical,step,color) */
static JSValue js_draw_ruler(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int rx   = (int)double_from_js(ctx,argv[0],0.0)-(int)cam2d_x;
   int ry   = (int)double_from_js(ctx,argv[1],0.0)-(int)cam2d_y;
   int len  = (int)double_from_js(ctx,argv[2],100.0);
   int vert = (int)double_from_js(ctx,argv[3],0.0);
   int step = (int)double_from_js(ctx,argv[4],10.0);
   uint32_t col = (uint32_t)color_from_js(ctx,argv[5],0xFFFFFFFFu);
   if (step<1) step=1;
   for (int i=0;i<len;i++) vert ? set_pixel(rx,ry+i,col) : set_pixel(rx+i,ry,col);
   for (int i=0;i<=len;i+=step){
      int tl=(i%(step*5)==0)?8:4;
      for (int t=1;t<=tl;t++) vert ? set_pixel(rx+t,ry+i,col) : set_pixel(rx+i,ry+t,col);
   }
   return JS_UNDEFINED;
}

/* ── Batch 16: thick line, arrow, check, waves, screen filters, cloud ─── */

/* drawThickLine(x1,y1,x2,y2,w,color) — filled rectangle along line */
static JSValue js_draw_thick_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   float fx1 = (float)double_from_js(ctx,argv[0],0.0)-(float)cam2d_x;
   float fy1 = (float)double_from_js(ctx,argv[1],0.0)-(float)cam2d_y;
   float fx2 = (float)double_from_js(ctx,argv[2],0.0)-(float)cam2d_x;
   float fy2 = (float)double_from_js(ctx,argv[3],0.0)-(float)cam2d_y;
   float hw  = (float)double_from_js(ctx,argv[4],2.0) * 0.5f;
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   float dx = fx2-fx1, dy = fy2-fy1;
   float len = sqrtf(dx*dx+dy*dy); if (len < 0.001f) return JS_UNDEFINED;
   float nx = -dy/len*hw, ny = dx/len*hw; /* normal scaled by half-width */
   float ax=fx1+nx, ay=fy1+ny, bx=fx1-nx, by=fy1-ny;
   float cx3=fx2-nx, cy3=fy2-ny, ddx=fx2+nx, ddy2=fy2+ny;
   /* Scanline fill the 4-vertex polygon: two triangles */
   float vx[4]={ax,bx,cx3,ddx}, vy[4]={ay,by,cy3,ddy2};
   int ibx0=(int)(ax<bx?ax:bx); if(cx3<ibx0)ibx0=(int)cx3; if(ddx<ibx0)ibx0=(int)ddx;
   int ibx1=(int)(ax>bx?ax:bx); if(cx3>ibx1)ibx1=(int)cx3; if(ddx>ibx1)ibx1=(int)ddx+1;
   int iby0=(int)(ay<by?ay:by); if(cy3<iby0)iby0=(int)cy3; if(ddy2<iby0)iby0=(int)ddy2;
   int iby1=(int)(ay>by?ay:by); if(cy3>iby1)iby1=(int)cy3; if(ddy2>iby1)iby1=(int)ddy2+1;
   /* For each scanline, find x-span by polygon edge tests */
   for (int py = iby0; py <= iby1; py++) {
      float xmin=1e9f, xmax=-1e9f;
      for (int i=0, j=3; i<4; j=i++) {
         float yi=vy[i], yj=vy[j];
         if ((yi>(float)py) != (yj>(float)py)) {
            float t2 = ((float)py-yj)/(yi-yj);
            float xi = vx[j]+(vx[i]-vx[j])*t2;
            if(xi<xmin)xmin=xi; if(xi>xmax)xmax=xi;
         }
      }
      for (int px=(int)xmin; px<=(int)xmax; px++) {
         if(px>=0&&px<NOVA64_WIDTH&&py>=0&&py<NOVA64_HEIGHT)
            framebuffer[(size_t)py*NOVA64_WIDTH+(size_t)px]=color;
      }
   }
   return JS_UNDEFINED;
}

/* drawArrowFilled(x1,y1,x2,y2,hw,hl,color) — line with filled triangle head */
static JSValue js_draw_arrow_filled(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   double x1=double_from_js(ctx,argv[0],0.0)-cam2d_x, y1=double_from_js(ctx,argv[1],0.0)-cam2d_y;
   double x2=double_from_js(ctx,argv[2],0.0)-cam2d_x, y2=double_from_js(ctx,argv[3],0.0)-cam2d_y;
   double hw=double_from_js(ctx,argv[4],8.0), hl=double_from_js(ctx,argv[5],12.0);
   uint32_t color=color_from_js(ctx,argv[6],0xffffffff);
   double dx=x2-x1, dy=y2-y1;
   double len=sqrt(dx*dx+dy*dy); if(len<0.001) return JS_UNDEFINED;
   double ux=dx/len, uy=dy/len;
   double bx=x2-ux*hl, by=y2-uy*hl; /* base of arrowhead */
   double nx=-uy*hw, ny=ux*hw;
   /* Draw shaft */
   path_draw_line_segment((float)x1,(float)y1,(float)bx,(float)by,color);
   /* Fill arrowhead triangle */
   float vx3[3]={(float)(bx+nx),(float)(bx-nx),(float)x2};
   float vy3[3]={(float)(by+ny),(float)(by-ny),(float)y2};
   int ibx0=(int)(vx3[0]<vx3[1]?vx3[0]:vx3[1]); if(vx3[2]<ibx0)ibx0=(int)vx3[2];
   int ibx1=(int)(vx3[0]>vx3[1]?vx3[0]:vx3[1]); if(vx3[2]>ibx1)ibx1=(int)vx3[2]+1;
   int iby0=(int)(vy3[0]<vy3[1]?vy3[0]:vy3[1]); if(vy3[2]<iby0)iby0=(int)vy3[2];
   int iby1=(int)(vy3[0]>vy3[1]?vy3[0]:vy3[1]); if(vy3[2]>iby1)iby1=(int)vy3[2]+1;
   float d=(vy3[1]-vy3[2])*(vx3[0]-vx3[2])+(vx3[2]-vx3[1])*(vy3[0]-vy3[2]);
   if(fabsf(d)<0.001f) return JS_UNDEFINED;
   for(int py=iby0;py<=iby1;py++){
      for(int px=ibx0;px<=ibx1;px++){
         if(px<0||px>=NOVA64_WIDTH||py<0||py>=NOVA64_HEIGHT) continue;
         float u=((vy3[1]-vy3[2])*((float)px-vx3[2])+(vx3[2]-vx3[1])*((float)py-vy3[2]))/d;
         float v=((vy3[2]-vy3[0])*((float)px-vx3[2])+(vx3[0]-vx3[2])*((float)py-vy3[2]))/d;
         float w=1.0f-u-v;
         if(u>=0&&v>=0&&w>=0) framebuffer[(size_t)py*NOVA64_WIDTH+(size_t)px]=color;
      }
   }
   return JS_UNDEFINED;
}

/* drawCheck(cx, cy, size, color) — checkmark / tick symbol */
static JSValue js_draw_check(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   float cx2 = (float)double_from_js(ctx,argv[0],0.0)-(float)cam2d_x;
   float cy2 = (float)double_from_js(ctx,argv[1],0.0)-(float)cam2d_y;
   float sz  = (float)double_from_js(ctx,argv[2],10.0);
   uint32_t color = color_from_js(ctx,argv[3],0xffffffff);
   /* Checkmark: two segments — short down-right, then long up-right */
   float mx = cx2 - sz*0.1f, my = cy2 + sz*0.3f; /* mid-point */
   path_draw_line_segment(cx2 - sz*0.5f, cy2,         mx, my,       color);
   path_draw_line_segment(mx,            my,           cx2 + sz*0.5f, cy2 - sz*0.6f, color);
   return JS_UNDEFINED;
}

/* triangleWave(t) — triangle wave: 0→1→0 per unit cycle */
static JSValue js_triangle_wave(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double f = fmod(t, 1.0); if (f < 0.0) f += 1.0;
   return JS_NewFloat64(ctx, f < 0.5 ? f * 2.0 : 2.0 - f * 2.0);
}

/* squareWave(t) — square wave: 1 for first half, 0 for second half */
static JSValue js_square_wave(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double f = fmod(t, 1.0); if (f < 0.0) f += 1.0;
   return JS_NewFloat64(ctx, f < 0.5 ? 1.0 : 0.0);
}

/* sawWave(t) — sawtooth wave: 0→1 per unit cycle */
static JSValue js_saw_wave(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double f = fmod(t, 1.0); if (f < 0.0) f += 1.0;
   return JS_NewFloat64(ctx, f);
}

/* screenEdgeDetect(strength) — Sobel edge detection overlay */
static JSValue js_screen_edge_detect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   double str = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0);
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   uint32_t *tmp = (uint32_t *)malloc((size_t)W * (size_t)H * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   memcpy(tmp, framebuffer, (size_t)W * (size_t)H * sizeof(uint32_t));
   for (int y = 1; y < H-1; y++) {
      for (int x = 1; x < W-1; x++) {
         /* Sobel on luminance */
         int lum[3][3];
         for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
               uint32_t c = tmp[(y+dy)*W+(x+dx)];
               lum[dy+1][dx+1] = (int)(0.299*((c>>24)&0xff)+0.587*((c>>16)&0xff)+0.114*((c>>8)&0xff));
            }
         }
         int gx = -lum[0][0]+lum[0][2]-2*lum[1][0]+2*lum[1][2]-lum[2][0]+lum[2][2];
         int gy = -lum[0][0]-2*lum[0][1]-lum[0][2]+lum[2][0]+2*lum[2][1]+lum[2][2];
         int mag = (int)(sqrt((double)(gx*gx+gy*gy)) * str);
         if (mag > 255) mag = 255;
         framebuffer[y*W+x] = rgba8((uint8_t)mag,(uint8_t)mag,(uint8_t)mag,255);
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* screenEmboss() — emboss convolution filter */
static JSValue js_screen_emboss(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (!framebuffer) return JS_UNDEFINED;
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   uint32_t *tmp = (uint32_t *)malloc((size_t)W * (size_t)H * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   memcpy(tmp, framebuffer, (size_t)W * (size_t)H * sizeof(uint32_t));
   /* Kernel: [-2,-1,0 / -1,1,1 / 0,1,2] + 128 bias */
   static const int kx[3]={-1,0,1}, ky[3]={-1,0,1};
   static const int kw[3][3]={{-2,-1,0},{-1,1,1},{0,1,2}};
   for (int y = 1; y < H-1; y++) {
      for (int x = 1; x < W-1; x++) {
         int rv=128, gv=128, bv=128;
         for (int dy=-1; dy<=1; dy++) {
            for (int dx=-1; dx<=1; dx++) {
               uint32_t c = tmp[(y+dy)*W+(x+dx)];
               int k = kw[dy+1][dx+1];
               rv += (int)((c>>24)&0xff)*k;
               gv += (int)((c>>16)&0xff)*k;
               bv += (int)((c>> 8)&0xff)*k;
            }
         }
         if(rv<0)rv=0;if(rv>255)rv=255;
         if(gv<0)gv=0;if(gv>255)gv=255;
         if(bv<0)bv=0;if(bv>255)bv=255;
         framebuffer[y*W+x]=rgba8((uint8_t)rv,(uint8_t)gv,(uint8_t)bv,255);
         (void)kx; (void)ky;
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* screenSharpen(amount) — unsharp mask sharpening */
static JSValue js_screen_sharpen(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   double amt = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0);
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   uint32_t *tmp = (uint32_t *)malloc((size_t)W * (size_t)H * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   memcpy(tmp, framebuffer, (size_t)W * (size_t)H * sizeof(uint32_t));
   float center = (float)(1.0 + 4.0 * amt), edge = (float)-amt;
   for (int y = 1; y < H-1; y++) {
      for (int x = 1; x < W-1; x++) {
         uint32_t cc=tmp[y*W+x], ct=tmp[(y-1)*W+x], cb=tmp[(y+1)*W+x];
         uint32_t cl=tmp[y*W+x-1], cr=tmp[y*W+x+1];
         for (int ch=3; ch>=1; ch--) {
            float v = center*((float)((cc>>(ch*8))&0xff))
                     +edge*((float)((ct>>(ch*8))&0xff))
                     +edge*((float)((cb>>(ch*8))&0xff))
                     +edge*((float)((cl>>(ch*8))&0xff))
                     +edge*((float)((cr>>(ch*8))&0xff));
            int iv=(int)v; if(iv<0)iv=0;if(iv>255)iv=255;
            framebuffer[y*W+x] = (framebuffer[y*W+x] & ~(0xffu<<(ch*8))) | ((uint32_t)iv<<(ch*8));
         }
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* drawCloud(cx, cy, r, color) — cloud silhouette (5 overlapping circles) */
static JSValue js_draw_cloud(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int cx2 = int_from_js(ctx,argv[0],0)-(int)cam2d_x;
   int cy2 = int_from_js(ctx,argv[1],0)-(int)cam2d_y;
   int r   = int_from_js(ctx,argv[2],20);
   uint32_t color = color_from_js(ctx,argv[3],0xffffffff);
   /* 5-bump cloud using filled circles */
   int r2 = r * 3 / 5;
   /* Bottom base: large circle */
   float rsq = (float)(r*r), r2sq = (float)(r2*r2);
   /* Use pixel test — for each pixel check if inside any of 5 circles */
   int bx0=cx2-r-r2, bx1=cx2+r+r2, by0=cy2-r, by1=cy2+r2/2;
   /* 5 circle centers */
   int cxs[5]={cx2-r/2, cx2+r/2, cx2, cx2-r, cx2+r};
   int cys[5]={cy2-r2/2, cy2-r2/2, cy2-r*2/3, cy2, cy2};
   int rs2[5]; rs2[0]=r2*r2; rs2[1]=r2*r2; rs2[2]=(r*2/3)*(r*2/3); rs2[3]=r*r/4; rs2[4]=r*r/4;
   /* Simpler: hardcoded cloud geometry proportional to r */
   /* Bottom: rect from -r to +r, height r/2 */
   for (int py=cy2; py<=cy2+r/2; py++)
      for (int px=cx2-r; px<=cx2+r; px++) set_pixel(px, py, color);
   /* 5 bumps */
   int bumpX[5]={cx2-r+r/3, cx2-r/3, cx2+r/3, cx2+r-r/3, cx2};
   int bumpY[5]={cy2, cy2, cy2, cy2, cy2-r/3};
   int bumpR[5]={r/3, r/3, r/3, r/3, r*2/5};
   for (int b=0; b<5; b++) {
      int br2=bumpR[b]*bumpR[b];
      for (int py=bumpY[b]-bumpR[b]; py<=bumpY[b]+bumpR[b]; py++)
         for (int px=bumpX[b]-bumpR[b]; px<=bumpX[b]+bumpR[b]; px++) {
            int ddx=px-bumpX[b], ddy=py-bumpY[b];
            if(ddx*ddx+ddy*ddy<=br2) set_pixel(px,py,color);
         }
   }
   (void)rsq; (void)r2sq; (void)bx0; (void)bx1; (void)by0; (void)by1;
   (void)cxs; (void)cys; (void)rs2; (void)r2;
   return JS_UNDEFINED;
}

/* screenNightVision(strength) — green tint + CRT scanlines + noise */
static JSValue js_screen_night_vision(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   double str = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.8);
   if (str < 0.0) str = 0.0; if (str > 1.0) str = 1.0;
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   uint32_t seed = 0xA5C3E7B1u;
   for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
         uint32_t c = framebuffer[y*W+x];
         double lum = 0.299*((c>>24)&0xff)+0.587*((c>>16)&0xff)+0.114*((c>>8)&0xff);
         /* Green tint */
         int gv = (int)(lum * (1.0 + str * 0.5));
         if (gv > 255) gv = 255;
         /* Scanline darkening */
         if (y % 2 == 0) gv = (int)(gv * (1.0 - str * 0.3));
         /* Noise grain */
         seed = seed * 1664525u + 1013904223u;
         int grain = (int)(((seed >> 16) & 0x1f) * str) - 8;
         gv += grain; if(gv<0)gv=0;if(gv>255)gv=255;
         framebuffer[y*W+x] = rgba8(0, (uint8_t)gv, 0, 255);
      }
   }
   return JS_UNDEFINED;
}

/* colorFromHSL(h, s, l) — create color from HSL (h 0-360, s 0-1, l 0-1) */
static JSValue js_color_from_hsl(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double h = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double s = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
   double l = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.5);
   /* HSL to RGB */
   double c2 = (1.0 - fabs(2.0*l - 1.0)) * s;
   double h2 = fmod(h, 360.0) / 60.0;
   double x2 = c2 * (1.0 - fabs(fmod(h2, 2.0) - 1.0));
   double m  = l - c2 * 0.5;
   double r2=0, g2=0, b2=0;
   int hi = (int)h2 % 6;
   switch(hi) {
      case 0: r2=c2;g2=x2;b2=0; break; case 1: r2=x2;g2=c2;b2=0; break;
      case 2: r2=0;g2=c2;b2=x2; break; case 3: r2=0;g2=x2;b2=c2; break;
      case 4: r2=x2;g2=0;b2=c2; break; default: r2=c2;g2=0;b2=x2; break;
   }
   int rv=(int)((r2+m)*255+0.5), gv=(int)((g2+m)*255+0.5), bv=(int)((b2+m)*255+0.5);
   if(rv<0)rv=0;if(rv>255)rv=255;if(gv<0)gv=0;if(gv>255)gv=255;if(bv<0)bv=0;if(bv>255)bv=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)rv,(uint8_t)gv,(uint8_t)bv,255));
}

/* ── Batch 15: copy pixels, lozenge, spiral, easing, tri gradient, etc. ─── */

/* copyPixels(srcX,srcY,dstX,dstY,w,h) — blit framebuffer region */
static JSValue js_copy_pixels(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer || argc < 6) return JS_UNDEFINED;
   int sx = int_from_js(ctx, argv[0], 0), sy = int_from_js(ctx, argv[1], 0);
   int dx = int_from_js(ctx, argv[2], 0), dy = int_from_js(ctx, argv[3], 0);
   int w  = int_from_js(ctx, argv[4], 0), h  = int_from_js(ctx, argv[5], 0);
   int W  = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   if (w <= 0 || h <= 0) return JS_UNDEFINED;
   uint32_t *tmp = (uint32_t *)malloc((size_t)w * (size_t)h * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   for (int y = 0; y < h; y++) {
      int sy2 = sy + y, dx2 = sx;
      if (sy2 < 0 || sy2 >= H) { memset(tmp + (size_t)y * w, 0, (size_t)w * 4); continue; }
      for (int x = 0; x < w; x++) {
         int sx2 = dx2 + x;
         tmp[(size_t)y * w + (size_t)x] = (sx2 >= 0 && sx2 < W) ? framebuffer[(size_t)sy2 * W + (size_t)sx2] : 0;
      }
   }
   for (int y = 0; y < h; y++) {
      int dy2 = dy + y; if (dy2 < 0 || dy2 >= H) continue;
      for (int x = 0; x < w; x++) {
         int dx3 = dx + x; if (dx3 < 0 || dx3 >= W) continue;
         framebuffer[(size_t)dy2 * W + (size_t)dx3] = tmp[(size_t)y * w + (size_t)x];
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* colorAddRGB(c, r, g, b) — add offsets to each channel (clamped) */
static JSValue js_color_add_rgb(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   int ra = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int ga = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int ba = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   int nr = (int)((c>>24)&0xff) + ra;
   int ng = (int)((c>>16)&0xff) + ga;
   int nb = (int)((c>> 8)&0xff) + ba;
   if(nr<0)nr=0;if(nr>255)nr=255;
   if(ng<0)ng=0;if(ng>255)ng=255;
   if(nb<0)nb=0;if(nb>255)nb=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)nr,(uint8_t)ng,(uint8_t)nb,(uint8_t)(c&0xff)));
}

/* drawLozenge(cx,cy,w,h,color) — diamond / lozenge outline */
static JSValue js_draw_lozenge(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   float cx2 = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   float cy2 = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   float hw  = (float)double_from_js(ctx, argv[2], 10.0) * 0.5f;
   float hh  = (float)double_from_js(ctx, argv[3], 10.0) * 0.5f;
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   path_draw_line_segment(cx2,      cy2 - hh, cx2 + hw, cy2,       color);
   path_draw_line_segment(cx2 + hw, cy2,      cx2,      cy2 + hh,  color);
   path_draw_line_segment(cx2,      cy2 + hh, cx2 - hw, cy2,       color);
   path_draw_line_segment(cx2 - hw, cy2,      cx2,      cy2 - hh,  color);
   return JS_UNDEFINED;
}

/* fillLozenge(cx,cy,w,h,color) — filled diamond */
static JSValue js_fill_lozenge(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int cx2 = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int cy2 = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int hw  = int_from_js(ctx, argv[2], 10) / 2;
   int hh  = int_from_js(ctx, argv[3], 10) / 2;
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   for (int dy = -hh; dy <= hh; dy++) {
      int xw = (hh > 0) ? (int)((float)hw * (1.0f - (float)abs(dy) / (float)hh)) : 0;
      for (int dx = -xw; dx <= xw; dx++)
         set_pixel(cx2 + dx, cy2 + dy, color);
   }
   return JS_UNDEFINED;
}

/* drawSpiral(cx,cy,r1,r2,turns,color) — Archimedean spiral */
static JSValue js_draw_spiral(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   double cx2  = double_from_js(ctx, argv[0], 0.0) - cam2d_x;
   double cy2  = double_from_js(ctx, argv[1], 0.0) - cam2d_y;
   double r1   = double_from_js(ctx, argv[2], 0.0);
   double r2   = double_from_js(ctx, argv[3], 40.0);
   double turns= double_from_js(ctx, argv[4], 3.0);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   int steps = (int)(turns * 60.0); if (steps < 4) steps = 4; if (steps > 1024) steps = 1024;
   double twopi = 2.0 * 3.14159265358979;
   double px = cx2, py = cy2;
   for (int i = 0; i <= steps; i++) {
      double t = (double)i / steps;
      double angle = t * turns * twopi;
      double r = r1 + (r2 - r1) * t;
      double nx = cx2 + cos(angle) * r;
      double ny = cy2 + sin(angle) * r;
      if (i > 0) path_draw_line_segment((float)px,(float)py,(float)nx,(float)ny,color);
      px = nx; py = ny;
   }
   return JS_UNDEFINED;
}

/* colorWarm(c, t) — warm filter: boost R, reduce B */
static JSValue js_color_warm(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double   t = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.5);
   int nr = (int)((c>>24)&0xff) + (int)(t * 40.0);
   int nb = (int)((c>> 8)&0xff) - (int)(t * 40.0);
   if(nr<0)nr=0;if(nr>255)nr=255; if(nb<0)nb=0;if(nb>255)nb=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)nr,(uint8_t)((c>>16)&0xff),(uint8_t)nb,(uint8_t)(c&0xff)));
}

/* colorCool(c, t) — cool filter: boost B, reduce R */
static JSValue js_color_cool(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double   t = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.5);
   int nr = (int)((c>>24)&0xff) - (int)(t * 40.0);
   int nb = (int)((c>> 8)&0xff) + (int)(t * 40.0);
   if(nr<0)nr=0;if(nr>255)nr=255; if(nb<0)nb=0;if(nb>255)nb=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)nr,(uint8_t)((c>>16)&0xff),(uint8_t)nb,(uint8_t)(c&0xff)));
}

/* easeExpo(t) — exponential ease in */
static JSValue js_ease_expo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   if (t <= 0.0) return JS_NewFloat64(ctx, 0.0);
   if (t >= 1.0) return JS_NewFloat64(ctx, 1.0);
   return JS_NewFloat64(ctx, pow(2.0, 10.0 * (t - 1.0)));
}

/* easePower(t, p) — power curve ease (t^p) */
static JSValue js_ease_power(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double p = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 2.0);
   if (t < 0.0) t = 0.0; if (t > 1.0) t = 1.0;
   return JS_NewFloat64(ctx, pow(t, p));
}

/* fillTriGradient(x1,y1,c1, x2,y2,c2, x3,y3,c3) — Gouraud triangle */
static JSValue js_fill_tri_gradient(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 9) return JS_UNDEFINED;
   float x1 = (float)double_from_js(ctx,argv[0],0.0)-(float)cam2d_x, y1=(float)double_from_js(ctx,argv[1],0.0)-(float)cam2d_y;
   uint32_t c1 = color_from_js(ctx, argv[2], 0xffffffff);
   float x2 = (float)double_from_js(ctx,argv[3],0.0)-(float)cam2d_x, y2=(float)double_from_js(ctx,argv[4],0.0)-(float)cam2d_y;
   uint32_t c2 = color_from_js(ctx, argv[5], 0xffffffff);
   float x3 = (float)double_from_js(ctx,argv[6],0.0)-(float)cam2d_x, y3=(float)double_from_js(ctx,argv[7],0.0)-(float)cam2d_y;
   uint32_t c3 = color_from_js(ctx, argv[8], 0xffffffff);
   float r1=(float)((c1>>24)&0xff),g1=(float)((c1>>16)&0xff),b1=(float)((c1>>8)&0xff);
   float r2=(float)((c2>>24)&0xff),g2=(float)((c2>>16)&0xff),b2=(float)((c2>>8)&0xff);
   float r3=(float)((c3>>24)&0xff),g3=(float)((c3>>16)&0xff),b3=(float)((c3>>8)&0xff);
   int bx0=(int)(x1<x2?x1:x2); if(x3<bx0)bx0=(int)x3;
   int bx1=(int)(x1>x2?x1:x2); if(x3>bx1)bx1=(int)x3+1;
   int by0=(int)(y1<y2?y1:y2); if(y3<by0)by0=(int)y3;
   int by1=(int)(y1>y2?y1:y2); if(y3>by1)by1=(int)y3+1;
   float d = (y2-y3)*(x1-x3)+(x3-x2)*(y1-y3);
   if (fabsf(d) < 0.001f) return JS_UNDEFINED;
   for (int py = by0; py <= by1; py++) {
      for (int px = bx0; px <= bx1; px++) {
         if (px<0||px>=NOVA64_WIDTH||py<0||py>=NOVA64_HEIGHT) continue;
         float u = ((y2-y3)*((float)px-x3)+(x3-x2)*((float)py-y3))/d;
         float v = ((y3-y1)*((float)px-x3)+(x1-x3)*((float)py-y3))/d;
         float w = 1.0f - u - v;
         if (u < 0.0f || v < 0.0f || w < 0.0f) continue;
         uint8_t nr=(uint8_t)(u*r1+v*r2+w*r3);
         uint8_t ng=(uint8_t)(u*g1+v*g2+w*g3);
         uint8_t nb2=(uint8_t)(u*b1+v*b2+w*b3);
         framebuffer[(size_t)py*NOVA64_WIDTH+(size_t)px] = rgba8(nr,ng,nb2,255);
      }
   }
   return JS_UNDEFINED;
}

/* invertRegion(x,y,w,h) — invert RGB in a screen region */
static JSValue js_invert_region(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   int rx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int ry = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int rw = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int rh = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   int W  = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   for (int y = ry; y < ry + rh; y++) {
      if (y < 0 || y >= H) continue;
      for (int x = rx; x < rx + rw; x++) {
         if (x < 0 || x >= W) continue;
         uint32_t c = framebuffer[(size_t)y * W + (size_t)x];
         framebuffer[(size_t)y * W + (size_t)x] =
            rgba8((uint8_t)(255 - ((c>>24)&0xff)),
                  (uint8_t)(255 - ((c>>16)&0xff)),
                  (uint8_t)(255 - ((c>> 8)&0xff)),
                  (uint8_t)(c & 0xff));
      }
   }
   return JS_UNDEFINED;
}

/* screenRetro(strength) — scanlines + subtle noise + vignette combo */
static JSValue js_screen_retro(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   double str = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.5);
   if (str < 0.0) str = 0.0; if (str > 1.0) str = 1.0;
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   /* Scanlines: darken every even row */
   uint8_t scan_factor = (uint8_t)(255 - (int)(str * 100));
   for (int y = 0; y < H; y += 2) {
      for (int x = 0; x < W; x++) {
         uint32_t c = framebuffer[(size_t)y * W + (size_t)x];
         framebuffer[(size_t)y * W + (size_t)x] = rgba8(
            (uint8_t)(((c>>24)&0xff) * scan_factor / 255),
            (uint8_t)(((c>>16)&0xff) * scan_factor / 255),
            (uint8_t)(((c>> 8)&0xff) * scan_factor / 255), 255);
      }
   }
   /* Vignette: darken edges proportionally */
   float cx3 = W * 0.5f, cy3 = H * 0.5f;
   float max_d = cx3 * cx3 + cy3 * cy3;
   float vig_str = (float)str;
   for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
         float dx2 = (float)x - cx3, dy2 = (float)y - cy3;
         float d2 = dx2*dx2 + dy2*dy2;
         float vig = 1.0f - vig_str * 0.8f * (d2 / max_d);
         if (vig < 0.0f) vig = 0.0f;
         uint32_t c = framebuffer[(size_t)y * W + (size_t)x];
         framebuffer[(size_t)y * W + (size_t)x] = rgba8(
            (uint8_t)(((c>>24)&0xff) * vig),
            (uint8_t)(((c>>16)&0xff) * vig),
            (uint8_t)(((c>> 8)&0xff) * vig), 255);
      }
   }
   return JS_UNDEFINED;
}

/* ── Batch 14: hue shift, luminance, easing, hex cell, X mark, etc. ────── */

/* Internal: RGB → HSV (h 0-360, s 0-1, v 0-1) */
static void rgb_to_hsv(uint8_t r, uint8_t g, uint8_t b, double *h, double *s, double *v)
{
   double rf = r / 255.0, gf = g / 255.0, bf = b / 255.0;
   double mx = rf > gf ? rf : gf; if (bf > mx) mx = bf;
   double mn = rf < gf ? rf : gf; if (bf < mn) mn = bf;
   *v = mx;
   *s = mx > 0.0 ? (mx - mn) / mx : 0.0;
   if (mx == mn) { *h = 0.0; return; }
   double d = mx - mn;
   if      (mx == rf) *h = 60.0 * fmod((gf - bf) / d, 6.0);
   else if (mx == gf) *h = 60.0 * ((bf - rf) / d + 2.0);
   else               *h = 60.0 * ((rf - gf) / d + 4.0);
   if (*h < 0.0) *h += 360.0;
}

/* Internal: HSV → RGB */
static void hsv_to_rgb(double h, double s, double v, uint8_t *r, uint8_t *g, uint8_t *b)
{
   if (s <= 0.0) { *r = *g = *b = (uint8_t)(v * 255.0); return; }
   double hh = fmod(h, 360.0); if (hh < 0.0) hh += 360.0;
   double hh6 = hh / 60.0;
   int    i   = (int)hh6;
   double f   = hh6 - i;
   double p   = v * (1.0 - s);
   double q   = v * (1.0 - f * s);
   double t   = v * (1.0 - (1.0 - f) * s);
   double rv, gv, bv;
   switch (i % 6) {
      case 0: rv=v; gv=t; bv=p; break;
      case 1: rv=q; gv=v; bv=p; break;
      case 2: rv=p; gv=v; bv=t; break;
      case 3: rv=p; gv=q; bv=v; break;
      case 4: rv=t; gv=p; bv=v; break;
      default:rv=v; gv=p; bv=q; break;
   }
   *r = (uint8_t)(rv * 255.0 + 0.5);
   *g = (uint8_t)(gv * 255.0 + 0.5);
   *b = (uint8_t)(bv * 255.0 + 0.5);
}

/* colorShift(c, hueOffset) — rotate hue by degrees, preserve S/V */
static JSValue js_color_shift(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double   d = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   double h, s, v;
   rgb_to_hsv((c>>24)&0xff, (c>>16)&0xff, (c>>8)&0xff, &h, &s, &v);
   h = fmod(h + d + 360.0, 360.0);
   uint8_t r2, g2, b2;
   hsv_to_rgb(h, s, v, &r2, &g2, &b2);
   return JS_NewInt32(ctx, (int32_t)rgba8(r2, g2, b2, (uint8_t)(c & 0xff)));
}

/* colorLuminance(c) — BT.601 perceptual luminance 0-255 */
static JSValue js_color_luminance(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double lum = 0.299*(double)((c>>24)&0xff) + 0.587*(double)((c>>16)&0xff) + 0.114*(double)((c>>8)&0xff);
   return JS_NewInt32(ctx, (int32_t)(lum + 0.5));
}

/* easeBack(t) — cubic back easing with overshoot */
static JSValue js_ease_back(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   if (t < 0.0) t = 0.0; if (t > 1.0) t = 1.0;
   const double c1 = 1.70158, c3 = c1 + 1.0;
   return JS_NewFloat64(ctx, 1.0 + c3 * (t - 1.0) * (t - 1.0) * (t - 1.0) + c1 * (t - 1.0) * (t - 1.0));
}

/* easeSine(t) — sine-based ease in */
static JSValue js_ease_sine(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   if (t < 0.0) t = 0.0; if (t > 1.0) t = 1.0;
   return JS_NewFloat64(ctx, 1.0 - cos(t * 3.14159265358979 * 0.5));
}

/* drawHexCell(cx, cy, r, color) — hexagon outline (pointy-top) */
static JSValue js_draw_hex_cell(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   double cx2 = double_from_js(ctx, argv[0], 0.0) - cam2d_x;
   double cy2 = double_from_js(ctx, argv[1], 0.0) - cam2d_y;
   double r   = double_from_js(ctx, argv[2], 10.0);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   double step = 3.14159265358979 / 3.0;
   double px = cx2, py = cy2;
   for (int i = 0; i <= 6; i++) {
      double angle = i * step - 3.14159265358979 / 6.0;
      double nx = cx2 + cos(angle) * r;
      double ny = cy2 + sin(angle) * r;
      if (i > 0) path_draw_line_segment((float)px, (float)py, (float)nx, (float)ny, color);
      px = nx; py = ny;
   }
   return JS_UNDEFINED;
}

/* fillHexCell(cx, cy, r, color) — filled hexagon (pointy-top) */
static JSValue js_fill_hex_cell(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   double cx2 = double_from_js(ctx, argv[0], 0.0) - cam2d_x;
   double cy2 = double_from_js(ctx, argv[1], 0.0) - cam2d_y;
   double r   = double_from_js(ctx, argv[2], 10.0);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   double step = 3.14159265358979 / 3.0;
   double vx[6], vy[6];
   for (int i = 0; i < 6; i++) {
      double angle = i * step - 3.14159265358979 / 6.0;
      vx[i] = cx2 + cos(angle) * r;
      vy[i] = cy2 + sin(angle) * r;
   }
   int ibx0 = (int)(cx2 - r), ibx1 = (int)(cx2 + r + 1.0);
   int iby0 = (int)(cy2 - r), iby1 = (int)(cy2 + r + 1.0);
   for (int py = iby0; py <= iby1; py++) {
      for (int px = ibx0; px <= ibx1; px++) {
         if (px < 0 || px >= NOVA64_WIDTH || py < 0 || py >= NOVA64_HEIGHT) continue;
         int inside = 0;
         double fx = (double)px + 0.5, fy = (double)py + 0.5;
         for (int i = 0, j = 5; i < 6; j = i++) {
            double xi = vx[i], yi = vy[i], xj = vx[j], yj = vy[j];
            if (((yi > fy) != (yj > fy)) &&
                (fx < (xj - xi) * (fy - yi) / (yj - yi) + xi))
               inside ^= 1;
         }
         if (inside) framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px] = color;
      }
   }
   return JS_UNDEFINED;
}

/* drawX(cx, cy, size, color) — diagonal X mark outline */
static JSValue js_draw_x_mark(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int cx2  = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int cy2  = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int size = int_from_js(ctx, argv[2], 8);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   path_draw_line_segment((float)(cx2 - size), (float)(cy2 - size),
                          (float)(cx2 + size), (float)(cy2 + size), color);
   path_draw_line_segment((float)(cx2 + size), (float)(cy2 - size),
                          (float)(cx2 - size), (float)(cy2 + size), color);
   return JS_UNDEFINED;
}

/* fillX(cx, cy, size, w, color) — filled X mark */
static JSValue js_fill_x_mark(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int cx2  = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int cy2  = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int size = int_from_js(ctx, argv[2], 8);
   int w    = int_from_js(ctx, argv[3], 2);
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   for (int dy = -size; dy <= size; dy++) {
      for (int dx = -size; dx <= size; dx++) {
         int adiff1 = abs(abs(dx) - abs(dy));
         int adiff2 = abs(dx + dy);
         if (adiff1 <= w || adiff2 <= w)
            set_pixel(cx2 + dx, cy2 + dy, color);
      }
   }
   return JS_UNDEFINED;
}

/* drawChevron(x, y, size, dir, color) — chevron (dir: 0=right,1=down,2=left,3=up) */
static JSValue js_draw_chevron(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int cx2  = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int cy2  = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int size = int_from_js(ctx, argv[2], 8);
   int dir  = int_from_js(ctx, argv[3], 0);
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   float ax, ay, bx, by, cx3, cy3;
   switch (dir % 4) {
      case 0: /* right > */
         ax=(float)(cx2-size); ay=(float)(cy2-size);
         bx=(float)(cx2+size); by=(float)cy2;
         cx3=(float)(cx2-size);cy3=(float)(cy2+size); break;
      case 1: /* down v */
         ax=(float)(cx2-size); ay=(float)(cy2-size);
         bx=(float)cx2;        by=(float)(cy2+size);
         cx3=(float)(cx2+size);cy3=(float)(cy2-size); break;
      case 2: /* left < */
         ax=(float)(cx2+size); ay=(float)(cy2-size);
         bx=(float)(cx2-size); by=(float)cy2;
         cx3=(float)(cx2+size);cy3=(float)(cy2+size); break;
      default:/* up ^ */
         ax=(float)(cx2-size); ay=(float)(cy2+size);
         bx=(float)cx2;        by=(float)(cy2-size);
         cx3=(float)(cx2+size);cy3=(float)(cy2+size); break;
   }
   path_draw_line_segment(ax, ay, bx, by, color);
   path_draw_line_segment(bx, by, cx3, cy3, color);
   return JS_UNDEFINED;
}

/* colorSepia(c) — sepia-tone a single color */
static JSValue js_color_sepia(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double r = (double)((c>>24)&0xff), g = (double)((c>>16)&0xff), b = (double)((c>>8)&0xff);
   int nr = (int)(r*0.393 + g*0.769 + b*0.189);
   int ng = (int)(r*0.349 + g*0.686 + b*0.168);
   int nb = (int)(r*0.272 + g*0.534 + b*0.131);
   if (nr>255)nr=255; if (ng>255)ng=255; if (nb>255)nb=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)nr,(uint8_t)ng,(uint8_t)nb,(uint8_t)(c&0xff)));
}

/* colorVibrance(c, amount) — boost saturation of less-saturated pixels */
static JSValue js_color_vibrance(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c   = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double   amt = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
   double r = (double)((c>>24)&0xff), g = (double)((c>>16)&0xff), b = (double)((c>>8)&0xff);
   double mx = r > g ? r : g; if (b > mx) mx = b;
   double mn = r < g ? r : g; if (b < mn) mn = b;
   double sat = mx > 0.0 ? (mx - mn) / mx : 0.0;
   double boost = 1.0 + amt * (1.0 - sat);
   double avg = (r + g + b) / 3.0;
   int nr = (int)(avg + (r - avg) * boost);
   int ng = (int)(avg + (g - avg) * boost);
   int nb = (int)(avg + (b - avg) * boost);
   if (nr<0)nr=0; if(nr>255)nr=255;
   if (ng<0)ng=0; if(ng>255)ng=255;
   if (nb<0)nb=0; if(nb>255)nb=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)nr,(uint8_t)ng,(uint8_t)nb,(uint8_t)(c&0xff)));
}

/* screenHSV(hShift, sMul, vMul) — apply HSV transform to full framebuffer */
static JSValue js_screen_hsv(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   double hshift = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   double smul   = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
   double vmul   = double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0);
   int total = NOVA64_WIDTH * NOVA64_HEIGHT;
   for (int i = 0; i < total; i++) {
      uint32_t px = framebuffer[i];
      double h, s, v;
      rgb_to_hsv((px>>24)&0xff, (px>>16)&0xff, (px>>8)&0xff, &h, &s, &v);
      h = fmod(h + hshift + 360.0, 360.0);
      s *= smul; if (s > 1.0) s = 1.0; if (s < 0.0) s = 0.0;
      v *= vmul; if (v > 1.0) v = 1.0; if (v < 0.0) v = 0.0;
      uint8_t r2, g2, b2;
      hsv_to_rgb(h, s, v, &r2, &g2, &b2);
      framebuffer[i] = rgba8(r2, g2, b2, (uint8_t)(px & 0xff));
   }
   return JS_UNDEFINED;
}

/* ── Batch 13: capsule, ring, region effects, gradient line, star, etc. ─ */

/* colorWithAlpha(c, a) — replace alpha channel of color, keep RGB */
static JSValue js_color_with_alpha(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   int a = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 255);
   if (a < 0) a = 0; if (a > 255) a = 255;
   return JS_NewInt32(ctx, (int32_t)((c & 0xffffff00u) | (uint32_t)a));
}

/* drawCapsule(x1,y1,x2,y2,r,color) — capsule outline */
static JSValue js_draw_capsule(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   float fx1 = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   float fy1 = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   float fx2 = (float)double_from_js(ctx, argv[2], 0.0) - (float)cam2d_x;
   float fy2 = (float)double_from_js(ctx, argv[3], 0.0) - (float)cam2d_y;
   int r  = int_from_js(ctx, argv[4], 4);
   if (r < 1) r = 1;
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   float dx = fx2 - fx1, dy = fy2 - fy1;
   float seg_sq = dx*dx + dy*dy;
   float rsq_hi = (float)(r * r);
   float rsq_lo = (float)((r-1) * (r-1));
   int bx0 = (int)(fminf(fx1,fx2) - r - 1);
   int by0 = (int)(fminf(fy1,fy2) - r - 1);
   int bx1 = (int)(fmaxf(fx1,fx2) + r + 1);
   int by1 = (int)(fmaxf(fy1,fy2) + r + 1);
   for (int py = by0; py <= by1; py++) {
      for (int px = bx0; px <= bx1; px++) {
         if (px < 0 || px >= NOVA64_WIDTH || py < 0 || py >= NOVA64_HEIGHT) continue;
         float ex = (float)px - fx1, ey = (float)py - fy1;
         float t = seg_sq > 0.0f ? (ex*dx + ey*dy) / seg_sq : 0.0f;
         if (t < 0.0f) t = 0.0f; if (t > 1.0f) t = 1.0f;
         float cx = fx1 + t*dx - (float)px, cy = fy1 + t*dy - (float)py;
         float d2 = cx*cx + cy*cy;
         if (d2 <= rsq_hi && d2 >= rsq_lo) framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px] = color;
      }
   }
   return JS_UNDEFINED;
}

/* fillCapsule(x1,y1,x2,y2,r,color) — filled pill/capsule shape */
static JSValue js_fill_capsule(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   float fx1 = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   float fy1 = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   float fx2 = (float)double_from_js(ctx, argv[2], 0.0) - (float)cam2d_x;
   float fy2 = (float)double_from_js(ctx, argv[3], 0.0) - (float)cam2d_y;
   int r  = int_from_js(ctx, argv[4], 4);
   if (r < 1) r = 1;
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   float dx = fx2 - fx1, dy = fy2 - fy1;
   float seg_sq = dx*dx + dy*dy;
   float rsq = (float)(r * r);
   int bx0 = (int)(fminf(fx1,fx2) - r - 1);
   int by0 = (int)(fminf(fy1,fy2) - r - 1);
   int bx1 = (int)(fmaxf(fx1,fx2) + r + 1);
   int by1 = (int)(fmaxf(fy1,fy2) + r + 1);
   for (int py = by0; py <= by1; py++) {
      for (int px = bx0; px <= bx1; px++) {
         if (px < 0 || px >= NOVA64_WIDTH || py < 0 || py >= NOVA64_HEIGHT) continue;
         float ex = (float)px - fx1, ey = (float)py - fy1;
         float t = seg_sq > 0.0f ? (ex*dx + ey*dy) / seg_sq : 0.0f;
         if (t < 0.0f) t = 0.0f; if (t > 1.0f) t = 1.0f;
         float cx = fx1 + t*dx - (float)px, cy = fy1 + t*dy - (float)py;
         if (cx*cx + cy*cy <= rsq) framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px] = color;
      }
   }
   return JS_UNDEFINED;
}

/* drawRing(cx,cy,r1,r2,color) — filled ring between inner r1 and outer r2 */
static JSValue js_draw_ring(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int cx2  = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int cy2  = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int r1   = int_from_js(ctx, argv[2], 10);
   int r2   = int_from_js(ctx, argv[3], 20);
   if (r1 < 0) r1 = 0; if (r2 < r1) r2 = r1;
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   float r1sq = (float)(r1 * r1), r2sq = (float)(r2 * r2);
   for (int py = cy2 - r2; py <= cy2 + r2; py++) {
      for (int px = cx2 - r2; px <= cx2 + r2; px++) {
         if (px < 0 || px >= NOVA64_WIDTH || py < 0 || py >= NOVA64_HEIGHT) continue;
         float ddx = (float)(px - cx2), ddy = (float)(py - cy2);
         float d2 = ddx*ddx + ddy*ddy;
         if (d2 >= r1sq && d2 <= r2sq) framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px] = color;
      }
   }
   return JS_UNDEFINED;
}

/* blurRegion(x,y,w,h,radius) — box-blur a rectangular screen region */
static JSValue js_blur_region(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   int rx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int ry = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int rw = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int rh = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   int br = int_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 2);
   if (br < 1) br = 1; if (br > 16) br = 16;
   if (rx < 0) { rw += rx; rx = 0; }
   if (ry < 0) { rh += ry; ry = 0; }
   if (rx + rw > NOVA64_WIDTH)  rw = NOVA64_WIDTH  - rx;
   if (ry + rh > NOVA64_HEIGHT) rh = NOVA64_HEIGHT - ry;
   if (rw <= 0 || rh <= 0) return JS_UNDEFINED;
   int W = NOVA64_WIDTH;
   uint32_t *tmp = (uint32_t *)malloc((size_t)rw * (size_t)rh * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   for (int y = 0; y < rh; y++) {
      for (int x = 0; x < rw; x++) {
         unsigned sr = 0, sg = 0, sb = 0, cnt = 0;
         for (int dx = -br; dx <= br; dx++) {
            int sx = rx + x + dx;
            if (sx < rx) sx = rx; if (sx >= rx + rw) sx = rx + rw - 1;
            uint32_t c = framebuffer[(size_t)(ry + y) * W + (size_t)sx];
            sr += (c >> 24) & 0xff; sg += (c >> 16) & 0xff; sb += (c >> 8) & 0xff; cnt++;
         }
         tmp[(size_t)y * rw + (size_t)x] = rgba8(sr/cnt, sg/cnt, sb/cnt, 255);
      }
   }
   for (int y = 0; y < rh; y++) {
      for (int x = 0; x < rw; x++) {
         unsigned sr = 0, sg = 0, sb = 0, cnt = 0;
         for (int dy = -br; dy <= br; dy++) {
            int sy = y + dy;
            if (sy < 0) sy = 0; if (sy >= rh) sy = rh - 1;
            uint32_t c = tmp[(size_t)sy * rw + (size_t)x];
            sr += (c >> 24) & 0xff; sg += (c >> 16) & 0xff; sb += (c >> 8) & 0xff; cnt++;
         }
         framebuffer[(size_t)(ry + y) * W + (size_t)(rx + x)] = rgba8(sr/cnt, sg/cnt, sb/cnt, 255);
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* drawGradientLine(x1,y1,x2,y2,c1,c2) — line with interpolated color */
static JSValue js_draw_gradient_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int x1 = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int y1 = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int x2 = int_from_js(ctx, argv[2], 0) - (int)cam2d_x;
   int y2 = int_from_js(ctx, argv[3], 0) - (int)cam2d_y;
   uint32_t c1 = color_from_js(ctx, argv[4], 0xffffffff);
   uint32_t c2 = color_from_js(ctx, argv[5], 0xffffffff);
   int dx = x2 - x1, dy = y2 - y1;
   int steps = abs(dx) > abs(dy) ? abs(dx) : abs(dy);
   if (steps == 0) { set_pixel(x1, y1, c1); return JS_UNDEFINED; }
   unsigned r1=(c1>>24)&0xff, g1=(c1>>16)&0xff, b1=(c1>>8)&0xff;
   unsigned r2=(c2>>24)&0xff, g2=(c2>>16)&0xff, b2=(c2>>8)&0xff;
   for (int i = 0; i <= steps; i++) {
      int px = x1 + dx * i / steps;
      int py = y1 + dy * i / steps;
      unsigned r = r1 + (r2 - r1) * (unsigned)i / (unsigned)steps;
      unsigned g = g1 + (g2 - g1) * (unsigned)i / (unsigned)steps;
      unsigned b = b1 + (b2 - b1) * (unsigned)i / (unsigned)steps;
      set_pixel(px, py, rgba8((uint8_t)r,(uint8_t)g,(uint8_t)b,255));
   }
   return JS_UNDEFINED;
}

/* colorContrast(c, amount) — adjust contrast (>1 boost, <1 reduce) */
static JSValue js_color_contrast(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0xffffffff);
   double amt = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
   int rv = (int)(128.0 + ((int)((c>>24)&0xff) - 128) * amt);
   int gv = (int)(128.0 + ((int)((c>>16)&0xff) - 128) * amt);
   int bv = (int)(128.0 + ((int)((c>> 8)&0xff) - 128) * amt);
   if (rv<0)rv=0; if(rv>255)rv=255;
   if (gv<0)gv=0; if(gv>255)gv=255;
   if (bv<0)bv=0; if(bv>255)bv=255;
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)rv,(uint8_t)gv,(uint8_t)bv,(uint8_t)((c)&0xff)));
}

/* pixelateRegion(x,y,w,h,blockSize) — nearest-block pixelate a screen region */
static JSValue js_pixelate_region(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   int rx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int ry = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int rw = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int rh = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   int bs = int_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, 4);
   if (bs < 1) bs = 1;
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   for (int by = 0; by < rh; by += bs) {
      for (int bx = 0; bx < rw; bx += bs) {
         int sx = rx + bx, sy = ry + by;
         if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
         uint32_t sample = framebuffer[(size_t)sy * W + (size_t)sx];
         for (int dy = 0; dy < bs; dy++) {
            for (int dx = 0; dx < bs; dx++) {
               int px = rx + bx + dx, py = ry + by + dy;
               if (px >= 0 && px < W && py >= 0 && py < H)
                  framebuffer[(size_t)py * W + (size_t)px] = sample;
            }
         }
      }
   }
   return JS_UNDEFINED;
}

/* fillPlus(cx, cy, armLen, armW, color) — filled plus/cross shape */
static JSValue js_fill_plus(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int cx2 = int_from_js(ctx, argv[0], 0) - (int)cam2d_x;
   int cy2 = int_from_js(ctx, argv[1], 0) - (int)cam2d_y;
   int arm = int_from_js(ctx, argv[2], 10);
   int aw  = int_from_js(ctx, argv[3], 3);
   uint32_t color = color_from_js(ctx, argv[4], 0xffffffff);
   for (int py = cy2 - aw; py <= cy2 + aw; py++)
      for (int px = cx2 - arm; px <= cx2 + arm; px++)
         set_pixel(px, py, color);
   for (int py = cy2 - arm; py <= cy2 + arm; py++)
      for (int px = cx2 - aw; px <= cx2 + aw; px++)
         set_pixel(px, py, color);
   return JS_UNDEFINED;
}

/* drawTextVertical(text, x, y, color) — draw text rotated 90° CW */
static JSValue js_draw_text_vertical(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int bx = int_from_js(ctx, argv[1], 0) - (int)cam2d_x;
   int by = int_from_js(ctx, argv[2], 0) - (int)cam2d_y;
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   int ci = 0;
   for (const char *p = text; *p; p++, ci++) {
      for (int row = 0; row < 7; row++) {
         uint8_t bits = glyph_row((uint8_t)*p, row);
         for (int col = 0; col < 5; col++) {
            if (bits & (1U << (4 - col)))
               set_pixel(bx + row, by + ci * 6 + (4 - col), color);
         }
      }
   }
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* drawStar(cx,cy,outerR,innerR,points,color) — star polygon outline */
static JSValue js_draw_star(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   double cx2   = double_from_js(ctx, argv[0], 0.0) - cam2d_x;
   double cy2   = double_from_js(ctx, argv[1], 0.0) - cam2d_y;
   double outer = double_from_js(ctx, argv[2], 20.0);
   double inner = double_from_js(ctx, argv[3], 8.0);
   int    pts   = int_from_js(ctx, argv[4], 5);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   if (pts < 3) pts = 3;
   int total = pts * 2;
   double step = (2.0 * 3.14159265358979) / total;
   double px = cx2, py = cy2;
   for (int i = 0; i < total; i++) {
      double r  = (i % 2 == 0) ? outer : inner;
      double angle = i * step - 3.14159265358979 / 2.0;
      double nx = cx2 + cos(angle) * r;
      double ny = cy2 + sin(angle) * r;
      if (i > 0) path_draw_line_segment((float)px, (float)py, (float)nx, (float)ny, color);
      px = nx; py = ny;
   }
   /* close the star */
   double r0 = outer;
   double a0 = -3.14159265358979 / 2.0;
   path_draw_line_segment((float)px, (float)py, (float)(cx2 + cos(a0)*r0), (float)(cy2 + sin(a0)*r0), color);
   return JS_UNDEFINED;
}

/* fillStar(cx,cy,outerR,innerR,points,color) — filled star polygon */
static JSValue js_fill_star(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   double cx2   = double_from_js(ctx, argv[0], 0.0) - cam2d_x;
   double cy2   = double_from_js(ctx, argv[1], 0.0) - cam2d_y;
   double outer = double_from_js(ctx, argv[2], 20.0);
   double inner = double_from_js(ctx, argv[3], 8.0);
   int    pts   = int_from_js(ctx, argv[4], 5);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   if (pts < 3) pts = 3;
   int total = pts * 2;
   double step = (2.0 * 3.14159265358979) / total;
   /* build vertex list and fan from center */
   double vx[64], vy[64];
   if (total > 64) total = 64;
   for (int i = 0; i < total; i++) {
      double r     = (i % 2 == 0) ? outer : inner;
      double angle = i * step - 3.14159265358979 / 2.0;
      vx[i] = cx2 + cos(angle) * r;
      vy[i] = cy2 + sin(angle) * r;
   }
   /* compute bounding box, scanline fill */
   double bx0 = cx2 - outer, bx1 = cx2 + outer;
   double by0 = cy2 - outer, by1 = cy2 + outer;
   int ibx0 = (int)bx0, ibx1 = (int)(bx1 + 1.0);
   int iby0 = (int)by0, iby1 = (int)(by1 + 1.0);
   for (int py = iby0; py <= iby1; py++) {
      for (int px = ibx0; px <= ibx1; px++) {
         if (px < 0 || px >= NOVA64_WIDTH || py < 0 || py >= NOVA64_HEIGHT) continue;
         /* point-in-polygon test */
         int inside = 0;
         double fx = (double)px + 0.5, fy = (double)py + 0.5;
         for (int i = 0, j = total - 1; i < total; j = i++) {
            double xi = vx[i], yi = vy[i], xj = vx[j], yj = vy[j];
            if (((yi > fy) != (yj > fy)) &&
                (fx < (xj - xi) * (fy - yi) / (yj - yi) + xi))
               inside ^= 1;
         }
         if (inside) framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px] = color;
      }
   }
   return JS_UNDEFINED;
}

/* ── Batch 12: italic/underline text, progress, grid, color matrix, UI ─ */

/* printItalic(text, x, y, color) — shear text right by 1px per 2 rows */
static JSValue js_print_italic(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int bx = int_from_js(ctx, argv[1], 0);
   int by = int_from_js(ctx, argv[2], 0);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   /* 5×7 font: draw each row with a shear offset */
   int font_h = 7;
   for (int row = 0; row < font_h; row++) {
      int shear = (font_h - 1 - row) / 2; /* 0 at bottom, increases toward top */
      /* render just this row by clipping */
      int save_clip = clip_active;
      int save_cy = clip_y, save_ch = clip_h;
      clip_active = 1;
      clip_x = 0; clip_w = NOVA64_WIDTH;
      clip_y = by + row; clip_h = 1;
      draw_text_pixels(text, bx + shear + (int)cam2d_x, by + (int)cam2d_y, color);
      clip_active = save_clip;
      clip_y = save_cy; clip_h = save_ch;
   }
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* printUnderline(text, x, y, color) — print text + horizontal underline */
static JSValue js_print_underline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0);
   int y = int_from_js(ctx, argv[2], 0);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   draw_text_pixels(text, x + (int)cam2d_x, y + (int)cam2d_y, color);
   int w = text_pixel_width(text);
   for (int px2 = x; px2 < x + w; px2++) set_pixel(px2, y + 8, color);
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* drawProgressBar(x,y,w,h, t, fgColor, bgColor) — filled progress bar [0,1] */
static JSValue js_draw_progress_bar(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7 || !framebuffer) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[0], 0), y = int_from_js(ctx, argv[1], 0);
   int w = int_from_js(ctx, argv[2], 100), h = int_from_js(ctx, argv[3], 10);
   double t = clamp_double(double_from_js(ctx, argv[4], 0.0), 0.0, 1.0);
   uint32_t fg = color_from_js(ctx, argv[5], rgba8(100, 200, 100, 255));
   uint32_t bg = color_from_js(ctx, argv[6], rgba8(30, 40, 60, 255));
   int filled = (int)round(t * w);
   for (int py2 = y; py2 < y + h; py2++) {
      for (int px2 = x; px2 < x + w; px2++) {
         set_pixel(px2 - (int)cam2d_x, py2 - (int)cam2d_y, px2 - x < filled ? fg : bg);
      }
   }
   return JS_UNDEFINED;
}

/* gridSnap(v, gridSize) — snap v to nearest gridSize multiple */
static JSValue js_grid_snap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewFloat64(ctx, 0.0);
   double v    = double_from_js(ctx, argv[0], 0.0);
   double grid = fabs(double_from_js(ctx, argv[1], 1.0));
   if (grid < 1e-12) return JS_NewFloat64(ctx, v);
   return JS_NewFloat64(ctx, round(v / grid) * grid);
}

/* colorMatrix(c, m9) — apply flat 3×3 matrix [r,g,b row-major] to RGB channels */
static JSValue js_color_matrix(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || !JS_IsArray(argv[1])) return JS_NewInt32(ctx, argc > 0 ? (int32_t)color_from_js(ctx, argv[0], 0) : 0);
   uint32_t c = (uint32_t)color_from_js(ctx, argv[0], 0);
   double r = (uint8_t)(c>>24), g = (uint8_t)(c>>16), b = (uint8_t)(c>>8);
   double m[9] = {1,0,0, 0,1,0, 0,0,1};
   for (int i = 0; i < 9; i++) {
      JSValue mv = JS_GetPropertyUint32(ctx, argv[1], (uint32_t)i);
      m[i] = JS_IsUndefined(mv) ? (i==0||i==4||i==8 ? 1.0 : 0.0) : double_from_js(ctx, mv, 0.0);
      JS_FreeValue(ctx, mv);
   }
   int ro = (int)(m[0]*r + m[1]*g + m[2]*b);
   int go = (int)(m[3]*r + m[4]*g + m[5]*b);
   int bo = (int)(m[6]*r + m[7]*g + m[8]*b);
   ro=ro<0?0:(ro>255?255:ro); go=go<0?0:(go>255?255:go); bo=bo<0?0:(bo>255?255:bo);
   return JS_NewInt32(ctx, (int32_t)(((uint8_t)ro<<24)|((uint8_t)go<<16)|((uint8_t)bo<<8)|(uint8_t)c));
}

/* neonGlow(cx,cy, r, color, glowRadius) — draw circle with glow halo */
static JSValue js_neon_glow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5 || !framebuffer) return JS_UNDEFINED;
   int cx2   = int_from_js(ctx, argv[0], 0);
   int cy2   = int_from_js(ctx, argv[1], 0);
   int r2    = int_from_js(ctx, argv[2], 10);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   int glow  = int_from_js(ctx, argv[4], 4);
   if (glow < 0) glow = 0;
   uint8_t cr2=(uint8_t)(color>>24),cg2=(uint8_t)(color>>16),cb2=(uint8_t)(color>>8);
   /* glow layers: alpha falloff */
   for (int g2 = glow; g2 > 0; g2--) {
      float alpha = (float)g2 / (glow + 1) * 0.4f;
      uint32_t gc = rgba8(cr2, cg2, cb2, (uint8_t)(alpha * 255));
      /* draw circle at radius r + g2 */
      int rd = r2 + g2;
      int xp = rd, yp = 0, err = 0;
      while (xp >= yp) {
         /* 8-point symmetry — blend with framebuffer */
         int pts[8][2] = {{cx2+xp,cy2+yp},{cx2-xp,cy2+yp},{cx2+xp,cy2-yp},{cx2-xp,cy2-yp},
                          {cx2+yp,cy2+xp},{cx2-yp,cy2+xp},{cx2+yp,cy2-xp},{cx2-yp,cy2-xp}};
         for (int pi = 0; pi < 8; pi++) {
            int sx = pts[pi][0], sy = pts[pi][1];
            if (sx<0||sx>=NOVA64_WIDTH||sy<0||sy>=NOVA64_HEIGHT) continue;
            uint32_t dst = framebuffer[sy*NOVA64_WIDTH+sx];
            uint8_t dr=(uint8_t)(dst>>24),dg=(uint8_t)(dst>>16),db=(uint8_t)(dst>>8);
            uint8_t nr=(uint8_t)(dr+(int)((cr2-dr)*alpha)),ng=(uint8_t)(dg+(int)((cg2-dg)*alpha)),nb=(uint8_t)(db+(int)((cb2-db)*alpha));
            framebuffer[sy*NOVA64_WIDTH+sx]=(nr<<24)|(ng<<16)|(nb<<8)|0xff;
         }
         yp++; err += 1 + 2*yp;
         if (2*(err-xp)+1 > 0) { xp--; err += 1 - 2*xp; }
      }
   }
   /* draw solid circle outline */
   {
      int xp = r2, yp = 0, err = 0;
      while (xp >= yp) {
         int pts[8][2] = {{cx2+xp,cy2+yp},{cx2-xp,cy2+yp},{cx2+xp,cy2-yp},{cx2-xp,cy2-yp},
                          {cx2+yp,cy2+xp},{cx2-yp,cy2+xp},{cx2+yp,cy2-xp},{cx2-yp,cy2-xp}};
         for (int pi = 0; pi < 8; pi++) {
            int sx = pts[pi][0], sy = pts[pi][1];
            if (sx<0||sx>=NOVA64_WIDTH||sy<0||sy>=NOVA64_HEIGHT) continue;
            framebuffer[sy*NOVA64_WIDTH+sx] = color | 0xff;
         }
         yp++; err += 1 + 2*yp;
         if (2*(err-xp)+1 > 0) { xp--; err += 1 - 2*xp; }
      }
   }
   return JS_UNDEFINED;
}

/* barChart(values, x,y,w,h, color [, bgColor]) — vertical bar chart */
static JSValue js_bar_chart(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6 || !JS_IsArray(argv[0]) || !framebuffer) return JS_UNDEFINED;
   JSValue len_v = JS_GetPropertyStr(ctx, argv[0], "length");
   int len = 0; JS_ToInt32(ctx, &len, len_v); JS_FreeValue(ctx, len_v);
   if (len < 1) return JS_UNDEFINED;
   int bx = int_from_js(ctx, argv[1], 0), by = int_from_js(ctx, argv[2], 0);
   int bw = int_from_js(ctx, argv[3], 100), bh = int_from_js(ctx, argv[4], 60);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   uint32_t bgcol = argc > 6 ? color_from_js(ctx, argv[6], rgba8(20,30,50,255)) : rgba8(20,30,50,255);
   /* find max */
   double maxV = 0.0;
   for (int i = 0; i < len; i++) {
      JSValue vv = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)i);
      double v = double_from_js(ctx, vv, 0.0); JS_FreeValue(ctx, vv);
      if (v > maxV) maxV = v;
   }
   if (maxV <= 0.0) maxV = 1.0;
   double bw_each = (double)bw / len;
   for (int i = 0; i < len; i++) {
      JSValue vv = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)i);
      double v = double_from_js(ctx, vv, 0.0); JS_FreeValue(ctx, vv);
      int bh2 = (int)(v / maxV * bh);
      int x0 = bx + (int)(i * bw_each);
      int x1 = bx + (int)((i + 1) * bw_each) - 1;
      for (int py2 = by; py2 < by + bh; py2++) {
         for (int px2 = x0; px2 <= x1; px2++) {
            set_pixel(px2 - (int)cam2d_x, py2 - (int)cam2d_y,
                      py2 >= by + bh - bh2 ? color : bgcol);
         }
      }
   }
   return JS_UNDEFINED;
}

/* drawMeter(x,y,w,h, value, minV,maxV, fgColor, bgColor) — filled meter */
static JSValue js_draw_meter(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 9 || !framebuffer) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[0], 0), y = int_from_js(ctx, argv[1], 0);
   int w = int_from_js(ctx, argv[2], 100), h = int_from_js(ctx, argv[3], 10);
   double v    = double_from_js(ctx, argv[4], 0.0);
   double minV = double_from_js(ctx, argv[5], 0.0);
   double maxV = double_from_js(ctx, argv[6], 1.0);
   uint32_t fg = color_from_js(ctx, argv[7], rgba8(100,200,100,255));
   uint32_t bg = color_from_js(ctx, argv[8], rgba8(30,40,60,255));
   if (maxV == minV) maxV = minV + 1.0;
   double t = (v - minV) / (maxV - minV);
   if (t < 0.0) t = 0.0; if (t > 1.0) t = 1.0;
   int filled = (int)round(t * w);
   for (int py2 = y; py2 < y + h; py2++) {
      for (int px2 = x; px2 < x + w; px2++) {
         set_pixel(px2 - (int)cam2d_x, py2 - (int)cam2d_y, px2 - x < filled ? fg : bg);
      }
   }
   return JS_UNDEFINED;
}

/* percentStr(v) — returns "75%" for v=0.75 */
static JSValue js_percent_str(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   char buf[16];
   snprintf(buf, sizeof(buf), "%d%%", (int)round(v * 100.0));
   return JS_NewString(ctx, buf);
}

/* toFixed(v, d) — format number to d decimal places */
static JSValue js_to_fixed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double v = argc > 0 ? double_from_js(ctx, argv[0], 0.0) : 0.0;
   int d    = argc > 1 ? int_from_js(ctx, argv[1], 2) : 2;
   if (d < 0) d = 0; if (d > 8) d = 8;
   char fmt[8]; snprintf(fmt, sizeof(fmt), "%%.%df", d);
   char buf[32]; snprintf(buf, sizeof(buf), fmt, v);
   return JS_NewString(ctx, buf);
}

/* colorMix3(c1,w1, c2,w2, c3,w3) — weighted 3-color mix */
static JSValue js_color_mix3(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_NewInt32(ctx, 0);
   uint32_t c1=(uint32_t)color_from_js(ctx,argv[0],0), c2=(uint32_t)color_from_js(ctx,argv[2],0), c3=(uint32_t)color_from_js(ctx,argv[4],0);
   double w1=double_from_js(ctx,argv[1],1.0), w2=double_from_js(ctx,argv[3],1.0), w3=double_from_js(ctx,argv[5],1.0);
   double total = w1 + w2 + w3;
   if (total < 1e-12) total = 1.0;
   w1/=total; w2/=total; w3/=total;
   int r=(int)(w1*(uint8_t)(c1>>24)+w2*(uint8_t)(c2>>24)+w3*(uint8_t)(c3>>24));
   int g=(int)(w1*(uint8_t)(c1>>16)+w2*(uint8_t)(c2>>16)+w3*(uint8_t)(c3>>16));
   int b=(int)(w1*(uint8_t)(c1>>8) +w2*(uint8_t)(c2>>8) +w3*(uint8_t)(c3>>8));
   int a=(int)(w1*(uint8_t)c1      +w2*(uint8_t)c2      +w3*(uint8_t)c3);
   r=r<0?0:(r>255?255:r); g=g<0?0:(g>255?255:g); b=b<0?0:(b>255?255:b); a=a<0?0:(a>255?255:a);
   return JS_NewInt32(ctx, (int32_t)(((uint8_t)r<<24)|((uint8_t)g<<16)|((uint8_t)b<<8)|(uint8_t)a));
}

/* drawNoise(x,y,w,h, density, color) — scatter random pixels in region */
static JSValue js_draw_noise(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6 || !framebuffer) return JS_UNDEFINED;
   int nx  = int_from_js(ctx, argv[0], 0), ny  = int_from_js(ctx, argv[1], 0);
   int nw  = int_from_js(ctx, argv[2], 100), nh = int_from_js(ctx, argv[3], 100);
   double density = clamp_double(double_from_js(ctx, argv[4], 0.1), 0.0, 1.0);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   /* use a fast LCG seeded from position for determinism */
   uint32_t seed = (uint32_t)(nx * 1619 + ny * 31337 + (int)(density * 1000));
   int total = nw * nh;
   int count = (int)(total * density);
   for (int i = 0; i < count; i++) {
      seed = seed * 1664525u + 1013904223u;
      int px2 = nx + (int)((seed >> 16) % (uint32_t)nw);
      seed = seed * 1664525u + 1013904223u;
      int py2 = ny + (int)((seed >> 16) % (uint32_t)nh);
      set_pixel(px2 - (int)cam2d_x, py2 - (int)cam2d_y, color);
   }
   return JS_UNDEFINED;
}

/* ── Batch 11: cubic bezier, spline, hex grid, graph, color, waveform ── */

/* drawCubicBezier(x0,y0, cx0,cy0, cx1,cy1, x1,y1, color [,steps]) */
static JSValue js_draw_cubic_bezier(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 9) return JS_UNDEFINED;
   double x0  = double_from_js(ctx, argv[0], 0.0), y0  = double_from_js(ctx, argv[1], 0.0);
   double cx0 = double_from_js(ctx, argv[2], 0.0), cy0 = double_from_js(ctx, argv[3], 0.0);
   double cx1 = double_from_js(ctx, argv[4], 0.0), cy1 = double_from_js(ctx, argv[5], 0.0);
   double x1  = double_from_js(ctx, argv[6], 0.0), y1  = double_from_js(ctx, argv[7], 0.0);
   uint32_t color = color_from_js(ctx, argv[8], 0xffffffff);
   int steps = argc > 9 ? int_from_js(ctx, argv[9], 48) : 48;
   if (steps < 2) steps = 2; if (steps > 256) steps = 256;
   double px = x0, py = y0;
   for (int i = 1; i <= steps; i++) {
      double t = (double)i / steps, mt = 1.0 - t;
      double nx = mt*mt*mt*x0 + 3.0*mt*mt*t*cx0 + 3.0*mt*t*t*cx1 + t*t*t*x1;
      double ny = mt*mt*mt*y0 + 3.0*mt*mt*t*cy0 + 3.0*mt*t*t*cy1 + t*t*t*y1;
      path_draw_line_segment((int)round(px),(int)round(py),(int)round(nx),(int)round(ny),color);
      px = nx; py = ny;
   }
   return JS_UNDEFINED;
}

/* splinePoint(points, t) → {x,y} — Catmull-Rom point (points = flat array x,y pairs, t in [0,1]) */
static JSValue js_spline_point(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || !JS_IsArray(argv[0])) return JS_NewObject(ctx);
   JSValue len_v = JS_GetPropertyStr(ctx, argv[0], "length");
   int len = 0; JS_ToInt32(ctx, &len, len_v); JS_FreeValue(ctx, len_v);
   int npts = len / 2;
   if (npts < 2) return JS_NewObject(ctx);
   double t = double_from_js(ctx, argv[1], 0.0);
   t = t < 0.0 ? 0.0 : (t > 1.0 ? 1.0 : t);
   double seg_f = t * (npts - 1);
   int seg = (int)seg_f; if (seg >= npts - 1) seg = npts - 2;
   double u = seg_f - seg;
   /* Catmull-Rom: p0,p1,p2,p3 — clamp endpoints */
   int i0 = seg > 0 ? seg - 1 : 0;
   int i1 = seg;
   int i2 = seg + 1 < npts ? seg + 1 : npts - 1;
   int i3 = seg + 2 < npts ? seg + 2 : npts - 1;
   JSValue x0v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i0*2));
   JSValue y0v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i0*2+1));
   JSValue x1v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i1*2));
   JSValue y1v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i1*2+1));
   JSValue x2v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i2*2));
   JSValue y2v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i2*2+1));
   JSValue x3v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i3*2));
   JSValue y3v=JS_GetPropertyUint32(ctx,argv[0],(uint32_t)(i3*2+1));
   double p0x=double_from_js(ctx,x0v,0),p0y=double_from_js(ctx,y0v,0);
   double p1x=double_from_js(ctx,x1v,0),p1y=double_from_js(ctx,y1v,0);
   double p2x=double_from_js(ctx,x2v,0),p2y=double_from_js(ctx,y2v,0);
   double p3x=double_from_js(ctx,x3v,0),p3y=double_from_js(ctx,y3v,0);
   JS_FreeValue(ctx,x0v);JS_FreeValue(ctx,y0v);JS_FreeValue(ctx,x1v);JS_FreeValue(ctx,y1v);
   JS_FreeValue(ctx,x2v);JS_FreeValue(ctx,y2v);JS_FreeValue(ctx,x3v);JS_FreeValue(ctx,y3v);
   double u2=u*u, u3=u2*u;
   double rx = 0.5*((-p0x+3*p1x-3*p2x+p3x)*u3+(2*p0x-5*p1x+4*p2x-p3x)*u2+(-p0x+p2x)*u+2*p1x);
   double ry = 0.5*((-p0y+3*p1y-3*p2y+p3y)*u3+(2*p0y-5*p1y+4*p2y-p3y)*u2+(-p0y+p2y)*u+2*p1y);
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx,obj,"x",JS_NewFloat64(ctx,rx));
   JS_SetPropertyStr(ctx,obj,"y",JS_NewFloat64(ctx,ry));
   return obj;
}

/* hexGrid(x,y, size, cols, rows, color) — draw hex grid outlines */
static JSValue js_hex_grid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   double ox   = double_from_js(ctx, argv[0], 0.0);
   double oy   = double_from_js(ctx, argv[1], 0.0);
   double size = fabs(double_from_js(ctx, argv[2], 20.0));
   int cols    = int_from_js(ctx, argv[3], 4);
   int rows    = int_from_js(ctx, argv[4], 3);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   if (cols < 1 || rows < 1 || size < 1.0) return JS_UNDEFINED;
   double hw = size * 1.7320508075688772 / 2.0; /* half-width */
   double hh = size;                              /* half-height */
   for (int row = 0; row < rows; row++) {
      for (int col = 0; col < cols; col++) {
         double cx2 = ox + col * hw * 2.0 + (row % 2 != 0 ? hw : 0.0);
         double cy2 = oy + row * hh * 1.5;
         /* 6 vertices of a pointy-top hexagon */
         double pvx = 0, pvy = 0;
         for (int v = 0; v <= 6; v++) {
            double ang = (v % 6) * M_PI / 3.0 - M_PI / 6.0;
            double vx = cx2 + size * cos(ang);
            double vy = cy2 + size * sin(ang);
            if (v > 0) path_draw_line_segment((int)round(pvx),(int)round(pvy),(int)round(vx),(int)round(vy),color);
            pvx = vx; pvy = vy;
         }
      }
   }
   return JS_UNDEFINED;
}

/* drawGraph(values, x,y,w,h, minV,maxV, color) — line graph from array */
static JSValue js_draw_graph(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 8 || !JS_IsArray(argv[0])) return JS_UNDEFINED;
   JSValue len_v = JS_GetPropertyStr(ctx, argv[0], "length");
   int len = 0; JS_ToInt32(ctx, &len, len_v); JS_FreeValue(ctx, len_v);
   if (len < 2) return JS_UNDEFINED;
   double gx = double_from_js(ctx, argv[1], 0.0), gy = double_from_js(ctx, argv[2], 0.0);
   double gw = double_from_js(ctx, argv[3], 100.0), gh = double_from_js(ctx, argv[4], 50.0);
   double minV = double_from_js(ctx, argv[5], 0.0), maxV = double_from_js(ctx, argv[6], 1.0);
   uint32_t color = color_from_js(ctx, argv[7], 0xffffffff);
   if (maxV == minV) maxV = minV + 1.0;
   double px = 0, py = 0;
   for (int i = 0; i < len; i++) {
      JSValue vv = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)i);
      double v = double_from_js(ctx, vv, 0.0); JS_FreeValue(ctx, vv);
      double nx = gx + (double)i / (len - 1) * gw;
      double ny = gy + gh - (v - minV) / (maxV - minV) * gh;
      if (i > 0) path_draw_line_segment((int)round(px),(int)round(py),(int)round(nx),(int)round(ny),color);
      px = nx; py = ny;
   }
   return JS_UNDEFINED;
}

/* colorDesaturate(c, amount) — reduce saturation by amount [0,1] */
static JSValue js_color_desaturate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewInt32(ctx, 0);
   uint32_t c = (uint32_t)color_from_js(ctx, argv[0], 0xffffffff);
   double amt = clamp_double(double_from_js(ctx, argv[1], 0.0), 0.0, 1.0);
   uint8_t r=(uint8_t)(c>>24),g=(uint8_t)(c>>16),b=(uint8_t)(c>>8),a=(uint8_t)c;
   uint8_t gray = (uint8_t)(0.299*r + 0.587*g + 0.114*b);
   r=(uint8_t)(r + (gray - r) * amt); g=(uint8_t)(g + (gray - g) * amt); b=(uint8_t)(b + (gray - b) * amt);
   return JS_NewInt32(ctx, (int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* colorSaturate(c, amount) — boost saturation by amount [0,1] */
static JSValue js_color_saturate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewInt32(ctx, 0);
   uint32_t c = (uint32_t)color_from_js(ctx, argv[0], 0xffffffff);
   double amt = clamp_double(double_from_js(ctx, argv[1], 0.0), 0.0, 4.0);
   uint8_t r=(uint8_t)(c>>24),g=(uint8_t)(c>>16),b=(uint8_t)(c>>8),a=(uint8_t)c;
   uint8_t gray = (uint8_t)(0.299*r + 0.587*g + 0.114*b);
   int ri=(int)r + (int)((r - gray) * amt); int gi=(int)g + (int)((g - gray) * amt); int bi=(int)b + (int)((b - gray) * amt);
   ri=ri<0?0:(ri>255?255:ri); gi=gi<0?0:(gi>255?255:gi); bi=bi<0?0:(bi>255?255:bi);
   return JS_NewInt32(ctx, (int32_t)(((uint8_t)ri<<24)|((uint8_t)gi<<16)|((uint8_t)bi<<8)|a));
}

/* waveformPlot(samples, x,y,w,h, color) — waveform from flat array of values in [-1,1] */
static JSValue js_waveform_plot(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6 || !JS_IsArray(argv[0])) return JS_UNDEFINED;
   JSValue len_v = JS_GetPropertyStr(ctx, argv[0], "length");
   int len = 0; JS_ToInt32(ctx, &len, len_v); JS_FreeValue(ctx, len_v);
   if (len < 2) return JS_UNDEFINED;
   double wx = double_from_js(ctx, argv[1], 0.0), wy = double_from_js(ctx, argv[2], 0.0);
   double ww = double_from_js(ctx, argv[3], 100.0), wh = double_from_js(ctx, argv[4], 40.0);
   uint32_t color = color_from_js(ctx, argv[5], 0xffffffff);
   double midY = wy + wh * 0.5, halfH = wh * 0.5;
   double px = 0, py = 0;
   for (int i = 0; i < len; i++) {
      JSValue vv = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)i);
      double v = double_from_js(ctx, vv, 0.0); JS_FreeValue(ctx, vv);
      v = v < -1.0 ? -1.0 : (v > 1.0 ? 1.0 : v);
      double nx = wx + (double)i / (len - 1) * ww;
      double ny = midY - v * halfH;
      if (i > 0) path_draw_line_segment((int)round(px),(int)round(py),(int)round(nx),(int)round(ny),color);
      px = nx; py = ny;
   }
   return JS_UNDEFINED;
}

/* charCode(str) — returns codepoint of first character */
static JSValue js_char_code(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s || !s[0]) { if(s) JS_FreeCString(ctx,s); return JS_NewInt32(ctx, 0); }
   int code = (unsigned char)s[0];
   JS_FreeCString(ctx, s);
   return JS_NewInt32(ctx, code);
}

/* charFromCode(n) — returns 1-char string from codepoint */
static JSValue js_char_from_code(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int code = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   if (code < 0 || code > 127) code = 0;
   char buf[2] = { (char)code, '\0' };
   return JS_NewString(ctx, buf);
}

/* printBold(text, x, y, color) — double-pixel bold text approximation */
static JSValue js_print_bold(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0);
   int y = int_from_js(ctx, argv[2], 0);
   uint32_t color = color_from_js(ctx, argv[3], 0xffffffff);
   draw_text_pixels(text, x + (int)cam2d_x,     y + (int)cam2d_y, color);
   draw_text_pixels(text, x + (int)cam2d_x + 1, y + (int)cam2d_y, color);
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* dotGrid(x,y, w,h, gap, r, color) — grid of filled dots */
static JSValue js_dot_grid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7 || !framebuffer) return JS_UNDEFINED;
   int ox  = int_from_js(ctx, argv[0], 0);
   int oy  = int_from_js(ctx, argv[1], 0);
   int w   = int_from_js(ctx, argv[2], 100);
   int h   = int_from_js(ctx, argv[3], 100);
   int gap = int_from_js(ctx, argv[4], 8);
   int r   = int_from_js(ctx, argv[5], 2);
   uint32_t color = color_from_js(ctx, argv[6], 0xffffffff);
   if (gap < 1) gap = 1;
   for (int dy = 0; dy <= h; dy += gap) {
      for (int dx = 0; dx <= w; dx += gap) {
         int cx2 = ox + dx, cy2 = oy + dy;
         for (int py2 = cy2 - r; py2 <= cy2 + r; py2++) {
            for (int px2 = cx2 - r; px2 <= cx2 + r; px2++) {
               if ((px2-cx2)*(px2-cx2)+(py2-cy2)*(py2-cy2) <= r*r)
                  set_pixel(px2 - (int)cam2d_x, py2 - (int)cam2d_y, color);
            }
         }
      }
   }
   return JS_UNDEFINED;
}

/* clampColor(c, lo, hi) — clamp each RGB channel to [lo, hi] */
static JSValue js_clamp_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewInt32(ctx, 0);
   uint32_t c  = (uint32_t)color_from_js(ctx, argv[0], 0);
   int lo = int_from_js(ctx, argv[1], 0);
   int hi = int_from_js(ctx, argv[2], 255);
   if (lo < 0) lo = 0; if (lo > 255) lo = 255;
   if (hi < 0) hi = 0; if (hi > 255) hi = 255;
   if (lo > hi) { int tmp=lo; lo=hi; hi=tmp; }
   uint8_t r=(uint8_t)(c>>24),g=(uint8_t)(c>>16),b=(uint8_t)(c>>8),a=(uint8_t)c;
   r=(r<lo)?lo:(r>hi?hi:r); g=(g<lo)?lo:(g>hi?hi:g); b=(b<lo)?lo:(b>hi?hi:b);
   return JS_NewInt32(ctx, (int32_t)((r<<24)|(g<<16)|(b<<8)|a));
}

/* ── Scrolling text ──────────────────────────────────────────────────── */
static JSValue js_create_scroll_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_NewInt32(ctx, 0);
   float speed = argc > 1 ? (float)clamp_double(double_from_js(ctx, argv[1], 60.0), 1.0, 1000.0) : 60.0f;
   for (int i = 0; i < NOVA64_MAX_SCROLL_TEXTS; i++) {
      if (!g_scroll_texts[i].used) {
         g_scroll_texts[i].used  = 1;
         strncpy(g_scroll_texts[i].text, text, NOVA64_SCROLL_TEXT_MAX - 1);
         g_scroll_texts[i].text[NOVA64_SCROLL_TEXT_MAX - 1] = '\0';
         g_scroll_texts[i].speed   = speed;
         g_scroll_texts[i].pos     = 0.0f;
         g_scroll_texts[i].total_w = text_pixel_width(g_scroll_texts[i].text);
         JS_FreeCString(ctx, text);
         return JS_NewInt32(ctx, i + 1);
      }
   }
   JS_FreeCString(ctx, text);
   return JS_NewInt32(ctx, 0);
}
static JSValue js_draw_scroll_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_UNDEFINED;
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_SCROLL_TEXTS || !g_scroll_texts[idx].used) return JS_UNDEFINED;
   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;
   int dw = int_from_js(ctx, argv[3], 0);
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   if (dw <= 0) return JS_UNDEFINED;
   /* save/restore clip */
   bool prev_active = clip_active;
   int px = clip_x, py = clip_y, pw = clip_w, ph = clip_h;
   clip_x = dx; clip_y = dy - 2; clip_w = dw; clip_h = 12;
   clip_active = true;
   draw_text_pixels(g_scroll_texts[idx].text, dx - (int)g_scroll_texts[idx].pos, dy, color);
   clip_active = prev_active; clip_x = px; clip_y = py; clip_w = pw; clip_h = ph;
   return JS_UNDEFINED;
}
static JSValue js_destroy_scroll_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_SCROLL_TEXTS) memset(&g_scroll_texts[idx], 0, sizeof(g_scroll_texts[idx]));
   return JS_UNDEFINED;
}
static JSValue js_reset_scroll_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_SCROLL_TEXTS && g_scroll_texts[idx].used)
      g_scroll_texts[idx].pos = 0.0f;
   return JS_UNDEFINED;
}
static JSValue js_scroll_text_x(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_SCROLL_TEXTS || !g_scroll_texts[idx].used) return JS_NewFloat64(ctx, 0.0);
   return JS_NewFloat64(ctx, (double)g_scroll_texts[idx].pos);
}
static JSValue js_scroll_text_done(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_SCROLL_TEXTS || !g_scroll_texts[idx].used) return JS_NewBool(ctx, true);
   return JS_NewBool(ctx, g_scroll_texts[idx].pos >= (float)g_scroll_texts[idx].total_w);
}

/* ── Bitmask ops ─────────────────────────────────────────────────────── */
static JSValue js_bit_and(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int32_t b = (int32_t)int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, a & b);
}
static JSValue js_bit_or(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int32_t b = (int32_t)int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, a | b);
}
static JSValue js_bit_xor(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int32_t b = (int32_t)int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, a ^ b);
}
static JSValue js_bit_not(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   return JS_NewInt32(ctx, ~a);
}
static JSValue js_bit_shl(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int n = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   if (n < 0 || n > 31) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, a << n);
}
static JSValue js_bit_shr(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int n = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   if (n < 0 || n > 31) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, a >> n);
}
static JSValue js_bit_test(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int b = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   if (b < 0 || b > 31) return JS_NewBool(ctx, false);
   return JS_NewBool(ctx, (a >> b) & 1);
}
static JSValue js_bit_set(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int b = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   if (b < 0 || b > 31) return JS_NewInt32(ctx, a);
   return JS_NewInt32(ctx, a | (1 << b));
}
static JSValue js_bit_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int b = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   if (b < 0 || b > 31) return JS_NewInt32(ctx, a);
   return JS_NewInt32(ctx, a & ~(1 << b));
}
static JSValue js_bit_toggle(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int32_t a = (int32_t)int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int b = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   if (b < 0 || b > 31) return JS_NewInt32(ctx, a);
   return JS_NewInt32(ctx, a ^ (1 << b));
}

/* ── printLines ──────────────────────────────────────────────────────── */
static JSValue js_print_lines(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3 || !JS_IsArray(argv[0])) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int y = int_from_js(ctx, argv[2], 0) - cam2d_y;
   int lineH = argc > 3 ? int_from_js(ctx, argv[3], 10) : 10;
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   JSValue len_val = JS_GetPropertyStr(ctx, argv[0], "length");
   int len = int_from_js(ctx, len_val, 0);
   JS_FreeValue(ctx, len_val);
   for (int i = 0; i < len; i++) {
      JSValue item = JS_GetPropertyUint32(ctx, argv[0], (uint32_t)i);
      const char *s = JS_ToCString(ctx, item);
      if (s) {
         draw_text_pixels(s, x, y + i * lineH, color);
         JS_FreeCString(ctx, s);
      }
      JS_FreeValue(ctx, item);
   }
   return JS_UNDEFINED;
}

/* ── Pattern fills ───────────────────────────────────────────────────── */
static JSValue js_fill_checkerboard(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int x1v = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int y1v = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int x2v = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int y2v = int_from_js(ctx, argv[3], 0) - cam2d_y;
   uint32_t c1 = color_from_js(ctx, argv[4], rgba8(255, 255, 255, 255));
   uint32_t c2 = color_from_js(ctx, argv[5], rgba8(0, 0, 0, 255));
   int sz = argc > 6 ? int_from_js(ctx, argv[6], 8) : 8;
   if (sz < 1) sz = 1;
   for (int y = y1v; y < y2v; y++) {
      for (int x = x1v; x < x2v; x++) {
         int bx = (x - x1v) / sz, by = (y - y1v) / sz;
         set_pixel(x, y, (bx + by) % 2 == 0 ? c1 : c2);
      }
   }
   return JS_UNDEFINED;
}
static JSValue js_fill_stripes(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   int x1v = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int y1v = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int x2v = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int y2v = int_from_js(ctx, argv[3], 0) - cam2d_y;
   uint32_t c1 = color_from_js(ctx, argv[4], rgba8(255, 255, 255, 255));
   uint32_t c2 = color_from_js(ctx, argv[5], rgba8(0, 0, 0, 255));
   int sz = argc > 6 ? int_from_js(ctx, argv[6], 8) : 8;
   int vert = argc > 7 ? int_from_js(ctx, argv[7], 0) : 0;
   if (sz < 1) sz = 1;
   for (int y = y1v; y < y2v; y++) {
      for (int x = x1v; x < x2v; x++) {
         int band = vert ? (x - x1v) / sz : (y - y1v) / sz;
         set_pixel(x, y, band % 2 == 0 ? c1 : c2);
      }
   }
   return JS_UNDEFINED;
}

/* ── fillCircleGradient ──────────────────────────────────────────────── */
static JSValue js_fill_circle_gradient(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   float cx2 = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   float cy2 = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   float r   = (float)double_from_js(ctx, argv[2], 0.0);
   uint32_t cc = color_from_js(ctx, argv[3], rgba8(255, 255, 255, 255));
   uint32_t ce = color_from_js(ctx, argv[4], rgba8(0, 0, 0, 255));
   if (r <= 0.0f) return JS_UNDEFINED;
   int ir = (int)ceilf(r);
   for (int dy2 = -ir; dy2 <= ir; dy2++) {
      for (int dx2 = -ir; dx2 <= ir; dx2++) {
         float d = sqrtf((float)(dx2 * dx2 + dy2 * dy2));
         if (d > r) continue;
         float t = d / r;
         set_pixel((int)cx2 + dx2, (int)cy2 + dy2, lerp_color(cc, ce, t));
      }
   }
   return JS_UNDEFINED;
}

/* ── Standalone easing ───────────────────────────────────────────────── */
static JSValue js_ease_in(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   double n = argc > 1 ? clamp_double(double_from_js(ctx, argv[1], 2.0), 1.0, 10.0) : 2.0;
   return JS_NewFloat64(ctx, pow(t, n));
}
static JSValue js_ease_out(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   double n = argc > 1 ? clamp_double(double_from_js(ctx, argv[1], 2.0), 1.0, 10.0) : 2.0;
   return JS_NewFloat64(ctx, 1.0 - pow(1.0 - t, n));
}
static JSValue js_ease_in_out(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   if (t < 0.5) return JS_NewFloat64(ctx, 2.0 * t * t);
   return JS_NewFloat64(ctx, -1.0 + (4.0 - 2.0 * t) * t);
}
static JSValue js_ease_bounce(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   /* bounce-out formula */
   if (t < 1.0 / 2.75)       return JS_NewFloat64(ctx, 7.5625 * t * t);
   if (t < 2.0 / 2.75)       { t -= 1.5 / 2.75;   return JS_NewFloat64(ctx, 7.5625 * t * t + 0.75); }
   if (t < 2.5 / 2.75)       { t -= 2.25 / 2.75;  return JS_NewFloat64(ctx, 7.5625 * t * t + 0.9375); }
   t -= 2.625 / 2.75;        return JS_NewFloat64(ctx, 7.5625 * t * t + 0.984375);
}
static JSValue js_ease_elastic(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double t = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   if (t == 0.0 || t == 1.0) return JS_NewFloat64(ctx, t);
   return JS_NewFloat64(ctx, pow(2.0, -10.0 * t) * sin((t - 0.075) * 2.0 * 3.14159265358979 / 0.3) + 1.0);
}

/* ── Color hex I/O ───────────────────────────────────────────────────── */
static JSValue js_color_to_hex(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   char buf[8];
   snprintf(buf, sizeof(buf), "#%02x%02x%02x",
            (unsigned)((c >> 24) & 0xff),
            (unsigned)((c >> 16) & 0xff),
            (unsigned)((c >>  8) & 0xff));
   return JS_NewString(ctx, buf);
}
static JSValue js_hex_to_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, (int32_t)rgba8(0, 0, 0, 255));
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s) return JS_NewInt32(ctx, (int32_t)rgba8(0, 0, 0, 255));
   const char *p = s;
   if (*p == '#') p++;
   unsigned rv = 0, gv = 0, bv = 0;
   if (strlen(p) >= 6) {
      char rb[3] = { p[0], p[1], 0 };
      char gb[3] = { p[2], p[3], 0 };
      char bb[3] = { p[4], p[5], 0 };
      rv = (unsigned)strtol(rb, NULL, 16);
      gv = (unsigned)strtol(gb, NULL, 16);
      bv = (unsigned)strtol(bb, NULL, 16);
   }
   JS_FreeCString(ctx, s);
   return JS_NewInt32(ctx, (int32_t)rgba8((uint8_t)rv, (uint8_t)gv, (uint8_t)bv, 255));
}

/* ── screenBorder ────────────────────────────────────────────────────── */
static JSValue js_screen_border(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int sz = argc > 0 ? int_from_js(ctx, argv[0], 4) : 4;
   uint32_t color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   if (sz <= 0 || !framebuffer) return JS_UNDEFINED;
   /* top */
   for (int y = 0; y < sz && y < NOVA64_HEIGHT; y++)
      for (int x = 0; x < NOVA64_WIDTH; x++) set_pixel(x, y, color);
   /* bottom */
   for (int y = NOVA64_HEIGHT - sz; y < NOVA64_HEIGHT; y++)
      for (int x = 0; x < NOVA64_WIDTH; x++) if (y >= 0) set_pixel(x, y, color);
   /* left */
   for (int y = sz; y < NOVA64_HEIGHT - sz; y++)
      for (int x = 0; x < sz && x < NOVA64_WIDTH; x++) set_pixel(x, y, color);
   /* right */
   for (int y = sz; y < NOVA64_HEIGHT - sz; y++)
      for (int x = NOVA64_WIDTH - sz; x < NOVA64_WIDTH; x++) if (x >= 0) set_pixel(x, y, color);
   return JS_UNDEFINED;
}

/* ── sprScale ────────────────────────────────────────────────────────── */
/* sprScale(path, dx, dy, scale [, imgw, imgh [, sx, sy, sw, sh]]) */
static JSValue js_spr_scale(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_NewBool(ctx, false);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4) return JS_NewBool(ctx, false);
   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;
   float scale = (float)clamp_double(double_from_js(ctx, argv[3], 1.0), 0.1, 16.0);
   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int img_w = argc > 4 ? int_from_js(ctx, argv[4], 0) : 0;
   int img_h = argc > 5 ? int_from_js(ctx, argv[5], 0) : 0;
   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_NewBool(ctx, false);
      pixels = png_pixels;
      if (img_w <= 0) img_w = pw;
      if (img_h <= 0) img_h = ph;
   }
   if (img_w <= 0 || img_h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      img_w = side > 0 ? side : 1;
      img_h = (int)((asset->size / 4) / (size_t)img_w);
      if (img_h <= 0) img_h = img_w;
   }
   int src_x = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   int src_y = argc > 7 ? int_from_js(ctx, argv[7], 0) : 0;
   int bw    = argc > 8 ? int_from_js(ctx, argv[8], 0) : (img_w - src_x);
   int bh    = argc > 9 ? int_from_js(ctx, argv[9], 0) : (img_h - src_y);
   if (bw <= 0 || bh <= 0) { free(png_pixels); return JS_NewBool(ctx, false); }
   int dw = (int)((float)bw * scale);
   int dh = (int)((float)bh * scale);
   for (int row = 0; row < dh; row++) {
      int sy2 = src_y + (int)((float)row / scale);
      if (sy2 < 0 || sy2 >= img_h) continue;
      for (int col = 0; col < dw; col++) {
         int sx2 = src_x + (int)((float)col / scale);
         if (sx2 < 0 || sx2 >= img_w) continue;
         size_t si = ((size_t)sy2 * (size_t)img_w + (size_t)sx2) * 4;
         uint8_t r2 = pixels[si], g2 = pixels[si+1], b2 = pixels[si+2], a2 = pixels[si+3];
         if (a2 == 0) continue;
         set_pixel(dx + col, dy + row, rgba8(r2, g2, b2, 255));
      }
   }
   free(png_pixels);
   return JS_NewBool(ctx, true);
}

/* ── formatTime ──────────────────────────────────────────────────────── */
static JSValue js_format_time(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "00:00");
   double secs = double_from_js(ctx, argv[0], 0.0);
   if (secs < 0.0) secs = 0.0;
   int total = (int)secs;
   int h = total / 3600, m = (total % 3600) / 60, s = total % 60;
   char buf[16];
   if (h > 0) snprintf(buf, sizeof(buf), "%d:%02d:%02d", h, m, s);
   else        snprintf(buf, sizeof(buf), "%02d:%02d", m, s);
   return JS_NewString(ctx, buf);
}
static JSValue js_format_time_ms(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "00:00.000");
   double ms = double_from_js(ctx, argv[0], 0.0);
   if (ms < 0.0) ms = 0.0;
   int total_ms = (int)ms;
   int m = (total_ms / 60000), sv = (total_ms % 60000) / 1000, frac = total_ms % 1000;
   char buf[16];
   snprintf(buf, sizeof(buf), "%02d:%02d.%03d", m, sv, frac);
   return JS_NewString(ctx, buf);
}

/* ── drawArrow ───────────────────────────────────────────────────────── */
static JSValue js_draw_arrow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int x0 = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int y0 = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int x1 = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int y1 = int_from_js(ctx, argv[3], 0) - cam2d_y;
   uint32_t color = color_from_js(ctx, argv[4], rgba8(255, 255, 255, 255));
   int hs = argc > 5 ? int_from_js(ctx, argv[5], 6) : 6;
   /* Draw the shaft */
   path_draw_line_segment(x0, y0, x1, y1, color);
   /* Compute arrowhead: two lines back at ±30° from (x1,y1) */
   float ang = atan2f((float)(y1 - y0), (float)(x1 - x0));
   float a1 = ang + (float)(3.14159265358979323846 * 5.0 / 6.0);
   float a2 = ang - (float)(3.14159265358979323846 * 5.0 / 6.0);
   path_draw_line_segment(x1, y1, x1 + (int)(cosf(a1) * hs), y1 + (int)(sinf(a1) * hs), color);
   path_draw_line_segment(x1, y1, x1 + (int)(cosf(a2) * hs), y1 + (int)(sinf(a2) * hs), color);
   return JS_UNDEFINED;
}

/* ── colorPulse ──────────────────────────────────────────────────────── */
static JSValue js_color_pulse(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   double speed = argc > 1 ? double_from_js(ctx, argv[1], 1.0) : 1.0;
   double minB  = argc > 2 ? clamp_double(double_from_js(ctx, argv[2], 0.2), 0.0, 1.0) : 0.2;
   double t = (sin(2.0 * 3.14159265358979 * speed * (double)frame_count / NOVA64_FPS) + 1.0) * 0.5;
   float factor = (float)(minB + (1.0 - minB) * t);
   uint8_t r2 = (uint8_t)((float)((c >> 24) & 0xff) * factor);
   uint8_t g2 = (uint8_t)((float)((c >> 16) & 0xff) * factor);
   uint8_t b2 = (uint8_t)((float)((c >>  8) & 0xff) * factor);
   return JS_NewInt32(ctx, (int32_t)rgba8(r2, g2, b2, 255));
}

/* ── Tilemap getters ─────────────────────────────────────────────────── */
static JSValue js_get_tile(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewInt32(ctx, -1);
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active || !tilemaps[idx].cells)
      return JS_NewInt32(ctx, -1);
   int col = int_from_js(ctx, argv[1], 0);
   int row = int_from_js(ctx, argv[2], 0);
   if (col < 0 || col >= tilemaps[idx].cols || row < 0 || row >= tilemaps[idx].rows)
      return JS_NewInt32(ctx, -1);
   return JS_NewInt32(ctx, tilemaps[idx].cells[row * tilemaps[idx].cols + col]);
}
static JSValue js_tilemap_cols(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, tilemaps[idx].cols);
}
static JSValue js_tilemap_rows(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, tilemaps[idx].rows);
}
static JSValue js_tilemap_tile_w(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, tilemaps[idx].tile_w);
}
static JSValue js_tilemap_tile_h(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TILEMAPS || !tilemaps[idx].active) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, tilemaps[idx].tile_h);
}

/* ── btnRepeat ───────────────────────────────────────────────────────── */
/* btnRepeat(b, delay, rate) — true on first press, then every rate frames after delay */
static JSValue js_btn_repeat(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int index = argc > 0 ? button_index_from_js(ctx, argv[0]) : -1;
   if (index < 0 || index >= NOVA64_BUTTON_COUNT) return JS_NewBool(ctx, false);
   int delay = argc > 1 ? int_from_js(ctx, argv[1], 15) : 15;
   int rate  = argc > 2 ? int_from_js(ctx, argv[2], 4)  : 4;
   if (delay < 1) delay = 1;
   if (rate < 1)  rate  = 1;
   int cnt = g_btn_repeat[index].count;
   if (cnt <= 0) return JS_NewBool(ctx, false);
   if (cnt == 1) return JS_NewBool(ctx, true);
   int extra = cnt - delay;
   if (extra < 0) return JS_NewBool(ctx, false);
   return JS_NewBool(ctx, extra % rate == 0);
}

/* ── String utilities ────────────────────────────────────────────────── */
static JSValue js_str_split(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   JSValue arr = JS_NewArray(ctx);
   if (argc < 1) return arr;
   const char *str = JS_ToCString(ctx, argv[0]);
   if (!str) return arr;
   const char *sep = argc > 1 ? JS_ToCString(ctx, argv[1]) : NULL;
   uint32_t idx = 0;
   if (!sep || sep[0] == '\0') {
      for (size_t i = 0; str[i]; i++) {
         char buf[2] = { str[i], 0 };
         JS_SetPropertyUint32(ctx, arr, idx++, JS_NewString(ctx, buf));
      }
   } else {
      const char *p = str;
      size_t sep_len = strlen(sep);
      while (1) {
         const char *found = strstr(p, sep);
         if (!found) {
            JS_SetPropertyUint32(ctx, arr, idx++, JS_NewString(ctx, p));
            break;
         }
         size_t slen = (size_t)(found - p);
         char *seg = (char *)malloc(slen + 1);
         memcpy(seg, p, slen);
         seg[slen] = '\0';
         JS_SetPropertyUint32(ctx, arr, idx++, JS_NewString(ctx, seg));
         free(seg);
         p = found + sep_len;
      }
   }
   JS_FreeCString(ctx, str);
   if (sep) JS_FreeCString(ctx, sep);
   return arr;
}
static JSValue js_str_trim(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "");
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s) return JS_NewString(ctx, "");
   const char *start = s;
   while (*start == ' ' || *start == '\t' || *start == '\n' || *start == '\r') start++;
   const char *end = s + strlen(s);
   while (end > start && (*(end-1) == ' ' || *(end-1) == '\t' || *(end-1) == '\n' || *(end-1) == '\r')) end--;
   size_t len = (size_t)(end - start);
   char *buf = (char *)malloc(len + 1);
   memcpy(buf, start, len); buf[len] = '\0';
   JSValue ret = JS_NewString(ctx, buf);
   free(buf); JS_FreeCString(ctx, s);
   return ret;
}
static JSValue js_str_pad_start(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewString(ctx, "");
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s) return JS_NewString(ctx, "");
   int target = int_from_js(ctx, argv[1], 0);
   const char *pad_str = argc > 2 ? JS_ToCString(ctx, argv[2]) : NULL;
   char pad_ch = (pad_str && pad_str[0]) ? pad_str[0] : ' ';
   int slen = (int)strlen(s);
   int needed = target - slen;
   if (needed <= 0) {
      JSValue r = JS_NewString(ctx, s);
      JS_FreeCString(ctx, s); if (pad_str) JS_FreeCString(ctx, pad_str);
      return r;
   }
   if (target > 256) target = 256;
   char *buf = (char *)malloc((size_t)target + 1);
   for (int i = 0; i < needed; i++) buf[i] = pad_ch;
   memcpy(buf + needed, s, (size_t)slen); buf[target] = '\0';
   JSValue ret = JS_NewString(ctx, buf);
   free(buf); JS_FreeCString(ctx, s); if (pad_str) JS_FreeCString(ctx, pad_str);
   return ret;
}
static JSValue js_str_pad_end(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewString(ctx, "");
   const char *s = JS_ToCString(ctx, argv[0]);
   if (!s) return JS_NewString(ctx, "");
   int target = int_from_js(ctx, argv[1], 0);
   const char *pad_str = argc > 2 ? JS_ToCString(ctx, argv[2]) : NULL;
   char pad_ch = (pad_str && pad_str[0]) ? pad_str[0] : ' ';
   int slen = (int)strlen(s);
   int needed = target - slen;
   if (needed <= 0) {
      JSValue r = JS_NewString(ctx, s);
      JS_FreeCString(ctx, s); if (pad_str) JS_FreeCString(ctx, pad_str);
      return r;
   }
   if (target > 256) target = 256;
   char *buf = (char *)malloc((size_t)target + 1);
   memcpy(buf, s, (size_t)slen);
   for (int i = slen; i < target; i++) buf[i] = pad_ch;
   buf[target] = '\0';
   JSValue ret = JS_NewString(ctx, buf);
   free(buf); JS_FreeCString(ctx, s); if (pad_str) JS_FreeCString(ctx, pad_str);
   return ret;
}
static JSValue js_str_starts_with(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewBool(ctx, false);
   const char *s   = JS_ToCString(ctx, argv[0]);
   const char *pfx = JS_ToCString(ctx, argv[1]);
   if (!s || !pfx) { JS_FreeCString(ctx, s); JS_FreeCString(ctx, pfx); return JS_NewBool(ctx, false); }
   bool result = strncmp(s, pfx, strlen(pfx)) == 0;
   JS_FreeCString(ctx, s); JS_FreeCString(ctx, pfx);
   return JS_NewBool(ctx, result);
}
static JSValue js_str_ends_with(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewBool(ctx, false);
   const char *s   = JS_ToCString(ctx, argv[0]);
   const char *sfx = JS_ToCString(ctx, argv[1]);
   if (!s || !sfx) { JS_FreeCString(ctx, s); JS_FreeCString(ctx, sfx); return JS_NewBool(ctx, false); }
   size_t slen = strlen(s), sfxlen = strlen(sfx);
   bool result = (slen >= sfxlen) && strcmp(s + slen - sfxlen, sfx) == 0;
   JS_FreeCString(ctx, s); JS_FreeCString(ctx, sfx);
   return JS_NewBool(ctx, result);
}
static JSValue js_str_repeat(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewString(ctx, "");
   const char *s = JS_ToCString(ctx, argv[0]);
   int n = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   if (!s || n <= 0) { JS_FreeCString(ctx, s); return JS_NewString(ctx, ""); }
   size_t slen = strlen(s);
   size_t total = slen * (size_t)n;
   if (total > 65535) total = 65535;
   char *buf = (char *)malloc(total + 1);
   for (size_t i = 0; i < (size_t)n && i * slen < total; i++)
      memcpy(buf + i * slen, s, slen);
   buf[total] = '\0';
   JSValue ret = JS_NewString(ctx, buf);
   free(buf); JS_FreeCString(ctx, s);
   return ret;
}

/* ── AABB hotspots ───────────────────────────────────────────────────── */
static JSValue js_create_hotspot(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int x = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int y = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int w = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int h = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   for (int i = 0; i < NOVA64_MAX_HOTSPOTS; i++) {
      if (!g_hotspots[i].used) {
         g_hotspots[i].used = 1; g_hotspots[i].x = x; g_hotspots[i].y = y;
         g_hotspots[i].w = w; g_hotspots[i].h = h;
         return JS_NewInt32(ctx, i + 1);
      }
   }
   return JS_NewInt32(ctx, 0);
}
static JSValue js_set_hotspot(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_HOTSPOTS || !g_hotspots[idx].used) return JS_UNDEFINED;
   g_hotspots[idx].x = int_from_js(ctx, argv[1], 0);
   g_hotspots[idx].y = int_from_js(ctx, argv[2], 0);
   g_hotspots[idx].w = int_from_js(ctx, argv[3], 0);
   g_hotspots[idx].h = int_from_js(ctx, argv[4], 0);
   return JS_UNDEFINED;
}
static JSValue js_hotspot_contains(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewBool(ctx, false);
   int idx = int_from_js(ctx, argv[0], 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_HOTSPOTS || !g_hotspots[idx].used) return JS_NewBool(ctx, false);
   int px = int_from_js(ctx, argv[1], 0);
   int py = int_from_js(ctx, argv[2], 0);
   struct nova64_hotspot *hs = &g_hotspots[idx];
   return JS_NewBool(ctx, px >= hs->x && px < hs->x + hs->w && py >= hs->y && py < hs->y + hs->h);
}
static JSValue js_hotspot_overlap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewBool(ctx, false);
   int ai = int_from_js(ctx, argv[0], 0) - 1;
   int bi = int_from_js(ctx, argv[1], 0) - 1;
   if (ai < 0 || ai >= NOVA64_MAX_HOTSPOTS || !g_hotspots[ai].used) return JS_NewBool(ctx, false);
   if (bi < 0 || bi >= NOVA64_MAX_HOTSPOTS || !g_hotspots[bi].used) return JS_NewBool(ctx, false);
   struct nova64_hotspot *ha = &g_hotspots[ai];
   struct nova64_hotspot *hb = &g_hotspots[bi];
   bool ov = !(ha->x + ha->w <= hb->x || hb->x + hb->w <= ha->x ||
               ha->y + ha->h <= hb->y || hb->y + hb->h <= ha->y);
   return JS_NewBool(ctx, ov);
}
static JSValue js_destroy_hotspot(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_HOTSPOTS) memset(&g_hotspots[idx], 0, sizeof(g_hotspots[idx]));
   return JS_UNDEFINED;
}
static JSValue js_hotspot_x(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_HOTSPOTS || !g_hotspots[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_hotspots[idx].x);
}
static JSValue js_hotspot_y(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_HOTSPOTS || !g_hotspots[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_hotspots[idx].y);
}
static JSValue js_hotspot_w(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_HOTSPOTS || !g_hotspots[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_hotspots[idx].w);
}
static JSValue js_hotspot_h(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_HOTSPOTS || !g_hotspots[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_hotspots[idx].h);
}

/* ── screenChromaticAberration ───────────────────────────────────────── */
static JSValue js_screen_chromatic_aberration(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int offset = argc > 0 ? int_from_js(ctx, argv[0], 2) : 2;
   if (offset < 1) offset = 1;
   if (offset > 16) offset = 16;
   if (!framebuffer) return JS_UNDEFINED;
   uint32_t *tmp = (uint32_t *)malloc((size_t)NOVA64_WIDTH * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   for (int y = 0; y < NOVA64_HEIGHT; y++) {
      uint32_t *row = &framebuffer[(size_t)y * NOVA64_WIDTH];
      memcpy(tmp, row, (size_t)NOVA64_WIDTH * sizeof(uint32_t));
      for (int x = 0; x < NOVA64_WIDTH; x++) {
         int rx2 = x + offset;
         uint8_t cr = (rx2 < NOVA64_WIDTH) ? (uint8_t)((tmp[rx2] >> 24) & 0xff) : 0;
         uint8_t cg = (uint8_t)((tmp[x] >> 16) & 0xff);
         int bx2 = x - offset;
         uint8_t cb = (bx2 >= 0) ? (uint8_t)((tmp[bx2] >> 8) & 0xff) : 0;
         row[x] = rgba8(cr, cg, cb, 255);
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* ── drawDashedLine / drawDashedRect ─────────────────────────────────── */
static JSValue js_draw_dashed_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int x0 = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int y0 = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int x1 = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int y1 = int_from_js(ctx, argv[3], 0) - cam2d_y;
   int dash = int_from_js(ctx, argv[4], 4);
   int gap  = int_from_js(ctx, argv[5], 4);
   uint32_t color = color_from_js(ctx, argv[6], rgba8(255, 255, 255, 255));
   if (dash < 1) dash = 1;
   if (gap  < 1) gap  = 1;
   int dx = abs(x1 - x0), dy = abs(y1 - y0);
   int steps = dx > dy ? dx : dy;
   if (steps == 0) { set_pixel(x0, y0, color); return JS_UNDEFINED; }
   float fx = (float)x0, fy = (float)y0;
   float sx = (float)(x1 - x0) / (float)steps;
   float sy = (float)(y1 - y0) / (float)steps;
   int pat = dash + gap;
   for (int i = 0; i <= steps; i++, fx += sx, fy += sy)
      if (i % pat < dash) set_pixel((int)(fx + 0.5f), (int)(fy + 0.5f), color);
   return JS_UNDEFINED;
}
static JSValue js_draw_dashed_rect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 7) return JS_UNDEFINED;
   int x1v = int_from_js(ctx, argv[0], 0) - cam2d_x;
   int y1v = int_from_js(ctx, argv[1], 0) - cam2d_y;
   int x2v = int_from_js(ctx, argv[2], 0) - cam2d_x;
   int y2v = int_from_js(ctx, argv[3], 0) - cam2d_y;
   int dash = int_from_js(ctx, argv[4], 4);
   int gap  = int_from_js(ctx, argv[5], 4);
   uint32_t color = color_from_js(ctx, argv[6], rgba8(255, 255, 255, 255));
   if (dash < 1) dash = 1;
   if (gap  < 1) gap  = 1;
   int pat = dash + gap;
   /* top */
   for (int x = x1v, i = 0; x <= x2v; x++, i++) if (i % pat < dash) set_pixel(x, y1v, color);
   /* bottom */
   for (int x = x1v, i = 0; x <= x2v; x++, i++) if (i % pat < dash) set_pixel(x, y2v, color);
   /* left */
   for (int y = y1v, i = 0; y <= y2v; y++, i++) if (i % pat < dash) set_pixel(x1v, y, color);
   /* right */
   for (int y = y1v, i = 0; y <= y2v; y++, i++) if (i % pat < dash) set_pixel(x2v, y, color);
   return JS_UNDEFINED;
}

/* ── screenWave ──────────────────────────────────────────────────────── */
static JSValue js_screen_wave(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float amp   = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 3.0);
   float freq  = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.05);
   float phase = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   if (!framebuffer) return JS_UNDEFINED;
   uint32_t *tmp = (uint32_t *)malloc((size_t)NOVA64_WIDTH * (size_t)NOVA64_HEIGHT * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   memcpy(tmp, framebuffer, (size_t)NOVA64_WIDTH * (size_t)NOVA64_HEIGHT * sizeof(uint32_t));
   for (int y = 0; y < NOVA64_HEIGHT; y++) {
      int shift = (int)(amp * sinf((float)y * freq + phase));
      for (int x = 0; x < NOVA64_WIDTH; x++) {
         int sx2 = x - shift;
         uint32_t src = (sx2 >= 0 && sx2 < NOVA64_WIDTH)
            ? tmp[(size_t)y * NOVA64_WIDTH + (size_t)sx2]
            : rgba8(0, 0, 0, 255);
         framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = src;
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* ── Frame utilities ─────────────────────────────────────────────────── */
static JSValue js_every(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int n = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1);
   if (n <= 1) return JS_NewBool(ctx, true);
   return JS_NewBool(ctx, (frame_count % (uint64_t)n) == 0);
}
static JSValue js_frame_count_fn(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt64(ctx, (int64_t)frame_count);
}
static JSValue js_sin_osc(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double hz = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0);
   return JS_NewFloat64(ctx, sin(2.0 * 3.14159265358979323846 * hz * (double)frame_count / NOVA64_FPS));
}
static JSValue js_cos_osc(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double hz = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0);
   return JS_NewFloat64(ctx, cos(2.0 * 3.14159265358979323846 * hz * (double)frame_count / NOVA64_FPS));
}

/* ── Color utilities ─────────────────────────────────────────────────── */
static JSValue js_color_brighter(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(128, 128, 128, 255));
   int amt = argc > 1 ? int_from_js(ctx, argv[1], 40) : 40;
   uint8_t r = (uint8_t)((c >> 24) & 0xff);
   uint8_t g = (uint8_t)((c >> 16) & 0xff);
   uint8_t b = (uint8_t)((c >>  8) & 0xff);
   r = (uint8_t)((int)r + amt > 255 ? 255 : (int)r + amt < 0 ? 0 : (int)r + amt);
   g = (uint8_t)((int)g + amt > 255 ? 255 : (int)g + amt < 0 ? 0 : (int)g + amt);
   b = (uint8_t)((int)b + amt > 255 ? 255 : (int)b + amt < 0 ? 0 : (int)b + amt);
   return JS_NewInt32(ctx, (int32_t)rgba8(r, g, b, 255));
}
static JSValue js_color_darker(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t c = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(128, 128, 128, 255));
   int amt = argc > 1 ? int_from_js(ctx, argv[1], 40) : 40;
   uint8_t r = (uint8_t)((c >> 24) & 0xff);
   uint8_t g = (uint8_t)((c >> 16) & 0xff);
   uint8_t b = (uint8_t)((c >>  8) & 0xff);
   r = (uint8_t)((int)r - amt < 0 ? 0 : (int)r - amt > 255 ? 255 : (int)r - amt);
   g = (uint8_t)((int)g - amt < 0 ? 0 : (int)g - amt > 255 ? 255 : (int)g - amt);
   b = (uint8_t)((int)b - amt < 0 ? 0 : (int)b - amt > 255 ? 255 : (int)b - amt);
   return JS_NewInt32(ctx, (int32_t)rgba8(r, g, b, 255));
}
static JSValue js_color_mix(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   uint32_t a = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   uint32_t b = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   float t = (float)clamp_double(double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.5), 0.0, 1.0);
   return JS_NewInt32(ctx, (int32_t)lerp_color(a, b, t));
}

/* ── screenDissolve ──────────────────────────────────────────────────── */
static JSValue js_screen_dissolve(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float t = (float)clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0), 0.0, 1.0);
   if (!framebuffer) return JS_UNDEFINED;
   static const uint8_t bayer[4][4] = {
      {  0,  8,  2, 10 },
      { 12,  4, 14,  6 },
      {  3, 11,  1,  9 },
      { 15,  7, 13,  5 }
   };
   int threshold = (int)(t * 16.0f);
   if (threshold >= 16) return JS_UNDEFINED;
   for (int y = 0; y < NOVA64_HEIGHT; y++) {
      for (int x = 0; x < NOVA64_WIDTH; x++) {
         if (bayer[y & 3][x & 3] >= threshold)
            framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = rgba8(0, 0, 0, 255);
      }
   }
   return JS_UNDEFINED;
}

/* ── Number formatting ───────────────────────────────────────────────── */
static JSValue js_zero_pad(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_NewString(ctx, "0");
   int n = int_from_js(ctx, argv[0], 0);
   int w = int_from_js(ctx, argv[1], 1);
   if (w < 1) w = 1; if (w > 20) w = 20;
   char buf[32];
   snprintf(buf, sizeof(buf), "%0*d", w, n);
   return JS_NewString(ctx, buf);
}
static JSValue js_format_number(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "0");
   double n = double_from_js(ctx, argv[0], 0.0);
   int decimals = argc > 1 ? int_from_js(ctx, argv[1], 2) : 2;
   if (decimals < 0) decimals = 0; if (decimals > 10) decimals = 10;
   char buf[64];
   snprintf(buf, sizeof(buf), "%.*f", decimals, n);
   return JS_NewString(ctx, buf);
}
static JSValue js_comma_number(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewString(ctx, "0");
   long long n = (long long)double_from_js(ctx, argv[0], 0.0);
   bool neg = n < 0; if (neg) n = -n;
   char raw[32]; snprintf(raw, sizeof(raw), "%lld", n);
   int rlen = (int)strlen(raw);
   char out[48]; int oi = 0;
   if (neg) out[oi++] = '-';
   for (int i = 0; i < rlen; i++) {
      if (i > 0 && (rlen - i) % 3 == 0) out[oi++] = ',';
      out[oi++] = raw[i];
   }
   out[oi] = '\0';
   return JS_NewString(ctx, out);
}

/* ── sprFlipX / sprFlipY ─────────────────────────────────────────────── */
/* sprFlipX(path, dx, dy [, imgw, imgh [, sx, sy, bw, bh]]) */
static JSValue js_spr_flip_x(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewBool(ctx, false);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4) return JS_NewBool(ctx, false);
   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;
   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int img_w = argc > 3 ? int_from_js(ctx, argv[3], 0) : 0;
   int img_h = argc > 4 ? int_from_js(ctx, argv[4], 0) : 0;
   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_NewBool(ctx, false);
      pixels = png_pixels;
      if (img_w <= 0) img_w = pw;
      if (img_h <= 0) img_h = ph;
   }
   if (img_w <= 0 || img_h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      img_w = side > 0 ? side : 1;
      img_h = (int)((asset->size / 4) / (size_t)img_w);
      if (img_h <= 0) img_h = img_w;
   }
   int src_x = argc > 5 ? int_from_js(ctx, argv[5], 0) : 0;
   int src_y = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   int bw    = argc > 7 ? int_from_js(ctx, argv[7], 0) : (img_w - src_x);
   int bh    = argc > 8 ? int_from_js(ctx, argv[8], 0) : (img_h - src_y);
   if (bw <= 0 || bh <= 0) { free(png_pixels); return JS_NewBool(ctx, false); }
   for (int row = 0; row < bh; row++) {
      for (int col = 0; col < bw; col++) {
         int sx2 = src_x + (bw - 1 - col);
         int sy2 = src_y + row;
         if (sx2 < 0 || sx2 >= img_w || sy2 < 0 || sy2 >= img_h) continue;
         size_t si = ((size_t)sy2 * (size_t)img_w + (size_t)sx2) * 4;
         uint8_t r2 = pixels[si], g2 = pixels[si+1], b2 = pixels[si+2], a2 = pixels[si+3];
         if (a2 == 0) continue;
         set_pixel(dx + col, dy + row, rgba8(r2, g2, b2, 255));
      }
   }
   free(png_pixels);
   return JS_NewBool(ctx, true);
}
static JSValue js_spr_flip_y(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewBool(ctx, false);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4) return JS_NewBool(ctx, false);
   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;
   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int img_w = argc > 3 ? int_from_js(ctx, argv[3], 0) : 0;
   int img_h = argc > 4 ? int_from_js(ctx, argv[4], 0) : 0;
   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_NewBool(ctx, false);
      pixels = png_pixels;
      if (img_w <= 0) img_w = pw;
      if (img_h <= 0) img_h = ph;
   }
   if (img_w <= 0 || img_h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      img_w = side > 0 ? side : 1;
      img_h = (int)((asset->size / 4) / (size_t)img_w);
      if (img_h <= 0) img_h = img_w;
   }
   int src_x = argc > 5 ? int_from_js(ctx, argv[5], 0) : 0;
   int src_y = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   int bw    = argc > 7 ? int_from_js(ctx, argv[7], 0) : (img_w - src_x);
   int bh    = argc > 8 ? int_from_js(ctx, argv[8], 0) : (img_h - src_y);
   if (bw <= 0 || bh <= 0) { free(png_pixels); return JS_NewBool(ctx, false); }
   for (int row = 0; row < bh; row++) {
      for (int col = 0; col < bw; col++) {
         int sx2 = src_x + col;
         int sy2 = src_y + (bh - 1 - row);
         if (sx2 < 0 || sx2 >= img_w || sy2 < 0 || sy2 >= img_h) continue;
         size_t si = ((size_t)sy2 * (size_t)img_w + (size_t)sx2) * 4;
         uint8_t r2 = pixels[si], g2 = pixels[si+1], b2 = pixels[si+2], a2 = pixels[si+3];
         if (a2 == 0) continue;
         set_pixel(dx + col, dy + row, rgba8(r2, g2, b2, 255));
      }
   }
   free(png_pixels);
   return JS_NewBool(ctx, true);
}

/* ── setPixels / getPixels / printRight ──────────────────────────────── */
static JSValue js_set_pixels(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5 || !JS_IsArray(argv[4])) return JS_UNDEFINED;
   int ox = int_from_js(ctx, argv[0], 0);
   int oy = int_from_js(ctx, argv[1], 0);
   int w  = int_from_js(ctx, argv[2], 0);
   int h  = int_from_js(ctx, argv[3], 0);
   if (w <= 0 || h <= 0) return JS_UNDEFINED;
   JSValue arr = argv[4];
   JSValue lv = JS_GetPropertyStr(ctx, arr, "length");
   int len = int_from_js(ctx, lv, 0);
   JS_FreeValue(ctx, lv);
   int n = w * h;
   if (n > len) n = len;
   for (int i = 0; i < n; i++) {
      JSValue cv = JS_GetPropertyUint32(ctx, arr, (unsigned)i);
      uint32_t c = color_from_js(ctx, cv, 0);
      JS_FreeValue(ctx, cv);
      int px = ox + (i % w);
      int py = oy + (i / w);
      set_pixel(px, py, c);
   }
   return JS_UNDEFINED;
}
static JSValue js_get_pixels(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 4) return JS_NewArray(ctx);
   int ox = int_from_js(ctx, argv[0], 0);
   int oy = int_from_js(ctx, argv[1], 0);
   int w  = int_from_js(ctx, argv[2], 0);
   int h  = int_from_js(ctx, argv[3], 0);
   if (w <= 0 || h <= 0) return JS_NewArray(ctx);
   JSValue arr = JS_NewArray(ctx);
   for (int r = 0; r < h; r++) {
      for (int c = 0; c < w; c++) {
         uint32_t pxv = get_pixel(ox + c, oy + r);
         JS_SetPropertyUint32(ctx, arr, (unsigned)(r * w + c), JS_NewUint32(ctx, pxv));
      }
   }
   return arr;
}
static JSValue js_print_right(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int y = int_from_js(ctx, argv[2], 0) - cam2d_y;
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   x -= text_pixel_width(text);
   draw_text_pixels(text, x, y, color);
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* ── screenBlur — separable box blur ─────────────────────────────────── */
static JSValue js_screen_blur(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (!framebuffer) return JS_UNDEFINED;
   int r = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1);
   if (r < 1) r = 1;
   if (r > 8) r = 8;
   int W = NOVA64_WIDTH, H = NOVA64_HEIGHT;
   uint32_t *tmp = (uint32_t *)malloc((size_t)W * (size_t)H * sizeof(uint32_t));
   if (!tmp) return JS_UNDEFINED;
   /* Horizontal pass */
   for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
         unsigned sr = 0, sg = 0, sb = 0, cnt = 0;
         for (int dx = -r; dx <= r; dx++) {
            int sx = x + dx;
            if (sx < 0) sx = 0;
            if (sx >= W) sx = W - 1;
            uint32_t c = framebuffer[(size_t)y * W + (size_t)sx];
            sr += (c >> 24) & 0xff; sg += (c >> 16) & 0xff; sb += (c >> 8) & 0xff;
            cnt++;
         }
         tmp[(size_t)y * W + (size_t)x] = rgba8(sr/cnt, sg/cnt, sb/cnt, 255);
      }
   }
   /* Vertical pass */
   for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
         unsigned sr = 0, sg = 0, sb = 0, cnt = 0;
         for (int dy = -r; dy <= r; dy++) {
            int sy = y + dy;
            if (sy < 0) sy = 0;
            if (sy >= H) sy = H - 1;
            uint32_t c = tmp[(size_t)sy * W + (size_t)x];
            sr += (c >> 24) & 0xff; sg += (c >> 16) & 0xff; sb += (c >> 8) & 0xff;
            cnt++;
         }
         framebuffer[(size_t)y * W + (size_t)x] = rgba8(sr/cnt, sg/cnt, sb/cnt, 255);
      }
   }
   free(tmp);
   return JS_UNDEFINED;
}

/* ── Off-screen canvas JS functions ──────────────────────────────────── */
static JSValue js_create_canvas(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int w = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 64);
   int h = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 64);
   if (w < 1 || h < 1 || w > 1280 || h > 720) return JS_NewInt32(ctx, 0);
   for (int i = 0; i < NOVA64_MAX_CANVASES; i++) {
      if (!g_canvases[i].used) {
         g_canvases[i].pixels = (uint32_t *)calloc((size_t)w * (size_t)h, sizeof(uint32_t));
         if (!g_canvases[i].pixels) return JS_NewInt32(ctx, 0);
         g_canvases[i].used = 1;
         g_canvases[i].w = w;
         g_canvases[i].h = h;
         return JS_NewInt32(ctx, i + 1);
      }
   }
   return JS_NewInt32(ctx, 0);
}
static JSValue js_canvas_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_CANVASES || !g_canvases[idx].used) return JS_UNDEFINED;
   uint32_t c = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   size_t n = (size_t)g_canvases[idx].w * (size_t)g_canvases[idx].h;
   for (size_t i = 0; i < n; i++) g_canvases[idx].pixels[i] = c;
   return JS_UNDEFINED;
}
static JSValue js_canvas_pset(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_CANVASES || !g_canvases[idx].used) return JS_UNDEFINED;
   int x = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int y = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   uint32_t c = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   if (x < 0 || x >= g_canvases[idx].w || y < 0 || y >= g_canvases[idx].h) return JS_UNDEFINED;
   g_canvases[idx].pixels[(size_t)y * g_canvases[idx].w + (size_t)x] = c;
   return JS_UNDEFINED;
}
static JSValue js_canvas_pget(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_CANVASES || !g_canvases[idx].used) return JS_NewUint32(ctx, 0);
   int x = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int y = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   if (x < 0 || x >= g_canvases[idx].w || y < 0 || y >= g_canvases[idx].h) return JS_NewUint32(ctx, 0);
   return JS_NewUint32(ctx, g_canvases[idx].pixels[(size_t)y * g_canvases[idx].w + (size_t)x]);
}
static JSValue js_canvas_blit(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_CANVASES || !g_canvases[idx].used) return JS_UNDEFINED;
   int dx = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0) - cam2d_x;
   int dy = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0) - cam2d_y;
   int sx = argc > 3 ? int_from_js(ctx, argv[3], 0) : 0;
   int sy = argc > 4 ? int_from_js(ctx, argv[4], 0) : 0;
   int sw = argc > 5 ? int_from_js(ctx, argv[5], g_canvases[idx].w) : g_canvases[idx].w;
   int sh = argc > 6 ? int_from_js(ctx, argv[6], g_canvases[idx].h) : g_canvases[idx].h;
   int cw = g_canvases[idx].w, ch = g_canvases[idx].h;
   for (int row = 0; row < sh; row++) {
      int sry = sy + row;
      if (sry < 0 || sry >= ch) continue;
      for (int col = 0; col < sw; col++) {
         int srx = sx + col;
         if (srx < 0 || srx >= cw) continue;
         uint32_t c = g_canvases[idx].pixels[(size_t)sry * cw + (size_t)srx];
         uint8_t a = c & 0xff;
         if (a == 0) continue;
         if (a == 255) {
            set_pixel(dx + col, dy + row, c);
         } else {
            uint32_t dst = get_pixel(dx + col, dy + row);
            uint8_t dr = (uint8_t)((dst >> 24) & 0xff);
            uint8_t dg = (uint8_t)((dst >> 16) & 0xff);
            uint8_t db = (uint8_t)((dst >>  8) & 0xff);
            float fa = (float)a / 255.0f;
            set_pixel(dx + col, dy + row, rgba8(
               (uint8_t)(((c >> 24) & 0xff) * fa + dr * (1.0f - fa)),
               (uint8_t)(((c >> 16) & 0xff) * fa + dg * (1.0f - fa)),
               (uint8_t)(((c >>  8) & 0xff) * fa + db * (1.0f - fa)), 255));
         }
      }
   }
   return JS_UNDEFINED;
}
static JSValue js_destroy_canvas(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_CANVASES) {
      free(g_canvases[idx].pixels);
      memset(&g_canvases[idx], 0, sizeof(g_canvases[idx]));
   }
   return JS_UNDEFINED;
}
static JSValue js_canvas_width(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_CANVASES || !g_canvases[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_canvases[idx].w);
}
static JSValue js_canvas_height(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_CANVASES || !g_canvases[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_canvases[idx].h);
}

/* ── drawNineSlice ────────────────────────────────────────────────────── */
/* drawNineSlice(path, dx, dy, dw, dh, border [, imgw, imgh]) */
static JSValue js_draw_nine_slice(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_UNDEFINED;
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4) return JS_UNDEFINED;

   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;
   int dw = int_from_js(ctx, argv[3], 0);
   int dh = int_from_js(ctx, argv[4], 0);
   int b  = int_from_js(ctx, argv[5], 0);
   if (dw <= 0 || dh <= 0 || b <= 0) return JS_UNDEFINED;

   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = (const uint8_t *)asset->data;
   int img_w = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   int img_h = argc > 7 ? int_from_js(ctx, argv[7], 0) : 0;
   if (is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_UNDEFINED;
      pixels = png_pixels;
      if (img_w <= 0) img_w = pw;
      if (img_h <= 0) img_h = ph;
   }
   if (img_w <= 0 || img_h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      img_w = side > 0 ? side : 1;
      img_h = (int)((asset->size / 4) / (size_t)img_w);
      if (img_h <= 0) img_h = img_w;
   }
   /* Clamp border */
   int sb = b;
   if (sb * 2 >= img_w) sb = (img_w - 1) / 2;
   if (sb * 2 >= img_h) sb = (img_h - 1) / 2;
   if (sb < 1) { free(png_pixels); return JS_UNDEFINED; }
   int db = b;
   if (db * 2 >= dw) db = (dw - 1) / 2;
   if (db * 2 >= dh) db = (dh - 1) / 2;
   if (db < 1) { free(png_pixels); return JS_UNDEFINED; }

   /* 9 regions: corners, edges, center */
   /* Source regions: top-left corner = (0,0,sb,sb), etc. */
   /* Dest regions: top-left = (dx,dy,db,db), etc. */
   struct { int sx, sy, sw, sh, ddx, ddy, ddw, ddh; } regions[9] = {
      /* TL */ { 0,       0,       sb,            sb,            dx,       dy,       db,    db    },
      /* TR */ { img_w-sb, 0,      sb,            sb,            dx+dw-db, dy,       db,    db    },
      /* BL */ { 0,       img_h-sb, sb,           sb,            dx,       dy+dh-db, db,    db    },
      /* BR */ { img_w-sb, img_h-sb, sb,          sb,            dx+dw-db, dy+dh-db, db,    db    },
      /* T  */ { sb,      0,       img_w-sb*2,    sb,            dx+db,    dy,       dw-db*2, db  },
      /* B  */ { sb,      img_h-sb, img_w-sb*2,  sb,            dx+db,    dy+dh-db, dw-db*2, db  },
      /* L  */ { 0,       sb,      sb,            img_h-sb*2,    dx,       dy+db,    db,    dh-db*2},
      /* R  */ { img_w-sb, sb,     sb,            img_h-sb*2,    dx+dw-db, dy+db,    db,    dh-db*2},
      /* C  */ { sb,      sb,      img_w-sb*2,    img_h-sb*2,    dx+db,    dy+db,    dw-db*2, dh-db*2},
   };
   for (int ri = 0; ri < 9; ri++) {
      int sw2 = regions[ri].sw, sh2 = regions[ri].sh;
      int ddw = regions[ri].ddw, ddh = regions[ri].ddh;
      if (sw2 <= 0 || sh2 <= 0 || ddw <= 0 || ddh <= 0) continue;
      /* Scale each region: sample source and write to dest */
      for (int row = 0; row < ddh; row++) {
         int sry = regions[ri].sy + (int)((float)row / (float)ddh * sh2);
         if (sry < 0 || sry >= img_h) continue;
         for (int col = 0; col < ddw; col++) {
            int srx = regions[ri].sx + (int)((float)col / (float)ddw * sw2);
            if (srx < 0 || srx >= img_w) continue;
            size_t si = ((size_t)sry * img_w + (size_t)srx) * 4;
            uint8_t r2 = pixels[si], g2 = pixels[si+1], b2 = pixels[si+2], a2 = pixels[si+3];
            if (a2 == 0) continue;
            set_pixel(regions[ri].ddx + col, regions[ri].ddy + row, rgba8(r2, g2, b2, 255));
         }
      }
   }
   free(png_pixels);
   return JS_UNDEFINED;
}

/* ── Timer JS functions ───────────────────────────────────────────────── */
static JSValue js_create_timer(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float dur = (float)clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0), 0.0001, 3600.0);
   for (int i = 0; i < NOVA64_MAX_TIMERS; i++) {
      if (!g_timers[i].used) {
         g_timers[i].used = 1;
         g_timers[i].duration = dur;
         g_timers[i].elapsed  = 0.0f;
         return JS_NewInt32(ctx, i + 1);
      }
   }
   return JS_NewInt32(ctx, 0);
}
static JSValue js_timer_done(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TIMERS || !g_timers[idx].used)
      return JS_NewBool(ctx, true);
   return JS_NewBool(ctx, g_timers[idx].elapsed >= g_timers[idx].duration);
}
static JSValue js_timer_elapsed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TIMERS || !g_timers[idx].used)
      return JS_NewFloat64(ctx, 0.0);
   return JS_NewFloat64(ctx, (double)g_timers[idx].elapsed);
}
static JSValue js_timer_progress(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_TIMERS || !g_timers[idx].used || g_timers[idx].duration <= 0.0f)
      return JS_NewFloat64(ctx, 0.0);
   double p = (double)(g_timers[idx].elapsed / g_timers[idx].duration);
   return JS_NewFloat64(ctx, p > 1.0 ? 1.0 : p);
}
static JSValue js_reset_timer(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_TIMERS && g_timers[idx].used)
      g_timers[idx].elapsed = 0.0f;
   return JS_UNDEFINED;
}
static JSValue js_destroy_timer(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_TIMERS)
      memset(&g_timers[idx], 0, sizeof(g_timers[idx]));
   return JS_UNDEFINED;
}

/* ── Logical grid JS functions ────────────────────────────────────────── */
static JSValue js_create_grid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int cols = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 8);
   int rows = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 8);
   int cw   = argc > 2 ? int_from_js(ctx, argv[2], 16) : 16;
   int ch   = argc > 3 ? int_from_js(ctx, argv[3], 16) : 16;
   if (cols < 1 || rows < 1 || cols * rows > NOVA64_MAX_GRID_CELLS) return JS_NewInt32(ctx, 0);
   for (int i = 0; i < NOVA64_MAX_GRIDS; i++) {
      if (!g_grids[i].used) {
         g_grids[i].used = 1;
         g_grids[i].cols = cols;
         g_grids[i].rows = rows;
         g_grids[i].cell_w = cw;
         g_grids[i].cell_h = ch;
         memset(g_grids[i].data, 0, sizeof(int) * (size_t)(cols * rows));
         return JS_NewInt32(ctx, i + 1);
      }
   }
   return JS_NewInt32(ctx, 0);
}
static JSValue js_set_cell(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_GRIDS || !g_grids[idx].used) return JS_UNDEFINED;
   int col = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int row = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int val = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   if (col < 0 || col >= g_grids[idx].cols || row < 0 || row >= g_grids[idx].rows) return JS_UNDEFINED;
   g_grids[idx].data[row * g_grids[idx].cols + col] = val;
   return JS_UNDEFINED;
}
static JSValue js_get_cell(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_GRIDS || !g_grids[idx].used) return JS_NewInt32(ctx, 0);
   int col = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int row = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   if (col < 0 || col >= g_grids[idx].cols || row < 0 || row >= g_grids[idx].rows) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_grids[idx].data[row * g_grids[idx].cols + col]);
}
static JSValue js_destroy_grid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx >= 0 && idx < NOVA64_MAX_GRIDS)
      memset(&g_grids[idx], 0, sizeof(g_grids[idx]));
   return JS_UNDEFINED;
}
static JSValue js_clear_grid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   int val = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   if (idx < 0 || idx >= NOVA64_MAX_GRIDS || !g_grids[idx].used) return JS_UNDEFINED;
   for (int i = 0; i < g_grids[idx].cols * g_grids[idx].rows; i++)
      g_grids[idx].data[i] = val;
   return JS_UNDEFINED;
}
static JSValue js_grid_cols(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_GRIDS || !g_grids[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_grids[idx].cols);
}
static JSValue js_grid_rows(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0) - 1;
   if (idx < 0 || idx >= NOVA64_MAX_GRIDS || !g_grids[idx].used) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_grids[idx].rows);
}

/* ── measureText / printCentered ─────────────────────────────────────── */
static JSValue js_measure_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "width",  JS_NewInt32(ctx, text_pixel_width(text)));
   JS_SetPropertyStr(ctx, obj, "height", JS_NewInt32(ctx, text_pixel_height(text)));
   JS_SetPropertyStr(ctx, obj, "lines",  JS_NewInt32(ctx, text_line_count(text)));
   JS_FreeCString(ctx, text);
   return obj;
}
static JSValue js_print_centered(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int x = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int y = int_from_js(ctx, argv[2], 0) - cam2d_y;
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   x -= text_pixel_width(text) / 2;
   draw_text_pixels(text, x, y, color);
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* forward declaration for parse_poly_pts (defined later) */
static int parse_poly_pts(JSContext *ctx, JSValue arr, float *pts, int max_pts);

/* ── drawArc ──────────────────────────────────────────────────────────── */
/* drawArc(cx, cy, radius, startDeg, endDeg, color [, segments]) */
static JSValue js_draw_arc(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   float cx2 = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   float cy2 = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   float r   = (float)double_from_js(ctx, argv[2], 0.0);
   float a0  = (float)double_from_js(ctx, argv[3], 0.0) * (float)(3.14159265358979323846 / 180.0);
   float a1  = (float)double_from_js(ctx, argv[4], 360.0) * (float)(3.14159265358979323846 / 180.0);
   uint32_t color = color_from_js(ctx, argv[5], rgba8(255, 255, 255, 255));
   int segs = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   if (segs <= 0) {
      int rr = (int)fabsf(r);
      segs = rr < 8 ? 16 : (rr < 32 ? 32 : 64);
   }
   if (segs < 3) segs = 3;
   if (segs > 256) segs = 256;
   float span = a1 - a0;
   for (int i = 0; i < segs; i++) {
      float ta = a0 + span * (float)i / (float)segs;
      float tb = a0 + span * (float)(i + 1) / (float)segs;
      int x0 = (int)roundf(cx2 + cosf(ta) * r);
      int y0 = (int)roundf(cy2 + sinf(ta) * r);
      int x1 = (int)roundf(cx2 + cosf(tb) * r);
      int y1 = (int)roundf(cy2 + sinf(tb) * r);
      path_draw_line_segment((float)x0, (float)y0, (float)x1, (float)y1, color);
   }
   return JS_UNDEFINED;
}

/* fillArc: filled sector (pie slice) */
static JSValue js_fill_arc(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_UNDEFINED;
   float cx2 = (float)double_from_js(ctx, argv[0], 0.0) - (float)cam2d_x;
   float cy2 = (float)double_from_js(ctx, argv[1], 0.0) - (float)cam2d_y;
   float r   = (float)double_from_js(ctx, argv[2], 0.0);
   float a0  = (float)double_from_js(ctx, argv[3], 0.0) * (float)(3.14159265358979323846 / 180.0);
   float a1  = (float)double_from_js(ctx, argv[4], 360.0) * (float)(3.14159265358979323846 / 180.0);
   uint32_t color = color_from_js(ctx, argv[5], rgba8(255, 255, 255, 255));
   int segs = argc > 6 ? int_from_js(ctx, argv[6], 0) : 0;
   if (segs <= 0) {
      int rr = (int)fabsf(r);
      segs = rr < 8 ? 16 : (rr < 32 ? 32 : 64);
   }
   if (segs < 3) segs = 3;
   if (segs > 256) segs = 256;
   float pts[258 * 2];
   int n = 0;
   pts[n * 2] = cx2; pts[n * 2 + 1] = cy2; n++;
   float span = a1 - a0;
   for (int i = 0; i <= segs; i++) {
      float ta = a0 + span * (float)i / (float)segs;
      pts[n * 2]     = cx2 + cosf(ta) * r;
      pts[n * 2 + 1] = cy2 + sinf(ta) * r;
      n++;
      if (n >= 258) break;
   }
   /* Scanline fill */
   float y_min = pts[1], y_max = pts[1];
   for (int i = 1; i < n; i++) {
      if (pts[i*2+1] < y_min) y_min = pts[i*2+1];
      if (pts[i*2+1] > y_max) y_max = pts[i*2+1];
   }
   float xs[258];
   for (int scanY = (int)floorf(y_min); scanY <= (int)ceilf(y_max); scanY++) {
      float fy = (float)scanY + 0.5f;
      int cnt = 0;
      for (int i = 0; i < n; i++) {
         int j = (i + 1) % n;
         float ay = pts[i*2+1], by = pts[j*2+1];
         float ax = pts[i*2],   bx = pts[j*2];
         if ((ay <= fy && by > fy) || (by <= fy && ay > fy)) {
            float t = (fy - ay) / (by - ay);
            xs[cnt++] = ax + t * (bx - ax);
         }
      }
      for (int aa = 0; aa < cnt - 1; aa++)
         for (int bb = aa + 1; bb < cnt; bb++)
            if (xs[aa] > xs[bb]) { float tmp = xs[aa]; xs[aa] = xs[bb]; xs[bb] = tmp; }
      for (int k = 0; k + 1 < cnt; k += 2) {
         int xL = (int)ceilf(xs[k]), xR = (int)floorf(xs[k + 1]);
         for (int xp = xL; xp <= xR; xp++)
            set_pixel(xp, scanY, color);
      }
   }
   return JS_UNDEFINED;
}

/* ── drawSpline — Catmull-Rom smooth curve ────────────────────────────── */
/* drawSpline(points, color [, segments_per_seg [, closed]]) */
static JSValue js_draw_spline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || !JS_IsArray(argv[0])) return JS_UNDEFINED;
   uint32_t color = color_from_js(ctx, argv[1], rgba8(255, 255, 255, 255));
   int seg_steps = argc > 2 ? int_from_js(ctx, argv[2], 16) : 16;
   bool closed = (argc > 3) && JS_ToBool(ctx, argv[3]);
   if (seg_steps < 2) seg_steps = 2;
   if (seg_steps > 64) seg_steps = 64;
   float pts[NOVA64_MAX_PATH_PTS * 2];
   int n = parse_poly_pts(ctx, argv[0], pts, NOVA64_MAX_PATH_PTS);
   if (n < 2) return JS_UNDEFINED;
   /* Catmull-Rom: P(t) = 0.5 * [(2*P1) + (-P0+P2)*t + (2P0-5P1+4P2-P3)*t^2 + (-P0+3P1-3P2+P3)*t^3] */
   int segs = closed ? n : (n - 1);
   for (int s = 0; s < segs; s++) {
      int i0 = closed ? ((s - 1 + n) % n) : (s == 0 ? 0 : s - 1);
      int i1 = s;
      int i2 = (s + 1) % n;
      int i3 = (s + 2) % n;
      float p0x = pts[i0*2], p0y = pts[i0*2+1];
      float p1x = pts[i1*2], p1y = pts[i1*2+1];
      float p2x = pts[i2*2], p2y = pts[i2*2+1];
      float p3x = pts[i3*2], p3y = pts[i3*2+1];
      float px = p1x, py = p1y;
      for (int step = 1; step <= seg_steps; step++) {
         float t = (float)step / (float)seg_steps;
         float t2 = t * t, t3 = t2 * t;
         float nx = 0.5f * ((2.0f*p1x) + (-p0x+p2x)*t + (2.0f*p0x-5.0f*p1x+4.0f*p2x-p3x)*t2 + (-p0x+3.0f*p1x-3.0f*p2x+p3x)*t3);
         float ny = 0.5f * ((2.0f*p1y) + (-p0y+p2y)*t + (2.0f*p0y-5.0f*p1y+4.0f*p2y-p3y)*t2 + (-p0y+3.0f*p1y-3.0f*p2y+p3y)*t3);
         path_draw_line_segment(px, py, nx, ny, color);
         px = nx; py = ny;
      }
   }
   return JS_UNDEFINED;
}

/* ── colorLerp2D — bilinear color interpolation ───────────────────────── */
/* colorLerp2D(c00, c10, c01, c11, tx, ty) */
static JSValue js_color_lerp2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_NewUint32(ctx, 0);
   uint32_t c00 = color_from_js(ctx, argv[0], 0);
   uint32_t c10 = color_from_js(ctx, argv[1], 0);
   uint32_t c01 = color_from_js(ctx, argv[2], 0);
   uint32_t c11 = color_from_js(ctx, argv[3], 0);
   float tx = (float)clamp_double(double_from_js(ctx, argv[4], 0.0), 0.0, 1.0);
   float ty = (float)clamp_double(double_from_js(ctx, argv[5], 0.0), 0.0, 1.0);
   uint32_t top    = lerp_color(c00, c10, tx);
   uint32_t bottom = lerp_color(c01, c11, tx);
   return JS_NewUint32(ctx, lerp_color(top, bottom, ty));
}

/* ── stampText — integer-scaled text ─────────────────────────────────── */
/* stampText(text, x, y, scaleX, scaleY, color) */
static JSValue js_stamp_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int bx  = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int by2 = int_from_js(ctx, argv[2], 0) - cam2d_y;
   int sx  = argc > 3 ? int_from_js(ctx, argv[3], 2) : 2;
   int sy  = argc > 4 ? int_from_js(ctx, argv[4], 2) : 2;
   uint32_t color = color_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   if (sx < 1) sx = 1;
   if (sy < 1) sy = 1;
   if (sx > 16) sx = 16;
   if (sy > 16) sy = 16;
   int cur_x = bx;
   for (const char *p = text; *p; p++) {
      if (*p == '\n') {
         cur_x = bx;
         by2 += 9 * sy;
         continue;
      }
      for (int row = 0; row < 7; row++) {
         uint8_t bits = glyph_row(*p, row);
         for (int col = 0; col < 5; col++) {
            if (bits & (1U << (4 - col))) {
               for (int dy2 = 0; dy2 < sy; dy2++)
                  for (int dx2 = 0; dx2 < sx; dx2++)
                     set_pixel(cur_x + col * sx + dx2, by2 + row * sy + dy2, color);
            }
         }
      }
      cur_x += 6 * sx;
   }
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* ── colorHSV ─────────────────────────────────────────────────────────── */
/* colorHSV(h, s, v [, a]) — h:0-360  s:0-255  v:0-255  a:0-255 */
static JSValue js_color_hsv(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float h = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0);
   float s = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 255.0) / 255.0, 0.0, 1.0);
   float v = (float)clamp_double(double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 255.0) / 255.0, 0.0, 1.0);
   uint32_t a = (uint32_t)(int)clamp_double(double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 255.0), 0.0, 255.0);
   while (h < 0.0f) h += 360.0f;
   h = fmodf(h, 360.0f);
   float c = v * s;
   float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
   float m = v - c;
   float r1, g1, b1;
   if      (h < 60.0f)  { r1 = c; g1 = x; b1 = 0.0f; }
   else if (h < 120.0f) { r1 = x; g1 = c; b1 = 0.0f; }
   else if (h < 180.0f) { r1 = 0.0f; g1 = c; b1 = x; }
   else if (h < 240.0f) { r1 = 0.0f; g1 = x; b1 = c; }
   else if (h < 300.0f) { r1 = x; g1 = 0.0f; b1 = c; }
   else                 { r1 = c; g1 = 0.0f; b1 = x; }
   return JS_NewUint32(ctx, rgba8(
      (uint32_t)((r1 + m) * 255.0f + 0.5f),
      (uint32_t)((g1 + m) * 255.0f + 0.5f),
      (uint32_t)((b1 + m) * 255.0f + 0.5f),
      a));
}

/* ── drawPoly / fillPoly ──────────────────────────────────────────────── */
/* Accept flat [x0,y0, x1,y1,...] or nested [[x,y],[x,y],...] JS arrays */
static int parse_poly_pts(JSContext *ctx, JSValue arr, float *pts, int max_pts)
{
   if (!JS_IsArray(arr)) return 0;
   JSValue lv = JS_GetPropertyStr(ctx, arr, "length");
   int len = int_from_js(ctx, lv, 0);
   JS_FreeValue(ctx, lv);
   if (len < 2) return 0;
   int count = 0;
   JSValue first = JS_GetPropertyUint32(ctx, arr, 0);
   bool nested = JS_IsArray(first);
   JS_FreeValue(ctx, first);
   if (nested) {
      for (int i = 0; i < len && count < max_pts; i++) {
         JSValue pair = JS_GetPropertyUint32(ctx, arr, (unsigned)i);
         JSValue xv = JS_GetPropertyUint32(ctx, pair, 0);
         JSValue yv = JS_GetPropertyUint32(ctx, pair, 1);
         pts[count * 2    ] = (float)double_from_js(ctx, xv, 0.0) - (float)cam2d_x;
         pts[count * 2 + 1] = (float)double_from_js(ctx, yv, 0.0) - (float)cam2d_y;
         count++;
         JS_FreeValue(ctx, xv); JS_FreeValue(ctx, yv); JS_FreeValue(ctx, pair);
      }
   } else {
      for (int i = 0; i + 1 < len && count < max_pts; i += 2) {
         JSValue xv = JS_GetPropertyUint32(ctx, arr, (unsigned)i);
         JSValue yv = JS_GetPropertyUint32(ctx, arr, (unsigned)(i + 1));
         pts[count * 2    ] = (float)double_from_js(ctx, xv, 0.0) - (float)cam2d_x;
         pts[count * 2 + 1] = (float)double_from_js(ctx, yv, 0.0) - (float)cam2d_y;
         count++;
         JS_FreeValue(ctx, xv); JS_FreeValue(ctx, yv);
      }
   }
   return count;
}

static JSValue js_draw_poly(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || !JS_IsArray(argv[0])) return JS_UNDEFINED;
   uint32_t color = color_from_js(ctx, argv[1], rgba8(255, 255, 255, 255));
   float pts[NOVA64_MAX_PATH_PTS * 2];
   int n = parse_poly_pts(ctx, argv[0], pts, NOVA64_MAX_PATH_PTS);
   if (n < 2) return JS_UNDEFINED;
   bool closed = (argc > 2) && JS_ToBool(ctx, argv[2]);
   for (int i = 0; i < n - 1; i++)
      path_draw_line_segment(pts[i*2], pts[i*2+1], pts[(i+1)*2], pts[(i+1)*2+1], color);
   if (closed)
      path_draw_line_segment(pts[(n-1)*2], pts[(n-1)*2+1], pts[0], pts[1], color);
   return JS_UNDEFINED;
}

static JSValue js_fill_poly(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2 || !JS_IsArray(argv[0])) return JS_UNDEFINED;
   uint32_t color = color_from_js(ctx, argv[1], rgba8(255, 255, 255, 255));
   float pts[NOVA64_MAX_PATH_PTS * 2];
   int n = parse_poly_pts(ctx, argv[0], pts, NOVA64_MAX_PATH_PTS);
   if (n < 3) return JS_UNDEFINED;
   float y_min = pts[1], y_max = pts[1];
   for (int i = 1; i < n; i++) {
      if (pts[i*2+1] < y_min) y_min = pts[i*2+1];
      if (pts[i*2+1] > y_max) y_max = pts[i*2+1];
   }
   float xs[NOVA64_MAX_PATH_PTS];
   for (int scanY = (int)floorf(y_min); scanY <= (int)ceilf(y_max); scanY++) {
      float fy = (float)scanY + 0.5f;
      int cnt = 0;
      for (int i = 0; i < n; i++) {
         int j = (i + 1) % n;
         float ay = pts[i*2+1], by = pts[j*2+1];
         float ax = pts[i*2],   bx = pts[j*2];
         if ((ay <= fy && by > fy) || (by <= fy && ay > fy)) {
            float t = (fy - ay) / (by - ay);
            xs[cnt++] = ax + t * (bx - ax);
         }
      }
      for (int aa = 0; aa < cnt - 1; aa++)
         for (int bb = aa + 1; bb < cnt; bb++)
            if (xs[aa] > xs[bb]) { float tmp = xs[aa]; xs[aa] = xs[bb]; xs[bb] = tmp; }
      for (int k = 0; k + 1 < cnt; k += 2) {
         int xL = (int)ceilf(xs[k]), xR = (int)floorf(xs[k + 1]);
         for (int xp = xL; xp <= xR; xp++)
            set_pixel(xp, scanY, color);
      }
   }
   return JS_UNDEFINED;
}

/* ── screenPixelate ────────────────────────────────────────────────────── */
static JSValue js_screen_pixelate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int block = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 4);
   if (block < 2)  block = 2;
   if (block > 64) block = 64;
   if (!framebuffer) return JS_UNDEFINED;
   for (int by2 = 0; by2 < NOVA64_HEIGHT; by2 += block) {
      for (int bx = 0; bx < NOVA64_WIDTH; bx += block) {
         unsigned sr = 0, sg = 0, sb = 0, cnt = 0;
         int xend = bx + block; if (xend > NOVA64_WIDTH)  xend = NOVA64_WIDTH;
         int yend = by2 + block; if (yend > NOVA64_HEIGHT) yend = NOVA64_HEIGHT;
         for (int y = by2; y < yend; y++)
            for (int x = bx; x < xend; x++) {
               uint32_t c = framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x];
               sr += (c >> 24) & 0xff; sg += (c >> 16) & 0xff; sb += (c >> 8) & 0xff;
               cnt++;
            }
         if (!cnt) continue;
         uint32_t avg = rgba8(sr / cnt, sg / cnt, sb / cnt, 255);
         for (int y = by2; y < yend; y++)
            for (int x = bx; x < xend; x++)
               framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = avg;
      }
   }
   return JS_UNDEFINED;
}

/* ── textBox ──────────────────────────────────────────────────────────── */
/* textBox(text, x, y [, maxWidth [, color]]) — word-wrap text */
static JSValue js_text_box(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int bx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int by2 = int_from_js(ctx, argv[2], 0) - cam2d_y;
   int maxW = argc > 3 ? int_from_js(ctx, argv[3], NOVA64_WIDTH) : NOVA64_WIDTH;
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   if (maxW <= 0) maxW = NOVA64_WIDTH;
   char line_buf[256];
   int line_len = 0;
   int cur_y = by2;
   const char *p = text;
   while (*p) {
      /* Hard newline */
      if (*p == '\n') {
         line_buf[line_len] = '\0';
         if (line_len > 0) draw_text_pixels(line_buf, bx, cur_y, color);
         cur_y += 9; line_len = 0; p++; continue;
      }
      /* Extract next word */
      const char *ws = p;
      while (*p && *p != ' ' && *p != '\n') p++;
      int wl = (int)(p - ws);
      if (*p == ' ') p++;
      if (wl == 0) continue;
      int word_px = wl * 6;
      int space_px = line_len > 0 ? 6 : 0;
      if (line_len > 0 && (line_len * 6) + space_px + word_px > maxW) {
         line_buf[line_len] = '\0';
         draw_text_pixels(line_buf, bx, cur_y, color);
         cur_y += 9; line_len = 0; space_px = 0;
      }
      if (line_len > 0 && line_len < (int)sizeof(line_buf) - 1)
         line_buf[line_len++] = ' ';
      if (line_len + wl < (int)sizeof(line_buf) - 1) {
         memcpy(line_buf + line_len, ws, (size_t)wl);
         line_len += wl;
      }
      (void)space_px;
   }
   if (line_len > 0) {
      line_buf[line_len] = '\0';
      draw_text_pixels(line_buf, bx, cur_y, color);
   }
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

/* ── Screen flash ─────────────────────────────────────────────────────── */
static JSValue js_screen_flash(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   g_flash_color    = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(255,255,255,255));
   g_flash_duration = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.3), 0.01, 10.0);
   g_flash_timer    = g_flash_duration;
   return JS_UNDEFINED;
}

static JSValue js_get_frame(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt64(ctx, (int64_t)frame_count);
}

static JSValue js_get_time(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewFloat64(ctx, (double)frame_count / NOVA64_FPS);
}

static JSValue js_meta_name(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewString(ctx, package_manifest_name);
}

static JSValue js_meta_title(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewString(ctx, package_manifest_title);
}

static JSValue js_meta_author(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewString(ctx, package_manifest_author);
}

static JSValue js_meta_version(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewString(ctx, package_manifest_version);
}

static JSValue js_meta_main(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewString(ctx, package_manifest_main);
}

static struct nova64_perf_timer *perf_timer_for_label(const char *label, bool create)
{
   if (!label || !label[0])
      return NULL;
   for (int i = 0; i < NOVA64_MAX_PERF_TIMERS; i++) {
      if (perf_timers[i].used && !strcmp(perf_timers[i].label, label))
         return &perf_timers[i];
   }
   if (!create)
      return NULL;
   for (int i = 0; i < NOVA64_MAX_PERF_TIMERS; i++) {
      if (!perf_timers[i].used) {
         perf_timers[i].used = true;
         snprintf(perf_timers[i].label, sizeof(perf_timers[i].label), "%s", label);
         return &perf_timers[i];
      }
   }
   return NULL;
}

static JSValue js_perf_begin(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   const char *label = argc > 0 ? JS_ToCString(ctx, argv[0]) : NULL;
   struct nova64_perf_timer *timer = perf_timer_for_label(label, true);
   if (label)
      JS_FreeCString(ctx, label);
   if (!timer)
      return JS_NewBool(ctx, false);
   timer->active = true;
   timer->started_at = clock();
   return JS_NewBool(ctx, true);
}

static JSValue js_perf_end(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   const char *label = argc > 0 ? JS_ToCString(ctx, argv[0]) : NULL;
   struct nova64_perf_timer *timer = perf_timer_for_label(label, false);
   if (label)
      JS_FreeCString(ctx, label);
   if (!timer || !timer->active)
      return JS_NewFloat64(ctx, 0.0);
   clock_t ended_at = clock();
   double elapsed = (double)(ended_at - timer->started_at) / (double)CLOCKS_PER_SEC;
   if (elapsed < 0.0)
      elapsed = 0.0;
   timer->active = false;
   timer->total += elapsed;
   timer->count++;
   return JS_NewFloat64(ctx, elapsed);
}

static JSValue js_perf_report(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue report = JS_NewObject(ctx);
   for (int i = 0; i < NOVA64_MAX_PERF_TIMERS; i++) {
      if (!perf_timers[i].used)
         continue;
      JSValue entry = JS_NewObject(ctx);
      JS_SetPropertyStr(ctx, entry, "total", JS_NewFloat64(ctx, perf_timers[i].total));
      JS_SetPropertyStr(ctx, entry, "count", JS_NewUint32(ctx, perf_timers[i].count));
      JS_SetPropertyStr(ctx, entry, "active", JS_NewBool(ctx, perf_timers[i].active));
      JS_SetPropertyStr(ctx, report, perf_timers[i].label, entry);
   }
   return report;
}

static JSValue js_perf_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   memset(perf_timers, 0, sizeof(perf_timers));
   return JS_UNDEFINED;
}

static void log_perf_report_if_requested(void)
{
   const char *enabled = getenv("NOVA64_PERF");
   if (!enabled || !enabled[0] || !strcmp(enabled, "0"))
      return;
   if (!log_cb)
      return;
   for (int i = 0; i < NOVA64_MAX_PERF_TIMERS; i++) {
      if (perf_timers[i].used) {
         log_cb(RETRO_LOG_INFO, "[nova64] perf %s total=%.6f count=%u active=%d\n",
               perf_timers[i].label, perf_timers[i].total, perf_timers[i].count,
               perf_timers[i].active ? 1 : 0);
      }
   }
}

static int button_index_from_js(JSContext *ctx, JSValueConst value)
{
   if (JS_IsNumber(value)) {
      int index = int_from_js(ctx, value, -1);
      return index >= 0 && index < NOVA64_BUTTON_COUNT ? index : -1;
   }

   const char *name = JS_ToCString(ctx, value);
   if (!name)
      return -1;

   int index = -1;
   if (!strcmp(name, "left"))
      index = NOVA64_BTN_LEFT;
   else if (!strcmp(name, "right"))
      index = NOVA64_BTN_RIGHT;
   else if (!strcmp(name, "up"))
      index = NOVA64_BTN_UP;
   else if (!strcmp(name, "down"))
      index = NOVA64_BTN_DOWN;
   else if (!strcmp(name, "z") || !strcmp(name, "b"))
      index = NOVA64_BTN_Z;
   else if (!strcmp(name, "x") || !strcmp(name, "a"))
      index = NOVA64_BTN_X;
   else if (!strcmp(name, "c") || !strcmp(name, "y"))
      index = NOVA64_BTN_C;
   else if (!strcmp(name, "v"))
      index = NOVA64_BTN_V;
   JS_FreeCString(ctx, name);
   return index;
}

static JSValue js_btn(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int index = argc > 0 ? button_index_from_js(ctx, argv[0]) : -1;
   int port  = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   if (port <= 0 || port >= NOVA64_MAX_PORTS)
      return JS_NewBool(ctx, index >= 0 ? buttons[index] : false);
   return JS_NewBool(ctx, index >= 0 ? mp_buttons[port][index] : false);
}

static JSValue js_btnp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int index = argc > 0 ? button_index_from_js(ctx, argv[0]) : -1;
   int port  = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   if (port <= 0 || port >= NOVA64_MAX_PORTS)
      return JS_NewBool(ctx, index >= 0 ? pressed_buttons[index] : false);
   return JS_NewBool(ctx, index >= 0 ? mp_pressed_buttons[port][index] : false);
}

static int key_code_from_js(JSContext *ctx, JSValueConst value)
{
   if (JS_IsNumber(value)) {
      int code = int_from_js(ctx, value, -1);
      return (code >= 0 && code < NOVA64_KEY_TABLE_SIZE) ? code : -1;
   }
   const char *name = JS_ToCString(ctx, value);
   if (!name)
      return -1;
   int code = -1;
   if (!strcmp(name, "up"))          code = NOVA64_RETROK_UP;
   else if (!strcmp(name, "down"))   code = NOVA64_RETROK_DOWN;
   else if (!strcmp(name, "left"))   code = NOVA64_RETROK_LEFT;
   else if (!strcmp(name, "right"))  code = NOVA64_RETROK_RIGHT;
   else if (!strcmp(name, "space"))  code = NOVA64_RETROK_SPACE;
   else if (!strcmp(name, "enter") || !strcmp(name, "return"))
                                     code = NOVA64_RETROK_RETURN;
   else if (!strcmp(name, "escape") || !strcmp(name, "esc"))
                                     code = NOVA64_RETROK_ESCAPE;
   else if (!strcmp(name, "backspace")) code = NOVA64_RETROK_BACKSPACE;
   else if (!strcmp(name, "tab"))    code = NOVA64_RETROK_TAB;
   else if (!strcmp(name, "shift") || !strcmp(name, "lshift"))
                                     code = NOVA64_RETROK_LSHIFT;
   else if (!strcmp(name, "rshift")) code = NOVA64_RETROK_RSHIFT;
   else if (!strcmp(name, "ctrl") || !strcmp(name, "lctrl"))
                                     code = NOVA64_RETROK_LCTRL;
   else if (!strcmp(name, "rctrl"))  code = NOVA64_RETROK_RCTRL;
   else if (!strcmp(name, "alt") || !strcmp(name, "lalt"))
                                     code = NOVA64_RETROK_LALT;
   else if (!strcmp(name, "ralt"))   code = NOVA64_RETROK_RALT;
   else if (name[0] >= 'a' && name[0] <= 'z' && name[1] == '\0')
      code = (int)name[0]; /* a-z maps to RETROK 97-122 */
   else if (name[0] >= '0' && name[0] <= '9' && name[1] == '\0')
      code = (int)name[0]; /* 0-9 maps to RETROK 48-57 */
   else if (name[0] == 'f' || name[0] == 'F') {
      int fn = (int)strtol(name + 1, NULL, 10);
      if (fn >= 1 && fn <= 12)
         code = NOVA64_RETROK_F1 + (fn - 1);
   }
   JS_FreeCString(ctx, name);
   return code;
}

static JSValue js_key(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int code = argc > 0 ? key_code_from_js(ctx, argv[0]) : -1;
   if (code < 0 || code >= NOVA64_KEY_TABLE_SIZE)
      return JS_NewBool(ctx, false);
   return JS_NewBool(ctx, key_held[code]);
}

static JSValue js_keyp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int code = argc > 0 ? key_code_from_js(ctx, argv[0]) : -1;
   if (code < 0 || code >= NOVA64_KEY_TABLE_SIZE)
      return JS_NewBool(ctx, false);
   return JS_NewBool(ctx, key_held[code] && !key_prev_held[code]);
}

static int mouse_btn_index(JSContext *ctx, JSValueConst value)
{
   if (JS_IsNumber(value)) {
      int i = int_from_js(ctx, value, -1);
      return (i >= 0 && i < NOVA64_MOUSE_BTN_COUNT) ? i : -1;
   }
   const char *name = JS_ToCString(ctx, value);
   if (!name) return -1;
   int idx = -1;
   if (!strcmp(name, "left"))        idx = 0;
   else if (!strcmp(name, "right"))  idx = 1;
   else if (!strcmp(name, "middle")) idx = 2;
   JS_FreeCString(ctx, name);
   return idx;
}

static JSValue js_mouse_x(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, mouse_rel_x);
}

static JSValue js_mouse_y(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, mouse_rel_y);
}

static JSValue js_mouse_btn(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = argc > 0 ? mouse_btn_index(ctx, argv[0]) : -1;
   if (idx < 0) return JS_NewBool(ctx, false);
   return JS_NewBool(ctx, mouse_btns[idx]);
}

static JSValue js_mouse_btnp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int idx = argc > 0 ? mouse_btn_index(ctx, argv[0]) : -1;
   if (idx < 0) return JS_NewBool(ctx, false);
   return JS_NewBool(ctx, mouse_btns[idx] && !mouse_prev_btns[idx]);
}

static JSValue js_touch_x(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, touch_count > 0 ? touch_x : 0);
}

static JSValue js_touch_y(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, touch_count > 0 ? touch_y : 0);
}

static JSValue js_touch_count(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, touch_count);
}

static JSValue js_create_cube(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = allocate_mesh(NOVA64_MESH_CUBE);
   if (!handle)
      return JS_ThrowInternalError(ctx, "Nova64 mesh table is full");

   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh)
      return JS_NewInt32(ctx, handle);

   if (argc >= 4 && JS_IsNumber(argv[0]) && JS_IsNumber(argv[1]) &&
         JS_IsNumber(argv[2]) && JS_IsNumber(argv[3])) {
      mesh->scale[0] = (float)clamp_double(fabs(double_from_js(ctx, argv[0], 1.0)), 0.001, 10000.0);
      mesh->scale[1] = (float)clamp_double(fabs(double_from_js(ctx, argv[1], 1.0)), 0.001, 10000.0);
      mesh->scale[2] = (float)clamp_double(fabs(double_from_js(ctx, argv[2], 1.0)), 0.001, 10000.0);
      mesh->color = color_from_js(ctx, argv[3], mesh->color);
      if (argc > 4)
         set_position_from_js(ctx, argv[4], mesh->position);
   } else if (argc >= 2 && JS_IsNumber(argv[0]) && !JS_IsArray(argv[1])) {
      double size = clamp_double(fabs(double_from_js(ctx, argv[0], 1.0)), 0.001, 10000.0);
      mesh->scale[0] = (float)size;
      mesh->scale[1] = (float)size;
      mesh->scale[2] = (float)size;
      mesh->color = color_from_js(ctx, argv[1], mesh->color);
      if (argc > 2)
         set_position_from_js(ctx, argv[2], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
      if (argc > 1)
         set_position_from_js(ctx, argv[1], mesh->position);
   }
   return JS_NewInt32(ctx, handle);
}

static JSValue js_create_sphere(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = allocate_mesh(NOVA64_MESH_SPHERE);
   if (!handle)
      return JS_ThrowInternalError(ctx, "Nova64 mesh table is full");

   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh)
      return JS_NewInt32(ctx, handle);

   if (argc >= 2 && JS_IsNumber(argv[0]) && !JS_IsArray(argv[1])) {
      double radius = clamp_double(fabs(double_from_js(ctx, argv[0], 1.0)), 0.001, 10000.0);
      mesh->scale[0] = (float)(radius * 2.0);
      mesh->scale[1] = (float)(radius * 2.0);
      mesh->scale[2] = (float)(radius * 2.0);
      mesh->color = color_from_js(ctx, argv[1], mesh->color);
      if (argc > 2)
         set_position_from_js(ctx, argv[2], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
      if (argc > 1)
         set_position_from_js(ctx, argv[1], mesh->position);
   }
   return JS_NewInt32(ctx, handle);
}

static JSValue js_create_plane(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int handle = allocate_mesh(NOVA64_MESH_PLANE);
   if (!handle)
      return JS_ThrowInternalError(ctx, "Nova64 mesh table is full");

   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh)
      return JS_NewInt32(ctx, handle);

   if (argc >= 2 && JS_IsNumber(argv[0]) && JS_IsNumber(argv[1])) {
      double width = double_from_js(ctx, argv[0], 1.0);
      double depth = double_from_js(ctx, argv[1], 1.0);
      mesh->scale[0] = (float)clamp_double(fabs(width), 0.001, 10000.0);
      mesh->scale[2] = (float)clamp_double(fabs(depth), 0.001, 10000.0);
      if (argc > 2)
         mesh->color = color_from_js(ctx, argv[2], mesh->color);
      if (argc > 3)
         set_position_from_js(ctx, argv[3], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
   }
   return JS_NewInt32(ctx, handle);
}

/* createCapsule(radius, height, color [, position]) */
static JSValue js_create_capsule(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = allocate_mesh(NOVA64_MESH_CAPSULE);
   if (!handle)
      return JS_ThrowInternalError(ctx, "Nova64 mesh table is full");
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh)
      return JS_NewInt32(ctx, handle);

   if (argc >= 3 && JS_IsNumber(argv[0]) && JS_IsNumber(argv[1])) {
      double radius = clamp_double(fabs(double_from_js(ctx, argv[0], 0.5)), 0.001, 10000.0);
      double height = clamp_double(fabs(double_from_js(ctx, argv[1], 1.0)), 0.001, 10000.0);
      /* scale[0]=scale[2]=diameter, scale[1]=total height */
      mesh->scale[0] = (float)(radius * 2.0);
      mesh->scale[1] = (float)height;
      mesh->scale[2] = (float)(radius * 2.0);
      mesh->color = color_from_js(ctx, argv[2], mesh->color);
      if (argc > 3)
         set_position_from_js(ctx, argv[3], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
   }
   return JS_NewInt32(ctx, handle);
}

/* createCylinder(radiusTop, radiusBottom, height, color [, position]) */
static JSValue js_create_cylinder(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = allocate_mesh(NOVA64_MESH_CYLINDER);
   if (!handle)
      return JS_ThrowInternalError(ctx, "Nova64 mesh table is full");
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh)
      return JS_NewInt32(ctx, handle);

   if (argc >= 4 && JS_IsNumber(argv[0]) && JS_IsNumber(argv[1]) && JS_IsNumber(argv[2])) {
      double rTop    = clamp_double(fabs(double_from_js(ctx, argv[0], 0.5)), 0.001, 10000.0);
      double rBottom = clamp_double(fabs(double_from_js(ctx, argv[1], 0.5)), 0.001, 10000.0);
      double height  = clamp_double(fabs(double_from_js(ctx, argv[2], 1.0)), 0.001, 10000.0);
      /* scale[0]=2*rTop, scale[2]=2*rBottom, scale[1]=height */
      mesh->scale[0] = (float)(rTop    * 2.0);
      mesh->scale[1] = (float)height;
      mesh->scale[2] = (float)(rBottom * 2.0);
      mesh->color = color_from_js(ctx, argv[3], mesh->color);
      if (argc > 4)
         set_position_from_js(ctx, argv[4], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
   }
   return JS_NewInt32(ctx, handle);
}

static JSValue js_vec3_array(JSContext *ctx, const float value[3])
{
   JSValue array = JS_NewArray(ctx);
   JS_SetPropertyUint32(ctx, array, 0, JS_NewFloat64(ctx, value[0]));
   JS_SetPropertyUint32(ctx, array, 1, JS_NewFloat64(ctx, value[1]));
   JS_SetPropertyUint32(ctx, array, 2, JS_NewFloat64(ctx, value[2]));
   return array;
}

static float normalize_positive_transform(double value)
{
   return value > 0.0 ? (float)clamp_double(value, 0.001, 10000.0) : 1.0f;
}

static void set_transform_vec3_from_args(JSContext *ctx, int argc, JSValueConst *argv,
      int start, float target[3], bool positive, bool uniform_single)
{
   if (argc <= start)
      return;

   float next[3] = {target[0], target[1], target[2]};
   if (set_position_from_js(ctx, argv[start], next)) {
      target[0] = positive ? normalize_positive_transform(next[0]) : next[0];
      target[1] = positive ? normalize_positive_transform(next[1]) : next[1];
      target[2] = positive ? normalize_positive_transform(next[2]) : next[2];
      return;
   }

   double fallback = positive ? 1.0 : 0.0;
   double x = double_from_js(ctx, argv[start], fallback);
   double y = argc > start + 1 ? double_from_js(ctx, argv[start + 1], fallback) :
      (uniform_single ? x : fallback);
   double z = argc > start + 2 ? double_from_js(ctx, argv[start + 2], fallback) :
      (uniform_single ? x : fallback);
   target[0] = positive ? normalize_positive_transform(x) : (float)x;
   target[1] = positive ? normalize_positive_transform(y) : (float)y;
   target[2] = positive ? normalize_positive_transform(z) : (float)z;
}

static JSValue js_destroy_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (mesh) {
      free(mesh->custom_verts);
      free(mesh->custom_indices);
      free(mesh->instance_transforms);
      memset(mesh, 0, sizeof(*mesh));
   }
   return JS_UNDEFINED;
}

static JSValue js_set_vec3(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, float *target)
{
   set_transform_vec3_from_args(ctx, argc, argv, 1, target, false, false);
   return JS_UNDEFINED;
}

static JSValue js_set_position(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   return mesh ? js_set_vec3(ctx, this_val, argc, argv, mesh->position) : JS_UNDEFINED;
}

static JSValue js_set_rotation(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   return mesh ? js_set_vec3(ctx, this_val, argc, argv, mesh->rotation) : JS_UNDEFINED;
}

static JSValue js_set_scale(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (mesh)
      set_transform_vec3_from_args(ctx, argc, argv, 1, mesh->scale, true, true);
   return JS_UNDEFINED;
}

static JSValue js_get_position(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   return mesh ? js_vec3_array(ctx, mesh->position) : JS_NULL;
}

static JSValue js_get_rotation(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   return mesh ? js_vec3_array(ctx, mesh->rotation) : JS_NULL;
}

static JSValue js_rotate_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->rotation[0] += (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   mesh->rotation[1] += (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   mesh->rotation[2] += (float)double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0.0);
   return JS_NewBool(ctx, true);
}

static JSValue js_move_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->position[0] += (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0);
   mesh->position[1] += (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0.0);
   mesh->position[2] += (float)double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0.0);
   return JS_NewBool(ctx, true);
}

static JSValue js_set_mesh_visible(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->visible = argc > 1 ? JS_ToBool(ctx, argv[1]) : true;
   return JS_NewBool(ctx, true);
}

static JSValue js_set_flat_shading(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->flat_shading = argc > 1 ? JS_ToBool(ctx, argv[1]) : true;
   return JS_NewBool(ctx, true);
}

static JSValue js_set_mesh_opacity(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->opacity = (float)clamp_double(
         double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->opacity),
         0.0, 1.0);
   return JS_NewBool(ctx, true);
}

static void gles_destroy_shadow_resources(void);
static void gles_destroy_skybox_resources(void);

static JSValue js_set_cast_shadow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->cast_shadow = argc > 1 ? JS_ToBool(ctx, argv[1]) : true;
   return JS_NewBool(ctx, true);
}

static JSValue js_set_receive_shadow(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->receive_shadow = argc > 1 ? JS_ToBool(ctx, argv[1]) : true;
   return JS_NewBool(ctx, true);
}

static JSValue js_set_shadow_quality(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc > 0 && JS_IsString(argv[0])) {
      const char *q = JS_ToCString(ctx, argv[0]);
      if (!strcmp(q, "high"))        g_shadow_map_size = 2048;
      else if (!strcmp(q, "medium")) g_shadow_map_size = 1024;
      else if (!strcmp(q, "low"))    g_shadow_map_size = 512;
      else if (!strcmp(q, "off") || !strcmp(q, "none")) g_shadow_map_size = 0;
      JS_FreeCString(ctx, q);
   } else if (argc > 0 && JS_IsNumber(argv[0])) {
      int32_t n = 0;
      JS_ToInt32(ctx, &n, argv[0]);
      g_shadow_map_size = (n <= 0) ? 0 : (n >= 512 && n <= 4096) ? n : 1024;
   }
   gles_destroy_shadow_resources();
   return JS_UNDEFINED;
}

static JSValue js_set_mesh_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->color);
   return JS_NewBool(ctx, true);
}

static JSValue js_get_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh)
      return JS_NULL;

   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "id", JS_NewInt32(ctx, handle));
   JS_SetPropertyStr(ctx, object, "type", JS_NewString(ctx, mesh_type_name(mesh->type)));
   JS_SetPropertyStr(ctx, object, "visible", JS_NewBool(ctx, mesh->visible));
   JS_SetPropertyStr(ctx, object, "opacity", JS_NewFloat64(ctx, mesh->opacity));
   JS_SetPropertyStr(ctx, object, "flatShading", JS_NewBool(ctx, mesh->flat_shading));
   JS_SetPropertyStr(ctx, object, "castShadow", JS_NewBool(ctx, mesh->cast_shadow));
   JS_SetPropertyStr(ctx, object, "receiveShadow", JS_NewBool(ctx, mesh->receive_shadow));
   JS_SetPropertyStr(ctx, object, "color", JS_NewUint32(ctx, mesh->color));
   JS_SetPropertyStr(ctx, object, "position", js_vec3_array(ctx, mesh->position));
   JS_SetPropertyStr(ctx, object, "rotation", js_vec3_array(ctx, mesh->rotation));
   JS_SetPropertyStr(ctx, object, "scale", js_vec3_array(ctx, mesh->scale));
   JS_SetPropertyStr(ctx, object, "roughness", JS_NewFloat64(ctx, mesh->roughness));
   JS_SetPropertyStr(ctx, object, "metalness", JS_NewFloat64(ctx, mesh->metalness));
   JS_SetPropertyStr(ctx, object, "emissiveColor", JS_NewUint32(ctx, mesh->emissive_color));
   JS_SetPropertyStr(ctx, object, "emissiveIntensity", JS_NewFloat64(ctx, mesh->emissive_intensity));
   /* uvOffset / uvScale as 2-element JS arrays + flat scalar accessors */
   {
      JSValue uvo = JS_NewArray(ctx);
      JS_SetPropertyUint32(ctx, uvo, 0, JS_NewFloat64(ctx, mesh->uv_offset[0]));
      JS_SetPropertyUint32(ctx, uvo, 1, JS_NewFloat64(ctx, mesh->uv_offset[1]));
      JS_SetPropertyStr(ctx, object, "uvOffset", uvo);
      JSValue uvs = JS_NewArray(ctx);
      JS_SetPropertyUint32(ctx, uvs, 0, JS_NewFloat64(ctx, mesh->uv_scale[0]));
      JS_SetPropertyUint32(ctx, uvs, 1, JS_NewFloat64(ctx, mesh->uv_scale[1]));
      JS_SetPropertyStr(ctx, object, "uvScale", uvs);
      JS_SetPropertyStr(ctx, object, "uvOffsetU", JS_NewFloat64(ctx, mesh->uv_offset[0]));
      JS_SetPropertyStr(ctx, object, "uvOffsetV", JS_NewFloat64(ctx, mesh->uv_offset[1]));
      JS_SetPropertyStr(ctx, object, "uvScaleU", JS_NewFloat64(ctx, mesh->uv_scale[0]));
      JS_SetPropertyStr(ctx, object, "uvScaleV", JS_NewFloat64(ctx, mesh->uv_scale[1]));
   }
   {
      const char *blend_name = "opaque";
      if (mesh->mesh_blend == NOVA64_MESH_BLEND_ADDITIVE)  blend_name = "additive";
      else if (mesh->mesh_blend == NOVA64_MESH_BLEND_MULTIPLY) blend_name = "multiply";
      JS_SetPropertyStr(ctx, object, "meshBlend", JS_NewString(ctx, blend_name));
      JS_SetPropertyStr(ctx, object, "blendMode", JS_NewString(ctx, blend_name));
   }
   return object;
}

static JSValue js_get_3d_stats(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   (void)argc;
   (void)argv;

   size_t meshes_count = 0;
   size_t visible_count = 0;
   size_t triangles = 0;
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (!meshes[i].used)
         continue;
      meshes_count++;
      triangles += mesh_triangle_count(meshes[i].type);
      if (meshes[i].visible && meshes[i].opacity > 0.0f)
         visible_count++;
   }

   size_t lights_count = 0;
   for (int i = 0; i < NOVA64_MAX_POINT_LIGHTS; i++) {
      if (point_lights[i].used)
         lights_count++;
   }

   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "triangles", JS_NewUint32(ctx, (uint32_t)triangles));
   JS_SetPropertyStr(ctx, object, "drawCalls", JS_NewUint32(ctx, (uint32_t)(visible_count + 1)));
   JS_SetPropertyStr(ctx, object, "meshes", JS_NewUint32(ctx, (uint32_t)meshes_count));
   JS_SetPropertyStr(ctx, object, "visibleMeshes", JS_NewUint32(ctx, (uint32_t)visible_count));
   JS_SetPropertyStr(ctx, object, "pointLights", JS_NewUint32(ctx, (uint32_t)lights_count));
   JS_SetPropertyStr(ctx, object, "backend", JS_NewString(ctx, renderer_backend_name(renderer_preference)));
   return object;
}

static JSValue js_get_backend_capabilities(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   (void)argc;
   (void)argv;

   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "backend", JS_NewString(ctx, renderer_backend_name(renderer_preference)));
   JS_SetPropertyStr(ctx, object, "hardwareGLES", JS_NewBool(ctx, gles.active));
   JS_SetPropertyStr(ctx, object, "softwareFallback", JS_NewBool(ctx, !gles.active));
   JS_SetPropertyStr(ctx, object, "primitives", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshOpacity", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshShadowFlags", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "pointLights", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "fogState", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "textures", JS_NewBool(ctx, gles.active));
   JS_SetPropertyStr(ctx, object, "postProcessing", JS_NewBool(ctx, gles.active));
   JS_SetPropertyStr(ctx, object, "emissive", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshAlpha", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "orthographicCamera", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "skyColor", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "skyGradient", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "paletteSwap", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "alphaBlend2D", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "primitive2DShapes", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "camera2DTransform", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "drawStateQueries", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "roundedRects", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "lineGradients", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "colorChannels", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "screenEffects2D", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "drawStateStack", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "textEffects", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshRoughness", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshMetalness", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshUVTransform", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "meshBlend", JS_NewBool(ctx, true));
   JS_SetPropertyStr(ctx, object, "shadowMaps", JS_NewBool(ctx, gles.active));
   JS_SetPropertyStr(ctx, object, "normalMaps", JS_NewBool(ctx, gles.active));
   JS_SetPropertyStr(ctx, object, "renderTargets", JS_NewBool(ctx, gles.active));
   JS_SetPropertyStr(ctx, object, "skybox", JS_NewBool(ctx, gles.active));
   return object;
}

static JSValue js_set_camera_position(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   camera_state.position[0] = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, camera_state.position[0]);
   camera_state.position[1] = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, camera_state.position[1]);
   camera_state.position[2] = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, camera_state.position[2]);
   return JS_UNDEFINED;
}

static JSValue js_set_camera_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   camera_state.target[0] = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, camera_state.target[0]);
   camera_state.target[1] = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, camera_state.target[1]);
   camera_state.target[2] = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, camera_state.target[2]);
   return JS_UNDEFINED;
}

static JSValue js_set_camera_fov(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   camera_state.fov = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, camera_state.fov);
   return JS_UNDEFINED;
}

static JSValue js_set_camera_look_at(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   float direction[3] = {0.0f, 0.0f, -1.0f};
   set_transform_vec3_from_args(ctx, argc, argv, 0, direction, false, false);
   camera_state.target[0] = camera_state.position[0] + direction[0];
   camera_state.target[1] = camera_state.position[1] + direction[1];
   camera_state.target[2] = camera_state.position[2] + direction[2];
   return JS_UNDEFINED;
}

/* getCameraPosition() → [x, y, z] */
static JSValue js_get_camera_position(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return js_vec3_array(ctx, camera_state.position);
}

/* getCameraTarget() → [x, y, z] */
static JSValue js_get_camera_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return js_vec3_array(ctx, camera_state.target);
}

/* getCameraFOV() → number */
static JSValue js_get_camera_fov(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewFloat64(ctx, camera_state.fov);
}

/* setCameraOrthographic(width [, height])
   Switches the projection to orthographic. height defaults to width * 9/16. */
static JSValue js_set_camera_orthographic(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double w = double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, (double)camera_state.ortho_width);
   double h = double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, w * ((double)NOVA64_HEIGHT / (double)NOVA64_WIDTH));
   camera_state.ortho_width  = (float)w;
   camera_state.ortho_height = (float)h;
   camera_state.is_ortho     = true;
   return JS_UNDEFINED;
}

/* setCameraPerspective() — restores perspective projection */
static JSValue js_set_camera_perspective(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   camera_state.is_ortho = false;
   return JS_UNDEFINED;
}

/* setSkyColor(topColor [, bottomColor])
   Sets a sky background color. In GLES mode the clear color is set to topColor.
   bottomColor is stored but the gradient is a future shader extension. */
static JSValue js_set_sky_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   sky_top_color    = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, sky_top_color);
   sky_bottom_color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, sky_top_color);
   sky_color_enabled = true;
   return JS_UNDEFINED;
}

/* clearSkyColor() — reverts to ambient-derived clear color */
static JSValue js_clear_sky_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   sky_color_enabled = false;
   return JS_UNDEFINED;
}

static JSValue js_get_sky_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue object = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, object, "enabled", JS_NewBool(ctx, sky_color_enabled));
   JS_SetPropertyStr(ctx, object, "top", JS_NewUint32(ctx, sky_top_color));
   JS_SetPropertyStr(ctx, object, "bottom", JS_NewUint32(ctx, sky_bottom_color));
   return object;
}

/* setSkybox(texHandle) — sets equirectangular skybox texture (GLES only).
   Software renderer ignores this and falls back to sky color. */
static JSValue js_set_skybox(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val;
   g_skybox_tex_handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   return JS_UNDEFINED;
}

/* clearSkybox() — disables the equirectangular skybox */
static JSValue js_clear_skybox(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   g_skybox_tex_handle = 0;
   return JS_UNDEFINED;
}

/* setMeshRoughness(handle, value) */
static JSValue js_set_mesh_roughness(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (mesh)
      mesh->roughness = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->roughness), 0.0, 1.0);
   return JS_UNDEFINED;
}

/* setMeshMetalness(handle, value) */
static JSValue js_set_mesh_metalness(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (mesh)
      mesh->metalness = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->metalness), 0.0, 1.0);
   return JS_UNDEFINED;
}

/* setMeshUVOffset(handle, u, v) */
static JSValue js_set_mesh_uv_offset(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (mesh) {
      mesh->uv_offset[0] = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->uv_offset[0]);
      mesh->uv_offset[1] = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, mesh->uv_offset[1]);
   }
   return JS_UNDEFINED;
}

/* setMeshUVScale(handle, u, v) */
static JSValue js_set_mesh_uv_scale(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (mesh) {
      mesh->uv_scale[0] = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->uv_scale[0]);
      mesh->uv_scale[1] = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, mesh->uv_scale[1]);
   }
   return JS_UNDEFINED;
}

/* setMeshBlend(handle, 'opaque'|'additive'|'multiply') */
static JSValue js_set_mesh_blend(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (mesh && argc > 1) {
      const char *mode = JS_ToCString(ctx, argv[1]);
      if (mode) {
         if (!strcmp(mode, "additive"))
            mesh->mesh_blend = NOVA64_MESH_BLEND_ADDITIVE;
         else if (!strcmp(mode, "multiply"))
            mesh->mesh_blend = NOVA64_MESH_BLEND_MULTIPLY;
         else
            mesh->mesh_blend = NOVA64_MESH_BLEND_OPAQUE;
         JS_FreeCString(ctx, mode);
      }
   }
   return JS_UNDEFINED;
}



static JSValue js_set_ambient_light(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   light_state.ambient = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, light_state.ambient);
   light_state.ambient_intensity = (float)clamp_double(
         double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, light_state.ambient_intensity),
         0.0, 4.0);
   return JS_UNDEFINED;
}

static JSValue js_set_light_direction(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   set_transform_vec3_from_args(ctx, argc, argv, 0, light_state.direction, false, false);
   return JS_UNDEFINED;
}

static JSValue js_set_light_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   light_state.color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, light_state.color);
   return JS_UNDEFINED;
}

static JSValue js_set_directional_light(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   set_transform_vec3_from_args(ctx, argc, argv, 0, light_state.direction, false, false);
   light_state.color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, light_state.color);
   light_state.intensity = (float)clamp_double(
         double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, light_state.intensity),
         0.0, 8.0);
   return JS_NewBool(ctx, true);
}

static JSValue js_set_fog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   light_state.fog_enabled = true;
   light_state.fog_color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, light_state.fog_color);
   light_state.fog_near = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, light_state.fog_near);
   light_state.fog_far = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, light_state.fog_far);
   return JS_UNDEFINED;
}

static JSValue js_clear_fog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx;
   (void)this_val;
   (void)argc;
   (void)argv;
   light_state.fog_enabled = false;
   return JS_UNDEFINED;
}

static JSValue js_create_point_light(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = allocate_point_light();
   struct nova64_point_light *light = point_light_from_handle(handle);
   if (!light)
      return JS_NewInt32(ctx, 0);

   light->color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, light->color);
   light->intensity = (float)clamp_double(
         double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, light->intensity),
         0.0, 16.0);

   if (argc > 2 && set_position_from_js(ctx, argv[2], light->position)) {
      light->distance = 20.0f;
   } else {
      light->distance = (float)clamp_double(
            double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, light->distance),
            0.0, 10000.0);
      if (argc > 3) {
         if (!set_position_from_js(ctx, argv[3], light->position)) {
            light->position[0] = (float)double_from_js(ctx, argv[3], light->position[0]);
            light->position[1] = (float)double_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, light->position[1]);
            light->position[2] = (float)double_from_js(ctx, argc > 5 ? argv[5] : JS_UNDEFINED, light->position[2]);
         }
      }
   }

   return JS_NewInt32(ctx, handle);
}

static JSValue js_set_point_light_position(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_point_light *light = point_light_from_handle(
         int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!light)
      return JS_NewBool(ctx, false);
   set_transform_vec3_from_args(ctx, argc, argv, 1, light->position, false, false);
   return JS_NewBool(ctx, true);
}

static JSValue js_set_point_light_color(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_point_light *light = point_light_from_handle(
         int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!light)
      return JS_NewBool(ctx, false);
   light->color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, light->color);
   if (argc > 2) {
      light->intensity = (float)clamp_double(double_from_js(ctx, argv[2], light->intensity),
            0.0, 16.0);
   }
   return JS_NewBool(ctx, true);
}

static JSValue js_remove_light(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_point_light *light = point_light_from_handle(handle);
   if (!light)
      return JS_NewBool(ctx, false);
   memset(light, 0, sizeof(*light));
   return JS_NewBool(ctx, true);
}

static JSValue js_clear_scene(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx;
   (void)this_val;
   (void)argc;
   (void)argv;
   clear_scene_objects();
   return JS_UNDEFINED;
}

static bool wav_parse(const char *data, size_t size,
                      const int16_t **out_pcm, size_t *out_frames,
                      size_t *out_channels, double *out_rate)
{
   /* Minimal RIFF/WAV parser — PCM format only */
   if (!data || size < 44) return false;
   if (memcmp(data, "RIFF", 4) != 0 || memcmp(data + 8, "WAVE", 4) != 0)
      return false;
   const uint8_t *b = (const uint8_t *)data;
   size_t pos = 12;
   uint16_t audio_fmt = 0, channels = 0, bps = 0;
   uint32_t sample_rate = 0;
   const int16_t *pcm = NULL;
   size_t pcm_bytes = 0;
   while (pos + 8 <= size) {
      uint32_t chunk_size = (uint32_t)b[pos+4] | ((uint32_t)b[pos+5]<<8) |
                            ((uint32_t)b[pos+6]<<16) | ((uint32_t)b[pos+7]<<24);
      if (memcmp(b + pos, "fmt ", 4) == 0 && chunk_size >= 16) {
         audio_fmt   = (uint16_t)(b[pos+8]  | (b[pos+9]  << 8));
         channels    = (uint16_t)(b[pos+10] | (b[pos+11] << 8));
         sample_rate = (uint32_t)(b[pos+12] | (b[pos+13]<<8) | (b[pos+14]<<16) | (b[pos+15]<<24));
         bps         = (uint16_t)(b[pos+22] | (b[pos+23] << 8));
      } else if (memcmp(b + pos, "data", 4) == 0) {
         pcm = (const int16_t *)(b + pos + 8);
         pcm_bytes = chunk_size;
         break;
      }
      pos += 8 + chunk_size + (chunk_size & 1);
   }
   if (audio_fmt != 1 || bps != 16 || !pcm || channels == 0 || sample_rate == 0)
      return false;
   *out_pcm      = pcm;
   *out_frames   = pcm_bytes / (channels * sizeof(int16_t));
   *out_channels = channels;
   *out_rate     = (double)sample_rate;
   return true;
}

/* Detect .ogg extension (case-insensitive last 4 chars) */
static bool path_is_ogg(const char *path)
{
   if (!path) return false;
   size_t len = strlen(path);
   if (len < 4) return false;
   const char *ext = path + len - 4;
   return (ext[0] == '.' &&
           (ext[1] == 'o' || ext[1] == 'O') &&
           (ext[2] == 'g' || ext[2] == 'G') &&
           (ext[3] == 'g' || ext[3] == 'G'));
}

/* Decode an OGG asset to a malloc'd int16 buffer.  Returns NULL on failure.
   *out_frames, *out_channels, *out_rate are set on success. */
static int16_t *ogg_decode_asset(const struct nova64_package_asset *asset,
                                  size_t *out_frames, size_t *out_channels, double *out_rate)
{
   int channels = 0, sample_rate = 0;
   short *decoded = NULL;
   int total_samples = stb_vorbis_decode_memory(
      (const unsigned char *)asset->data, (int)asset->size,
      &channels, &sample_rate, &decoded);
   if (total_samples <= 0 || !decoded || channels <= 0 || sample_rate <= 0) {
      if (decoded) free(decoded);
      return NULL;
   }
   *out_frames   = (size_t)total_samples;
   *out_channels = (size_t)channels;
   *out_rate     = (double)sample_rate;
   return (int16_t *)decoded;
}

static JSValue js_play_sound(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewBool(ctx, false);
   const char *path_str = JS_ToCString(ctx, argv[0]);
   if (!path_str) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path_str);
   bool is_ogg = path_is_ogg(path_str);
   JS_FreeCString(ctx, path_str);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewBool(ctx, false);

   double vol   = argc > 1 ? double_from_js(ctx, argv[1], 1.0) : 1.0;
   bool loop    = argc > 2 ? JS_ToBool(ctx, argv[2]) != 0 : false;
   const char *channel_name = argc > 3 ? JS_ToCString(ctx, argv[3]) : NULL;
   float pitch  = argc > 4 ? (float)double_from_js(ctx, argv[4], 1.0) : 1.0f;

   /* Find a free voice */
   size_t slot = 0;
   for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++) {
      if (!audio_voices[i].active) { slot = i; break; }
   }
   struct nova64_audio_voice *voice = &audio_voices[slot];
   /* Free any previously owned OGG buffer */
   if (voice->ogg_decoded_data) {
      free(voice->ogg_decoded_data);
      voice->ogg_decoded_data = NULL;
   }
   memset(voice, 0, sizeof(*voice));

   const int16_t *pcm = NULL;
   size_t frames = 0, channels = 1;
   double rate = NOVA64_SAMPLE_RATE;
   int16_t *owned = NULL;

   if (is_ogg) {
      owned = ogg_decode_asset(asset, &frames, &channels, &rate);
      if (!owned) return JS_NewBool(ctx, false);
      pcm = owned;
   } else if (!wav_parse((const char *)asset->data, asset->size, &pcm, &frames, &channels, &rate)) {
      /* Treat as raw int16 LE mono at 44100Hz */
      pcm      = (const int16_t *)asset->data;
      frames   = asset->size / sizeof(int16_t);
      channels = 1;
      rate     = NOVA64_SAMPLE_RATE;
   }
   if (frames == 0) {
      if (owned) free(owned);
      return JS_NewBool(ctx, false);
   }

   voice->active           = true;
   voice->wave             = NOVA64_AUDIO_PCM;
   voice->vol              = clamp_double(vol, 0.0, 1.0);
   voice->pcm_data         = pcm;
   voice->ogg_decoded_data = owned;
   voice->pcm_asset        = asset;
   voice->pcm_frames       = frames;
   voice->pcm_channels     = channels;
   voice->pcm_rate         = rate;
   voice->pcm_pos          = 0.0;
   voice->pcm_loop         = loop;
   voice->pitch            = (pitch > 0.01f && pitch < 100.0f) ? pitch : 1.0f;
   if (channel_name) {
      strncpy(voice->channel, channel_name, sizeof(voice->channel) - 1);
      JS_FreeCString(ctx, channel_name);
   } else {
      voice->channel[0] = '\0';
   }
   /* Return 1-based voice handle; backward-compat: non-zero is truthy like true */
   return JS_NewInt32(ctx, (int)(slot + 1));
}

static JSValue js_set_voice_pitch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   int handle = int_from_js(ctx, argv[0], 0);
   if (handle < 1 || handle > (int)NOVA64_AUDIO_MAX_VOICES) return JS_UNDEFINED;
   float pitch = (float)double_from_js(ctx, argv[1], 1.0);
   audio_voices[handle - 1].pitch = (pitch > 0.0f) ? pitch : 0.0f;
   return JS_UNDEFINED;
}

static JSValue js_stop_voice(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   int handle = int_from_js(ctx, argv[0], 0);
   if (handle < 1 || handle > (int)NOVA64_AUDIO_MAX_VOICES) return JS_UNDEFINED;
   audio_voices[handle - 1].active = false;
   return JS_UNDEFINED;
}

static JSValue js_get_voice_pitch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewFloat64(ctx, 0.0);
   int handle = int_from_js(ctx, argv[0], 0);
   if (handle < 1 || handle > (int)NOVA64_AUDIO_MAX_VOICES) return JS_NewFloat64(ctx, 0.0);
   return JS_NewFloat64(ctx, (double)audio_voices[handle - 1].pitch);
}

static JSValue js_get_voice_volume(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewFloat64(ctx, 0.0);
   int handle = int_from_js(ctx, argv[0], 0);
   if (handle < 1 || handle > (int)NOVA64_AUDIO_MAX_VOICES) return JS_NewFloat64(ctx, 0.0);
   return JS_NewFloat64(ctx, (double)audio_voices[handle - 1].vol);
}

static JSValue js_voice_active(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_FALSE;
   int handle = int_from_js(ctx, argv[0], 0);
   if (handle < 1 || handle > (int)NOVA64_AUDIO_MAX_VOICES) return JS_FALSE;
   return JS_NewBool(ctx, audio_voices[handle - 1].active);
}

static JSValue js_stop_sound(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1 || JS_IsUndefined(argv[0]) || JS_IsNull(argv[0])) {
      /* No args: stop all PCM voices */
      for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++) {
         if (audio_voices[i].active && audio_voices[i].wave == NOVA64_AUDIO_PCM)
            audio_voices[i].active = false;
      }
      return JS_NewBool(ctx, true);
   }
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   bool stopped = false;
   for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++) {
      if (audio_voices[i].active && audio_voices[i].wave == NOVA64_AUDIO_PCM &&
          audio_voices[i].pcm_asset == asset) {
         audio_voices[i].active = false;
         stopped = true;
      }
   }
   return JS_NewBool(ctx, stopped);
}

static JSValue js_stop_all_sounds(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++)
      audio_voices[i].active = false;
   return JS_UNDEFINED;
}

/* ---- Music playback API ---- */

static void music_stop_current(void)
{
   if (music_state.ogg_decoded_data) {
      free(music_state.ogg_decoded_data);
      music_state.ogg_decoded_data = NULL;
   }
   memset(&music_state, 0, sizeof(music_state));
   music_state.vol = 1.0f;
}

static JSValue js_play_music(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewBool(ctx, false);
   const char *path_str = JS_ToCString(ctx, argv[0]);
   if (!path_str) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path_str);
   bool is_ogg = path_is_ogg(path_str);
   JS_FreeCString(ctx, path_str);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewBool(ctx, false);

   double vol = argc > 1 ? double_from_js(ctx, argv[1], 1.0) : 1.0;

   music_stop_current();

   const int16_t *pcm = NULL;
   size_t frames = 0, channels = 1;
   double rate = NOVA64_SAMPLE_RATE;
   int16_t *owned = NULL;

   if (is_ogg) {
      owned = ogg_decode_asset(asset, &frames, &channels, &rate);
      if (!owned) return JS_NewBool(ctx, false);
      pcm = owned;
   } else if (!wav_parse((const char *)asset->data, asset->size, &pcm, &frames, &channels, &rate)) {
      pcm      = (const int16_t *)asset->data;
      frames   = asset->size / sizeof(int16_t);
      channels = 1;
      rate     = NOVA64_SAMPLE_RATE;
   }
   if (frames == 0) {
      if (owned) free(owned);
      return JS_NewBool(ctx, false);
   }

   music_state.active           = true;
   music_state.paused           = false;
   music_state.vol              = (float)clamp_double(vol, 0.0, 1.0);
   music_state.pcm_data         = pcm;
   music_state.ogg_decoded_data = owned;
   music_state.pcm_frames       = frames;
   music_state.pcm_channels     = channels;
   music_state.pcm_rate         = rate;
   music_state.pcm_pos          = 0.0;
   music_state.pcm_asset        = asset;
   return JS_NewBool(ctx, true);
}

static JSValue js_stop_music(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   music_stop_current();
   return JS_UNDEFINED;
}

static JSValue js_set_music_volume(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   music_state.vol = (float)clamp_double(double_from_js(ctx, argv[0], 1.0), 0.0, 1.0);
   return JS_UNDEFINED;
}

static JSValue js_pause_music(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   music_state.paused = true;
   return JS_UNDEFINED;
}

static JSValue js_resume_music(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (music_state.active)
      music_state.paused = false;
   return JS_UNDEFINED;
}

static JSValue js_music_active(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   return JS_NewBool(ctx, music_state.active);
}

/* ---- Blend 2D API ---- */

static JSValue js_set_blend_2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   const char *mode = JS_ToCString(ctx, argv[0]);
   if (!mode) return JS_UNDEFINED;
   if (strcmp(mode, "alpha") == 0)
      blend_2d_mode = NOVA64_BLEND_ALPHA;
   else if (strcmp(mode, "additive") == 0)
      blend_2d_mode = NOVA64_BLEND_ADDITIVE;
   else if (strcmp(mode, "multiply") == 0)
      blend_2d_mode = NOVA64_BLEND_MULTIPLY;
   else if (strcmp(mode, "screen") == 0)
      blend_2d_mode = NOVA64_BLEND_SCREEN;
   else
      blend_2d_mode = NOVA64_BLEND_NORMAL;
   JS_FreeCString(ctx, mode);
   return JS_UNDEFINED;
}

static const char *blend_2d_name(enum nova64_blend_mode mode)
{
   switch (mode) {
      case NOVA64_BLEND_ALPHA: return "alpha";
      case NOVA64_BLEND_ADDITIVE: return "additive";
      case NOVA64_BLEND_MULTIPLY: return "multiply";
      case NOVA64_BLEND_SCREEN: return "screen";
      case NOVA64_BLEND_NORMAL:
      default:
         return "normal";
   }
}

static JSValue js_get_blend_2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewString(ctx, blend_2d_name(blend_2d_mode));
}

static JSValue js_push_blend_2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (blend_stack_depth >= NOVA64_DRAW_STACK_MAX)
      return JS_NewBool(ctx, false);
   blend_stack[blend_stack_depth++] = blend_2d_mode;
   return JS_NewBool(ctx, true);
}

static JSValue js_pop_blend_2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (blend_stack_depth <= 0)
      return JS_NewBool(ctx, false);
   blend_2d_mode = blend_stack[--blend_stack_depth];
   return JS_NewBool(ctx, true);
}

static JSValue js_clear_blend_2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   blend_2d_mode = NOVA64_BLEND_NORMAL;
   return JS_UNDEFINED;
}

static JSValue js_set_palette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int index = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, -1);
   if (index < 0 || index >= 16)
      return JS_NewBool(ctx, false);
   draw_palette[index] = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, draw_palette[index]);
   return JS_NewBool(ctx, true);
}

static JSValue js_get_palette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int index = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, -1);
   if (index < 0 || index >= 16)
      return JS_NULL;
   return JS_NewUint32(ctx, draw_palette[index]);
}

static JSValue js_apply_palette_swap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int from = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, -1);
   int to = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, -1);
   if (from < 0 || from >= 16 || to < 0 || to >= 16) {
      palette_swap_enabled = false;
      return JS_NewBool(ctx, false);
   }
   palette_swap_from = draw_palette[from];
   palette_swap_to = draw_palette[to];
   palette_swap_enabled = true;
   return JS_NewBool(ctx, true);
}

static JSValue js_clear_palette_swap(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   palette_swap_enabled = false;
   return JS_UNDEFINED;
}

static JSValue js_reset_palette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   reset_palette_state();
   return JS_UNDEFINED;
}

static JSValue js_push_palette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   if (palette_stack_depth >= NOVA64_DRAW_STACK_MAX)
      return JS_NewBool(ctx, false);
   struct nova64_palette_state *state = &palette_stack[palette_stack_depth++];
   memcpy(state->colors, draw_palette, sizeof(draw_palette));
   state->swap_enabled = palette_swap_enabled;
   state->swap_from = palette_swap_from;
   state->swap_to = palette_swap_to;
   return JS_NewBool(ctx, true);
}

static JSValue js_pop_palette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (palette_stack_depth <= 0)
      return JS_NewBool(ctx, false);
   struct nova64_palette_state *state = &palette_stack[--palette_stack_depth];
   memcpy(draw_palette, state->colors, sizeof(draw_palette));
   palette_swap_enabled = state->swap_enabled;
   palette_swap_from = state->swap_from;
   palette_swap_to = state->swap_to;
   return JS_NewBool(ctx, true);
}

static JSValue js_get_draw_state(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue object = JS_NewObject(ctx);
   JSValue clip = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, clip, "active", JS_NewBool(ctx, clip_active));
   JS_SetPropertyStr(ctx, clip, "x", JS_NewInt32(ctx, clip_x));
   JS_SetPropertyStr(ctx, clip, "y", JS_NewInt32(ctx, clip_y));
   JS_SetPropertyStr(ctx, clip, "w", JS_NewInt32(ctx, clip_w));
   JS_SetPropertyStr(ctx, clip, "h", JS_NewInt32(ctx, clip_h));
   JS_SetPropertyStr(ctx, object, "clip", clip);

   JSValue camera = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, camera, "x", JS_NewInt32(ctx, cam2d_x));
   JS_SetPropertyStr(ctx, camera, "y", JS_NewInt32(ctx, cam2d_y));
   JS_SetPropertyStr(ctx, camera, "zoom", JS_NewFloat64(ctx, cam2d_zoom));
   JS_SetPropertyStr(ctx, camera, "rotation", JS_NewFloat64(ctx, cam2d_rotation));
   JS_SetPropertyStr(ctx, object, "camera2D", camera);

   JS_SetPropertyStr(ctx, object, "blend", JS_NewString(ctx, blend_2d_name(blend_2d_mode)));
   JSValue palette = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, palette, "swapEnabled", JS_NewBool(ctx, palette_swap_enabled));
   JS_SetPropertyStr(ctx, palette, "swapFrom", JS_NewUint32(ctx, palette_swap_from));
   JS_SetPropertyStr(ctx, palette, "swapTo", JS_NewUint32(ctx, palette_swap_to));
   JS_SetPropertyStr(ctx, object, "palette", palette);
   return object;
}

static JSValue js_clear_draw_state(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   clip_active = false;
   cam2d_x = cam2d_y = 0;
   cam2d_zoom = 1.0f;
   cam2d_rotation = 0.0f;
   blend_2d_mode = NOVA64_BLEND_NORMAL;
   palette_swap_enabled = false;
   clip_stack_depth = camera2d_stack_depth = blend_stack_depth = palette_stack_depth = 0;
   return JS_UNDEFINED;
}

static JSValue js_sfx(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_sfx_params params;
   audio_default_params(&params);

   if (argc > 0) {
      if (JS_IsNumber(argv[0])) {
         int preset_id = int_from_js(ctx, argv[0], -1);
         char preset_name[16];
         snprintf(preset_name, sizeof(preset_name), "%d", preset_id);
         audio_apply_preset(preset_name, &params);
         if (argc > 1)
            audio_apply_js_options(ctx, argv[1], &params);
      } else if (JS_IsString(argv[0])) {
         const char *preset_name = JS_ToCString(ctx, argv[0]);
         if (preset_name) {
            audio_apply_preset(preset_name, &params);
            JS_FreeCString(ctx, preset_name);
            if (argc > 1)
               audio_apply_js_options(ctx, argv[1], &params);
         }
      } else {
         audio_apply_js_options(ctx, argv[0], &params);
      }
   }

   int handle = audio_start_sfx(&params);
   return JS_NewInt32(ctx, handle);
}

static JSValue js_set_volume(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   audio_master_volume = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED,
         audio_master_volume), 0.0, 1.0);
   return JS_UNDEFINED;
}

/* draw3d(callback) — native host renders 3D automatically each frame. */
static JSValue js_draw3d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc > 0 && JS_IsFunction(ctx, argv[0])) {
      JSValue result = JS_Call(ctx, argv[0], JS_UNDEFINED, 0, NULL);
      if (JS_IsException(result))
         js_log_exception(ctx, "draw3d callback");
      else
         JS_FreeValue(ctx, result);
   }
   return JS_UNDEFINED;
}

/* —— Post-processing JS API —— */

static JSValue js_post_set_crt(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   post_state.crt_enabled = argc > 0 ? JS_ToBool(ctx, argv[0]) : true;
   return JS_UNDEFINED;
}

static JSValue js_post_set_vignette(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   post_state.vignette = (float)clamp_double(
      double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   return JS_UNDEFINED;
}

static JSValue js_post_set_pixelate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int size = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   post_state.pixelate = size < 0 ? 0 : size;
   return JS_UNDEFINED;
}

static JSValue js_post_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx;
   (void)this_val;
   (void)argc;
   (void)argv;
   reset_post_state();
   return JS_UNDEFINED;
}

static JSValue js_post_get_state(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   (void)argc;
   (void)argv;
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "crt", JS_NewBool(ctx, post_state.crt_enabled));
   JS_SetPropertyStr(ctx, obj, "vignette", JS_NewFloat64(ctx, (double)post_state.vignette));
   JS_SetPropertyStr(ctx, obj, "pixelate", JS_NewInt32(ctx, post_state.pixelate));
   JS_SetPropertyStr(ctx, obj, "bloom", JS_NewFloat64(ctx, (double)post_state.bloom));
   JS_SetPropertyStr(ctx, obj, "chromatic", JS_NewFloat64(ctx, (double)post_state.chromatic));
   JSValue grade = JS_NewArray(ctx);
   JS_SetPropertyUint32(ctx, grade, 0, JS_NewFloat64(ctx, (double)post_state.color_grade[0]));
   JS_SetPropertyUint32(ctx, grade, 1, JS_NewFloat64(ctx, (double)post_state.color_grade[1]));
   JS_SetPropertyUint32(ctx, grade, 2, JS_NewFloat64(ctx, (double)post_state.color_grade[2]));
   JS_SetPropertyStr(ctx, obj, "colorGrade", grade);
   JS_SetPropertyStr(ctx, obj, "posterize", JS_NewInt32(ctx, post_state.posterize));
   JS_SetPropertyStr(ctx, obj, "active", JS_NewBool(ctx, post_is_active()));
   JS_SetPropertyStr(ctx, obj, "fboReady", JS_NewBool(ctx, gles.post_resources_ready));
   return obj;
}

static JSValue js_post_set_bloom(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   post_state.bloom = (float)clamp_double(
      double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   return JS_UNDEFINED;
}

static JSValue js_post_set_chromatic(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   post_state.chromatic = (float)clamp_double(
      double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 0.1);
   return JS_UNDEFINED;
}

static JSValue js_post_set_color_grade(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   post_state.color_grade[0] = (float)clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 1.0), 0.0, 4.0);
   post_state.color_grade[1] = (float)clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0), 0.0, 4.0);
   post_state.color_grade[2] = (float)clamp_double(double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 1.0), 0.0, 4.0);
   return JS_UNDEFINED;
}

static JSValue js_post_set_posterize(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int levels = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   post_state.posterize = (levels < 2) ? 0 : (levels > 32 ? 32 : levels);
   return JS_UNDEFINED;
}

static JSValue js_set_mesh_emissive(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->emissive_color = color_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, mesh->emissive_color);
   mesh->emissive_intensity = (float)clamp_double(
      double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, (double)mesh->emissive_intensity), 0.0, 4.0);
   return JS_NewBool(ctx, true);
}

static JSValue js_set_mesh_alpha(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->opacity = (float)clamp_double(
      double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0), 0.0, 1.0);
   return JS_NewBool(ctx, true);
}

static JSValue js_create_texture(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return JS_NewInt32(ctx, 0);

   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path)
      return JS_NewInt32(ctx, 0);
   const struct nova64_package_asset *asset = find_package_asset(path);
   bool tex_is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewInt32(ctx, 0);

   int handle = allocate_texture();
   if (!handle)
      return JS_NewInt32(ctx, 0);
   struct nova64_texture *tex = texture_from_handle(handle);
   if (!tex)
      return JS_NewInt32(ctx, 0);

   uint8_t *png_pixels = NULL;
   const uint8_t *pixels = asset->data;
   int w = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   int h = argc > 2 ? int_from_js(ctx, argv[2], 0) : 0;

   if (tex_is_png) {
      int pw = 0, ph = 0;
      png_pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
      if (!png_pixels) return JS_NewInt32(ctx, 0);
      pixels = png_pixels;
      if (w <= 0) w = pw;
      if (h <= 0) h = ph;
   }
   if (w <= 0 || h <= 0) {
      int side = (int)sqrt((double)(asset->size / 4));
      w = side > 0 ? side : 1;
      h = side > 0 ? side : 1;
   }
   tex->width = w;
   tex->height = h;

   if (gles.active && gles.GenTextures && gles.BindTexture && gles.TexImage2D) {
      gles.GenTextures(1, &tex->gl_name);
      gles.ActiveTexture(GL_TEXTURE0);
      gles.BindTexture(GL_TEXTURE_2D, tex->gl_name);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
      gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
      gles.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, (GLsizei)w, (GLsizei)h, 0,
         GL_RGBA, GL_UNSIGNED_BYTE, pixels);
      gles.BindTexture(GL_TEXTURE_2D, 0);
   }
   free(png_pixels);
   return JS_NewInt32(ctx, handle);
}

static JSValue js_set_mesh_texture(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->texture_handle = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   return JS_NewBool(ctx, true);
}

static JSValue js_set_mesh_normal_map(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_mesh *mesh = mesh_from_handle(int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0));
   if (!mesh)
      return JS_NewBool(ctx, false);
   mesh->normal_map_handle = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   return JS_NewBool(ctx, true);
}

static JSValue js_destroy_texture(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx;
   (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_texture *tex = texture_from_handle(handle);
   if (!tex)
      return JS_NewBool(ctx, false);
   free_texture_gl(tex);
   memset(tex, 0, sizeof(*tex));
   return JS_NewBool(ctx, true);
}

/* ── Render targets (8A offscreen rendering) ─────────────────────────── */

static struct nova64_render_target *rt_from_handle(int handle)
{
   if (handle < 1 || handle > NOVA64_MAX_RENDER_TARGETS) return NULL;
   struct nova64_render_target *rt = &render_targets[handle - 1];
   return rt->used ? rt : NULL;
}

static void rt_destroy_gl(struct nova64_render_target *rt)
{
   if (!rt) return;
   /* Release borrowed texture handle */
   if (rt->texture_handle > 0) {
      struct nova64_texture *tex = texture_from_handle(rt->texture_handle);
      if (tex) memset(tex, 0, sizeof(*tex));
      rt->texture_handle = 0;
   }
   if (gles.active) {
      if (rt->fbo && gles.DeleteFramebuffers)
         gles.DeleteFramebuffers(1, &rt->fbo);
      if (rt->color_tex && gles.DeleteTextures)
         gles.DeleteTextures(1, &rt->color_tex);
      if (rt->depth_rbo && gles.DeleteRenderbuffers)
         gles.DeleteRenderbuffers(1, &rt->depth_rbo);
   }
   memset(rt, 0, sizeof(*rt));
}

static JSValue js_create_render_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int w = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 256);
   int h = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 256);
   if (w <= 0 || w > 2048) w = 256;
   if (h <= 0 || h > 2048) h = 256;

   /* Find free slot */
   int slot = -1;
   for (int i = 0; i < NOVA64_MAX_RENDER_TARGETS; i++) {
      if (!render_targets[i].used) { slot = i; break; }
   }
   if (slot < 0) return JS_NewInt32(ctx, 0);

   struct nova64_render_target *rt = &render_targets[slot];
   memset(rt, 0, sizeof(*rt));
   rt->used = true;
   rt->width = w;
   rt->height = h;

   if (!gles.active || !gles.GenFramebuffers || !gles.GenTextures || !gles.GenRenderbuffers)
      return JS_NewInt32(ctx, slot + 1); /* software mode: handle but no GL */

   /* Color texture */
   gles.GenTextures(1, &rt->color_tex);
   gles.BindTexture(GL_TEXTURE_2D, rt->color_tex);
   gles.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, NULL);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
   gles.BindTexture(GL_TEXTURE_2D, 0);

   /* Depth renderbuffer */
   gles.GenRenderbuffers(1, &rt->depth_rbo);
   gles.BindRenderbuffer(GL_RENDERBUFFER, rt->depth_rbo);
   gles.RenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT16, w, h);
   gles.BindRenderbuffer(GL_RENDERBUFFER, 0);

   /* FBO */
   gles.GenFramebuffers(1, &rt->fbo);
   gles.BindFramebuffer(GL_FRAMEBUFFER, rt->fbo);
   gles.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, rt->color_tex, 0);
   gles.FramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, rt->depth_rbo);
   GLenum status = gles.CheckFramebufferStatus(GL_FRAMEBUFFER);
   gles.BindFramebuffer(GL_FRAMEBUFFER, 0);

   if (status != GL_FRAMEBUFFER_COMPLETE) {
      rt_destroy_gl(rt);
      return JS_NewInt32(ctx, 0);
   }

   return JS_NewInt32(ctx, slot + 1);
}

static JSValue js_destroy_render_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_render_target *rt = rt_from_handle(handle);
   if (!rt) return JS_NewBool(ctx, false);
   rt_destroy_gl(rt);
   return JS_NewBool(ctx, true);
}

/* Forward declarations for render functions defined later */
static void render_gles_cube(const struct nova64_mesh *mesh, const float view_projection[16]);
static void render_gles_plane(const struct nova64_mesh *mesh, const float view_projection[16]);
static void render_gles_sphere(const struct nova64_mesh *mesh, const float view_projection[16]);
static void render_gles_capsule(const struct nova64_mesh *mesh, const float view_projection[16]);
static void render_gles_cylinder(const struct nova64_mesh *mesh, const float view_projection[16]);
static void render_gles_custom_mesh(struct nova64_mesh *mesh, const float view_projection[16]);
static void render_gles_instanced_mesh(const struct nova64_mesh *mesh, const float view_projection[16]);
static bool gles_any_cast_shadow_mesh(void);
static bool gles_init_shadow_resources(void);
static void build_shadow_light_vp(float out[16]);
static void render_gles_shadow_pass(const float light_vp[16]);
static bool gles_load_functions(void);
static bool gles_init_resources(void);
static void render_gles_skybox(const float view[16], const float projection[16]);

static void render_gles_scene_to_rt(struct nova64_render_target *rt)
{
   if (!gles.active || !rt->fbo) return;

   /* Optional shadow pass into existing shadow map */
   bool use_shadow = g_shadow_map_size > 0 && gles_any_cast_shadow_mesh()
      && gles_init_shadow_resources();
   if (use_shadow) {
      build_shadow_light_vp(g_shadow_light_vp);
      render_gles_shadow_pass(g_shadow_light_vp);
   }

   gles.BindFramebuffer(GL_FRAMEBUFFER, rt->fbo);
   gles.Viewport(0, 0, rt->width, rt->height);

   uint32_t clear_color = sky_color_enabled ? sky_top_color
      : color_with_intensity(light_state.ambient, light_state.ambient_intensity);
   gles.ClearColor(
      (float)((clear_color >> 24) & 0xffU) / 255.0f,
      (float)((clear_color >> 16) & 0xffU) / 255.0f,
      (float)((clear_color >>  8) & 0xffU) / 255.0f, 1.0f);
   gles.Enable(GL_DEPTH_TEST);
   gles.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

   float projection[16], view[16], view_projection[16];
   float up[3] = {0.0f, 1.0f, 0.0f};
   float aspect = (float)rt->width / (float)(rt->height > 0 ? rt->height : 1);
   if (camera_state.is_ortho) {
      float hw = camera_state.ortho_width  * 0.5f;
      float hh = camera_state.ortho_height * 0.5f;
      mat4_ortho(projection, -hw, hw, -hh, hh, 0.05f, 100.0f);
   } else {
      mat4_perspective(projection, camera_state.fov, aspect, 0.05f, 100.0f);
   }
   {
      float eye[3], tgt[3];
      float sx = (g_shake_intensity > 0.0f) ? (float)(perlin_noise_2d((double)frame_count * 0.31, 0.0) * g_shake_intensity) : 0.0f;
      float sy = (g_shake_intensity > 0.0f) ? (float)(perlin_noise_2d((double)frame_count * 0.31, 1.7) * g_shake_intensity) : 0.0f;
      eye[0] = camera_state.position[0] + sx; eye[1] = camera_state.position[1] + sy; eye[2] = camera_state.position[2];
      tgt[0] = camera_state.target[0]   + sx; tgt[1] = camera_state.target[1]   + sy; tgt[2] = camera_state.target[2];
      mat4_look_at(view, eye, tgt, up);
   }
   mat4_multiply(view_projection, projection, view);

   /* Draw equirectangular skybox behind all geometry (GLES only) */
   render_gles_skybox(view, projection);

   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (!meshes[i].used || !meshes[i].visible || meshes[i].opacity <= 0.0f) continue;
      if (meshes[i].type == NOVA64_MESH_CUBE)        render_gles_cube(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_PLANE)  render_gles_plane(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_SPHERE) render_gles_sphere(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_CAPSULE)  render_gles_capsule(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_CYLINDER) render_gles_cylinder(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_CUSTOM)      render_gles_custom_mesh(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_INSTANCED)   render_gles_instanced_mesh(&meshes[i], view_projection);
   }

   /* Restore default viewport */
   gles.Viewport(0, 0, NOVA64_WIDTH, NOVA64_HEIGHT);
   GLuint hw_fbo = hw_render.get_current_framebuffer ? hw_render.get_current_framebuffer() : 0;
   gles.BindFramebuffer(GL_FRAMEBUFFER, hw_fbo);
}

static JSValue js_render_scene_to_target(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_render_target *rt = rt_from_handle(handle);
   if (!rt || !gles.active || !rt->fbo) return JS_NewBool(ctx, false);
   if (!gles_load_functions() || !gles_init_resources()) return JS_NewBool(ctx, false);

   render_gles_scene_to_rt(rt);
   return JS_NewBool(ctx, true);
}

static JSValue js_render_target_as_texture(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_render_target *rt = rt_from_handle(handle);
   if (!rt) return JS_NewInt32(ctx, 0);

   /* Return cached texture handle */
   if (rt->texture_handle > 0) return JS_NewInt32(ctx, rt->texture_handle);

   /* Allocate a borrowed texture entry */
   int th = allocate_texture();
   if (!th) return JS_NewInt32(ctx, 0);
   struct nova64_texture *tex = texture_from_handle(th);
   tex->gl_name = rt->color_tex;
   tex->borrowed = true;
   tex->width = rt->width;
   tex->height = rt->height;
   rt->texture_handle = th;
   return JS_NewInt32(ctx, th);
}

static JSValue js_assets_has(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return JS_NewBool(ctx, false);

   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path)
      return JS_NewBool(ctx, false);
   bool found = find_package_asset(path) != NULL;
   JS_FreeCString(ctx, path);
   return JS_NewBool(ctx, found);
}

static JSValue js_assets_size(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return JS_NewInt32(ctx, -1);

   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path)
      return JS_NewInt32(ctx, -1);
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   return asset ? JS_NewInt64(ctx, (int64_t)asset->size) : JS_NewInt32(ctx, -1);
}

static JSValue js_assets_read_text(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   if (!asset)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   return JS_NewStringLen(ctx, (const char *)asset->data, asset->size);
}

static JSValue js_assets_read_json(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   if (!asset)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   JSValue parsed = JS_ParseJSON(ctx, (const char *)asset->data, asset->size, asset->path);
   if (JS_IsException(parsed)) {
      js_log_exception(ctx, "assets.readJSON");
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   }
   return parsed;
}

static JSValue js_assets_read_bytes(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return JS_NULL;

   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path)
      return JS_NULL;
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   if (!asset)
      return JS_NULL;
   return JS_NewArrayBufferCopy(ctx, asset->data, asset->size);
}

static JSValue js_assets_list(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   (void)argc;
   (void)argv;
   JSValue list = JS_NewObject(ctx);
   uint32_t index = 0;
   for (int i = 0; i < NOVA64_MAX_PACKAGE_ASSETS; i++) {
      if (!package_assets[i].used)
         continue;
      JS_SetPropertyUint32(ctx, list, index++, JS_NewString(ctx, package_assets[i].path));
   }
   JS_SetPropertyStr(ctx, list, "length", JS_NewUint32(ctx, index));
   return list;
}

static JSValue js_assets_quota(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue quota = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, quota, "used", JS_NewInt64(ctx, (int64_t)package_manifest_asset_bytes));
   JS_SetPropertyStr(ctx, quota, "max", JS_NewInt64(ctx, (int64_t)package_asset_quota_bytes));
   JS_SetPropertyStr(ctx, quota, "count", JS_NewUint32(ctx, (uint32_t)package_manifest_asset_count));
   JS_SetPropertyStr(ctx, quota, "missing", JS_NewUint32(ctx, (uint32_t)package_manifest_missing_asset_count));
   JS_SetPropertyStr(ctx, quota, "rejected", JS_NewUint32(ctx, (uint32_t)package_asset_quota_rejected_count));
   return quota;
}

static bool storage_effective_key(JSContext *ctx, JSValueConst this_val, JSValueConst key_value,
      char *out, size_t out_size)
{
   if (!out || out_size == 0)
      return false;
   const char *key = JS_ToCString(ctx, key_value);
   if (!key)
      return false;

   char prefix[96];
   prefix[0] = '\0';
   if (!JS_IsUndefined(this_val) && !JS_IsNull(this_val)) {
      JSValue prefix_value = JS_GetPropertyStr(ctx, this_val, "__prefix");
      if (!JS_IsUndefined(prefix_value) && !JS_IsNull(prefix_value)) {
         const char *raw_prefix = JS_ToCString(ctx, prefix_value);
         if (raw_prefix)
            sanitize_identifier(raw_prefix, prefix, sizeof(prefix), NULL);
         if (raw_prefix)
            JS_FreeCString(ctx, raw_prefix);
      }
      JS_FreeValue(ctx, prefix_value);
   }

   int written = prefix[0] ?
      snprintf(out, out_size, "%s__%s", prefix, key) :
      snprintf(out, out_size, "%s", key);
   JS_FreeCString(ctx, key);
   return written > 0 && (size_t)written < out_size;
}

static JSValue js_storage_save_data(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 2)
      return JS_NewBool(ctx, false);

   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return JS_NewBool(ctx, false);

   char path[2048];
   bool ok = storage_path_for_key(effective_key, path, sizeof(path));
   if (!ok)
      return JS_NewBool(ctx, false);

   JSValue json_value = JS_JSONStringify(ctx, argv[1], JS_UNDEFINED, JS_UNDEFINED);
   if (JS_IsException(json_value))
      return JS_NewBool(ctx, false);

   const char *json = JS_ToCString(ctx, json_value);
   if (!json) {
      JS_FreeValue(ctx, json_value);
      return JS_NewBool(ctx, false);
   }

   FILE *file = fopen(path, "wb");
   if (file) {
      size_t json_len = strlen(json);
      ok = fwrite(json, 1, json_len, file) == json_len;
      ok = fclose(file) == 0 && ok;
   } else {
      ok = false;
   }

   JS_FreeCString(ctx, json);
   JS_FreeValue(ctx, json_value);
   return JS_NewBool(ctx, ok);
}

/* Compressed storage: JSON + zlib deflate, stored in <key>.z files */
static JSValue js_storage_save_compressed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 2) return JS_NewBool(ctx, false);
   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return JS_NewBool(ctx, false);
   char path[2052];
   if (!storage_path_for_key(effective_key, path, sizeof(path) - 2))
      return JS_NewBool(ctx, false);
   strcat(path, ".z");

   JSValue json_value = JS_JSONStringify(ctx, argv[1], JS_UNDEFINED, JS_UNDEFINED);
   if (JS_IsException(json_value)) return JS_NewBool(ctx, false);
   const char *json = JS_ToCString(ctx, json_value);
   if (!json) { JS_FreeValue(ctx, json_value); return JS_NewBool(ctx, false); }

   size_t json_len = strlen(json);
   uLongf bound = compressBound((uLong)json_len) + 4;
   uint8_t *buf = (uint8_t *)malloc(bound);
   bool ok = false;
   if (buf) {
      /* 4-byte uncompressed length prefix (little-endian) */
      buf[0] = (uint8_t)(json_len & 0xff);
      buf[1] = (uint8_t)((json_len >> 8) & 0xff);
      buf[2] = (uint8_t)((json_len >> 16) & 0xff);
      buf[3] = (uint8_t)((json_len >> 24) & 0xff);
      uLongf clen = bound - 4;
      if (compress2(buf + 4, &clen, (const Bytef *)json, (uLong)json_len, Z_DEFAULT_COMPRESSION) == Z_OK) {
         FILE *f = fopen(path, "wb");
         if (f) {
            ok = fwrite(buf, 1, clen + 4, f) == clen + 4;
            fclose(f);
         }
      }
      free(buf);
   }
   JS_FreeCString(ctx, json);
   JS_FreeValue(ctx, json_value);
   return JS_NewBool(ctx, ok);
}

static JSValue js_storage_load_compressed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 1) return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   char path[2052];
   if (!storage_path_for_key(effective_key, path, sizeof(path) - 2))
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   strcat(path, ".z");

   size_t file_size = 0;
   uint8_t *raw = (uint8_t *)read_file_to_memory(path, &file_size);
   if (!raw || file_size < 4) {
      free(raw);
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   }
   uLongf json_len = (uLongf)(raw[0] | ((uint32_t)raw[1] << 8) | ((uint32_t)raw[2] << 16) | ((uint32_t)raw[3] << 24));
   if (json_len == 0 || json_len > 16 * 1024 * 1024) {
      free(raw); return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   }
   char *json = (char *)malloc(json_len + 1);
   if (!json) { free(raw); return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL; }
   uLongf dest_len = json_len;
   if (uncompress((Bytef *)json, &dest_len, raw + 4, (uLong)(file_size - 4)) != Z_OK || dest_len != json_len) {
      free(json); free(raw);
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   }
   json[json_len] = '\0';
   free(raw);
   JSValue parsed = JS_ParseJSON(ctx, json, json_len, path);
   free(json);
   if (JS_IsException(parsed)) {
      js_log_exception(ctx, "storage.loadCompressed");
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   }
   return parsed;
}

static JSValue js_storage_has_compressed(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 1) return JS_NewBool(ctx, false);
   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return JS_NewBool(ctx, false);
   char path[2052];
   if (!storage_path_for_key(effective_key, path, sizeof(path) - 2))
      return JS_NewBool(ctx, false);
   strcat(path, ".z");
   FILE *f = fopen(path, "rb");
   if (f) { fclose(f); return JS_NewBool(ctx, true); }
   return JS_NewBool(ctx, false);
}

static JSValue js_storage_load_data(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 1)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   char path[2048];
   bool ok = storage_path_for_key(effective_key, path, sizeof(path));
   if (!ok)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   size_t json_size = 0;
   char *json = read_file_to_memory(path, &json_size);
   if (!json)
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;

   JSValue parsed = JS_ParseJSON(ctx, json, json_size, path);
   free(json);
   if (JS_IsException(parsed)) {
      js_log_exception(ctx, "storage.loadData");
      return argc > 1 ? JS_DupValue(ctx, argv[1]) : JS_NULL;
   }
   return parsed;
}

static JSValue js_storage_delete_data(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 1)
      return JS_NewBool(ctx, false);

   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return JS_NewBool(ctx, false);

   char path[2048];
   bool ok = storage_path_for_key(effective_key, path, sizeof(path));
   if (!ok)
      return JS_NewBool(ctx, false);

   return JS_NewBool(ctx, remove(path) == 0);
}

static JSValue js_storage_has_data(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 1)
      return JS_NewBool(ctx, false);
   char effective_key[256];
   if (!storage_effective_key(ctx, this_val, argv[0], effective_key, sizeof(effective_key)))
      return JS_NewBool(ctx, false);
   char path[2048];
   bool ok = storage_path_for_key(effective_key, path, sizeof(path));
   if (!ok)
      return JS_NewBool(ctx, false);
   FILE *f = fopen(path, "rb");
   if (f) { fclose(f); return JS_NewBool(ctx, true); }
   return JS_NewBool(ctx, false);
}

#ifndef _WIN32
static JSValue js_storage_keys(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue arr = JS_NewArray(ctx);
   uint32_t idx = 0;

   if (!storage_cart_id[0])
      update_storage_cart_id();
   const char *cid = storage_cart_id[0] ? storage_cart_id : "cart";
   size_t cid_len = strlen(cid);

   char root[1200];
   if (!storage_root_dir(root, sizeof(root)))
      return arr;

   DIR *dir = opendir(root);
   if (!dir)
      return arr;

   struct dirent *entry;
   while ((entry = readdir(dir)) != NULL) {
      const char *name = entry->d_name;
      size_t name_len = strlen(name);
      /* Match: {cid}_{key}.json */
      if (name_len <= cid_len + 1 + 5)
         continue;
      if (strncmp(name, cid, cid_len) != 0 || name[cid_len] != '_')
         continue;
      if (strcmp(name + name_len - 5, ".json") != 0)
         continue;
      /* Extract the key portion */
      const char *key_start = name + cid_len + 1;
      size_t key_len = name_len - cid_len - 1 - 5;
      JSValue k = JS_NewStringLen(ctx, key_start, key_len);
      JS_SetPropertyUint32(ctx, arr, idx++, k);
   }
   closedir(dir);
   return arr;
}

static JSValue js_storage_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (!storage_cart_id[0])
      update_storage_cart_id();
   const char *cid = storage_cart_id[0] ? storage_cart_id : "cart";
   size_t cid_len = strlen(cid);

   char root[1200];
   if (!storage_root_dir(root, sizeof(root)))
      return JS_NewInt32(ctx, 0);

   DIR *dir = opendir(root);
   if (!dir)
      return JS_NewInt32(ctx, 0);

   int count = 0;
   struct dirent *entry;
   while ((entry = readdir(dir)) != NULL) {
      const char *name = entry->d_name;
      size_t name_len = strlen(name);
      if (name_len <= cid_len + 1 + 5)
         continue;
      if (strncmp(name, cid, cid_len) != 0 || name[cid_len] != '_')
         continue;
      if (strcmp(name + name_len - 5, ".json") != 0)
         continue;
      char fpath[2048];
      int plen = snprintf(fpath, sizeof(fpath), "%s%s%s", root, NOVA64_PATH_SEPARATOR, name);
      if (plen > 0 && (size_t)plen < sizeof(fpath)) {
         if (remove(fpath) == 0)
            count++;
      }
   }
   closedir(dir);
   return JS_NewInt32(ctx, count);
}
#else
/* Windows stubs — directory scanning not implemented for now */
static JSValue js_storage_keys(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewArray(ctx);
}
static JSValue js_storage_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, 0);
}
#endif

static void set_function(JSContext *ctx, JSValue object, const char *name, JSCFunction *fn, int length);

static JSValue js_storage_open(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1)
      return JS_NULL;
   const char *ns = JS_ToCString(ctx, argv[0]);
   if (!ns)
      return JS_NULL;
   char safe_ns[96];
   sanitize_identifier(ns, safe_ns, sizeof(safe_ns), NULL);
   JS_FreeCString(ctx, ns);
   if (!safe_ns[0])
      return JS_NULL;

   JSValue store = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, store, "__prefix", JS_NewString(ctx, safe_ns));
   set_function(ctx, store, "saveData", js_storage_save_data, 2);
   set_function(ctx, store, "loadData", js_storage_load_data, 2);
   set_function(ctx, store, "deleteData", js_storage_delete_data, 1);
   set_function(ctx, store, "saveJSON", js_storage_save_data, 2);
   set_function(ctx, store, "loadJSON", js_storage_load_data, 2);
   set_function(ctx, store, "remove", js_storage_delete_data, 1);
   set_function(ctx, store, "has", js_storage_has_data, 1);
   return store;
}

/* ---- Multi-channel audio control (8C) ---- */
static JSValue js_set_channel_volume(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   const char *name = JS_ToCString(ctx, argv[0]);
   if (!name) return JS_UNDEFINED;
   float vol = (float)clamp_double(double_from_js(ctx, argv[1], 1.0), 0.0, 1.0);
   channel_set_volume(name, vol);
   JS_FreeCString(ctx, name);
   return JS_UNDEFINED;
}

static JSValue js_get_channel_volume(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewFloat64(ctx, 1.0);
   const char *name = JS_ToCString(ctx, argv[0]);
   if (!name) return JS_NewFloat64(ctx, 1.0);
   float vol = channel_volume(name);
   JS_FreeCString(ctx, name);
   return JS_NewFloat64(ctx, vol);
}

static JSValue js_set_channel_pitch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   const char *name = JS_ToCString(ctx, argv[0]);
   if (!name) return JS_UNDEFINED;
   float pitch = (float)clamp_double(double_from_js(ctx, argv[1], 1.0), 0.01, 100.0);
   channel_set_pitch(name, pitch);
   JS_FreeCString(ctx, name);
   return JS_UNDEFINED;
}

static JSValue js_get_channel_pitch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewFloat64(ctx, 1.0);
   const char *name = JS_ToCString(ctx, argv[0]);
   if (!name) return JS_NewFloat64(ctx, 1.0);
   float pitch = channel_pitch(name);
   JS_FreeCString(ctx, name);
   return JS_NewFloat64(ctx, pitch);
}

static JSValue js_stop_channel(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   const char *name = JS_ToCString(ctx, argv[0]);
   if (!name) return JS_UNDEFINED;
   for (size_t i = 0; i < NOVA64_AUDIO_MAX_VOICES; i++)
      if (audio_voices[i].active && !strcmp(audio_voices[i].channel, name))
         audio_voices[i].active = false;
   JS_FreeCString(ctx, name);
   return JS_UNDEFINED;
}

/* ---- Scene hierarchy (8A) ---- */
static JSValue js_set_parent(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   int child_h  = int_from_js(ctx, argv[0], 0);
   int parent_h = int_from_js(ctx, argv[1], 0);
   struct nova64_mesh *child = (child_h > 0 && child_h <= NOVA64_MAX_MESHES) ? &meshes[child_h - 1] : NULL;
   if (!child || !child->used) return JS_UNDEFINED;
   /* Guard against self-parenting or simple cycles */
   if (parent_h == child_h) return JS_UNDEFINED;
   child->parent_handle = (parent_h > 0 && parent_h <= NOVA64_MAX_MESHES) ? parent_h : 0;
   return JS_UNDEFINED;
}

static JSValue js_clear_parent(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int h = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   struct nova64_mesh *mesh = (h > 0 && h <= NOVA64_MAX_MESHES) ? &meshes[h - 1] : NULL;
   if (mesh && mesh->used) mesh->parent_handle = 0;
   return JS_UNDEFINED;
}

static JSValue js_get_world_position(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int h = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   struct nova64_mesh *mesh = (h > 0 && h <= NOVA64_MAX_MESHES) ? &meshes[h - 1] : NULL;
   if (!mesh || !mesh->used) return JS_NULL;
   float mat[16];
   mat4_world_transform(mat, mesh);
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, mat[12]));
   JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, mat[13]));
   JS_SetPropertyStr(ctx, obj, "z", JS_NewFloat64(ctx, mat[14]));
   return obj;
}

/* ---- Storage versioning (8G) ---- */
static JSValue js_storage_version(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   char path[2048];
   if (!storage_path_for_key("__version", path, sizeof(path)))
      return JS_NewInt32(ctx, 0);
   size_t sz = 0;
   char *data = read_file_to_memory(path, &sz);
   if (!data) return JS_NewInt32(ctx, 0);
   int v = (int)strtol(data, NULL, 10);
   free(data);
   return JS_NewInt32(ctx, v);
}

static JSValue js_storage_set_version(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int v = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   char path[2048];
   if (!storage_path_for_key("__version", path, sizeof(path)))
      return JS_NewBool(ctx, false);
   char buf[32];
   snprintf(buf, sizeof(buf), "%d", v);
   FILE *f = fopen(path, "wb");
   if (!f) return JS_NewBool(ctx, false);
   fwrite(buf, 1, strlen(buf), f);
   fclose(f);
   return JS_NewBool(ctx, true);
}

/* ---- Rumble (8D) ---- */
static JSValue js_rumble(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   double strong = clamp_double(double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   double weak   = clamp_double(double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0.0), 0.0, 1.0);
   if (rumble_fn) {
      rumble_fn(0, 0 /* STRONG */, (uint16_t)(strong * 65535.0));
      rumble_fn(0, 1 /* WEAK */,   (uint16_t)(weak   * 65535.0));
   }
   return JS_UNDEFINED;
}

/* ---- Physics colliders (8H) ---- */
static JSValue js_create_collider(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *ts = JS_ToCString(ctx, argv[0]);
   if (!ts) return JS_NewInt32(ctx, 0);
   int type = (!strcmp(ts, "circle")) ? NOVA64_COLLIDER_CIRCLE : NOVA64_COLLIDER_BOX;
   JS_FreeCString(ctx, ts);
   int h = alloc_collider();
   if (!h) return JS_NewInt32(ctx, 0);
   struct nova64_collider *c = &g_colliders[h];
   c->type = type;
   if (type == NOVA64_COLLIDER_BOX) {
      c->w = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
      c->h = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, c->w);
   } else {
      c->w = c->h = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1.0);
   }
   return JS_NewInt32(ctx, h);
}

static JSValue js_set_collider_pos(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_collider *c = argc > 0 ? collider_ptr(int_from_js(ctx, argv[0], 0)) : NULL;
   if (!c || argc < 3) return JS_UNDEFINED;
   c->x = (float)double_from_js(ctx, argv[1], 0.0);
   c->y = (float)double_from_js(ctx, argv[2], 0.0);
   return JS_UNDEFINED;
}

static JSValue js_get_collider_pos(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_collider *c = argc > 0 ? collider_ptr(int_from_js(ctx, argv[0], 0)) : NULL;
   if (!c) return JS_NULL;
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x", JS_NewFloat64(ctx, c->x));
   JS_SetPropertyStr(ctx, obj, "y", JS_NewFloat64(ctx, c->y));
   return obj;
}

static JSValue js_check_collision(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_FALSE;
   struct nova64_collider *a = collider_ptr(int_from_js(ctx, argv[0], 0));
   struct nova64_collider *b = collider_ptr(int_from_js(ctx, argv[1], 0));
   return JS_NewBool(ctx, colliders_overlap(a, b));
}

static JSValue js_move_and_collide(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   struct nova64_collider *c = argc > 0 ? collider_ptr(int_from_js(ctx, argv[0], 0)) : NULL;
   if (!c || argc < 3) return JS_NULL;
   float dx = (float)double_from_js(ctx, argv[1], 0.0);
   float dy = (float)double_from_js(ctx, argv[2], 0.0);
   c->x += dx;
   c->y += dy;
   bool hit = false;
   if (argc > 3 && JS_IsArray(argv[3])) {
      JSValue lv = JS_GetPropertyStr(ctx, argv[3], "length");
      int len = 0;
      JS_ToInt32(ctx, &len, lv);
      JS_FreeValue(ctx, lv);
      for (int i = 0; i < len && !hit; i++) {
         JSValue ev = JS_GetPropertyUint32(ctx, argv[3], (uint32_t)i);
         struct nova64_collider *other = collider_ptr(int_from_js(ctx, ev, 0));
         JS_FreeValue(ctx, ev);
         if (other != c && colliders_overlap(c, other)) {
            hit = true;
            c->x -= dx;
            c->y -= dy;
         }
      }
   }
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "x",   JS_NewFloat64(ctx, c->x));
   JS_SetPropertyStr(ctx, obj, "y",   JS_NewFloat64(ctx, c->y));
   JS_SetPropertyStr(ctx, obj, "hit", JS_NewBool(ctx, hit));
   return obj;
}

static JSValue js_destroy_collider(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   struct nova64_collider *c = argc > 0 ? collider_ptr(int_from_js(ctx, argv[0], 0)) : NULL;
   if (c) memset(c, 0, sizeof(*c));
   return JS_UNDEFINED;
}

/* ── 2D particle system JS bindings ──────────────────────────── */

static JSValue js_create_particles2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   /* find free emitter slot */
   int slot = -1;
   for (int i = 0; i < NOVA64_MAX_EMITTERS; i++) {
      if (!g_emitters[i].used) { slot = i; break; }
   }
   if (slot < 0) return JS_NewInt32(ctx, 0);

   struct nova64_particle_emitter *em = &g_emitters[slot];
   memset(em, 0, sizeof(*em));
   em->used = 1;

   /* defaults */
   em->dir_x = 0.0f; em->dir_y = -1.0f; /* upward */
   em->spread = 0.5f;
   em->speed_min = 30.0f; em->speed_max = 80.0f;
   em->lifetime_min = 0.4f; em->lifetime_max = 1.0f;
   em->grav_x = 0.0f; em->grav_y = 200.0f;
   em->color_start = rgba8(255, 220, 60, 255);
   em->color_end   = rgba8(255, 60, 0, 0);
   em->size_start = 4.0f; em->size_end = 0.0f;
   em->rate = 0.0f;
   em->max_count = 64;
   em->active = 0;

/* Helper: read a float property from a JS object, returning def if absent */
#define EMOPT_F(key, field) do { \
   JSValue _v = JS_GetPropertyStr(ctx, obj, key); \
   if (!JS_IsUndefined(_v)) em->field = (float)double_from_js(ctx, _v, (double)em->field); \
   JS_FreeValue(ctx, _v); \
} while (0)
#define EMOPT_I(key, field) do { \
   JSValue _v = JS_GetPropertyStr(ctx, obj, key); \
   if (!JS_IsUndefined(_v)) em->field = int_from_js(ctx, _v, em->field); \
   JS_FreeValue(ctx, _v); \
} while (0)
#define EMOPT_C(key, field) do { \
   JSValue _v = JS_GetPropertyStr(ctx, obj, key); \
   if (!JS_IsUndefined(_v)) em->field = color_from_js(ctx, _v, em->field); \
   JS_FreeValue(ctx, _v); \
} while (0)

   /* parse opts object if provided */
   if (argc > 0 && JS_IsObject(argv[0])) {
      JSValue obj = argv[0];
      EMOPT_F("x",           x);          EMOPT_F("y",           y);
      EMOPT_F("dirX",        dir_x);      EMOPT_F("dirY",        dir_y);
      EMOPT_F("spread",      spread);
      EMOPT_F("speedMin",    speed_min);  EMOPT_F("speedMax",    speed_max);
      EMOPT_F("lifetimeMin", lifetime_min); EMOPT_F("lifetimeMax", lifetime_max);
      EMOPT_F("gravX",       grav_x);     EMOPT_F("gravY",       grav_y);
      EMOPT_C("color",       color_start); EMOPT_C("colorEnd",   color_end);
      EMOPT_F("size",        size_start); EMOPT_F("sizeEnd",     size_end);
      EMOPT_F("rate",        rate);       EMOPT_I("maxCount",    max_count);
   }
#undef EMOPT_F
#undef EMOPT_I
#undef EMOPT_C

   return JS_NewInt32(ctx, slot + 1); /* 1-based handle */
}

static JSValue js_emit_particles2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int count  = argc > 1 ? int_from_js(ctx, argv[1], 1) : 1;
   int e_idx = handle - 1;
   if (e_idx < 0 || e_idx >= NOVA64_MAX_EMITTERS || !g_emitters[e_idx].used)
      return JS_UNDEFINED;
   if (count > NOVA64_MAX_PARTICLES) count = NOVA64_MAX_PARTICLES;
   for (int i = 0; i < count; i++) spawn_particle(e_idx);
   return JS_UNDEFINED;
}

static JSValue js_set_emitter_pos2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int e_idx = handle - 1;
   if (e_idx < 0 || e_idx >= NOVA64_MAX_EMITTERS || !g_emitters[e_idx].used)
      return JS_UNDEFINED;
   if (argc > 1) g_emitters[e_idx].x = (float)double_from_js(ctx, argv[1], 0.0);
   if (argc > 2) g_emitters[e_idx].y = (float)double_from_js(ctx, argv[2], 0.0);
   return JS_UNDEFINED;
}

static JSValue js_set_emitter_active2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int e_idx = handle - 1;
   if (e_idx < 0 || e_idx >= NOVA64_MAX_EMITTERS || !g_emitters[e_idx].used)
      return JS_UNDEFINED;
   if (argc > 1) g_emitters[e_idx].active = JS_ToBool(ctx, argv[1]) ? 1 : 0;
   return JS_UNDEFINED;
}

static JSValue js_destroy_particles2d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   int e_idx = handle - 1;
   if (e_idx < 0 || e_idx >= NOVA64_MAX_EMITTERS) return JS_UNDEFINED;
   memset(&g_emitters[e_idx], 0, sizeof(g_emitters[e_idx]));
   return JS_UNDEFINED;
}

static JSValue js_update_particles(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx;
   float dt = argc > 0 ? (float)double_from_js(ctx, argv[0], 0.0) : 0.0f;
   if (dt <= 0.0f) return JS_UNDEFINED;

   /* continuous emitters */
   for (int e = 0; e < NOVA64_MAX_EMITTERS; e++) {
      struct nova64_particle_emitter *em = &g_emitters[e];
      if (!em->used || !em->active || em->rate <= 0.0f) continue;
      em->rate_accum += em->rate * dt;
      int to_spawn = (int)em->rate_accum;
      em->rate_accum -= (float)to_spawn;
      for (int i = 0; i < to_spawn; i++) spawn_particle(e);
   }

   /* advance particles */
   for (int i = 0; i < NOVA64_MAX_PARTICLES; i++) {
      struct nova64_particle *p = &g_particles[i];
      if (!p->active) continue;
      p->age += dt;
      if (p->age >= p->lifetime) { p->active = 0; continue; }
      /* find owning emitter for gravity (use slot 0 gravity as default) */
      float gx = 0.0f, gy = 200.0f;
      for (int e = 0; e < NOVA64_MAX_EMITTERS; e++) {
         if (g_emitters[e].used) { gx = g_emitters[e].grav_x; gy = g_emitters[e].grav_y; break; }
      }
      /* for simplicity, apply global average gravity from active emitters */
      /* (particles don't track their source emitter to keep struct small) */
      p->vx += gx * dt;
      p->vy += gy * dt;
      p->x  += p->vx * dt;
      p->y  += p->vy * dt;
   }
   return JS_UNDEFINED;
}

static JSValue js_draw_particles(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx; (void)argc; (void)argv;
   for (int i = 0; i < NOVA64_MAX_PARTICLES; i++) {
      struct nova64_particle *p = &g_particles[i];
      if (!p->active) continue;
      float t = (p->lifetime > 0.0f) ? (p->age / p->lifetime) : 1.0f;
      uint32_t color = particle_lerp_color(p->color_start, p->color_end, t);
      /* skip fully transparent */
      if ((color & 0xffu) == 0) continue;
      float size = p->size_start + (p->size_end - p->size_start) * t;
      int r = (size > 0.5f) ? (int)(size + 0.5f) : 0;
      int cx = (int)(p->x + 0.5f), cy = (int)(p->y + 0.5f);
      draw_circle_pixels(cx, cy, r, color, true);
   }
   return JS_UNDEFINED;
}

static JSValue js_get_particle_count(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)ctx; (void)argc; (void)argv;
   int count = 0;
   for (int i = 0; i < NOVA64_MAX_PARTICLES; i++)
      if (g_particles[i].active) count++;
   return JS_NewInt32(ctx, count);
}

/* ── Storage: cartIds ─────────────────────────────────────── */
#ifndef _WIN32
static JSValue js_storage_cart_ids(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue arr = JS_NewArray(ctx);
   uint32_t arr_idx = 0;
   char root[1200];
   if (!storage_root_dir(root, sizeof(root)))
      return arr;
   DIR *dir = opendir(root);
   if (!dir) return arr;
   char seen[32][128];
   int seen_count = 0;
   struct dirent *entry;
   while ((entry = readdir(dir)) != NULL) {
      const char *name = entry->d_name;
      size_t name_len = strlen(name);
      if (name_len < 7) continue;
      if (strcmp(name + name_len - 5, ".json") != 0) continue;
      const char *sep = strchr(name, '_');
      if (!sep) continue;
      size_t cid_len = (size_t)(sep - name);
      if (cid_len == 0 || cid_len >= 128) continue;
      bool found = false;
      for (int s = 0; s < seen_count; s++) {
         if (strlen(seen[s]) == cid_len && strncmp(seen[s], name, cid_len) == 0) { found = true; break; }
      }
      if (!found && seen_count < 32) {
         strncpy(seen[seen_count], name, cid_len);
         seen[seen_count][cid_len] = '\0';
         seen_count++;
         JS_SetPropertyUint32(ctx, arr, arr_idx++, JS_NewStringLen(ctx, name, cid_len));
      }
   }
   closedir(dir);
   return arr;
}
#else
static JSValue js_storage_cart_ids(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv; (void)ctx;
   return JS_NewArray(ctx);
}
#endif

/* ── 3D Raycast ───────────────────────────────────────────── */
static JSValue js_raycast(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 6) return JS_NULL;
   float ox = (float)double_from_js(ctx, argv[0], 0.0);
   float oy = (float)double_from_js(ctx, argv[1], 0.0);
   float oz = (float)double_from_js(ctx, argv[2], 0.0);
   float dx = (float)double_from_js(ctx, argv[3], 0.0);
   float dy = (float)double_from_js(ctx, argv[4], 0.0);
   float dz = (float)double_from_js(ctx, argv[5], 0.0);
   float max_dist = (float)double_from_js(ctx, argc > 6 ? argv[6] : JS_UNDEFINED, 1000.0);

   float dl = sqrtf(dx*dx + dy*dy + dz*dz);
   if (dl < 1e-6f) return JS_NULL;
   dx /= dl; dy /= dl; dz /= dl;

   float best_t = max_dist;
   int best_i = -1;
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (!meshes[i].used) continue;
      float cx = meshes[i].position[0] - ox;
      float cy = meshes[i].position[1] - oy;
      float cz = meshes[i].position[2] - oz;
      float r = (fabsf(meshes[i].scale[0]) + fabsf(meshes[i].scale[1]) + fabsf(meshes[i].scale[2])) / 6.0f;
      if (r < 1e-4f) r = 0.5f;
      float b = cx*dx + cy*dy + cz*dz;
      float c2 = cx*cx + cy*cy + cz*cz - r*r;
      float disc = b*b - c2;
      if (disc < 0.0f) continue;
      float sq = sqrtf(disc);
      float t = b - sq;
      if (t < 0.0f) t = b + sq;
      if (t < 0.0f || t >= best_t) continue;
      best_t = t;
      best_i = i;
   }
   if (best_i < 0) return JS_NULL;

   float hx = ox + dx * best_t;
   float hy = oy + dy * best_t;
   float hz = oz + dz * best_t;
   float nx = hx - meshes[best_i].position[0];
   float ny = hy - meshes[best_i].position[1];
   float nz = hz - meshes[best_i].position[2];
   float nl = sqrtf(nx*nx + ny*ny + nz*nz);
   if (nl > 1e-6f) { nx /= nl; ny /= nl; nz /= nl; }

   JSValue result = JS_NewObject(ctx);
   JSValue point  = JS_NewObject(ctx);
   JSValue normal = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, result, "handle",   JS_NewInt32(ctx, best_i + 1));
   JS_SetPropertyStr(ctx, result, "distance", JS_NewFloat64(ctx, (double)best_t));
   JS_SetPropertyStr(ctx, point,  "x", JS_NewFloat64(ctx, (double)hx));
   JS_SetPropertyStr(ctx, point,  "y", JS_NewFloat64(ctx, (double)hy));
   JS_SetPropertyStr(ctx, point,  "z", JS_NewFloat64(ctx, (double)hz));
   JS_SetPropertyStr(ctx, result, "point",  point);
   JS_SetPropertyStr(ctx, normal, "x", JS_NewFloat64(ctx, (double)nx));
   JS_SetPropertyStr(ctx, normal, "y", JS_NewFloat64(ctx, (double)ny));
   JS_SetPropertyStr(ctx, normal, "z", JS_NewFloat64(ctx, (double)nz));
   JS_SetPropertyStr(ctx, result, "normal", normal);
   return result;
}

/* ── Bitmap font functions ───────────────────────────────── */
static JSValue js_load_font(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewInt32(ctx, 0);
   int glyph_w = argc > 1 ? int_from_js(ctx, argv[1], 8) : 8;
   int glyph_h = argc > 2 ? int_from_js(ctx, argv[2], 8) : 8;
   if (glyph_w < 1) glyph_w = 1;
   if (glyph_h < 1) glyph_h = 1;

   const struct nova64_package_asset *asset = find_package_asset(path);
   bool is_png = path_is_png(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewInt32(ctx, 0);

   int pw = 0, ph = 0;
   uint8_t *pixels = NULL;
   if (is_png) {
      pixels = decode_png_asset(asset->data, asset->size, &pw, &ph);
   } else {
      int side = (int)sqrt((double)(asset->size / 4));
      pw = side > 0 ? side : 1;
      ph = (int)((asset->size / 4) / (size_t)(unsigned)pw);
      if (ph < 1) ph = 1;
      pixels = (uint8_t *)malloc(asset->size);
      if (pixels) memcpy(pixels, asset->data, asset->size);
   }
   if (!pixels || pw < glyph_w || ph < glyph_h) { free(pixels); return JS_NewInt32(ctx, 0); }

   for (int i = 0; i < NOVA64_MAX_FONTS; i++) {
      if (!g_fonts[i].active) {
         g_fonts[i].active  = true;
         g_fonts[i].pixels  = pixels;
         g_fonts[i].glyph_w = glyph_w;
         g_fonts[i].glyph_h = glyph_h;
         g_fonts[i].atlas_w = pw;
         g_fonts[i].atlas_h = ph;
         return JS_NewInt32(ctx, i + 1);
      }
   }
   free(pixels);
   return JS_NewInt32(ctx, 0);
}

static JSValue js_print_font(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 5) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int wx = int_from_js(ctx, argv[1], 0);
   int wy = int_from_js(ctx, argv[2], 0);
   uint32_t color = color_from_js(ctx, argv[3], rgba8(255, 255, 255, 255));
   int handle = int_from_js(ctx, argv[4], 0);

   struct nova64_bitmap_font *fnt = (handle >= 1 && handle <= NOVA64_MAX_FONTS && g_fonts[handle-1].active)
      ? &g_fonts[handle - 1] : NULL;
   if (!fnt) { JS_FreeCString(ctx, text); return JS_UNDEFINED; }

   int screen_x, screen_y;
   transform_2d_point(wx, wy, &screen_x, &screen_y);

   float cr = (float)((color >> 24) & 0xff) / 255.0f;
   float cg = (float)((color >> 16) & 0xff) / 255.0f;
   float cb = (float)((color >>  8) & 0xff) / 255.0f;
   float ca = (float)( color        & 0xff) / 255.0f;
   int cols = fnt->atlas_w / fnt->glyph_w;
   int rows = fnt->atlas_h / fnt->glyph_h;
   int total_glyphs = cols * rows;

   int cx_pos = screen_x;
   for (const char *p = text; *p; p++) {
      int ch = (unsigned char)*p - 32;
      if (ch < 0 || ch >= total_glyphs) { cx_pos += fnt->glyph_w; continue; }
      int gc = ch % cols;
      int gr = ch / cols;
      int src_x = gc * fnt->glyph_w;
      int src_y = gr * fnt->glyph_h;
      for (int gy = 0; gy < fnt->glyph_h; gy++) {
         for (int gx = 0; gx < fnt->glyph_w; gx++) {
            int px = cx_pos + gx, py = screen_y + gy;
            if (px < 0 || py < 0 || px >= NOVA64_WIDTH || py >= NOVA64_HEIGHT) continue;
            size_t si = ((size_t)(src_y + gy) * (size_t)fnt->atlas_w + (size_t)(src_x + gx)) * 4;
            float fr = fnt->pixels[si  ] / 255.0f;
            float fg = fnt->pixels[si+1] / 255.0f;
            float fb = fnt->pixels[si+2] / 255.0f;
            float fa = fnt->pixels[si+3] / 255.0f * ca;
            if (fa < 0.004f) continue;
            float inv_fa = 1.0f - fa;
            uint32_t dst = framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px];
            uint8_t nr = (uint8_t)(fr * cr * fa * 255.0f + (float)((dst >> 24) & 0xff) * inv_fa);
            uint8_t ng = (uint8_t)(fg * cg * fa * 255.0f + (float)((dst >> 16) & 0xff) * inv_fa);
            uint8_t nb = (uint8_t)(fb * cb * fa * 255.0f + (float)((dst >>  8) & 0xff) * inv_fa);
            framebuffer[(size_t)py * NOVA64_WIDTH + (size_t)px] = rgba8(nr, ng, nb, 255);
         }
      }
      cx_pos += fnt->glyph_w;
   }
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

static JSValue js_destroy_font(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = argc > 0 ? int_from_js(ctx, argv[0], 0) : 0;
   if (handle >= 1 && handle <= NOVA64_MAX_FONTS && g_fonts[handle-1].active) {
      free(g_fonts[handle-1].pixels);
      memset(&g_fonts[handle-1], 0, sizeof(g_fonts[handle-1]));
   }
   return JS_UNDEFINED;
}

/* ── Resolution query ────────────────────────────────────── */
static JSValue js_get_resolution(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue obj = JS_NewObject(ctx);
   JS_SetPropertyStr(ctx, obj, "width",  JS_NewInt32(ctx, NOVA64_WIDTH));
   JS_SetPropertyStr(ctx, obj, "height", JS_NewInt32(ctx, NOVA64_HEIGHT));
   return obj;
}

/* ── Audio echo / delay (8C batch4) ───────────────────── */
static JSValue js_set_echo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   double delay_sec = double_from_js(ctx, argv[0], 0.3);
   echo_decay = (float)clamp_double(argc > 1 ? double_from_js(ctx, argv[1], 0.5) : 0.5, 0.0, 0.99);
   echo_wet   = (float)clamp_double(argc > 2 ? double_from_js(ctx, argv[2], 0.5) : 0.5, 0.0, 1.0);
   int frames = (int)(delay_sec * NOVA64_SAMPLE_RATE);
   if (frames < 1) frames = 1;
   if (frames >= NOVA64_ECHO_BUF_SIZE) frames = NOVA64_ECHO_BUF_SIZE - 1;
   echo_delay_frames = frames;
   return JS_UNDEFINED;
}

static JSValue js_clear_echo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv; (void)ctx;
   echo_delay_frames = 0;
   memset(echo_buf, 0, sizeof(echo_buf));
   echo_write_pos = 0;
   return JS_UNDEFINED;
}

/* ── Positional 3D audio (8C batch4) ─────────────────── */
static JSValue js_set_listener_pos(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc >= 3) {
      listener_pos[0] = (float)double_from_js(ctx, argv[0], 0.0);
      listener_pos[1] = (float)double_from_js(ctx, argv[1], 0.0);
      listener_pos[2] = (float)double_from_js(ctx, argv[2], 0.0);
   }
   return JS_UNDEFINED;
}

static JSValue js_play_sound_3d(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   /* playSound3D(path, x, y, z [, vol [, maxDist]]) */
   if (argc < 4) return JS_NewBool(ctx, false);
   float sx = (float)double_from_js(ctx, argv[1], 0.0);
   float sy = (float)double_from_js(ctx, argv[2], 0.0);
   float sz = (float)double_from_js(ctx, argv[3], 0.0);
   double vol_arg = argc > 4 ? double_from_js(ctx, argv[4], 1.0) : 1.0;
   double max_dist = argc > 5 ? double_from_js(ctx, argv[5], 10.0) : 10.0;
   if (max_dist < 0.001) max_dist = 0.001;

   float dx = sx - listener_pos[0];
   float dy = sy - listener_pos[1];
   float dz = sz - listener_pos[2];
   double dist = sqrt((double)dx*dx + (double)dy*dy + (double)dz*dz);
   double vol_scale = clamp_double(1.0 - dist / max_dist, 0.0, 1.0);
   if (vol_scale < 0.001) return JS_NewBool(ctx, false); /* inaudible */

   /* Pan based on relative X direction from listener */
   double raw_pan = clamp_double((double)dx / max_dist, -1.0, 1.0);

   /* Build argv subset for js_play_sound: (path, vol_scaled, loop?, channel?) */
   JSValue call_argv[4];
   call_argv[0] = argv[0];
   call_argv[1] = JS_NewFloat64(ctx, vol_arg * vol_scale);
   call_argv[2] = JS_NewBool(ctx, false);
   call_argv[3] = JS_UNDEFINED;
   JSValue result = js_play_sound(ctx, JS_UNDEFINED, 3, call_argv);
   JS_FreeValue(ctx, call_argv[1]);

   /* Patch the most recently activated voice with the computed pan */
   for (int v = (int)NOVA64_AUDIO_MAX_VOICES - 1; v >= 0; v--) {
      if (audio_voices[v].active && audio_voices[v].pan == 0.0f &&
            audio_voices[v].wave == NOVA64_AUDIO_PCM && audio_voices[v].pcm_pos < 2.0) {
         audio_voices[v].pan = (float)raw_pan;
         break;
      }
   }
   return result;
}

/* ── RetroAchievements cart RAM peek/poke ─────────────── */
static JSValue js_cheevos_peek(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_NewInt32(ctx, 0);
   uint32_t addr;
   if (JS_ToUint32(ctx, &addr, argv[0])) return JS_NewInt32(ctx, 0);
   if (addr >= NOVA64_CHEEVOS_RAM_SIZE) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, g_cheevos_ram[addr]);
}

static JSValue js_cheevos_poke(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 2) return JS_UNDEFINED;
   uint32_t addr, val;
   if (JS_ToUint32(ctx, &addr, argv[0])) return JS_UNDEFINED;
   if (JS_ToUint32(ctx, &val,  argv[1])) return JS_UNDEFINED;
   if (addr >= NOVA64_CHEEVOS_RAM_SIZE) return JS_UNDEFINED;
   g_cheevos_ram[addr] = (uint8_t)(val & 0xFF);
   return JS_UNDEFINED;
}

static JSValue js_cheevos_ram_size(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   return JS_NewInt32(ctx, NOVA64_CHEEVOS_RAM_SIZE);
}

/* ── Developer mode (8I batch4) ──────────────────────── */
static JSValue js_is_developer_mode(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   if (!g_developer_mode && environ_cb) {
      struct retro_variable v;
      v.key = "nova64_developer_mode";
      v.value = NULL;
      if (environ_cb(RETRO_ENVIRONMENT_GET_VARIABLE, &v) && v.value)
         g_developer_mode = (v.value[0] == 'e'); /* "enable" */
   }
   return JS_NewBool(ctx, g_developer_mode);
}

/* ── Developer console (8J) ───────────────────────────────────────── */
static JSValue js_dev_console_print(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 1) return JS_UNDEFINED;
   const char *text = JS_ToCString(ctx, argv[0]);
   if (!text) return JS_UNDEFINED;
   int idx = (g_dev_con_head + g_dev_con_count) % NOVA64_DEV_CON_LINES;
   if (g_dev_con_count < NOVA64_DEV_CON_LINES) {
      g_dev_con_count++;
   } else {
      g_dev_con_head = (g_dev_con_head + 1) % NOVA64_DEV_CON_LINES;
   }
   strncpy(g_dev_con[idx], text, NOVA64_DEV_CON_COLS - 1);
   g_dev_con[idx][NOVA64_DEV_CON_COLS - 1] = '\0';
   JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
}

static JSValue js_dev_console_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)ctx; (void)this_val; (void)argc; (void)argv;
   g_dev_con_count = 0;
   g_dev_con_head  = 0;
   return JS_UNDEFINED;
}

static JSValue js_dev_console_get_lines(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val; (void)argc; (void)argv;
   JSValue arr = JS_NewArray(ctx);
   for (int i = 0; i < g_dev_con_count; i++) {
      int ridx = (g_dev_con_head + i) % NOVA64_DEV_CON_LINES;
      JS_SetPropertyUint32(ctx, arr, (uint32_t)i, JS_NewString(ctx, g_dev_con[ridx]));
   }
   return arr;
}

/* ── Custom mesh geometry (8E/M8) ────────────────────────────────── */
static float read_float_from_js_arr(JSContext *ctx, JSValueConst arr, unsigned ai)
{
   JSValue v = JS_GetPropertyUint32(ctx, arr, ai);
   double d = 0.0;
   JS_ToFloat64(ctx, &d, v);
   JS_FreeValue(ctx, v);
   return (float)d;
}

static JSValue js_create_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewInt32(ctx, 0);
   JSValue len_val = JS_GetPropertyStr(ctx, argv[0], "length");
   uint32_t pos_len = 0;
   JS_ToUint32(ctx, &pos_len, len_val);
   JS_FreeValue(ctx, len_val);
   if (pos_len == 0 || pos_len % 3 != 0) return JS_NewInt32(ctx, 0);
   unsigned vert_count = pos_len / 3;
   JSValue idx_len_val = JS_GetPropertyStr(ctx, argv[2], "length");
   uint32_t idx_len = 0;
   JS_ToUint32(ctx, &idx_len, idx_len_val);
   JS_FreeValue(ctx, idx_len_val);
   if (idx_len == 0 || idx_len % 3 != 0) return JS_NewInt32(ctx, 0);
   int handle = allocate_mesh(NOVA64_MESH_CUSTOM);
   if (!handle) return JS_NewInt32(ctx, 0);
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   float *verts = (float *)malloc(vert_count * 6 * sizeof(float));
   if (!verts) { mesh->used = false; return JS_NewInt32(ctx, 0); }
   for (unsigned vi = 0; vi < vert_count; vi++) {
      verts[vi*6+0] = read_float_from_js_arr(ctx, argv[0], vi*3+0);
      verts[vi*6+1] = read_float_from_js_arr(ctx, argv[0], vi*3+1);
      verts[vi*6+2] = read_float_from_js_arr(ctx, argv[0], vi*3+2);
      verts[vi*6+3] = read_float_from_js_arr(ctx, argv[1], vi*3+0);
      verts[vi*6+4] = read_float_from_js_arr(ctx, argv[1], vi*3+1);
      verts[vi*6+5] = read_float_from_js_arr(ctx, argv[1], vi*3+2);
   }
   uint16_t *indices = (uint16_t *)malloc(idx_len * sizeof(uint16_t));
   if (!indices) { free(verts); mesh->used = false; return JS_NewInt32(ctx, 0); }
   for (uint32_t ii = 0; ii < idx_len; ii++) {
      JSValue iv = JS_GetPropertyUint32(ctx, argv[2], ii);
      uint32_t iu = 0;
      JS_ToUint32(ctx, &iu, iv);
      JS_FreeValue(ctx, iv);
      indices[ii] = (uint16_t)iu;
   }
   mesh->custom_verts       = verts;
   mesh->custom_vert_count  = vert_count;
   mesh->custom_indices     = indices;
   mesh->custom_index_count = idx_len;
   return JS_NewInt32(ctx, handle);
}

static JSValue js_create_instanced_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   const char *geo_str = argc > 0 ? JS_ToCString(ctx, argv[0]) : NULL;
   int count = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 1);
   if (count < 1) count = 1;
   if (count > 4096) count = 4096;

   int geo = 0; /* default: cube */
   if (geo_str) {
      if (!strcmp(geo_str, "sphere"))        geo = 1;
      else if (!strcmp(geo_str, "plane"))    geo = 2;
      else if (!strcmp(geo_str, "capsule"))  geo = 3;
      else if (!strcmp(geo_str, "cylinder")) geo = 4;
      JS_FreeCString(ctx, geo_str);
   }

   int handle = allocate_mesh(NOVA64_MESH_INSTANCED);
   if (!handle) return JS_NewInt32(ctx, 0);
   struct nova64_mesh *mesh = &meshes[handle - 1];
   mesh->instance_geometry = geo;
   mesh->instance_count = count;
   mesh->instance_transforms = (float *)calloc((size_t)count * 16, sizeof(float));
   if (!mesh->instance_transforms) {
      memset(mesh, 0, sizeof(*mesh));
      return JS_NewInt32(ctx, 0);
   }
   /* Initialize each instance to identity matrix */
   for (int i = 0; i < count; i++) {
      float *m = mesh->instance_transforms + i * 16;
      m[0] = m[5] = m[10] = m[15] = 1.0f;
   }
   mesh->color = 0xffffffff;
   mesh->opacity = 1.0f;
   mesh->scale[0] = mesh->scale[1] = mesh->scale[2] = 1.0f;
   mesh->visible = true;
   return JS_NewInt32(ctx, handle);
}

static JSValue js_set_instance_transform(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int idx    = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh || mesh->type != NOVA64_MESH_INSTANCED) return JS_UNDEFINED;
   if (idx < 0 || idx >= mesh->instance_count)       return JS_UNDEFINED;
   if (argc < 3 || !JS_IsArray(argv[2]))               return JS_UNDEFINED;

   float *m = mesh->instance_transforms + idx * 16;
   for (int i = 0; i < 16; i++) {
      JSValue v = JS_GetPropertyUint32(ctx, argv[2], (uint32_t)i);
      double d = 0.0;
      JS_ToFloat64(ctx, &d, v);
      JS_FreeValue(ctx, v);
      m[i] = (float)d;
   }
   return JS_UNDEFINED;
}

static JSValue js_get_instance_count(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   int handle = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (!mesh || mesh->type != NOVA64_MESH_INSTANCED) return JS_NewInt32(ctx, 0);
   return JS_NewInt32(ctx, mesh->instance_count);
}

static void set_function(JSContext *ctx, JSValue object, const char *name, JSCFunction *fn, int length)
{
   JS_SetPropertyStr(ctx, object, name, JS_NewCFunction(ctx, fn, name, length));
}

static bool install_nova64_api(JSContext *ctx)
{
   JSValue global = JS_GetGlobalObject(ctx);
   JSValue nova64 = JS_NewObject(ctx);
   JSValue draw = JS_NewObject(ctx);
   JSValue input = JS_NewObject(ctx);
   JSValue scene = JS_NewObject(ctx);
   JSValue camera = JS_NewObject(ctx);
   JSValue light = JS_NewObject(ctx);
   JSValue audio = JS_NewObject(ctx);
   JSValue assets = JS_NewObject(ctx);
   JSValue storage = JS_NewObject(ctx);

   set_function(ctx, draw, "rgba8", js_rgba8, 4);
   set_function(ctx, draw, "colorLerp", js_color_lerp, 3);
   set_function(ctx, draw, "colorR", js_color_r, 1);
   set_function(ctx, draw, "colorG", js_color_g, 1);
   set_function(ctx, draw, "colorB", js_color_b, 1);
   set_function(ctx, draw, "colorA", js_color_a, 1);
   set_function(ctx, draw, "screenWidth", js_screen_width, 0);
   set_function(ctx, draw, "screenHeight", js_screen_height, 0);
   set_function(ctx, draw, "cls", js_cls, 1);
   set_function(ctx, draw, "clsGradient", js_cls_gradient, 3);
   set_function(ctx, draw, "pset", js_pset, 3);
   set_function(ctx, draw, "pget", js_pget, 2);
   set_function(ctx, draw, "replaceColor", js_replace_color, 2);
   set_function(ctx, draw, "screenFade", js_screen_fade, 2);
   set_function(ctx, draw, "screenTint", js_screen_tint, 2);
   set_function(ctx, draw, "screenInvert", js_screen_invert, 0);
   set_function(ctx, draw, "screenGrayscale", js_screen_grayscale, 0);
   set_function(ctx, draw, "screenPosterize", js_screen_posterize, 1);
   set_function(ctx, draw, "screenThreshold", js_screen_threshold, 3);
   set_function(ctx, draw, "screenScanlines", js_screen_scanlines, 3);
   set_function(ctx, draw, "screenVignette", js_screen_vignette, 2);
   set_function(ctx, draw, "line", js_line, 5);
   set_function(ctx, draw, "hline", js_hline, 4);
   set_function(ctx, draw, "vline", js_vline, 4);
   set_function(ctx, draw, "lineGradient", js_line_gradient, 7);
   set_function(ctx, draw, "rect", js_rect, 6);
   set_function(ctx, draw, "rectfill", js_rectfill, 5);
   set_function(ctx, draw, "rectGradient", js_rect_gradient, 7);
   set_function(ctx, draw, "roundRect", js_round_rect, 6);
   set_function(ctx, draw, "roundRectFill", js_round_rect_fill, 6);
   set_function(ctx, draw, "circ", js_circ, 4);
   set_function(ctx, draw, "circfill", js_circfill, 4);
   set_function(ctx, draw, "oval", js_oval, 5);
   set_function(ctx, draw, "ovalfill", js_ovalfill, 5);
   set_function(ctx, draw, "tri", js_tri, 7);
   set_function(ctx, draw, "trifill", js_trifill, 7);
   set_function(ctx, draw, "print", js_draw_print, 5);
   set_function(ctx, draw, "textWidth", js_text_width, 1);
   set_function(ctx, draw, "textHeight", js_text_height, 1);
   set_function(ctx, draw, "textSize", js_text_size, 1);
   set_function(ctx, draw, "printShadow", js_print_shadow, 8);
   set_function(ctx, draw, "printOutline", js_print_outline, 6);
   set_function(ctx, draw, "spr", js_spr, 10);
   set_function(ctx, draw, "createSpriteSheet", js_create_spritesheet, 3);
   set_function(ctx, draw, "sprFrame", js_spr_frame, 4);
   set_function(ctx, draw, "sprNamed", js_spr_named, 4);
   set_function(ctx, draw, "setClip", js_set_clip, 4);
   set_function(ctx, draw, "clearClip", js_clear_clip, 0);
   set_function(ctx, draw, "getClip", js_get_clip, 0);
   set_function(ctx, draw, "pushClip", js_push_clip, 0);
   set_function(ctx, draw, "popClip", js_pop_clip, 0);
   set_function(ctx, draw, "setCamera2D", js_set_camera2d, 4);
   set_function(ctx, draw, "clearCamera2D", js_clear_camera2d, 0);
   set_function(ctx, draw, "getCamera2D", js_get_camera2d, 0);
   set_function(ctx, draw, "pushCamera2D", js_push_camera2d, 0);
   set_function(ctx, draw, "popCamera2D", js_pop_camera2d, 0);
   set_function(ctx, draw, "setBlend2D", js_set_blend_2d, 1);
   set_function(ctx, draw, "getBlend2D", js_get_blend_2d, 0);
   set_function(ctx, draw, "pushBlend2D", js_push_blend_2d, 0);
   set_function(ctx, draw, "popBlend2D", js_pop_blend_2d, 0);
   set_function(ctx, draw, "clearBlend2D", js_clear_blend_2d, 0);
   set_function(ctx, draw, "setPalette", js_set_palette, 2);
   set_function(ctx, draw, "getPalette", js_get_palette, 1);
   set_function(ctx, draw, "applyPaletteSwap", js_apply_palette_swap, 2);
   set_function(ctx, draw, "clearPaletteSwap", js_clear_palette_swap, 0);
   set_function(ctx, draw, "resetPalette", js_reset_palette, 0);
   set_function(ctx, draw, "pushPalette", js_push_palette, 0);
   set_function(ctx, draw, "popPalette", js_pop_palette, 0);
   set_function(ctx, draw, "getDrawState", js_get_draw_state, 0);
   set_function(ctx, draw, "clearDrawState", js_clear_draw_state, 0);

   set_function(ctx, input, "btn", js_btn, 2);
   set_function(ctx, input, "btnp", js_btnp, 2);
   set_function(ctx, input, "key", js_key, 1);
   set_function(ctx, input, "keyp", js_keyp, 1);
   set_function(ctx, input, "mouseX", js_mouse_x, 0);
   set_function(ctx, input, "mouseY", js_mouse_y, 0);
   set_function(ctx, input, "mouseBtn", js_mouse_btn, 1);
   set_function(ctx, input, "mouseBtnp", js_mouse_btnp, 1);
   set_function(ctx, input, "touchX", js_touch_x, 1);
   set_function(ctx, input, "touchY", js_touch_y, 1);
   set_function(ctx, input, "touchCount", js_touch_count, 0);
   set_function(ctx, input, "axis", js_axis, 3);
   set_function(ctx, input, "trigger", js_trigger, 2);

   set_function(ctx, scene, "createCube", js_create_cube, 1);
   set_function(ctx, scene, "createSphere", js_create_sphere, 1);
   set_function(ctx, scene, "createPlane", js_create_plane, 1);
   set_function(ctx, scene, "createCapsule", js_create_capsule, 4);
   set_function(ctx, scene, "createCylinder", js_create_cylinder, 5);
   set_function(ctx, scene, "destroyMesh", js_destroy_mesh, 1);
   set_function(ctx, scene, "removeMesh", js_destroy_mesh, 1);
   set_function(ctx, scene, "getMesh", js_get_mesh, 1);
   set_function(ctx, scene, "setPosition", js_set_position, 4);
   set_function(ctx, scene, "setRotation", js_set_rotation, 4);
   set_function(ctx, scene, "setScale", js_set_scale, 4);
   set_function(ctx, scene, "getPosition", js_get_position, 1);
   set_function(ctx, scene, "getRotation", js_get_rotation, 1);
   set_function(ctx, scene, "rotateMesh", js_rotate_mesh, 4);
   set_function(ctx, scene, "moveMesh", js_move_mesh, 4);
   set_function(ctx, scene, "setMeshVisible", js_set_mesh_visible, 2);
   set_function(ctx, scene, "setFlatShading", js_set_flat_shading, 2);
   set_function(ctx, scene, "setMeshOpacity", js_set_mesh_opacity, 2);
   set_function(ctx, scene, "setCastShadow", js_set_cast_shadow, 2);
   set_function(ctx, scene, "setReceiveShadow", js_set_receive_shadow, 2);
   set_function(ctx, scene, "setShadowQuality", js_set_shadow_quality, 1);
   set_function(ctx, scene, "setMeshColor", js_set_mesh_color, 2);
   set_function(ctx, scene, "setMeshEmissive", js_set_mesh_emissive, 3);
   set_function(ctx, scene, "setMeshAlpha", js_set_mesh_alpha, 2);
   set_function(ctx, scene, "get3DStats", js_get_3d_stats, 0);
   set_function(ctx, scene, "getBackendCapabilities", js_get_backend_capabilities, 0);
   set_function(ctx, scene, "setFog", js_set_fog, 3);
   set_function(ctx, scene, "clearFog", js_clear_fog, 0);
   set_function(ctx, scene, "clearScene", js_clear_scene, 0);
   set_function(ctx, scene, "draw3d", js_draw3d, 1);
   set_function(ctx, scene, "createTexture", js_create_texture, 3);
   set_function(ctx, scene, "setMeshTexture", js_set_mesh_texture, 2);
   set_function(ctx, scene, "setMeshNormalMap", js_set_mesh_normal_map, 2);
   set_function(ctx, scene, "destroyTexture", js_destroy_texture, 1);
   set_function(ctx, scene, "createRenderTarget", js_create_render_target, 2);
   set_function(ctx, scene, "destroyRenderTarget", js_destroy_render_target, 1);
   set_function(ctx, scene, "renderScene", js_render_scene_to_target, 1);
   set_function(ctx, scene, "renderTargetAsTexture", js_render_target_as_texture, 1);
   set_function(ctx, scene, "setSkyColor", js_set_sky_color, 2);
   set_function(ctx, scene, "clearSkyColor", js_clear_sky_color, 0);
   set_function(ctx, scene, "getSkyColor", js_get_sky_color, 0);
   set_function(ctx, scene, "setSkybox", js_set_skybox, 1);
   set_function(ctx, scene, "clearSkybox", js_clear_skybox, 0);
   set_function(ctx, scene, "setMeshRoughness", js_set_mesh_roughness, 2);
   set_function(ctx, scene, "setMeshMetalness", js_set_mesh_metalness, 2);
   set_function(ctx, scene, "setMeshUVOffset", js_set_mesh_uv_offset, 3);
   set_function(ctx, scene, "setMeshUVScale", js_set_mesh_uv_scale, 3);
   set_function(ctx, scene, "setMeshBlend", js_set_mesh_blend, 2);

   set_function(ctx, camera, "setPosition", js_set_camera_position, 3);
   set_function(ctx, camera, "setTarget", js_set_camera_target, 3);
   set_function(ctx, camera, "setFOV", js_set_camera_fov, 1);
   set_function(ctx, camera, "setCameraPosition", js_set_camera_position, 3);
   set_function(ctx, camera, "setCameraTarget", js_set_camera_target, 3);
   set_function(ctx, camera, "setCameraFOV", js_set_camera_fov, 1);
   set_function(ctx, camera, "setCameraLookAt", js_set_camera_look_at, 1);
   set_function(ctx, camera, "setCameraOrthographic", js_set_camera_orthographic, 2);
   set_function(ctx, camera, "setCameraPerspective", js_set_camera_perspective, 0);
   set_function(ctx, camera, "setOrthographic", js_set_camera_orthographic, 2);
   set_function(ctx, camera, "setPerspective", js_set_camera_perspective, 0);
   set_function(ctx, camera, "getCameraPosition", js_get_camera_position, 0);
   set_function(ctx, camera, "getCameraTarget", js_get_camera_target, 0);
   set_function(ctx, camera, "getCameraFOV", js_get_camera_fov, 0);
   set_function(ctx, camera, "getPosition", js_get_camera_position, 0);
   set_function(ctx, camera, "getTarget", js_get_camera_target, 0);
   set_function(ctx, camera, "getFOV", js_get_camera_fov, 0);

   set_function(ctx, light, "setAmbient", js_set_ambient_light, 2);
   set_function(ctx, light, "setDirection", js_set_light_direction, 3);
   set_function(ctx, light, "setAmbientLight", js_set_ambient_light, 2);
   set_function(ctx, light, "setLightDirection", js_set_light_direction, 3);
   set_function(ctx, light, "setLightColor", js_set_light_color, 1);
   set_function(ctx, light, "setDirectionalLight", js_set_directional_light, 3);
   set_function(ctx, light, "createPointLight", js_create_point_light, 6);
   set_function(ctx, light, "setPointLightPosition", js_set_point_light_position, 4);
   set_function(ctx, light, "setPointLightColor", js_set_point_light_color, 3);
   set_function(ctx, light, "removeLight", js_remove_light, 1);
   set_function(ctx, light, "setFog", js_set_fog, 3);
   set_function(ctx, light, "clearFog", js_clear_fog, 0);

   set_function(ctx, audio, "sfx", js_sfx, 2);
   set_function(ctx, audio, "setVolume", js_set_volume, 1);
   set_function(ctx, audio, "playSound", js_play_sound, 3);
   set_function(ctx, audio, "stopSound", js_stop_sound, 1);
   set_function(ctx, audio, "stopAll", js_stop_all_sounds, 0);
   set_function(ctx, audio, "playMusic", js_play_music, 3);
   set_function(ctx, audio, "stopMusic", js_stop_music, 0);
   set_function(ctx, audio, "setMusicVolume", js_set_music_volume, 1);
   set_function(ctx, audio, "pauseMusic", js_pause_music, 0);
   set_function(ctx, audio, "resumeMusic", js_resume_music, 0);
   set_function(ctx, audio, "musicActive", js_music_active, 0);

   set_function(ctx, assets, "has", js_assets_has, 1);
   set_function(ctx, assets, "size", js_assets_size, 1);
   set_function(ctx, assets, "readText", js_assets_read_text, 2);
   set_function(ctx, assets, "readJSON", js_assets_read_json, 2);
   set_function(ctx, assets, "readBytes", js_assets_read_bytes, 1);
   set_function(ctx, assets, "list", js_assets_list, 0);
   set_function(ctx, assets, "quota", js_assets_quota, 0);

   set_function(ctx, storage, "saveData", js_storage_save_data, 2);
   set_function(ctx, storage, "loadData", js_storage_load_data, 2);
   set_function(ctx, storage, "deleteData", js_storage_delete_data, 1);
   set_function(ctx, storage, "saveJSON", js_storage_save_data, 2);
   set_function(ctx, storage, "loadJSON", js_storage_load_data, 2);
   set_function(ctx, storage, "remove", js_storage_delete_data, 1);
   set_function(ctx, storage, "has", js_storage_has_data, 1);
   set_function(ctx, storage, "keys", js_storage_keys, 0);
   set_function(ctx, storage, "clear", js_storage_clear, 0);
   set_function(ctx, storage, "hasData", js_storage_has_data, 1);
   set_function(ctx, storage, "storageKeys", js_storage_keys, 0);
   set_function(ctx, storage, "storageClear", js_storage_clear, 0);
   set_function(ctx, storage, "open", js_storage_open, 1);
   set_function(ctx, storage, "saveCompressed",  js_storage_save_compressed, 2);
   set_function(ctx, storage, "loadCompressed",  js_storage_load_compressed, 2);
   set_function(ctx, storage, "hasCompressed",   js_storage_has_compressed,  1);

   /* nova64.tilemap namespace */
   JSValue tilemap_ns = JS_NewObject(ctx);
   set_function(ctx, tilemap_ns, "create", js_create_tilemap, 4);
   set_function(ctx, tilemap_ns, "setTile", js_set_tile, 4);
   set_function(ctx, tilemap_ns, "draw", js_draw_tilemap, 4);
   set_function(ctx, tilemap_ns, "clear", js_clear_tilemap, 1);
   set_function(ctx, tilemap_ns, "destroy", js_destroy_tilemap, 1);
   JS_SetPropertyStr(ctx, nova64, "tilemap", tilemap_ns);

   /* nova64.sprites namespace */
   JSValue sprites_ns = JS_NewObject(ctx);
   set_function(ctx, sprites_ns, "createSpriteSheet", js_create_spritesheet, 3);
   set_function(ctx, sprites_ns, "sprFrame", js_spr_frame, 4);
   set_function(ctx, sprites_ns, "sprNamed", js_spr_named, 4);
   JS_SetPropertyStr(ctx, nova64, "sprites", sprites_ns);

   /* nova64.random namespace */
   JSValue random_ns = JS_NewObject(ctx);
   set_function(ctx, random_ns, "seed", js_rng_seed, 1);
   set_function(ctx, random_ns, "next", js_rng_next, 0);
   set_function(ctx, random_ns, "int", js_rng_int, 2);
   set_function(ctx, random_ns, "noise", js_noise, 3);
   set_function(ctx, random_ns, "fbm", js_fbm, 5);
   JS_SetPropertyStr(ctx, nova64, "random", random_ns);

   JS_SetPropertyStr(ctx, nova64, "draw", draw);
   JS_SetPropertyStr(ctx, nova64, "input", input);
   JS_SetPropertyStr(ctx, nova64, "scene", scene);
   JS_SetPropertyStr(ctx, nova64, "camera", camera);
   JS_SetPropertyStr(ctx, nova64, "light", JS_DupValue(ctx, light));
   JS_SetPropertyStr(ctx, nova64, "lights", light);
   JS_SetPropertyStr(ctx, nova64, "audio", audio);
   JS_SetPropertyStr(ctx, nova64, "assets", assets);
   JS_SetPropertyStr(ctx, nova64, "storage", storage);

   /* nova64.post — post-processing namespace */
   JSValue post = JS_NewObject(ctx);
   set_function(ctx, post, "setCRT", js_post_set_crt, 1);
   set_function(ctx, post, "setVignette", js_post_set_vignette, 1);
   set_function(ctx, post, "setPixelate", js_post_set_pixelate, 1);
   set_function(ctx, post, "setBloom", js_post_set_bloom, 1);
   set_function(ctx, post, "setChromatic", js_post_set_chromatic, 1);
   set_function(ctx, post, "setColorGrade", js_post_set_color_grade, 3);
   set_function(ctx, post, "setPosterize", js_post_set_posterize, 1);
   set_function(ctx, post, "clear", js_post_clear, 0);
   set_function(ctx, post, "getState", js_post_get_state, 0);
   JS_SetPropertyStr(ctx, nova64, "post", post);

   JSValue meta = JS_NewObject(ctx);
   set_function(ctx, meta, "name", js_meta_name, 0);
   set_function(ctx, meta, "title", js_meta_title, 0);
   set_function(ctx, meta, "author", js_meta_author, 0);
   set_function(ctx, meta, "version", js_meta_version, 0);
   set_function(ctx, meta, "main", js_meta_main, 0);
   JS_SetPropertyStr(ctx, nova64, "meta", meta);

   JSValue perf = JS_NewObject(ctx);
   set_function(ctx, perf, "begin", js_perf_begin, 1);
   set_function(ctx, perf, "end", js_perf_end, 1);
   set_function(ctx, perf, "report", js_perf_report, 0);
   set_function(ctx, perf, "clear", js_perf_clear, 0);
   JS_SetPropertyStr(ctx, nova64, "perf", perf);

   set_function(ctx, nova64, "frame", js_get_frame, 0);
   set_function(ctx, nova64, "time", js_get_time, 0);

   JS_SetPropertyStr(ctx, global, "nova64", nova64);

   set_function(ctx, global, "rgba8", js_rgba8, 4);
   set_function(ctx, global, "colorLerp", js_color_lerp, 3);
   set_function(ctx, global, "colorR", js_color_r, 1);
   set_function(ctx, global, "colorG", js_color_g, 1);
   set_function(ctx, global, "colorB", js_color_b, 1);
   set_function(ctx, global, "colorA", js_color_a, 1);
   set_function(ctx, global, "screenWidth", js_screen_width, 0);
   set_function(ctx, global, "screenHeight", js_screen_height, 0);
   set_function(ctx, global, "cls", js_cls, 1);
   set_function(ctx, global, "clsGradient", js_cls_gradient, 3);
   set_function(ctx, global, "pset", js_pset, 3);
   set_function(ctx, global, "pget", js_pget, 2);
   set_function(ctx, global, "replaceColor", js_replace_color, 2);
   set_function(ctx, global, "screenFade", js_screen_fade, 2);
   set_function(ctx, global, "screenTint", js_screen_tint, 2);
   set_function(ctx, global, "screenInvert", js_screen_invert, 0);
   set_function(ctx, global, "screenGrayscale", js_screen_grayscale, 0);
   set_function(ctx, global, "screenPosterize", js_screen_posterize, 1);
   set_function(ctx, global, "screenThreshold", js_screen_threshold, 3);
   set_function(ctx, global, "screenScanlines", js_screen_scanlines, 3);
   set_function(ctx, global, "screenVignette", js_screen_vignette, 2);
   set_function(ctx, global, "line", js_line, 5);
   set_function(ctx, global, "hline", js_hline, 4);
   set_function(ctx, global, "vline", js_vline, 4);
   set_function(ctx, global, "lineGradient", js_line_gradient, 7);
   set_function(ctx, global, "rect", js_rect, 6);
   set_function(ctx, global, "rectfill", js_rectfill, 5);
   set_function(ctx, global, "rectGradient", js_rect_gradient, 7);
   set_function(ctx, global, "roundRect", js_round_rect, 6);
   set_function(ctx, global, "roundRectFill", js_round_rect_fill, 6);
   set_function(ctx, global, "circ", js_circ, 4);
   set_function(ctx, global, "circfill", js_circfill, 4);
   set_function(ctx, global, "oval", js_oval, 5);
   set_function(ctx, global, "ovalfill", js_ovalfill, 5);
   set_function(ctx, global, "tri", js_tri, 7);
   set_function(ctx, global, "trifill", js_trifill, 7);
   set_function(ctx, global, "print", js_draw_print, 5);
   set_function(ctx, global, "textWidth", js_text_width, 1);
   set_function(ctx, global, "textHeight", js_text_height, 1);
   set_function(ctx, global, "textSize", js_text_size, 1);
   set_function(ctx, global, "printShadow", js_print_shadow, 8);
   set_function(ctx, global, "printOutline", js_print_outline, 6);
   set_function(ctx, global, "spr", js_spr, 10);
   set_function(ctx, global, "createSpriteSheet", js_create_spritesheet, 3);
   set_function(ctx, global, "sprFrame", js_spr_frame, 4);
   set_function(ctx, global, "sprNamed", js_spr_named, 4);
   set_function(ctx, global, "setClip", js_set_clip, 4);
   set_function(ctx, global, "clearClip", js_clear_clip, 0);
   set_function(ctx, global, "getClip", js_get_clip, 0);
   set_function(ctx, global, "pushClip", js_push_clip, 0);
   set_function(ctx, global, "popClip", js_pop_clip, 0);
   set_function(ctx, global, "setCamera2D", js_set_camera2d, 4);
   set_function(ctx, global, "clearCamera2D", js_clear_camera2d, 0);
   set_function(ctx, global, "getCamera2D", js_get_camera2d, 0);
   set_function(ctx, global, "pushCamera2D", js_push_camera2d, 0);
   set_function(ctx, global, "popCamera2D", js_pop_camera2d, 0);
   set_function(ctx, global, "setBlend2D", js_set_blend_2d, 1);
   set_function(ctx, global, "getBlend2D", js_get_blend_2d, 0);
   set_function(ctx, global, "pushBlend2D", js_push_blend_2d, 0);
   set_function(ctx, global, "popBlend2D", js_pop_blend_2d, 0);
   set_function(ctx, global, "clearBlend2D", js_clear_blend_2d, 0);
   set_function(ctx, global, "setPalette", js_set_palette, 2);
   set_function(ctx, global, "getPalette", js_get_palette, 1);
   set_function(ctx, global, "applyPaletteSwap", js_apply_palette_swap, 2);
   set_function(ctx, global, "clearPaletteSwap", js_clear_palette_swap, 0);
   set_function(ctx, global, "resetPalette", js_reset_palette, 0);
   set_function(ctx, global, "pushPalette", js_push_palette, 0);
   set_function(ctx, global, "popPalette", js_pop_palette, 0);
   set_function(ctx, global, "getDrawState", js_get_draw_state, 0);
   set_function(ctx, global, "clearDrawState", js_clear_draw_state, 0);
   set_function(ctx, global, "playSound", js_play_sound, 3);
   set_function(ctx, global, "stopSound", js_stop_sound, 1);
   set_function(ctx, global, "stopAllSounds", js_stop_all_sounds, 0);
   set_function(ctx, global, "playMusic", js_play_music, 3);
   set_function(ctx, global, "stopMusic", js_stop_music, 0);
   set_function(ctx, global, "setMusicVolume", js_set_music_volume, 1);
   set_function(ctx, global, "pauseMusic", js_pause_music, 0);
   set_function(ctx, global, "resumeMusic", js_resume_music, 0);
   set_function(ctx, global, "musicActive", js_music_active, 0);
   set_function(ctx, global, "btn", js_btn, 2);
   set_function(ctx, global, "btnp", js_btnp, 2);
   set_function(ctx, global, "key", js_key, 1);
   set_function(ctx, global, "keyp", js_keyp, 1);
   set_function(ctx, global, "mouseX", js_mouse_x, 0);
   set_function(ctx, global, "mouseY", js_mouse_y, 0);
   set_function(ctx, global, "mouseBtn", js_mouse_btn, 1);
   set_function(ctx, global, "mouseBtnp", js_mouse_btnp, 1);
   set_function(ctx, global, "touchX", js_touch_x, 1);
   set_function(ctx, global, "touchY", js_touch_y, 1);
   set_function(ctx, global, "touchCount", js_touch_count, 0);
   set_function(ctx, global, "axis", js_axis, 3);
   set_function(ctx, global, "trigger", js_trigger, 2);
   set_function(ctx, global, "createTilemap", js_create_tilemap, 4);
   set_function(ctx, global, "setTile", js_set_tile, 4);
   set_function(ctx, global, "drawTilemap", js_draw_tilemap, 4);
   set_function(ctx, global, "clearTilemap", js_clear_tilemap, 1);
   set_function(ctx, global, "destroyTilemap", js_destroy_tilemap, 1);
   set_function(ctx, global, "createCube", js_create_cube, 1);
   set_function(ctx, global, "createSphere", js_create_sphere, 1);
   set_function(ctx, global, "createPlane", js_create_plane, 1);
   set_function(ctx, global, "createCapsule", js_create_capsule, 4);
   set_function(ctx, global, "createCylinder", js_create_cylinder, 5);
   set_function(ctx, global, "destroyMesh", js_destroy_mesh, 1);
   set_function(ctx, global, "removeMesh", js_destroy_mesh, 1);
   set_function(ctx, global, "getMesh", js_get_mesh, 1);
   set_function(ctx, global, "setPosition", js_set_position, 4);
   set_function(ctx, global, "setRotation", js_set_rotation, 4);
   set_function(ctx, global, "setScale", js_set_scale, 4);
   set_function(ctx, global, "getPosition", js_get_position, 1);
   set_function(ctx, global, "getRotation", js_get_rotation, 1);
   set_function(ctx, global, "rotateMesh", js_rotate_mesh, 4);
   set_function(ctx, global, "moveMesh", js_move_mesh, 4);
   set_function(ctx, global, "setMeshVisible", js_set_mesh_visible, 2);
   set_function(ctx, global, "setFlatShading", js_set_flat_shading, 2);
   set_function(ctx, global, "setMeshOpacity", js_set_mesh_opacity, 2);
   set_function(ctx, global, "setCastShadow", js_set_cast_shadow, 2);
   set_function(ctx, global, "setReceiveShadow", js_set_receive_shadow, 2);
   set_function(ctx, global, "setShadowQuality", js_set_shadow_quality, 1);
   set_function(ctx, global, "setMeshColor", js_set_mesh_color, 2);
   set_function(ctx, global, "setMeshEmissive", js_set_mesh_emissive, 3);
   set_function(ctx, global, "setMeshAlpha", js_set_mesh_alpha, 2);
   set_function(ctx, global, "draw3d", js_draw3d, 1);
   set_function(ctx, global, "createTexture", js_create_texture, 3);
   set_function(ctx, global, "setMeshTexture", js_set_mesh_texture, 2);
   set_function(ctx, global, "setMeshNormalMap", js_set_mesh_normal_map, 2);
   set_function(ctx, global, "destroyTexture", js_destroy_texture, 1);
   set_function(ctx, global, "createRenderTarget", js_create_render_target, 2);
   set_function(ctx, global, "destroyRenderTarget", js_destroy_render_target, 1);
   set_function(ctx, global, "renderScene", js_render_scene_to_target, 1);
   set_function(ctx, global, "renderTargetAsTexture", js_render_target_as_texture, 1);
   set_function(ctx, global, "get3DStats", js_get_3d_stats, 0);
   set_function(ctx, global, "getBackendCapabilities", js_get_backend_capabilities, 0);
   set_function(ctx, global, "setCameraPosition", js_set_camera_position, 3);
   set_function(ctx, global, "setCameraTarget", js_set_camera_target, 3);
   set_function(ctx, global, "setCameraFOV", js_set_camera_fov, 1);
   set_function(ctx, global, "setCameraLookAt", js_set_camera_look_at, 1);
   set_function(ctx, global, "setAmbientLight", js_set_ambient_light, 2);
   set_function(ctx, global, "setLightDirection", js_set_light_direction, 3);
   set_function(ctx, global, "setLightColor", js_set_light_color, 1);
   set_function(ctx, global, "setDirectionalLight", js_set_directional_light, 3);
   set_function(ctx, global, "createPointLight", js_create_point_light, 6);
   set_function(ctx, global, "setPointLightPosition", js_set_point_light_position, 4);
   set_function(ctx, global, "setPointLightColor", js_set_point_light_color, 3);
   set_function(ctx, global, "removeLight", js_remove_light, 1);
   set_function(ctx, global, "setFog", js_set_fog, 3);
   set_function(ctx, global, "clearFog", js_clear_fog, 0);
   set_function(ctx, global, "clearScene", js_clear_scene, 0);
   set_function(ctx, global, "setSkyColor", js_set_sky_color, 2);
   set_function(ctx, global, "clearSkyColor", js_clear_sky_color, 0);
   set_function(ctx, global, "getSkyColor", js_get_sky_color, 0);
   set_function(ctx, global, "setSkybox", js_set_skybox, 1);
   set_function(ctx, global, "clearSkybox", js_clear_skybox, 0);
   set_function(ctx, global, "setCameraOrthographic", js_set_camera_orthographic, 2);
   set_function(ctx, global, "setCameraPerspective", js_set_camera_perspective, 0);
   set_function(ctx, global, "getCameraPosition", js_get_camera_position, 0);
   set_function(ctx, global, "getCameraTarget", js_get_camera_target, 0);
   set_function(ctx, global, "getCameraFOV", js_get_camera_fov, 0);
   set_function(ctx, global, "setMeshRoughness", js_set_mesh_roughness, 2);
   set_function(ctx, global, "setMeshMetalness", js_set_mesh_metalness, 2);
   set_function(ctx, global, "setMeshUVOffset", js_set_mesh_uv_offset, 3);
   set_function(ctx, global, "setMeshUVScale", js_set_mesh_uv_scale, 3);
   set_function(ctx, global, "setMeshBlend", js_set_mesh_blend, 2);
   set_function(ctx, global, "sfx", js_sfx, 2);
   set_function(ctx, global, "setVolume", js_set_volume, 1);
   set_function(ctx, global, "playSound", js_play_sound, 3);
   set_function(ctx, global, "assetHas", js_assets_has, 1);
   set_function(ctx, global, "assetSize", js_assets_size, 1);
   set_function(ctx, global, "readAssetText", js_assets_read_text, 2);
   set_function(ctx, global, "readAssetJSON", js_assets_read_json, 2);
   set_function(ctx, global, "readAssetBytes", js_assets_read_bytes, 1);
   set_function(ctx, global, "listAssets", js_assets_list, 0);
   set_function(ctx, global, "assetQuota", js_assets_quota, 0);
   set_function(ctx, global, "saveData", js_storage_save_data, 2);
   set_function(ctx, global, "loadData", js_storage_load_data, 2);
   set_function(ctx, global, "deleteData", js_storage_delete_data, 1);
   set_function(ctx, global, "saveJSON", js_storage_save_data, 2);
   set_function(ctx, global, "loadJSON", js_storage_load_data, 2);
   set_function(ctx, global, "remove", js_storage_delete_data, 1);
   set_function(ctx, global, "hasData", js_storage_has_data, 1);
   set_function(ctx, global, "storageKeys", js_storage_keys, 0);
   set_function(ctx, global, "storageClear", js_storage_clear, 0);

   /* Storage versioning + compression (8G) */
   set_function(ctx, global, "storageVersion",        js_storage_version,          0);
   set_function(ctx, global, "storageSetVersion",     js_storage_set_version,      1);
   set_function(ctx, global, "storageSetCompressed",  js_storage_save_compressed,  2);
   set_function(ctx, global, "storageGetCompressed",  js_storage_load_compressed,  2);
   set_function(ctx, global, "storageHasCompressed",  js_storage_has_compressed,   1);

   /* Procedural noise */
   set_function(ctx, global, "noise", js_noise, 3);
   set_function(ctx, global, "fbm",   js_fbm,   5);

   /* Rumble (8D) */
   set_function(ctx, global, "rumble", js_rumble, 2);

   /* Physics colliders (8H) */
   set_function(ctx, global, "createCollider",   js_create_collider,   3);
   set_function(ctx, global, "setColliderPos",   js_set_collider_pos,  3);
   set_function(ctx, global, "getColliderPos",   js_get_collider_pos,  1);
   set_function(ctx, global, "checkCollision",   js_check_collision,   2);
   set_function(ctx, global, "moveAndCollide",   js_move_and_collide,  4);
   set_function(ctx, global, "destroyCollider",  js_destroy_collider,  1);

   /* 2D particle system */
   set_function(ctx, global, "createParticles2D",    js_create_particles2d,    1);
   set_function(ctx, global, "emitParticles2D",      js_emit_particles2d,      2);
   set_function(ctx, global, "setEmitterPos2D",      js_set_emitter_pos2d,     3);
   set_function(ctx, global, "setEmitterActive2D",   js_set_emitter_active2d,  2);
   set_function(ctx, global, "destroyParticles2D",   js_destroy_particles2d,   1);
   set_function(ctx, global, "updateParticles",      js_update_particles,      1);
   set_function(ctx, global, "drawParticles",        js_draw_particles,        0);
   set_function(ctx, global, "getParticleCount",     js_get_particle_count,    0);

   /* Register on nova64.storage namespace */
   {
      JSValue store = JS_GetPropertyStr(ctx, nova64, "storage");
      set_function(ctx, store, "version",    js_storage_version,     0);
      set_function(ctx, store, "setVersion", js_storage_set_version, 1);
      JS_FreeValue(ctx, store);
   }

   /* Register on nova64.input namespace */
   {
      JSValue inp = JS_GetPropertyStr(ctx, nova64, "input");
      set_function(ctx, inp, "rumble", js_rumble, 2);
      JS_FreeValue(ctx, inp);
   }

   /* Scene hierarchy (8A) */
   set_function(ctx, global, "setParent",        js_set_parent,        2);
   set_function(ctx, global, "clearParent",       js_clear_parent,      1);
   set_function(ctx, global, "getWorldPosition",  js_get_world_position, 1);

   /* Multi-channel audio (8C) */
   set_function(ctx, global, "setChannelVolume",  js_set_channel_volume, 2);
   set_function(ctx, global, "getChannelVolume",  js_get_channel_volume, 1);
   set_function(ctx, global, "setChannelPitch",   js_set_channel_pitch,  2);
   set_function(ctx, global, "getChannelPitch",   js_get_channel_pitch,  1);
   set_function(ctx, global, "stopChannel",       js_stop_channel,       1);
   {
      JSValue aud = JS_GetPropertyStr(ctx, nova64, "audio");
      set_function(ctx, aud, "setChannelVolume", js_set_channel_volume, 2);
      set_function(ctx, aud, "getChannelVolume", js_get_channel_volume, 1);
      set_function(ctx, aud, "setChannelPitch",  js_set_channel_pitch,  2);
      set_function(ctx, aud, "getChannelPitch",  js_get_channel_pitch,  1);
      set_function(ctx, aud, "stopChannel",      js_stop_channel,       1);
      JS_FreeValue(ctx, aud);
   }

   /* Scene hierarchy on nova64.scene namespace */
   {
      JSValue sc = JS_GetPropertyStr(ctx, nova64, "scene");
      set_function(ctx, sc, "setParent",       js_set_parent,         2);
      set_function(ctx, sc, "clearParent",     js_clear_parent,       1);
      set_function(ctx, sc, "getWorldPosition",js_get_world_position, 1);
      JS_FreeValue(ctx, sc);
   }

   /* Register on nova64.physics namespace */
   {
      JSValue phys = JS_NewObject(ctx);
      set_function(ctx, phys, "createCollider",  js_create_collider,   3);
      set_function(ctx, phys, "setPos",          js_set_collider_pos,  3);
      set_function(ctx, phys, "getPos",          js_get_collider_pos,  1);
      set_function(ctx, phys, "check",           js_check_collision,   2);
      set_function(ctx, phys, "move",            js_move_and_collide,  4);
      set_function(ctx, phys, "destroy",         js_destroy_collider,  1);
      JS_SetPropertyStr(ctx, nova64, "physics", phys);
   }

   /* Storage: cartIds (8G) */
   set_function(ctx, global, "cartIds", js_storage_cart_ids, 0);
   {
      JSValue st = JS_GetPropertyStr(ctx, nova64, "storage");
      set_function(ctx, st, "cartIds", js_storage_cart_ids, 0);
      JS_FreeValue(ctx, st);
   }

   /* 3D Raycast (8H) */
   set_function(ctx, global, "raycast", js_raycast, 7);
   {
      JSValue sc = JS_GetPropertyStr(ctx, nova64, "scene");
      set_function(ctx, sc, "raycast", js_raycast, 7);
      JS_FreeValue(ctx, sc);
   }

   /* Bitmap fonts (8B) */
   set_function(ctx, global, "loadFont",    js_load_font,    3);
   set_function(ctx, global, "printFont",   js_print_font,   5);
   set_function(ctx, global, "destroyFont", js_destroy_font, 1);
   {
      JSValue dr = JS_GetPropertyStr(ctx, nova64, "draw");
      set_function(ctx, dr, "loadFont",    js_load_font,    3);
      set_function(ctx, dr, "printFont",   js_print_font,   5);
      set_function(ctx, dr, "destroyFont", js_destroy_font, 1);
      JS_FreeValue(ctx, dr);
   }

   /* Resolution query (8I) */
   set_function(ctx, global, "getResolution", js_get_resolution, 0);
   set_function(ctx, nova64, "getResolution", js_get_resolution, 0);

   /* Echo / delay (8C batch4) */
   set_function(ctx, global, "setEcho",   js_set_echo,   3);
   set_function(ctx, global, "clearEcho", js_clear_echo, 0);
   {
      JSValue aud = JS_GetPropertyStr(ctx, nova64, "audio");
      set_function(ctx, aud, "setEcho",   js_set_echo,   3);
      set_function(ctx, aud, "clearEcho", js_clear_echo, 0);
      JS_FreeValue(ctx, aud);
   }

   /* Positional 3D audio (8C batch4) */
   set_function(ctx, global, "setListenerPos", js_set_listener_pos, 3);
   set_function(ctx, global, "playSound3D",    js_play_sound_3d,    6);
   {
      JSValue aud = JS_GetPropertyStr(ctx, nova64, "audio");
      set_function(ctx, aud, "setListenerPos", js_set_listener_pos, 3);
      set_function(ctx, aud, "playSound3D",    js_play_sound_3d,    6);
      JS_FreeValue(ctx, aud);
   }

   /* Voice handle control (M8 batch 10/11) */
   set_function(ctx, global, "setVoicePitch",  js_set_voice_pitch,  2);
   set_function(ctx, global, "stopVoice",      js_stop_voice,       1);
   set_function(ctx, global, "getVoicePitch",  js_get_voice_pitch,  1);
   set_function(ctx, global, "getVoiceVolume", js_get_voice_volume, 1);
   set_function(ctx, global, "voiceActive",    js_voice_active,     1);
   {
      JSValue aud = JS_GetPropertyStr(ctx, nova64, "audio");
      set_function(ctx, aud, "setVoicePitch",  js_set_voice_pitch,  2);
      set_function(ctx, aud, "stopVoice",      js_stop_voice,       1);
      set_function(ctx, aud, "getVoicePitch",  js_get_voice_pitch,  1);
      set_function(ctx, aud, "getVoiceVolume", js_get_voice_volume, 1);
      set_function(ctx, aud, "voiceActive",    js_voice_active,     1);
      JS_FreeValue(ctx, aud);
   }

   /* Developer mode (8I batch4) */
   set_function(ctx, global, "isDeveloperMode", js_is_developer_mode, 0);
   set_function(ctx, nova64, "isDeveloperMode", js_is_developer_mode, 0);

   /* Developer console (8J) */
   {
      JSValue con = JS_NewObject(ctx);
      set_function(ctx, con, "print",    js_dev_console_print,     1);
      set_function(ctx, con, "clear",    js_dev_console_clear,     0);
      set_function(ctx, con, "lines",    js_dev_console_get_lines, 0);
      JS_SetPropertyStr(ctx, nova64, "console", con);
   }
   set_function(ctx, global, "devPrint", js_dev_console_print, 1);

   /* RetroAchievements cart RAM (M8) */
   set_function(ctx, global, "peek", js_cheevos_peek, 1);
   set_function(ctx, global, "poke", js_cheevos_poke, 2);
   {
      JSValue cheevos = JS_NewObject(ctx);
      set_function(ctx, cheevos, "peek",    js_cheevos_peek,     1);
      set_function(ctx, cheevos, "poke",    js_cheevos_poke,     2);
      set_function(ctx, cheevos, "ramSize", js_cheevos_ram_size, 0);
      JS_SetPropertyStr(ctx, nova64, "cheevos", cheevos);
   }

   /* Custom mesh (M8) */
   set_function(ctx, global, "createMesh", js_create_mesh, 3);
   set_function(ctx, global, "createInstancedMesh", js_create_instanced_mesh, 2);
   set_function(ctx, global, "setInstanceTransform", js_set_instance_transform, 3);
   set_function(ctx, global, "getInstanceCount", js_get_instance_count, 1);
   {
      JSValue sc = JS_GetPropertyStr(ctx, nova64, "scene");
      if (!JS_IsUndefined(sc)) {
         set_function(ctx, sc, "createMesh", js_create_mesh, 3);
         set_function(ctx, sc, "createInstancedMesh", js_create_instanced_mesh, 2);
         set_function(ctx, sc, "setInstanceTransform", js_set_instance_transform, 3);
         set_function(ctx, sc, "getInstanceCount", js_get_instance_count, 1);
      }
      JS_FreeValue(ctx, sc);
   }

   /* Batch pixel I/O */
   set_function(ctx, global, "setPixels",  js_set_pixels,  5);
   set_function(ctx, global, "getPixels",  js_get_pixels,  4);

   /* Right-aligned text */
   set_function(ctx, global, "printRight", js_print_right, 4);

   /* Screen blur */
   set_function(ctx, global, "screenBlur", js_screen_blur, 1);

   /* Off-screen canvas */
   set_function(ctx, global, "createCanvas",  js_create_canvas,  2);
   set_function(ctx, global, "canvasClear",   js_canvas_clear,   2);
   set_function(ctx, global, "canvasPset",    js_canvas_pset,    4);
   set_function(ctx, global, "canvasPget",    js_canvas_pget,    3);
   set_function(ctx, global, "canvasBlit",    js_canvas_blit,    7);
   set_function(ctx, global, "destroyCanvas", js_destroy_canvas, 1);
   set_function(ctx, global, "canvasWidth",   js_canvas_width,   1);
   set_function(ctx, global, "canvasHeight",  js_canvas_height,  1);

   /* Nine-slice */
   set_function(ctx, global, "drawNineSlice", js_draw_nine_slice, 8);

   /* Timers */
   set_function(ctx, global, "createTimer",   js_create_timer,   1);
   set_function(ctx, global, "timerDone",     js_timer_done,     1);
   set_function(ctx, global, "timerElapsed",  js_timer_elapsed,  1);
   set_function(ctx, global, "timerProgress", js_timer_progress, 1);
   set_function(ctx, global, "resetTimer",    js_reset_timer,    1);
   set_function(ctx, global, "destroyTimer",  js_destroy_timer,  1);

   /* Logical grid */
   set_function(ctx, global, "createGrid",  js_create_grid,  4);
   set_function(ctx, global, "setCell",     js_set_cell,     4);
   set_function(ctx, global, "getCell",     js_get_cell,     3);
   set_function(ctx, global, "destroyGrid", js_destroy_grid, 1);
   set_function(ctx, global, "clearGrid",   js_clear_grid,   2);
   set_function(ctx, global, "gridCols",    js_grid_cols,    1);
   set_function(ctx, global, "gridRows",    js_grid_rows,    1);

   /* Text measurement and centering */
   set_function(ctx, global, "measureText",   js_measure_text,   1);
   set_function(ctx, global, "printCentered", js_print_centered, 4);

   /* Arc drawing */
   set_function(ctx, global, "drawArc",  js_draw_arc,  7);
   set_function(ctx, global, "fillArc",  js_fill_arc,  7);

   /* Catmull-Rom spline */
   set_function(ctx, global, "drawSpline", js_draw_spline, 4);

   /* Bilinear color interpolation */
   set_function(ctx, global, "colorLerp2D", js_color_lerp2d, 6);

   /* Scaled text stamp */
   set_function(ctx, global, "stampText", js_stamp_text, 6);

   /* Color HSV */
   set_function(ctx, global, "colorHSV", js_color_hsv, 4);

   /* Polygon draw/fill from JS arrays */
   set_function(ctx, global, "drawPoly", js_draw_poly, 3);
   set_function(ctx, global, "fillPoly", js_fill_poly, 2);

   /* Screen pixelate */
   set_function(ctx, global, "screenPixelate", js_screen_pixelate, 1);

   /* Word-wrap text box */
   set_function(ctx, global, "textBox", js_text_box, 5);

   /* Sprite transform */
   set_function(ctx, global, "sprTransform", js_spr_transform, 12);

   /* Path drawing */
   set_function(ctx, global, "beginPath",  js_begin_path, 0);
   set_function(ctx, global, "moveTo",     js_move_to,    2);
   set_function(ctx, global, "lineTo",     js_line_to,    2);
   set_function(ctx, global, "closePath",  js_close_path, 0);
   set_function(ctx, global, "strokePath", js_stroke_path, 2);
   set_function(ctx, global, "fillPath",   js_fill_path,   1);

   /* Screen flash */
   set_function(ctx, global, "screenFlash", js_screen_flash, 2);

   /* Math utilities */
   set_function(ctx, global, "lerp",       js_lerp,       3);
   set_function(ctx, global, "clamp",      js_clamp,      3);
   set_function(ctx, global, "map",        js_map,        5);
   set_function(ctx, global, "smoothstep", js_smoothstep, 3);
   set_function(ctx, global, "wrap",       js_wrap,       3);
   set_function(ctx, global, "approach",   js_approach,   3);
   set_function(ctx, global, "between",    js_between,    3);

   /* Camera orbit + shake */
   set_function(ctx, global, "setCameraOrbit",  js_set_camera_orbit,  6);
   set_function(ctx, global, "addCameraShake",  js_add_camera_shake,  2);
   set_function(ctx, global, "stopCameraShake", js_stop_camera_shake, 0);

   /* Tweens */
   set_function(ctx, global, "createTween",   js_create_tween,   4);
   set_function(ctx, global, "getTweenValue", js_get_tween_value, 1);
   set_function(ctx, global, "tweenDone",     js_tween_done,     1);
   set_function(ctx, global, "destroyTween",  js_destroy_tween,  1);
   set_function(ctx, global, "resetTween",    js_reset_tween,    1);

   /* Tilemap getters */
   set_function(ctx, global, "getTile",       js_get_tile,       3);
   set_function(ctx, global, "tilemapCols",   js_tilemap_cols,   1);
   set_function(ctx, global, "tilemapRows",   js_tilemap_rows,   1);
   set_function(ctx, global, "tilemapTileW",  js_tilemap_tile_w, 1);
   set_function(ctx, global, "tilemapTileH",  js_tilemap_tile_h, 1);
   /* Button repeat */
   set_function(ctx, global, "btnRepeat",     js_btn_repeat,     3);
   /* String utilities */
   set_function(ctx, global, "strSplit",      js_str_split,      2);
   set_function(ctx, global, "strTrim",       js_str_trim,       1);
   set_function(ctx, global, "strPadStart",   js_str_pad_start,  3);
   set_function(ctx, global, "strPadEnd",     js_str_pad_end,    3);
   set_function(ctx, global, "strStartsWith", js_str_starts_with,2);
   set_function(ctx, global, "strEndsWith",   js_str_ends_with,  2);
   set_function(ctx, global, "strRepeat",     js_str_repeat,     2);
   /* AABB hotspots */
   set_function(ctx, global, "createHotspot",   js_create_hotspot,   4);
   set_function(ctx, global, "setHotspot",      js_set_hotspot,      5);
   set_function(ctx, global, "hotspotContains", js_hotspot_contains, 3);
   set_function(ctx, global, "hotspotOverlap",  js_hotspot_overlap,  2);
   set_function(ctx, global, "destroyHotspot",  js_destroy_hotspot,  1);
   set_function(ctx, global, "hotspotX",        js_hotspot_x,        1);
   set_function(ctx, global, "hotspotY",        js_hotspot_y,        1);
   set_function(ctx, global, "hotspotW",        js_hotspot_w,        1);
   set_function(ctx, global, "hotspotH",        js_hotspot_h,        1);
   /* Screen effects */
   set_function(ctx, global, "screenChromaticAberration", js_screen_chromatic_aberration, 1);
   set_function(ctx, global, "screenWave",      js_screen_wave,      3);
   set_function(ctx, global, "screenDissolve",  js_screen_dissolve,  1);
   /* Dashed lines */
   set_function(ctx, global, "drawDashedLine",  js_draw_dashed_line, 7);
   set_function(ctx, global, "drawDashedRect",  js_draw_dashed_rect, 7);
   /* Frame utilities */
   set_function(ctx, global, "every",       js_every,          1);
   set_function(ctx, global, "frameCount",  js_frame_count_fn, 0);
   set_function(ctx, global, "sinOsc",      js_sin_osc,        1);
   set_function(ctx, global, "cosOsc",      js_cos_osc,        1);
   /* Color utilities */
   set_function(ctx, global, "colorBrighter", js_color_brighter, 2);
   set_function(ctx, global, "colorDarker",   js_color_darker,   2);
   set_function(ctx, global, "colorMix",      js_color_mix,      3);
   /* Number formatting */
   set_function(ctx, global, "zeroPad",      js_zero_pad,      2);
   set_function(ctx, global, "formatNumber", js_format_number, 2);
   set_function(ctx, global, "commaNumber",  js_comma_number,  1);
   /* Sprite flip */
   set_function(ctx, global, "sprFlipX",     js_spr_flip_x,    9);
   set_function(ctx, global, "sprFlipY",     js_spr_flip_y,    9);

   /* Scrolling text */
   set_function(ctx, global, "createScrollText",  js_create_scroll_text,  2);
   set_function(ctx, global, "drawScrollText",    js_draw_scroll_text,    5);
   set_function(ctx, global, "destroyScrollText", js_destroy_scroll_text, 1);
   set_function(ctx, global, "resetScrollText",   js_reset_scroll_text,   1);
   set_function(ctx, global, "scrollTextX",       js_scroll_text_x,       1);
   set_function(ctx, global, "scrollTextDone",    js_scroll_text_done,    1);
   /* Bitmask ops */
   set_function(ctx, global, "bitAnd",    js_bit_and,    2);
   set_function(ctx, global, "bitOr",     js_bit_or,     2);
   set_function(ctx, global, "bitXor",    js_bit_xor,    2);
   set_function(ctx, global, "bitNot",    js_bit_not,    1);
   set_function(ctx, global, "bitShL",    js_bit_shl,    2);
   set_function(ctx, global, "bitShR",    js_bit_shr,    2);
   set_function(ctx, global, "bitTest",   js_bit_test,   2);
   set_function(ctx, global, "bitSet",    js_bit_set,    2);
   set_function(ctx, global, "bitClear",  js_bit_clear,  2);
   set_function(ctx, global, "bitToggle", js_bit_toggle, 2);
   /* Multi-line print */
   set_function(ctx, global, "printLines", js_print_lines, 5);
   /* Pattern fills */
   set_function(ctx, global, "fillCheckerboard", js_fill_checkerboard, 7);
   set_function(ctx, global, "fillStripes",      js_fill_stripes,      8);
   /* Circle gradient */
   set_function(ctx, global, "fillCircleGradient", js_fill_circle_gradient, 5);
   /* Standalone easing */
   set_function(ctx, global, "easeIn",      js_ease_in,      2);
   set_function(ctx, global, "easeOut",     js_ease_out,     2);
   set_function(ctx, global, "easeInOut",   js_ease_in_out,  1);
   set_function(ctx, global, "easeBounce",  js_ease_bounce,  1);
   set_function(ctx, global, "easeElastic", js_ease_elastic, 1);
   /* Color hex */
   set_function(ctx, global, "colorToHex",  js_color_to_hex,  1);
   set_function(ctx, global, "hexToColor",  js_hex_to_color,  1);
   /* Screen border */
   set_function(ctx, global, "screenBorder", js_screen_border, 2);
   /* Sprite scale */
   set_function(ctx, global, "sprScale", js_spr_scale, 10);
   /* Time format */
   set_function(ctx, global, "formatTime",   js_format_time,    1);
   set_function(ctx, global, "formatTimeMs", js_format_time_ms, 1);
   /* Arrow */
   set_function(ctx, global, "drawArrow", js_draw_arrow, 6);
   /* Color pulse */
   set_function(ctx, global, "colorPulse", js_color_pulse, 3);
   /* Sprite animation */
   set_function(ctx, global, "createAnim",  js_create_anim,  7);
   set_function(ctx, global, "drawAnim",    js_draw_anim,    3);
   set_function(ctx, global, "animFrame",   js_anim_frame,   1);
   set_function(ctx, global, "animDone",    js_anim_done,    1);
   set_function(ctx, global, "setAnimFPS",  js_set_anim_fps, 2);
   set_function(ctx, global, "resetAnim",   js_reset_anim,   1);
   set_function(ctx, global, "destroyAnim", js_destroy_anim, 1);
   /* Floating text */
   set_function(ctx, global, "createFloatText",  js_create_float_text,  6);
   set_function(ctx, global, "drawFloatTexts",   js_draw_float_texts,   0);
   set_function(ctx, global, "clearFloatTexts",  js_clear_float_texts,  0);
   set_function(ctx, global, "floatTextCount",   js_float_text_count,   0);
   /* Dialog */
   set_function(ctx, global, "createDialog",    js_create_dialog,    2);
   set_function(ctx, global, "drawDialog",      js_draw_dialog,      4);
   set_function(ctx, global, "dialogDone",      js_dialog_done,      1);
   set_function(ctx, global, "advanceDialog",   js_advance_dialog,   1);
   set_function(ctx, global, "destroyDialog",   js_destroy_dialog,   1);
   set_function(ctx, global, "dialogCharCount", js_dialog_char_count,1);
   /* FSM */
   set_function(ctx, global, "createFSM",  js_create_fsm,  1);
   set_function(ctx, global, "fsmSet",     js_fsm_set,     2);
   set_function(ctx, global, "fsmGet",     js_fsm_get,     1);
   set_function(ctx, global, "fsmPrev",    js_fsm_prev,    1);
   set_function(ctx, global, "fsmElapsed", js_fsm_elapsed, 1);
   set_function(ctx, global, "destroyFSM", js_destroy_fsm, 1);
   /* Virtual stick */
   set_function(ctx, global, "vstickX",      js_vstick_x,      0);
   set_function(ctx, global, "vstickY",      js_vstick_y,      0);
   set_function(ctx, global, "vstickAngle",  js_vstick_angle,  0);
   set_function(ctx, global, "vstickLength", js_vstick_length, 0);
   /* Seeded RNG */
   set_function(ctx, global, "createRNG",  js_create_rng,  1);
   set_function(ctx, global, "rngNext",    js_seeded_rng_next,  1);
   set_function(ctx, global, "rngRange",   js_seeded_rng_range, 3);
   set_function(ctx, global, "destroyRNG", js_destroy_rng, 1);
   /* Draw grid */
   set_function(ctx, global, "drawGrid", js_draw_grid_lines, 7);
   /* Math globals */
   set_function(ctx, global, "floor",  js_math_floor, 1);
   set_function(ctx, global, "ceil",   js_math_ceil,  1);
   set_function(ctx, global, "round",  js_math_round, 1);
   set_function(ctx, global, "fract",  js_math_fract, 1);
   set_function(ctx, global, "sign",   js_math_sign,  1);
   set_function(ctx, global, "pow",    js_math_pow,   2);
   set_function(ctx, global, "abs",    js_math_abs,   1);
   set_function(ctx, global, "sqrt",   js_math_sqrt,  1);
   /* Screen mosaic */
   set_function(ctx, global, "screenMosaic", js_screen_mosaic, 1);
   /* Color inspection */
   set_function(ctx, global, "colorInvert",       js_color_invert,       1);
   set_function(ctx, global, "colorGrayscaleVal", js_color_grayscale_val,1);
   set_function(ctx, global, "colorToHSV",        js_color_to_hsv,       1);
   /* Star burst */
   set_function(ctx, global, "drawStarBurst", js_draw_star_burst, 6);
   set_function(ctx, global, "fillStarBurst", js_fill_star_burst, 6);
   /* Color maps */
   set_function(ctx, global, "colorRainbow",     js_color_rainbow,     1);
   set_function(ctx, global, "colorTemperature", js_color_temperature, 1);
   /* Batch 10: curves / math / geometry / text / color / string / vector */
   set_function(ctx, global, "drawBezier",     js_draw_bezier,     8);
   set_function(ctx, global, "polyline",       js_polyline,        3);
   set_function(ctx, global, "printWrap",      js_print_wrap,      6);
   set_function(ctx, global, "mapRange",       js_map_range,       5);
   set_function(ctx, global, "inverseLerp",    js_inverse_lerp,    3);
   set_function(ctx, global, "pingPong",       js_ping_pong,       2);
   set_function(ctx, global, "pointInRect",    js_point_in_rect,   6);
   set_function(ctx, global, "pointInCirc",    js_point_in_circ,   5);
   set_function(ctx, global, "rectIntersects", js_rect_intersects, 8);
   set_function(ctx, global, "circIntersects", js_circ_intersects, 6);
   set_function(ctx, global, "colorBlendMode", js_color_blend_mode,3);
   set_function(ctx, global, "floodFill",      js_flood_fill,      3);
   set_function(ctx, global, "strReplace",     js_str_replace,     3);
   set_function(ctx, global, "strContains",    js_str_contains,    2);
   set_function(ctx, global, "strUpper",       js_str_upper,       1);
   set_function(ctx, global, "strLower",       js_str_lower,       1);
   set_function(ctx, global, "wrapAngle",      js_wrap_angle,      1);
   set_function(ctx, global, "angleDiff",      js_angle_diff,      2);
   set_function(ctx, global, "angleLerp",      js_angle_lerp,      3);
   set_function(ctx, global, "moveToward",     js_move_toward,     3);
   set_function(ctx, global, "vecLen",         js_vec_len,         2);
   set_function(ctx, global, "vecNorm",        js_vec_norm,        2);
   set_function(ctx, global, "vecDot",         js_vec_dot,         4);
   set_function(ctx, global, "vecCross",       js_vec_cross,       4);
   set_function(ctx, global, "vecLerp",        js_vec_lerp,        5);
   /* Batch 11: cubic bezier, spline, hex grid, graph, color, waveform, char, bold, dots */
   set_function(ctx, global, "drawCubicBezier",  js_draw_cubic_bezier, 10);
   set_function(ctx, global, "splinePoint",      js_spline_point,      2);
   set_function(ctx, global, "hexGrid",          js_hex_grid,          6);
   set_function(ctx, global, "drawGraph",        js_draw_graph,        8);
   set_function(ctx, global, "colorDesaturate",  js_color_desaturate,  2);
   set_function(ctx, global, "colorSaturate",    js_color_saturate,    2);
   set_function(ctx, global, "waveformPlot",     js_waveform_plot,     6);
   set_function(ctx, global, "charCode",         js_char_code,         1);
   set_function(ctx, global, "charFromCode",     js_char_from_code,    1);
   set_function(ctx, global, "printBold",        js_print_bold,        4);
   set_function(ctx, global, "dotGrid",          js_dot_grid,          7);
   set_function(ctx, global, "clampColor",       js_clamp_color,       3);
   /* Batch 12: italic/underline, progress bar, grid snap, color matrix, neon, bar chart, meter */
   set_function(ctx, global, "printItalic",      js_print_italic,      4);
   set_function(ctx, global, "printUnderline",   js_print_underline,   4);
   set_function(ctx, global, "drawProgressBar",  js_draw_progress_bar, 7);
   set_function(ctx, global, "gridSnap",         js_grid_snap,         2);
   set_function(ctx, global, "colorMatrix",      js_color_matrix,      2);
   set_function(ctx, global, "neonGlow",         js_neon_glow,         5);
   set_function(ctx, global, "barChart",         js_bar_chart,         7);
   set_function(ctx, global, "drawMeter",        js_draw_meter,        9);
   set_function(ctx, global, "percentStr",       js_percent_str,       1);
   set_function(ctx, global, "toFixed",          js_to_fixed,          2);
   set_function(ctx, global, "colorMix3",        js_color_mix3,        6);
   set_function(ctx, global, "drawNoise",        js_draw_noise,        6);

   /* Batch 13 */
   set_function(ctx, global, "colorWithAlpha",   js_color_with_alpha,  2);
   set_function(ctx, global, "drawCapsule",      js_draw_capsule,      6);
   set_function(ctx, global, "fillCapsule",      js_fill_capsule,      6);
   set_function(ctx, global, "drawRing",         js_draw_ring,         5);
   set_function(ctx, global, "blurRegion",       js_blur_region,       5);
   set_function(ctx, global, "drawGradientLine", js_draw_gradient_line,6);
   set_function(ctx, global, "colorContrast",    js_color_contrast,    2);
   set_function(ctx, global, "pixelateRegion",   js_pixelate_region,   5);
   set_function(ctx, global, "fillPlus",         js_fill_plus,         5);
   set_function(ctx, global, "drawTextVertical", js_draw_text_vertical,4);
   set_function(ctx, global, "drawStar",         js_draw_star,         6);
   set_function(ctx, global, "fillStar",         js_fill_star,         6);

   /* Batch 14 */
   set_function(ctx, global, "colorShift",      js_color_shift,       2);
   set_function(ctx, global, "colorLuminance",  js_color_luminance,   1);
   set_function(ctx, global, "easeBack",        js_ease_back,         1);
   set_function(ctx, global, "easeSine",        js_ease_sine,         1);
   set_function(ctx, global, "drawHexCell",     js_draw_hex_cell,     4);
   set_function(ctx, global, "fillHexCell",     js_fill_hex_cell,     4);
   set_function(ctx, global, "drawXMark",       js_draw_x_mark,       4);
   set_function(ctx, global, "fillXMark",       js_fill_x_mark,       5);
   set_function(ctx, global, "drawChevron",     js_draw_chevron,      5);
   set_function(ctx, global, "colorSepia",      js_color_sepia,       1);
   set_function(ctx, global, "colorVibrance",   js_color_vibrance,    2);
   set_function(ctx, global, "screenHSV",       js_screen_hsv,        3);

   /* Batch 15 */
   set_function(ctx, global, "copyPixels",       js_copy_pixels,       6);
   set_function(ctx, global, "colorAddRGB",      js_color_add_rgb,     4);
   set_function(ctx, global, "drawLozenge",      js_draw_lozenge,      5);
   set_function(ctx, global, "fillLozenge",      js_fill_lozenge,      5);
   set_function(ctx, global, "drawSpiral",       js_draw_spiral,       6);
   set_function(ctx, global, "colorWarm",        js_color_warm,        2);
   set_function(ctx, global, "colorCool",        js_color_cool,        2);
   set_function(ctx, global, "easeExpo",         js_ease_expo,         1);
   set_function(ctx, global, "easePower",        js_ease_power,        2);
   set_function(ctx, global, "fillTriGradient",  js_fill_tri_gradient, 9);
   set_function(ctx, global, "invertRegion",     js_invert_region,     4);
   set_function(ctx, global, "screenRetro",      js_screen_retro,      1);

   /* Batch 16 */
   set_function(ctx, global, "drawThickLine",    js_draw_thick_line,   6);
   set_function(ctx, global, "drawArrowFilled",  js_draw_arrow_filled, 7);
   set_function(ctx, global, "drawCheck",        js_draw_check,        4);
   set_function(ctx, global, "triangleWave",     js_triangle_wave,     1);
   set_function(ctx, global, "squareWave",       js_square_wave,       1);
   set_function(ctx, global, "sawWave",          js_saw_wave,          1);
   set_function(ctx, global, "screenEdgeDetect", js_screen_edge_detect,1);
   set_function(ctx, global, "screenEmboss",     js_screen_emboss,     0);
   set_function(ctx, global, "screenSharpen",    js_screen_sharpen,    1);
   set_function(ctx, global, "drawCloud",        js_draw_cloud,        4);
   set_function(ctx, global, "screenNightVision",js_screen_night_vision,1);
   set_function(ctx, global, "colorFromHSL",     js_color_from_hsl,    3);

   /* Batch 17 */
   set_function(ctx, global, "reflectVector",  js_reflect_vector,  4);
   set_function(ctx, global, "rotateVector",   js_rotate_vector,   3);
   set_function(ctx, global, "colorMultiply",  js_color_multiply,  2);
   set_function(ctx, global, "colorScreen",    js_color_screen,    2);
   set_function(ctx, global, "colorOverlay",   js_color_overlay,   2);
   set_function(ctx, global, "sinD",           js_sin_d,           1);
   set_function(ctx, global, "cosD",           js_cos_d,           1);
   set_function(ctx, global, "atan2D",         js_atan2_d,         2);
   set_function(ctx, global, "degToRad",       js_deg_to_rad,      1);
   set_function(ctx, global, "radToDeg",       js_rad_to_deg,      1);
   set_function(ctx, global, "screenGlow",     js_screen_glow,     2);
   set_function(ctx, global, "drawRuler",      js_draw_ruler,      6);

   /* Batch 18 */
   set_function(ctx, global, "vecFromAngle",        js_vec_from_angle,        1);
   set_function(ctx, global, "closestPointOnLine",  js_closest_point_on_line, 6);
   set_function(ctx, global, "distToLine",          js_dist_to_line,          6);
   set_function(ctx, global, "drawTrail",           js_draw_trail,            7);
   set_function(ctx, global, "colorDodge",          js_color_dodge,           2);
   set_function(ctx, global, "colorBurn",           js_color_burn,            2);
   set_function(ctx, global, "fillRadialGradient",  js_fill_radial_gradient,  5);
   set_function(ctx, global, "screenCRTWarp",       js_screen_crt_warp,       1);
   set_function(ctx, global, "screenOilPaint",      js_screen_oil_paint,      1);
   set_function(ctx, global, "drawGear",            js_draw_gear,             6);
   set_function(ctx, global, "fillGear",            js_fill_gear,             6);
   set_function(ctx, global, "colorFromFloats",     js_color_from_floats,     4);

   /* Batch 19 */
   set_function(ctx, global, "colorLighten",             js_color_lighten,             2);
   set_function(ctx, global, "colorDarken",              js_color_darken,              2);
   set_function(ctx, global, "colorDifference",          js_color_difference,          2);
   set_function(ctx, global, "screenBrightnessContrast", js_screen_brightness_contrast,2);
   set_function(ctx, global, "drawSineWave",             js_draw_sine_wave,            7);
   set_function(ctx, global, "drawSquiggle",             js_draw_squiggle,             7);
   set_function(ctx, global, "screenGlitch",             js_screen_glitch,             1);
   set_function(ctx, global, "drawBubble",               js_draw_bubble,               4);
   set_function(ctx, global, "fillBubble",               js_fill_bubble,               4);
   set_function(ctx, global, "colorPinLight",            js_color_pin_light,           2);
   set_function(ctx, global, "drawConnector",            js_draw_connector,            5);
   set_function(ctx, global, "drawHatch",                js_draw_hatch,                7);

   /* Batch 20 */
   set_function(ctx, global, "drawTarget",       js_draw_target,       5);
   set_function(ctx, global, "fillTarget",       js_fill_target,       6);
   set_function(ctx, global, "drawSpiderWeb",    js_draw_spider_web,   6);
   set_function(ctx, global, "drawBrickPattern", js_draw_brick_pattern,7);
   set_function(ctx, global, "fillWaveShape",    js_fill_wave_shape,   7);
   set_function(ctx, global, "colorFromLab",     js_color_from_lab,    3);
   set_function(ctx, global, "drawFlame",        js_draw_flame,        4);
   set_function(ctx, global, "fillFlame",        js_fill_flame,        4);
   set_function(ctx, global, "screenZoom",       js_screen_zoom,       3);
   set_function(ctx, global, "drawDotLine",      js_draw_dot_line,     7);
   set_function(ctx, global, "oscillate",        js_oscillate,         4);
   set_function(ctx, global, "pulseValue",       js_pulse_value,       2);

   /* Batch 21 */
   set_function(ctx, global, "drawNestedRects",         js_draw_nested_rects,         7);
   set_function(ctx, global, "fillNestedRects",         js_fill_nested_rects,         8);
   set_function(ctx, global, "drawParallelogram",       js_draw_parallelogram,        6);
   set_function(ctx, global, "fillParallelogram",       js_fill_parallelogram,        6);
   set_function(ctx, global, "drawTrapezoid",           js_draw_trapezoid,            6);
   set_function(ctx, global, "fillTrapezoid",           js_fill_trapezoid,            6);
   set_function(ctx, global, "drawConcentricPolygons",  js_draw_concentric_polygons,  7);
   set_function(ctx, global, "fillCheckerCircle",       js_fill_checker_circle,       6);
   set_function(ctx, global, "colorFromRandom",         js_color_from_random,         1);
   set_function(ctx, global, "drawNeonLine",            js_draw_neon_line,            6);
   set_function(ctx, global, "screenDuotone",           js_screen_duotone,            2);
   set_function(ctx, global, "gradientCircle",          js_gradient_circle,           6);

   JS_FreeValue(ctx, global);
   return true;
}

static void js_host_free(void)
{
   if (js_host.context) {
      JS_FreeValue(js_host.context, js_host.init);
      JS_FreeValue(js_host.context, js_host.update);
      JS_FreeValue(js_host.context, js_host.draw);
      JS_FreeContext(js_host.context);
   }
   if (js_host.runtime)
      JS_FreeRuntime(js_host.runtime);
   memset(&js_host, 0, sizeof(js_host));
   js_host.init = JS_UNDEFINED;
   js_host.update = JS_UNDEFINED;
   js_host.draw = JS_UNDEFINED;
}

static bool js_host_create(void)
{
   js_host_free();
   js_host.runtime = JS_NewRuntime();
   if (!js_host.runtime) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] failed to create QuickJS runtime");
      return false;
   }
   JS_SetModuleLoaderFunc(js_host.runtime, js_module_normalize, js_module_loader, NULL);

   js_host.context = JS_NewContext(js_host.runtime);
   if (!js_host.context) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] failed to create QuickJS context");
      js_host_free();
      return false;
   }

   js_host.init = JS_UNDEFINED;
   js_host.update = JS_UNDEFINED;
   js_host.draw = JS_UNDEFINED;
   return install_nova64_api(js_host.context);
}

static bool cache_lifecycle_export(JSContext *ctx, JSValue namespace, const char *name, JSValue *slot)
{
   JSValue value = JS_GetPropertyStr(ctx, namespace, name);
   if (JS_IsUndefined(value) || JS_IsNull(value)) {
      JS_FreeValue(ctx, value);
      *slot = JS_UNDEFINED;
      return true;
   }
   if (!JS_IsFunction(ctx, value)) {
      JS_FreeValue(ctx, value);
      if (log_cb)
         log_cb(RETRO_LOG_ERROR, "[nova64] export '%s' is not a function\n", name);
      return false;
   }
   *slot = value;
   return true;
}

static bool js_host_load_cart(const char *source, size_t source_size, const char *filename)
{
   if (!js_host_create())
      return false;

   JSContext *ctx = js_host.context;
   const char *eval_filename = package_manifest_main[0] ? package_manifest_main :
      (filename ? filename : "<nova64-cart>");
   JSValue compiled = JS_Eval(ctx, source, source_size, eval_filename,
         JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
   if (JS_IsException(compiled)) {
      js_log_exception(ctx, "compile");
      return false;
   }

   JSModuleDef *module = JS_VALUE_GET_PTR(compiled);
   JSValue result = JS_EvalFunction(ctx, compiled);
   if (JS_IsException(result)) {
      js_log_exception(ctx, "module evaluation");
      return false;
   }
   JS_FreeValue(ctx, result);

   JSValue namespace = JS_GetModuleNamespace(ctx, module);
   if (JS_IsException(namespace)) {
      js_log_exception(ctx, "module namespace");
      return false;
   }

   bool ok = cache_lifecycle_export(ctx, namespace, "init", &js_host.init) &&
             cache_lifecycle_export(ctx, namespace, "update", &js_host.update) &&
             cache_lifecycle_export(ctx, namespace, "draw", &js_host.draw);
   JS_FreeValue(ctx, namespace);
   if (!ok)
      return false;

   js_host.loaded = true;
   if (!JS_IsUndefined(js_host.init)) {
      JSValue call_result = JS_Call(ctx, js_host.init, JS_UNDEFINED, 0, NULL);
      if (JS_IsException(call_result)) {
         js_log_exception(ctx, "init");
         return false;
      }
      JS_FreeValue(ctx, call_result);
   }
   return true;
}

static void js_host_call_frame(double dt)
{
   if (!js_host.loaded || !js_host.context)
      return;

   JSContext *ctx = js_host.context;
   if (!JS_IsUndefined(js_host.update)) {
      JSValue arg = JS_NewFloat64(ctx, dt);
      JSValue result = JS_Call(ctx, js_host.update, JS_UNDEFINED, 1, &arg);
      JS_FreeValue(ctx, arg);
      if (JS_IsException(result)) {
         js_log_exception(ctx, "update");
      } else {
         JS_FreeValue(ctx, result);
      }
   }

   if (!JS_IsUndefined(js_host.draw)) {
      JSValue result = JS_Call(ctx, js_host.draw, JS_UNDEFINED, 0, NULL);
      if (JS_IsException(result)) {
         js_log_exception(ctx, "draw");
      } else {
         JS_FreeValue(ctx, result);
      }
   }
   spr_sorted_flush();
}

static void update_input(void)
{
   memcpy(previous_buttons, buttons, sizeof(previous_buttons));
   memset(buttons, 0, sizeof(buttons));
   memset(pressed_buttons, 0, sizeof(pressed_buttons));

   if (!input_poll_cb || !input_state_cb)
      return;

   input_poll_cb();
   buttons[NOVA64_BTN_LEFT] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_LEFT) != 0;
   buttons[NOVA64_BTN_RIGHT] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_RIGHT) != 0;
   buttons[NOVA64_BTN_UP] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_UP) != 0;
   buttons[NOVA64_BTN_DOWN] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_DOWN) != 0;
   buttons[NOVA64_BTN_Z] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_B) != 0;
   buttons[NOVA64_BTN_X] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_A) != 0;
   buttons[NOVA64_BTN_C] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_Y) != 0;
   buttons[NOVA64_BTN_V] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_X) != 0;

   for (int i = 0; i < NOVA64_BUTTON_COUNT; i++)
      pressed_buttons[i] = buttons[i] && !previous_buttons[i];

   memcpy(key_prev_held, key_held, sizeof(key_held));
   memset(key_held, 0, sizeof(key_held));
   size_t num_tracked = sizeof(nova64_tracked_keys) / sizeof(nova64_tracked_keys[0]);
   for (size_t ki = 0; ki < num_tracked; ki++) {
      int code = nova64_tracked_keys[ki];
      if (code >= 0 && code < NOVA64_KEY_TABLE_SIZE)
         key_held[code] = input_state_cb(0, RETRO_DEVICE_KEYBOARD, 0, (unsigned)code) != 0;
   }

   memcpy(mouse_prev_btns, mouse_btns, sizeof(mouse_btns));
   mouse_rel_x = (int32_t)input_state_cb(0, RETRO_DEVICE_MOUSE, 0, NOVA64_MOUSE_X);
   mouse_rel_y = (int32_t)input_state_cb(0, RETRO_DEVICE_MOUSE, 0, NOVA64_MOUSE_Y);
   mouse_btns[0] = input_state_cb(0, RETRO_DEVICE_MOUSE, 0, NOVA64_MOUSE_LEFT)  != 0;
   mouse_btns[1] = input_state_cb(0, RETRO_DEVICE_MOUSE, 0, NOVA64_MOUSE_RIGHT) != 0;
   mouse_btns[2] = input_state_cb(0, RETRO_DEVICE_MOUSE, 0, NOVA64_MOUSE_MIDDLE)!= 0;
   int16_t pointer_count = input_state_cb(0, RETRO_DEVICE_POINTER, 0, NOVA64_POINTER_COUNT);
   bool pointer_pressed = input_state_cb(0, RETRO_DEVICE_POINTER, 0, NOVA64_POINTER_PRESSED) != 0;
   touch_count = pointer_count > 0 ? pointer_count : (pointer_pressed ? 1 : 0);
   touch_x = (int32_t)input_state_cb(0, RETRO_DEVICE_POINTER, 0, NOVA64_POINTER_X);
   touch_y = (int32_t)input_state_cb(0, RETRO_DEVICE_POINTER, 0, NOVA64_POINTER_Y);

   /* Analog sticks + triggers — port 0 */
   static const int joypad_map[NOVA64_BUTTON_COUNT] = {
      RETRO_DEVICE_ID_JOYPAD_LEFT, RETRO_DEVICE_ID_JOYPAD_RIGHT,
      RETRO_DEVICE_ID_JOYPAD_UP, RETRO_DEVICE_ID_JOYPAD_DOWN,
      RETRO_DEVICE_ID_JOYPAD_B, RETRO_DEVICE_ID_JOYPAD_A,
      RETRO_DEVICE_ID_JOYPAD_Y, RETRO_DEVICE_ID_JOYPAD_X
   };
   for (unsigned p = 0; p < NOVA64_MAX_PORTS; p++) {
      int16_t lx = input_state_cb(p, NOVA64_DEVICE_ANALOG, NOVA64_ANALOG_LEFT,   NOVA64_ANALOG_X);
      int16_t ly = input_state_cb(p, NOVA64_DEVICE_ANALOG, NOVA64_ANALOG_LEFT,   NOVA64_ANALOG_Y);
      int16_t rx = input_state_cb(p, NOVA64_DEVICE_ANALOG, NOVA64_ANALOG_RIGHT,  NOVA64_ANALOG_X);
      int16_t ry = input_state_cb(p, NOVA64_DEVICE_ANALOG, NOVA64_ANALOG_RIGHT,  NOVA64_ANALOG_Y);
      int16_t l2 = input_state_cb(p, NOVA64_DEVICE_ANALOG, NOVA64_ANALOG_BUTTON, NOVA64_RETRO_L2);
      int16_t r2 = input_state_cb(p, NOVA64_DEVICE_ANALOG, NOVA64_ANALOG_BUTTON, NOVA64_RETRO_R2);
      analog_axes[p][0][0] = lx / 32767.0f;
      analog_axes[p][0][1] = ly / 32767.0f;
      analog_axes[p][1][0] = rx / 32767.0f;
      analog_axes[p][1][1] = ry / 32767.0f;
      analog_triggers[p][0] = (float)l2 / 32767.0f;
      analog_triggers[p][1] = (float)r2 / 32767.0f;

      /* Multi-port joypad state */
      if (p == 0) {
         for (int i = 0; i < NOVA64_BUTTON_COUNT; i++)
            mp_buttons[0][i] = buttons[i];
      } else {
         memcpy(mp_prev_buttons[p], mp_buttons[p], NOVA64_BUTTON_COUNT * sizeof(bool));
         memset(mp_buttons[p], 0, NOVA64_BUTTON_COUNT * sizeof(bool));
         for (int i = 0; i < NOVA64_BUTTON_COUNT; i++) {
            mp_buttons[p][i] = input_state_cb(p, RETRO_DEVICE_JOYPAD, 0, joypad_map[i]) != 0;
            mp_pressed_buttons[p][i] = mp_buttons[p][i] && !mp_prev_buttons[p][i];
         }
      }
   }
   /* mirror port 0 edge state into mp */
   for (int i = 0; i < NOVA64_BUTTON_COUNT; i++)
      mp_pressed_buttons[0][i] = pressed_buttons[i];
}

static retro_proc_address_t load_gles_proc(const char *name)
{
   if (!hw_render.get_proc_address)
      return NULL;
   return hw_render.get_proc_address(name);
}

static GLuint gles_compile_shader(GLenum type, const char *source)
{
   GLuint shader = gles.CreateShader(type);
   if (!shader)
      return 0;
   const GLchar *sources[] = {source};
   gles.ShaderSource(shader, 1, sources, NULL);
   gles.CompileShader(shader);

   GLint status = 0;
   gles.GetShaderiv(shader, GL_COMPILE_STATUS, &status);
   if (!status) {
      GLchar log[512];
      GLsizei length = 0;
      if (gles.GetShaderInfoLog)
         gles.GetShaderInfoLog(shader, (GLsizei)sizeof(log), &length, log);
      log[length < (GLsizei)sizeof(log) ? length : (GLsizei)sizeof(log) - 1] = '\0';
      if (log_cb)
         log_cb(RETRO_LOG_ERROR, "[nova64] GLES shader compile failed: %s\n", log);
      gles.DeleteShader(shader);
      return 0;
   }
   return shader;
}

static bool gles_create_cube_program(void)
{
   static const char *vertex_source =
      "attribute vec3 a_position;\n"
      "attribute vec3 a_normal;\n"
      "uniform mat4 u_mvp;\n"
      "uniform mat3 u_normal_matrix;\n"
      "uniform vec4 u_light_direction;\n"
      "uniform vec2 u_uv_offset;\n"
      "uniform vec2 u_uv_scale;\n"
      "uniform mat4 u_shadow_mvp;\n"
      "varying float v_light;\n"
      "varying float v_depth;\n"
      "varying vec2 v_uv;\n"
      "varying vec4 v_shadow_coord;\n"
      "varying vec3 v_normal;\n"
      "void main() {\n"
      "  vec3 n = normalize(u_normal_matrix * a_normal);\n"
      "  vec3 l = normalize(-u_light_direction.xyz);\n"
      "  float diffuse = max(dot(n, l), 0.0);\n"
      "  v_light = 0.58 + diffuse * 0.42;\n"
      "  v_normal = n;\n"
      "  gl_Position = u_mvp * vec4(a_position, 1.0);\n"
      "  v_depth = gl_Position.z / gl_Position.w;\n"
      "  v_uv = (a_position.xz + 0.5) * u_uv_scale + u_uv_offset;\n"
      "  v_shadow_coord = u_shadow_mvp * vec4(a_position, 1.0);\n"
      "}\n";
   static const char *fragment_source =
      "precision mediump float;\n"
      "varying float v_light;\n"
      "varying float v_depth;\n"
      "varying vec2 v_uv;\n"
      "varying vec4 v_shadow_coord;\n"
      "varying vec3 v_normal;\n"
      "uniform vec4 u_color;\n"
      "uniform vec4 u_ambient_color;\n"
      "uniform highp vec4 u_light_direction;\n"
      "uniform int u_fog_enabled;\n"
      "uniform vec4 u_fog_color;\n"
      "uniform float u_fog_near;\n"
      "uniform float u_fog_far;\n"
      "uniform int u_has_texture;\n"
      "uniform sampler2D u_texture;\n"
      "uniform int u_has_normal_map;\n"
      "uniform sampler2D u_normal_map;\n"
      "uniform vec4 u_emissive_color;\n"
      "uniform float u_emissive_intensity;\n"
      "uniform float u_roughness;\n"
      "uniform float u_metalness;\n"
      "uniform sampler2D u_shadow_map;\n"
      "uniform float u_shadow_texel_size;\n"
      "uniform int u_shadow_enabled;\n"
      "float shadow_tap(vec2 uv, float depth) {\n"
      "  return depth - 0.005 > texture2D(u_shadow_map, uv).r ? 0.0 : 1.0;\n"
      "}\n"
      "void main() {\n"
      "  vec3 ambient = u_ambient_color.rgb * 0.35;\n"
      "  vec4 base = (u_has_texture != 0) ? texture2D(u_texture, v_uv) * u_color : u_color;\n"
      "  float surface_light;\n"
      "  if (u_has_normal_map != 0) {\n"
      "    vec3 nm = texture2D(u_normal_map, v_uv).rgb * 2.0 - 1.0;\n"
      "    vec3 perturbed = normalize(v_normal + nm * 0.6);\n"
      "    vec3 l = normalize(-u_light_direction.xyz);\n"
      "    float diffuse = max(dot(perturbed, l), 0.0);\n"
      "    surface_light = 0.58 + diffuse * 0.42;\n"
      "  } else {\n"
      "    surface_light = v_light;\n"
      "  }\n"
      "  float diff = mix(surface_light, 0.75, u_roughness * 0.5);\n"
      "  vec3 metal_ambient = mix(ambient, ambient * base.rgb, u_metalness);\n"
      "  vec3 lit = clamp(base.rgb * diff + metal_ambient, 0.0, 1.0);\n"
      "  if (u_shadow_enabled != 0) {\n"
      "    vec3 sc = v_shadow_coord.xyz / v_shadow_coord.w;\n"
      "    sc = sc * 0.5 + 0.5;\n"
      "    if (sc.x >= 0.0 && sc.x <= 1.0 && sc.y >= 0.0 && sc.y <= 1.0\n"
      "        && sc.z >= 0.0 && sc.z <= 1.0) {\n"
      "      float ts = u_shadow_texel_size;\n"
      "      float s = shadow_tap(sc.xy+vec2(-ts,-ts),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2(0.0,-ts),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2( ts,-ts),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2(-ts,0.0),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2(0.0,0.0),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2( ts,0.0),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2(-ts, ts),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2(0.0, ts),sc.z)\n"
      "              + shadow_tap(sc.xy+vec2( ts, ts),sc.z);\n"
      "      lit *= (0.35 + 0.65 * (s / 9.0));\n"
      "    }\n"
      "  }\n"
      "  if (u_fog_enabled != 0) {\n"
      "    float depth_linear = v_depth * 0.5 + 0.5;\n"
      "    float fog_t = clamp((depth_linear - u_fog_near / (u_fog_far + 0.001)) / ((u_fog_far - u_fog_near) / (u_fog_far + 0.001)), 0.0, 1.0);\n"
      "    lit = mix(lit, u_fog_color.rgb, fog_t);\n"
      "  }\n"
      "  lit = clamp(lit + u_emissive_color.rgb * u_emissive_intensity, 0.0, 1.0);\n"
      "  gl_FragColor = vec4(lit, base.a);\n"
      "}\n";

   GLuint vertex = gles_compile_shader(GL_VERTEX_SHADER, vertex_source);
   GLuint fragment = gles_compile_shader(GL_FRAGMENT_SHADER, fragment_source);
   if (!vertex || !fragment) {
      if (vertex)
         gles.DeleteShader(vertex);
      if (fragment)
         gles.DeleteShader(fragment);
      return false;
   }

   GLuint program = gles.CreateProgram();
   gles.AttachShader(program, vertex);
   gles.AttachShader(program, fragment);
   gles.LinkProgram(program);
   gles.DeleteShader(vertex);
   gles.DeleteShader(fragment);

   GLint status = 0;
   gles.GetProgramiv(program, GL_LINK_STATUS, &status);
   if (!status) {
      GLchar log[512];
      GLsizei length = 0;
      if (gles.GetProgramInfoLog)
         gles.GetProgramInfoLog(program, (GLsizei)sizeof(log), &length, log);
      log[length < (GLsizei)sizeof(log) ? length : (GLsizei)sizeof(log) - 1] = '\0';
      if (log_cb)
         log_cb(RETRO_LOG_ERROR, "[nova64] GLES program link failed: %s\n", log);
      gles.DeleteProgram(program);
      return false;
   }

   gles.cube_program = program;
   gles.cube_position_attrib = gles.GetAttribLocation(program, "a_position");
   gles.cube_normal_attrib = gles.GetAttribLocation(program, "a_normal");
   gles.cube_mvp_uniform = gles.GetUniformLocation(program, "u_mvp");
   gles.cube_normal_matrix_uniform = gles.GetUniformLocation(program, "u_normal_matrix");
   gles.cube_color_uniform = gles.GetUniformLocation(program, "u_color");
   gles.cube_ambient_uniform = gles.GetUniformLocation(program, "u_ambient_color");
   gles.cube_light_direction_uniform = gles.GetUniformLocation(program, "u_light_direction");
   gles.cube_fog_enabled_uniform = gles.GetUniformLocation(program, "u_fog_enabled");
   gles.cube_fog_color_uniform = gles.GetUniformLocation(program, "u_fog_color");
   gles.cube_fog_near_uniform = gles.GetUniformLocation(program, "u_fog_near");
   gles.cube_fog_far_uniform = gles.GetUniformLocation(program, "u_fog_far");
   gles.cube_has_texture_uniform = gles.GetUniformLocation(program, "u_has_texture");
   gles.cube_texture_uniform = gles.GetUniformLocation(program, "u_texture");
   gles.cube_has_normal_map_uniform = gles.GetUniformLocation(program, "u_has_normal_map");
   gles.cube_normal_map_uniform = gles.GetUniformLocation(program, "u_normal_map");
   gles.cube_emissive_color_uniform = gles.GetUniformLocation(program, "u_emissive_color");
   gles.cube_emissive_intensity_uniform = gles.GetUniformLocation(program, "u_emissive_intensity");
   gles.cube_roughness_uniform = gles.GetUniformLocation(program, "u_roughness");
   gles.cube_metalness_uniform = gles.GetUniformLocation(program, "u_metalness");
   gles.cube_uv_offset_uniform = gles.GetUniformLocation(program, "u_uv_offset");
   gles.cube_uv_scale_uniform = gles.GetUniformLocation(program, "u_uv_scale");
   gles.cube_shadow_map_uniform = gles.GetUniformLocation(program, "u_shadow_map");
   gles.cube_shadow_mvp_uniform = gles.GetUniformLocation(program, "u_shadow_mvp");
   gles.cube_shadow_texel_size_uniform = gles.GetUniformLocation(program, "u_shadow_texel_size");
   gles.cube_shadow_enabled_uniform = gles.GetUniformLocation(program, "u_shadow_enabled");
   return gles.cube_position_attrib >= 0 && gles.cube_normal_attrib >= 0 &&
      gles.cube_mvp_uniform >= 0 && gles.cube_normal_matrix_uniform >= 0 &&
      gles.cube_color_uniform >= 0 && gles.cube_ambient_uniform >= 0 &&
      gles.cube_light_direction_uniform >= 0;
}

static bool gles_create_shadow_program(void)
{
   static const char *vertex_source =
      "attribute vec3 a_position;\n"
      "uniform mat4 u_mvp;\n"
      "void main() {\n"
      "  gl_Position = u_mvp * vec4(a_position, 1.0);\n"
      "}\n";
   static const char *fragment_source =
      "precision mediump float;\n"
      "void main() {}\n";

   GLuint vertex = gles_compile_shader(GL_VERTEX_SHADER, vertex_source);
   GLuint fragment = gles_compile_shader(GL_FRAGMENT_SHADER, fragment_source);
   if (!vertex || !fragment) {
      if (vertex)  gles.DeleteShader(vertex);
      if (fragment) gles.DeleteShader(fragment);
      return false;
   }
   GLuint program = gles.CreateProgram();
   gles.AttachShader(program, vertex);
   gles.AttachShader(program, fragment);
   gles.LinkProgram(program);
   gles.DeleteShader(vertex);
   gles.DeleteShader(fragment);
   GLint status = 0;
   gles.GetProgramiv(program, GL_LINK_STATUS, &status);
   if (!status) { gles.DeleteProgram(program); return false; }
   gles.shadow_program = program;
   gles.shadow_position_attrib = gles.GetAttribLocation(program, "a_position");
   gles.shadow_mvp_uniform = gles.GetUniformLocation(program, "u_mvp");
   return gles.shadow_mvp_uniform >= 0 && gles.shadow_position_attrib >= 0;
}

static bool gles_init_shadow_resources(void)
{
   if (g_shadow_map_size <= 0) return false;
   if (gles.shadow_resources_ready) return true;
   if (!gles.GenFramebuffers || !gles.GenTextures || !gles.GenRenderbuffers) return false;
   if (!gles_create_shadow_program()) return false;

   gles.GenTextures(1, &gles.shadow_depth_tex);
   gles.BindTexture(GL_TEXTURE_2D, gles.shadow_depth_tex);
   gles.TexImage2D(GL_TEXTURE_2D, 0, GL_DEPTH_COMPONENT16,
      g_shadow_map_size, g_shadow_map_size, 0, GL_DEPTH_COMPONENT, GL_UNSIGNED_SHORT, NULL);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
   gles.BindTexture(GL_TEXTURE_2D, 0);

   gles.GenRenderbuffers(1, &gles.shadow_rbo);
   gles.BindRenderbuffer(GL_RENDERBUFFER, gles.shadow_rbo);
   gles.RenderbufferStorage(GL_RENDERBUFFER, GL_RGB565, g_shadow_map_size, g_shadow_map_size);
   gles.BindRenderbuffer(GL_RENDERBUFFER, 0);

   gles.GenFramebuffers(1, &gles.shadow_fbo);
   gles.BindFramebuffer(GL_FRAMEBUFFER, gles.shadow_fbo);
   gles.FramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT,
      GL_TEXTURE_2D, gles.shadow_depth_tex, 0);
   gles.FramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0,
      GL_RENDERBUFFER, gles.shadow_rbo);
   GLenum status = gles.CheckFramebufferStatus(GL_FRAMEBUFFER);
   gles.BindFramebuffer(GL_FRAMEBUFFER, 0);

   if (status != GL_FRAMEBUFFER_COMPLETE) {
      gles.DeleteFramebuffers(1, &gles.shadow_fbo);
      gles.DeleteTextures(1, &gles.shadow_depth_tex);
      gles.DeleteRenderbuffers(1, &gles.shadow_rbo);
      gles.DeleteProgram(gles.shadow_program);
      gles.shadow_fbo = 0; gles.shadow_depth_tex = 0;
      gles.shadow_rbo = 0; gles.shadow_program = 0;
      return false;
   }
   gles.shadow_resources_ready = true;
   return true;
}

static void gles_destroy_shadow_resources(void)
{
   if (gles.shadow_fbo && gles.DeleteFramebuffers)
      gles.DeleteFramebuffers(1, &gles.shadow_fbo);
   if (gles.shadow_depth_tex && gles.DeleteTextures)
      gles.DeleteTextures(1, &gles.shadow_depth_tex);
   if (gles.shadow_rbo && gles.DeleteRenderbuffers)
      gles.DeleteRenderbuffers(1, &gles.shadow_rbo);
   if (gles.shadow_program && gles.DeleteProgram)
      gles.DeleteProgram(gles.shadow_program);
   gles.shadow_fbo = 0; gles.shadow_depth_tex = 0;
   gles.shadow_rbo = 0; gles.shadow_program = 0;
   gles.shadow_resources_ready = false;
}

static void build_shadow_light_vp(float out[16])
{
   float ldir[3] = {
      light_state.direction[0],
      light_state.direction[1],
      light_state.direction[2]
   };
   float len = sqrtf(ldir[0]*ldir[0] + ldir[1]*ldir[1] + ldir[2]*ldir[2]);
   if (len < 0.0001f) { ldir[0] = 0.0f; ldir[1] = -1.0f; ldir[2] = 0.0f; len = 1.0f; }
   ldir[0] /= len; ldir[1] /= len; ldir[2] /= len;

   float eye[3] = { -ldir[0] * 20.0f, -ldir[1] * 20.0f, -ldir[2] * 20.0f };
   float target[3] = { 0.0f, 0.0f, 0.0f };
   float up[3] = { 0.0f, 1.0f, 0.0f };
   if (fabsf(ldir[1]) > 0.99f) { up[0] = 1.0f; up[1] = 0.0f; up[2] = 0.0f; }

   float view[16], proj[16];
   mat4_look_at(view, eye, target, up);
   mat4_ortho(proj, -12.0f, 12.0f, -12.0f, 12.0f, 1.0f, 50.0f);
   mat4_multiply(out, proj, view);
}

static bool gles_any_cast_shadow_mesh(void)
{
   for (int i = 0; i < NOVA64_MAX_MESHES; i++)
      if (meshes[i].used && meshes[i].visible && meshes[i].cast_shadow)
         return true;
   return false;
}

static void render_gles_shadow_pass(const float light_vp[16])
{
   if (!gles.shadow_fbo || !gles.shadow_program) return;
   GLuint hw_fbo = hw_render.get_current_framebuffer ? hw_render.get_current_framebuffer() : 0;
   gles.BindFramebuffer(GL_FRAMEBUFFER, gles.shadow_fbo);
   gles.Viewport(0, 0, g_shadow_map_size, g_shadow_map_size);
   gles.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
   gles.Enable(GL_DEPTH_TEST);
   gles.UseProgram(gles.shadow_program);

   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      const struct nova64_mesh *mesh = &meshes[i];
      if (!mesh->used || !mesh->visible || !mesh->cast_shadow || mesh->opacity <= 0.0f)
         continue;
      float model[16], shadow_mvp[16];
      mat4_world_transform(model, mesh);
      mat4_multiply(shadow_mvp, light_vp, model);
      gles.UniformMatrix4fv(gles.shadow_mvp_uniform, 1, GL_FALSE, shadow_mvp);

      GLuint vbo, ibo; GLsizei idx_count;
      switch (mesh->type) {
         case NOVA64_MESH_CUBE:
            vbo = gles.cube_vbo; ibo = gles.cube_ibo; idx_count = 36; break;
         case NOVA64_MESH_PLANE:
            vbo = gles.plane_vbo; ibo = gles.plane_ibo; idx_count = 6; break;
         case NOVA64_MESH_SPHERE:
         case NOVA64_MESH_CAPSULE:
         case NOVA64_MESH_CYLINDER:
            vbo = gles.sphere_vbo; ibo = gles.sphere_ibo; idx_count = 24; break;
         case NOVA64_MESH_CUSTOM:
            if (!mesh->gl_custom_vbo || !mesh->gl_custom_ibo || !mesh->custom_index_count) continue;
            vbo = mesh->gl_custom_vbo; ibo = mesh->gl_custom_ibo;
            idx_count = (GLsizei)mesh->custom_index_count; break;
         default: continue;
      }
      gles.BindBuffer(GL_ARRAY_BUFFER, vbo);
      gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);
      gles.EnableVertexAttribArray((GLuint)gles.shadow_position_attrib);
      gles.VertexAttribPointer((GLuint)gles.shadow_position_attrib, 3, GL_FLOAT, GL_FALSE,
         (GLsizei)(sizeof(GLfloat) * 6), NULL);
      gles.DrawElements(GL_TRIANGLES, idx_count, GL_UNSIGNED_SHORT, NULL);
      gles.DisableVertexAttribArray((GLuint)gles.shadow_position_attrib);
   }
   gles.BindFramebuffer(GL_FRAMEBUFFER, hw_fbo);
}

static bool gles_create_overlay_program(void)
{
   static const char *vertex_source =
      "attribute vec2 a_position;\n"
      "attribute vec2 a_uv;\n"
      "varying vec2 v_uv;\n"
      "void main() {\n"
      "  v_uv = a_uv;\n"
      "  gl_Position = vec4(a_position, 0.0, 1.0);\n"
      "}\n";
   static const char *fragment_source =
      "precision mediump float;\n"
      "varying vec2 v_uv;\n"
      "uniform sampler2D u_overlay;\n"
      "void main() {\n"
      "  gl_FragColor = texture2D(u_overlay, v_uv);\n"
      "}\n";

   GLuint vertex = gles_compile_shader(GL_VERTEX_SHADER, vertex_source);
   GLuint fragment = gles_compile_shader(GL_FRAGMENT_SHADER, fragment_source);
   if (!vertex || !fragment) {
      if (vertex)
         gles.DeleteShader(vertex);
      if (fragment)
         gles.DeleteShader(fragment);
      return false;
   }

   GLuint program = gles.CreateProgram();
   gles.AttachShader(program, vertex);
   gles.AttachShader(program, fragment);
   gles.LinkProgram(program);
   gles.DeleteShader(vertex);
   gles.DeleteShader(fragment);

   GLint status = 0;
   gles.GetProgramiv(program, GL_LINK_STATUS, &status);
   if (!status) {
      GLchar log[512];
      GLsizei length = 0;
      if (gles.GetProgramInfoLog)
         gles.GetProgramInfoLog(program, (GLsizei)sizeof(log), &length, log);
      log[length < (GLsizei)sizeof(log) ? length : (GLsizei)sizeof(log) - 1] = '\0';
      if (log_cb)
         log_cb(RETRO_LOG_ERROR, "[nova64] GLES overlay program link failed: %s\n", log);
      gles.DeleteProgram(program);
      return false;
   }

   gles.overlay_program = program;
   gles.overlay_position_attrib = gles.GetAttribLocation(program, "a_position");
   gles.overlay_uv_attrib = gles.GetAttribLocation(program, "a_uv");
   gles.overlay_texture_uniform = gles.GetUniformLocation(program, "u_overlay");
   return gles.overlay_position_attrib >= 0 && gles.overlay_uv_attrib >= 0 && gles.overlay_texture_uniform >= 0;
}

static void gles_destroy_resources(void)
{
   if (gles.cube_vbo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.cube_vbo);
   if (gles.cube_ibo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.cube_ibo);
   if (gles.plane_vbo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.plane_vbo);
   if (gles.plane_ibo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.plane_ibo);
   if (gles.sphere_vbo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.sphere_vbo);
   if (gles.sphere_ibo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.sphere_ibo);
   if (gles.overlay_vbo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.overlay_vbo);
   if (gles.overlay_ibo && gles.DeleteBuffers)
      gles.DeleteBuffers(1, &gles.overlay_ibo);
   if (gles.overlay_texture && gles.DeleteTextures)
      gles.DeleteTextures(1, &gles.overlay_texture);
   if (gles.cube_program && gles.DeleteProgram)
      gles.DeleteProgram(gles.cube_program);
   if (gles.overlay_program && gles.DeleteProgram)
      gles.DeleteProgram(gles.overlay_program);
   gles.cube_vbo = 0;
   gles.cube_ibo = 0;
   gles.plane_vbo = 0;
   gles.plane_ibo = 0;
   gles.sphere_vbo = 0;
   gles.sphere_ibo = 0;
   gles.overlay_vbo = 0;
   gles.overlay_ibo = 0;
   gles.overlay_texture = 0;
   gles.cube_program = 0;
   gles.overlay_program = 0;
   gles_destroy_shadow_resources();
   gles_destroy_skybox_resources();
   gles.resources_ready = false;
}

static bool gles_init_resources(void)
{
   if (gles.resources_ready)
      return true;

   static const GLfloat cube_vertices[] = {
      -0.5f, -0.5f, -0.5f,  0.0f,  0.0f, -1.0f,
       0.5f, -0.5f, -0.5f,  0.0f,  0.0f, -1.0f,
       0.5f,  0.5f, -0.5f,  0.0f,  0.0f, -1.0f,
      -0.5f,  0.5f, -0.5f,  0.0f,  0.0f, -1.0f,
      -0.5f, -0.5f,  0.5f,  0.0f,  0.0f,  1.0f,
       0.5f, -0.5f,  0.5f,  0.0f,  0.0f,  1.0f,
       0.5f,  0.5f,  0.5f,  0.0f,  0.0f,  1.0f,
      -0.5f,  0.5f,  0.5f,  0.0f,  0.0f,  1.0f,
      -0.5f, -0.5f, -0.5f,  0.0f, -1.0f,  0.0f,
      -0.5f, -0.5f,  0.5f,  0.0f, -1.0f,  0.0f,
       0.5f, -0.5f,  0.5f,  0.0f, -1.0f,  0.0f,
       0.5f, -0.5f, -0.5f,  0.0f, -1.0f,  0.0f,
      -0.5f,  0.5f, -0.5f,  0.0f,  1.0f,  0.0f,
       0.5f,  0.5f, -0.5f,  0.0f,  1.0f,  0.0f,
       0.5f,  0.5f,  0.5f,  0.0f,  1.0f,  0.0f,
      -0.5f,  0.5f,  0.5f,  0.0f,  1.0f,  0.0f,
       0.5f, -0.5f, -0.5f,  1.0f,  0.0f,  0.0f,
       0.5f, -0.5f,  0.5f,  1.0f,  0.0f,  0.0f,
       0.5f,  0.5f,  0.5f,  1.0f,  0.0f,  0.0f,
       0.5f,  0.5f, -0.5f,  1.0f,  0.0f,  0.0f,
      -0.5f, -0.5f, -0.5f, -1.0f,  0.0f,  0.0f,
      -0.5f,  0.5f, -0.5f, -1.0f,  0.0f,  0.0f,
      -0.5f,  0.5f,  0.5f, -1.0f,  0.0f,  0.0f,
      -0.5f, -0.5f,  0.5f, -1.0f,  0.0f,  0.0f,
   };
   static const unsigned short cube_indices[] = {
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23,
   };
   static const GLfloat plane_vertices[] = {
      -0.5f, 0.0f, -0.5f, 0.0f, 1.0f, 0.0f,
       0.5f, 0.0f, -0.5f, 0.0f, 1.0f, 0.0f,
       0.5f, 0.0f,  0.5f, 0.0f, 1.0f, 0.0f,
      -0.5f, 0.0f,  0.5f, 0.0f, 1.0f, 0.0f,
   };
   static const unsigned short plane_indices[] = {
      0, 1, 2, 0, 2, 3,
   };
   static const GLfloat sphere_vertices[] = {
       0.0f,  0.5f,  0.0f,  0.0f,  1.0f,  0.0f,
       0.5f,  0.0f,  0.0f,  1.0f,  0.0f,  0.0f,
       0.0f,  0.0f,  0.5f,  0.0f,  0.0f,  1.0f,
      -0.5f,  0.0f,  0.0f, -1.0f,  0.0f,  0.0f,
       0.0f,  0.0f, -0.5f,  0.0f,  0.0f, -1.0f,
       0.0f, -0.5f,  0.0f,  0.0f, -1.0f,  0.0f,
   };
   static const unsigned short sphere_indices[] = {
      0, 1, 2,
      0, 2, 3,
      0, 3, 4,
      0, 4, 1,
      5, 2, 1,
      5, 3, 2,
      5, 4, 3,
      5, 1, 4,
   };
   static const GLfloat overlay_vertices[] = {
      -1.0f, -1.0f, 0.0f, 1.0f,
       1.0f, -1.0f, 1.0f, 1.0f,
       1.0f,  1.0f, 1.0f, 0.0f,
      -1.0f,  1.0f, 0.0f, 0.0f,
   };
   static const unsigned short overlay_indices[] = {
      0, 1, 2, 0, 2, 3,
   };

   if (!gles_create_cube_program())
      return false;
   if (!gles_create_overlay_program())
      return false;

   gles.GenBuffers(1, &gles.cube_vbo);
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.cube_vbo);
   gles.BufferData(GL_ARRAY_BUFFER, (GLsizeiptr)sizeof(cube_vertices), cube_vertices, GL_STATIC_DRAW);
   gles.GenBuffers(1, &gles.cube_ibo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.cube_ibo);
   gles.BufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)sizeof(cube_indices), cube_indices, GL_STATIC_DRAW);

   gles.GenBuffers(1, &gles.plane_vbo);
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.plane_vbo);
   gles.BufferData(GL_ARRAY_BUFFER, (GLsizeiptr)sizeof(plane_vertices), plane_vertices, GL_STATIC_DRAW);
   gles.GenBuffers(1, &gles.plane_ibo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.plane_ibo);
   gles.BufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)sizeof(plane_indices), plane_indices, GL_STATIC_DRAW);

   gles.GenBuffers(1, &gles.sphere_vbo);
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.sphere_vbo);
   gles.BufferData(GL_ARRAY_BUFFER, (GLsizeiptr)sizeof(sphere_vertices), sphere_vertices, GL_STATIC_DRAW);
   gles.GenBuffers(1, &gles.sphere_ibo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.sphere_ibo);
   gles.BufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)sizeof(sphere_indices), sphere_indices, GL_STATIC_DRAW);

   gles.GenBuffers(1, &gles.overlay_vbo);
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.overlay_vbo);
   gles.BufferData(GL_ARRAY_BUFFER, (GLsizeiptr)sizeof(overlay_vertices), overlay_vertices, GL_STATIC_DRAW);
   gles.GenBuffers(1, &gles.overlay_ibo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.overlay_ibo);
   gles.BufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)sizeof(overlay_indices), overlay_indices, GL_STATIC_DRAW);

   gles.GenTextures(1, &gles.overlay_texture);
   gles.BindTexture(GL_TEXTURE_2D, gles.overlay_texture);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
   gles.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, NOVA64_WIDTH, NOVA64_HEIGHT, 0,
      GL_RGBA, GL_UNSIGNED_BYTE, NULL);

   gles.resources_ready = true;
   return true;
}

static bool gles_load_functions(void)
{
   if (gles.functions_loaded)
      return true;

   gles.Viewport = (PFNGLVIEWPORTPROC)load_gles_proc("glViewport");
   gles.ClearColor = (PFNGLCLEARCOLORPROC)load_gles_proc("glClearColor");
   gles.Clear = (PFNGLCLEARPROC)load_gles_proc("glClear");
   gles.Enable = (PFNGLENABLEPROC)load_gles_proc("glEnable");
   gles.Disable = (PFNGLDISABLEPROC)load_gles_proc("glDisable");
   gles.CreateShader = (PFNGLCREATESHADERPROC)load_gles_proc("glCreateShader");
   gles.ShaderSource = (PFNGLSHADERSOURCEPROC)load_gles_proc("glShaderSource");
   gles.CompileShader = (PFNGLCOMPILESHADERPROC)load_gles_proc("glCompileShader");
   gles.GetShaderiv = (PFNGLGETSHADERIVPROC)load_gles_proc("glGetShaderiv");
   gles.GetShaderInfoLog = (PFNGLGETSHADERINFOLOGPROC)load_gles_proc("glGetShaderInfoLog");
   gles.DeleteShader = (PFNGLDELETESHADERPROC)load_gles_proc("glDeleteShader");
   gles.CreateProgram = (PFNGLCREATEPROGRAMPROC)load_gles_proc("glCreateProgram");
   gles.AttachShader = (PFNGLATTACHSHADERPROC)load_gles_proc("glAttachShader");
   gles.LinkProgram = (PFNGLLINKPROGRAMPROC)load_gles_proc("glLinkProgram");
   gles.GetProgramiv = (PFNGLGETPROGRAMIVPROC)load_gles_proc("glGetProgramiv");
   gles.GetProgramInfoLog = (PFNGLGETPROGRAMINFOLOGPROC)load_gles_proc("glGetProgramInfoLog");
   gles.DeleteProgram = (PFNGLDELETEPROGRAMPROC)load_gles_proc("glDeleteProgram");
   gles.UseProgram = (PFNGLUSEPROGRAMPROC)load_gles_proc("glUseProgram");
   gles.GetAttribLocation = (PFNGLGETATTRIBLOCATIONPROC)load_gles_proc("glGetAttribLocation");
   gles.GetUniformLocation = (PFNGLGETUNIFORMLOCATIONPROC)load_gles_proc("glGetUniformLocation");
   gles.UniformMatrix4fv = (PFNGLUNIFORMMATRIX4FVPROC)load_gles_proc("glUniformMatrix4fv");
   gles.UniformMatrix3fv = (PFNGLUNIFORMMATRIX3FVPROC)load_gles_proc("glUniformMatrix3fv");
   gles.Uniform4f = (PFNGLUNIFORM4FPROC)load_gles_proc("glUniform4f");
   gles.GenBuffers = (PFNGLGENBUFFERSPROC)load_gles_proc("glGenBuffers");
   gles.BindBuffer = (PFNGLBINDBUFFERPROC)load_gles_proc("glBindBuffer");
   gles.BufferData = (PFNGLBUFFERDATAPROC)load_gles_proc("glBufferData");
   gles.DeleteBuffers = (PFNGLDELETEBUFFERSPROC)load_gles_proc("glDeleteBuffers");
   gles.EnableVertexAttribArray = (PFNGLENABLEVERTEXATTRIBARRAYPROC)load_gles_proc("glEnableVertexAttribArray");
   gles.DisableVertexAttribArray = (PFNGLDISABLEVERTEXATTRIBARRAYPROC)load_gles_proc("glDisableVertexAttribArray");
   gles.VertexAttribPointer = (PFNGLVERTEXATTRIBPOINTERPROC)load_gles_proc("glVertexAttribPointer");
   gles.DrawElements = (PFNGLDRAWELEMENTSPROC)load_gles_proc("glDrawElements");
   gles.GenTextures = (PFNGLGENTEXTURESPROC)load_gles_proc("glGenTextures");
   gles.DeleteTextures = (PFNGLDELETETEXTURESPROC)load_gles_proc("glDeleteTextures");
   gles.ActiveTexture = (PFNGLACTIVETEXTUREPROC)load_gles_proc("glActiveTexture");
   gles.BindTexture = (PFNGLBINDTEXTUREPROC)load_gles_proc("glBindTexture");
   gles.TexParameteri = (PFNGLTEXPARAMETERIPROC)load_gles_proc("glTexParameteri");
   gles.TexImage2D = (PFNGLTEXIMAGE2DPROC)load_gles_proc("glTexImage2D");
   gles.TexSubImage2D = (PFNGLTEXSUBIMAGE2DPROC)load_gles_proc("glTexSubImage2D");
   gles.Uniform1i = (PFNGLUNIFORM1IPROC)load_gles_proc("glUniform1i");
   gles.Uniform1f = (PFNGLUNIFORM1FPROC)load_gles_proc("glUniform1f");
   gles.Uniform2f = (PFNGLUNIFORM2FPROC)load_gles_proc("glUniform2f");
   gles.BlendFunc = (PFNGLBLENDFUNCPROC)load_gles_proc("glBlendFunc");
   /* FBO procs — optional; post-processing degrades gracefully if absent */
   gles.GenFramebuffers = (PFNGLGENFRAMEBUFFERSPROC)load_gles_proc("glGenFramebuffers");
   gles.BindFramebuffer = (PFNGLBINDFRAMEBUFFERPROC)load_gles_proc("glBindFramebuffer");
   gles.FramebufferTexture2D = (PFNGLFRAMEBUFFERTEXTURE2DPROC)load_gles_proc("glFramebufferTexture2D");
   gles.CheckFramebufferStatus = (PFNGLCHECKFRAMEBUFFERSTATUSPROC)load_gles_proc("glCheckFramebufferStatus");
   gles.DeleteFramebuffers = (PFNGLDELETEFRAMEBUFFERSPROC)load_gles_proc("glDeleteFramebuffers");
   gles.GenRenderbuffers = (PFNGLGENRENDERBUFFERSPROC)load_gles_proc("glGenRenderbuffers");
   gles.BindRenderbuffer = (PFNGLBINDRENDERBUFFERPROC)load_gles_proc("glBindRenderbuffer");
   gles.RenderbufferStorage = (PFNGLRENDERBUFFERSTORAGEPROC)load_gles_proc("glRenderbufferStorage");
   gles.FramebufferRenderbuffer = (PFNGLFRAMEBUFFERRENDERBUFFERPROC)load_gles_proc("glFramebufferRenderbuffer");
   gles.DeleteRenderbuffers = (PFNGLDELETERENDERBUFFERSPROC)load_gles_proc("glDeleteRenderbuffers");

   gles.functions_loaded = gles.Viewport && gles.ClearColor && gles.Clear &&
      gles.CreateShader && gles.ShaderSource && gles.CompileShader && gles.GetShaderiv &&
      gles.DeleteShader && gles.CreateProgram && gles.AttachShader && gles.LinkProgram &&
      gles.GetProgramiv && gles.DeleteProgram && gles.UseProgram && gles.GetAttribLocation &&
      gles.GetUniformLocation && gles.UniformMatrix4fv && gles.UniformMatrix3fv && gles.Uniform4f &&
      gles.GenBuffers && gles.BindBuffer && gles.BufferData && gles.DeleteBuffers &&
      gles.EnableVertexAttribArray && gles.DisableVertexAttribArray &&
      gles.VertexAttribPointer && gles.DrawElements && gles.GenTextures &&
      gles.DeleteTextures && gles.ActiveTexture && gles.BindTexture &&
      gles.TexParameteri && gles.TexImage2D && gles.TexSubImage2D &&
      gles.Uniform1i && gles.Uniform1f && gles.BlendFunc;
   if (!gles.functions_loaded)
      nova64_log_line(RETRO_LOG_WARN, "[nova64] GLES proc-address callback did not provide the primitive renderer path");
   return gles.functions_loaded;
}

static void gles_context_reset(void)
{
   gles.active = true;
   gles_load_functions();
   nova64_log_line(RETRO_LOG_INFO, "[nova64] GLES3 hardware context reset");
}

static void gles_context_destroy(void)
{
   gles_destroy_resources();
   gles.active = false;
   gles.functions_loaded = false;
   gles.Viewport = NULL;
   gles.ClearColor = NULL;
   gles.Clear = NULL;
   gles.Enable = NULL;
   gles.Disable = NULL;
   gles.CreateShader = NULL;
   gles.ShaderSource = NULL;
   gles.CompileShader = NULL;
   gles.GetShaderiv = NULL;
   gles.GetShaderInfoLog = NULL;
   gles.DeleteShader = NULL;
   gles.CreateProgram = NULL;
   gles.AttachShader = NULL;
   gles.LinkProgram = NULL;
   gles.GetProgramiv = NULL;
   gles.GetProgramInfoLog = NULL;
   gles.DeleteProgram = NULL;
   gles.UseProgram = NULL;
   gles.GetAttribLocation = NULL;
   gles.GetUniformLocation = NULL;
   gles.UniformMatrix4fv = NULL;
   gles.UniformMatrix3fv = NULL;
   gles.Uniform4f = NULL;
   gles.GenBuffers = NULL;
   gles.BindBuffer = NULL;
   gles.BufferData = NULL;
   gles.DeleteBuffers = NULL;
   gles.EnableVertexAttribArray = NULL;
   gles.DisableVertexAttribArray = NULL;
   gles.VertexAttribPointer = NULL;
   gles.DrawElements = NULL;
   gles.GenTextures = NULL;
   gles.DeleteTextures = NULL;
   gles.ActiveTexture = NULL;
   gles.BindTexture = NULL;
   gles.TexParameteri = NULL;
   gles.TexImage2D = NULL;
   gles.TexSubImage2D = NULL;
   gles.Uniform1i = NULL;
   gles.Uniform1f = NULL;
   gles.BlendFunc = NULL;
   gles.GenFramebuffers = NULL;
   gles.BindFramebuffer = NULL;
   gles.FramebufferTexture2D = NULL;
   gles.CheckFramebufferStatus = NULL;
   gles.DeleteFramebuffers = NULL;
   gles.GenRenderbuffers = NULL;
   gles.BindRenderbuffer = NULL;
   gles.RenderbufferStorage = NULL;
   gles.FramebufferRenderbuffer = NULL;
   gles.DeleteRenderbuffers = NULL;
   gles.post_fbo = 0;
   gles.post_rbo = 0;
   gles.post_color_texture = 0;
   gles.post_program = 0;
   gles.post_resources_ready = false;
   nova64_log_line(RETRO_LOG_INFO, "[nova64] GLES3 hardware context destroyed");
}

static void render_gles_primitive(const struct nova64_mesh *mesh, const float view_projection[16],
      GLuint vbo, GLuint ibo, GLsizei index_count)
{
   float model[16];
   float normal_matrix[9];
   float mvp[16];
   mat4_world_transform(model, mesh);
   mat3_normal_from_mesh(normal_matrix, mesh);
   mat4_multiply(mvp, view_projection, model);

   uint32_t color = mesh->color;
   float r = (float)((color >> 24) & 0xffU) / 255.0f;
   float g = (float)((color >> 16) & 0xffU) / 255.0f;
   float b = (float)((color >> 8) & 0xffU) / 255.0f;
   float a = ((float)(color & 0xffU) / 255.0f) * clamp_float(mesh->opacity, 0.0f, 1.0f);

   gles.UseProgram(gles.cube_program);
   gles.UniformMatrix4fv(gles.cube_mvp_uniform, 1, GL_FALSE, mvp);
   gles.UniformMatrix3fv(gles.cube_normal_matrix_uniform, 1, GL_FALSE, normal_matrix);
   gles.Uniform4f(gles.cube_color_uniform, r, g, b, a);
   uint32_t ambient = color_with_intensity(light_state.ambient, light_state.ambient_intensity);
   gles.Uniform4f(gles.cube_ambient_uniform,
      (float)((ambient >> 24) & 0xffU) / 255.0f,
      (float)((ambient >> 16) & 0xffU) / 255.0f,
      (float)((ambient >> 8) & 0xffU) / 255.0f,
      (float)(ambient & 0xffU) / 255.0f);
   gles.Uniform4f(gles.cube_light_direction_uniform,
      light_state.direction[0], light_state.direction[1], light_state.direction[2], 0.0f);
   /* fog */
   if (gles.cube_fog_enabled_uniform >= 0) {
      gles.Uniform1i(gles.cube_fog_enabled_uniform, light_state.fog_enabled ? 1 : 0);
      if (gles.cube_fog_color_uniform >= 0)
         gles.Uniform4f(gles.cube_fog_color_uniform,
            (float)((light_state.fog_color >> 24) & 0xffU) / 255.0f,
            (float)((light_state.fog_color >> 16) & 0xffU) / 255.0f,
            (float)((light_state.fog_color >>  8) & 0xffU) / 255.0f,
            1.0f);
      if (gles.cube_fog_near_uniform >= 0 && gles.Uniform1f)
         gles.Uniform1f(gles.cube_fog_near_uniform, light_state.fog_near);
      if (gles.cube_fog_far_uniform >= 0 && gles.Uniform1f)
         gles.Uniform1f(gles.cube_fog_far_uniform, light_state.fog_far);
   }
   /* texture (unit 0) */
   GLuint mesh_gl_tex = 0;
   if (mesh->texture_handle > 0) {
      struct nova64_texture *tex = texture_from_handle(mesh->texture_handle);
      if (tex && tex->gl_name)
         mesh_gl_tex = tex->gl_name;
   }
   if (gles.cube_has_texture_uniform >= 0)
      gles.Uniform1i(gles.cube_has_texture_uniform, mesh_gl_tex ? 1 : 0);
   if (mesh_gl_tex) {
      gles.ActiveTexture(GL_TEXTURE0);
      gles.BindTexture(GL_TEXTURE_2D, mesh_gl_tex);
      if (gles.cube_texture_uniform >= 0)
         gles.Uniform1i(gles.cube_texture_uniform, 0);
   }
   /* normal map (unit 2) */
   GLuint mesh_gl_nrm = 0;
   if (mesh->normal_map_handle > 0) {
      struct nova64_texture *ntex = texture_from_handle(mesh->normal_map_handle);
      if (ntex && ntex->gl_name)
         mesh_gl_nrm = ntex->gl_name;
   }
   if (gles.cube_has_normal_map_uniform >= 0)
      gles.Uniform1i(gles.cube_has_normal_map_uniform, mesh_gl_nrm ? 1 : 0);
   if (mesh_gl_nrm) {
      gles.ActiveTexture(GL_TEXTURE2);
      gles.BindTexture(GL_TEXTURE_2D, mesh_gl_nrm);
      if (gles.cube_normal_map_uniform >= 0)
         gles.Uniform1i(gles.cube_normal_map_uniform, 2);
      gles.ActiveTexture(GL_TEXTURE0);
   }
   /* emissive */
   if (gles.cube_emissive_color_uniform >= 0) {
      uint32_t ec = mesh->emissive_color;
      gles.Uniform4f(gles.cube_emissive_color_uniform,
         (float)((ec >> 24) & 0xffU) / 255.0f,
         (float)((ec >> 16) & 0xffU) / 255.0f,
         (float)((ec >>  8) & 0xffU) / 255.0f,
         1.0f);
   }
   if (gles.cube_emissive_intensity_uniform >= 0 && gles.Uniform1f)
      gles.Uniform1f(gles.cube_emissive_intensity_uniform, mesh->emissive_intensity);
   /* roughness / metalness */
   if (gles.cube_roughness_uniform >= 0 && gles.Uniform1f)
      gles.Uniform1f(gles.cube_roughness_uniform, mesh->roughness);
   if (gles.cube_metalness_uniform >= 0 && gles.Uniform1f)
      gles.Uniform1f(gles.cube_metalness_uniform, mesh->metalness);
   /* UV transforms */
   if (gles.cube_uv_offset_uniform >= 0 && gles.Uniform2f)
      gles.Uniform2f(gles.cube_uv_offset_uniform, mesh->uv_offset[0], mesh->uv_offset[1]);
   if (gles.cube_uv_scale_uniform >= 0 && gles.Uniform2f)
      gles.Uniform2f(gles.cube_uv_scale_uniform, mesh->uv_scale[0], mesh->uv_scale[1]);
   /* shadow map */
   {
      bool do_shadow = gles.shadow_depth_tex && mesh->receive_shadow && g_shadow_map_size > 0;
      if (gles.cube_shadow_enabled_uniform >= 0)
         gles.Uniform1i(gles.cube_shadow_enabled_uniform, do_shadow ? 1 : 0);
      if (do_shadow) {
         float model2[16], shadow_mvp[16];
         mat4_world_transform(model2, mesh);
         mat4_multiply(shadow_mvp, g_shadow_light_vp, model2);
         if (gles.cube_shadow_mvp_uniform >= 0)
            gles.UniformMatrix4fv(gles.cube_shadow_mvp_uniform, 1, GL_FALSE, shadow_mvp);
         if (gles.cube_shadow_texel_size_uniform >= 0 && gles.Uniform1f)
            gles.Uniform1f(gles.cube_shadow_texel_size_uniform, 1.0f / (float)g_shadow_map_size);
         if (gles.cube_shadow_map_uniform >= 0) {
            gles.ActiveTexture(GL_TEXTURE1);
            gles.BindTexture(GL_TEXTURE_2D, gles.shadow_depth_tex);
            gles.Uniform1i(gles.cube_shadow_map_uniform, 1);
            gles.ActiveTexture(GL_TEXTURE0);
         }
      } else {
         if (gles.cube_shadow_mvp_uniform >= 0) {
            /* Identity matrix so v_shadow_coord stays valid */
            static const float identity[16] = {
               1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
            };
            gles.UniformMatrix4fv(gles.cube_shadow_mvp_uniform, 1, GL_FALSE, identity);
         }
      }
   }
   /* blend mode */
   bool mesh_transparent = mesh->opacity < 0.999f;
   bool did_blend = false;
   if (mesh->mesh_blend == NOVA64_MESH_BLEND_ADDITIVE) {
      gles.Enable(GL_BLEND);
      gles.BlendFunc(GL_SRC_ALPHA, GL_ONE);
      did_blend = true;
   } else if (mesh->mesh_blend == NOVA64_MESH_BLEND_MULTIPLY) {
      gles.Enable(GL_BLEND);
      gles.BlendFunc(GL_DST_COLOR, GL_ZERO);
      did_blend = true;
   } else if (mesh_transparent) {
      gles.Enable(GL_BLEND);
      gles.BlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
      did_blend = true;
   }
   gles.BindBuffer(GL_ARRAY_BUFFER, vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);
   gles.EnableVertexAttribArray((GLuint)gles.cube_position_attrib);
   gles.EnableVertexAttribArray((GLuint)gles.cube_normal_attrib);
   gles.VertexAttribPointer((GLuint)gles.cube_position_attrib, 3, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 6), NULL);
   gles.VertexAttribPointer((GLuint)gles.cube_normal_attrib, 3, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 6), (const void *)(uintptr_t)(sizeof(GLfloat) * 3));
   gles.DrawElements(GL_TRIANGLES, index_count, GL_UNSIGNED_SHORT, NULL);
   gles.DisableVertexAttribArray((GLuint)gles.cube_normal_attrib);
   gles.DisableVertexAttribArray((GLuint)gles.cube_position_attrib);
   if (did_blend)
      gles.Disable(GL_BLEND);
}

static void render_gles_cube(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.cube_vbo, gles.cube_ibo, 36);
}

static void render_gles_plane(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.plane_vbo, gles.plane_ibo, 6);
}

static void render_gles_sphere(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.sphere_vbo, gles.sphere_ibo, 24);
}

/* Capsule and cylinder use the sphere proxy geometry until dedicated VBOs are built */
static void render_gles_capsule(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.sphere_vbo, gles.sphere_ibo, 24);
}

static void render_gles_cylinder(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.sphere_vbo, gles.sphere_ibo, 24);
}

static void render_gles_custom_mesh(struct nova64_mesh *mesh, const float view_projection[16])
{
   if (!mesh->custom_verts || mesh->custom_vert_count == 0 ||
       !mesh->custom_indices || mesh->custom_index_count == 0)
      return;
   /* Lazy GPU upload on first draw */
   if (!mesh->gl_custom_vbo && gles.GenBuffers && gles.BindBuffer && gles.BufferData) {
      gles.GenBuffers(1, &mesh->gl_custom_vbo);
      gles.BindBuffer(GL_ARRAY_BUFFER, mesh->gl_custom_vbo);
      gles.BufferData(GL_ARRAY_BUFFER,
         (GLsizeiptr)(mesh->custom_vert_count * 6 * sizeof(float)),
         mesh->custom_verts, GL_STATIC_DRAW);
      gles.GenBuffers(1, &mesh->gl_custom_ibo);
      gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, mesh->gl_custom_ibo);
      gles.BufferData(GL_ELEMENT_ARRAY_BUFFER,
         (GLsizeiptr)(mesh->custom_index_count * sizeof(uint16_t)),
         mesh->custom_indices, GL_STATIC_DRAW);
      gles.BindBuffer(GL_ARRAY_BUFFER, 0);
      gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
   }
   if (mesh->gl_custom_vbo && mesh->gl_custom_ibo)
      render_gles_primitive(mesh, view_projection,
         mesh->gl_custom_vbo, mesh->gl_custom_ibo, (GLsizei)mesh->custom_index_count);
}

static void render_gles_instanced_mesh(const struct nova64_mesh *mesh, const float view_projection[16])
{
   if (!mesh->instance_transforms || mesh->instance_count <= 0) return;

   GLuint vbo, ibo; GLsizei idx_count;
   switch (mesh->instance_geometry) {
      case 1: vbo = gles.sphere_vbo; ibo = gles.sphere_ibo; idx_count = 24; break;
      case 2: vbo = gles.plane_vbo;  ibo = gles.plane_ibo;  idx_count = 6;  break;
      case 3: /* capsule */ vbo = gles.sphere_vbo; ibo = gles.sphere_ibo; idx_count = 24; break;
      case 4: /* cylinder */ vbo = gles.sphere_vbo; ibo = gles.sphere_ibo; idx_count = 24; break;
      default: vbo = gles.cube_vbo; ibo = gles.cube_ibo; idx_count = 36; break;
   }

   /* Set material uniforms once — shared across all instances */
   uint32_t color = mesh->color;
   float r = (float)((color >> 24) & 0xffU) / 255.0f;
   float g = (float)((color >> 16) & 0xffU) / 255.0f;
   float b = (float)((color >> 8)  & 0xffU) / 255.0f;
   float a = ((float)(color & 0xffU) / 255.0f) * clamp_float(mesh->opacity, 0.0f, 1.0f);

   gles.UseProgram(gles.cube_program);
   gles.Uniform4f(gles.cube_color_uniform, r, g, b, a);

   uint32_t ambient = color_with_intensity(light_state.ambient, light_state.ambient_intensity);
   gles.Uniform4f(gles.cube_ambient_uniform,
      (float)((ambient >> 24) & 0xffU) / 255.0f,
      (float)((ambient >> 16) & 0xffU) / 255.0f,
      (float)((ambient >> 8)  & 0xffU) / 255.0f,
      (float)(ambient & 0xffU) / 255.0f);
   gles.Uniform4f(gles.cube_light_direction_uniform,
      light_state.direction[0], light_state.direction[1], light_state.direction[2], 0.0f);
   if (gles.cube_fog_enabled_uniform >= 0)
      gles.Uniform1i(gles.cube_fog_enabled_uniform, light_state.fog_enabled ? 1 : 0);
   if (gles.cube_shadow_enabled_uniform >= 0)
      gles.Uniform1i(gles.cube_shadow_enabled_uniform, 0);
   if (gles.cube_has_texture_uniform >= 0)
      gles.Uniform1i(gles.cube_has_texture_uniform, 0);
   if (gles.cube_has_normal_map_uniform >= 0)
      gles.Uniform1i(gles.cube_has_normal_map_uniform, 0);

   /* Per-instance draw loop */
   gles.BindBuffer(GL_ARRAY_BUFFER, vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);
   gles.EnableVertexAttribArray((GLuint)gles.cube_position_attrib);
   gles.EnableVertexAttribArray((GLuint)gles.cube_normal_attrib);
   gles.VertexAttribPointer((GLuint)gles.cube_position_attrib, 3, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 6), NULL);
   gles.VertexAttribPointer((GLuint)gles.cube_normal_attrib, 3, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 6), (const void *)(uintptr_t)(sizeof(GLfloat) * 3));

   for (int j = 0; j < mesh->instance_count; j++) {
      const float *model = mesh->instance_transforms + j * 16;
      float mvp[16];
      mat4_multiply(mvp, view_projection, model);
      gles.UniformMatrix4fv(gles.cube_mvp_uniform, 1, GL_FALSE, mvp);
      /* Normal matrix: upper-left 3x3 of model (adequate for rigid + uniform scale) */
      float nm[9] = {
         model[0], model[1], model[2],
         model[4], model[5], model[6],
         model[8], model[9], model[10]
      };
      gles.UniformMatrix3fv(gles.cube_normal_matrix_uniform, 1, GL_FALSE, nm);
      gles.DrawElements(GL_TRIANGLES, idx_count, GL_UNSIGNED_SHORT, NULL);
   }

   gles.DisableVertexAttribArray((GLuint)gles.cube_normal_attrib);
   gles.DisableVertexAttribArray((GLuint)gles.cube_position_attrib);
}

/* ---- Equirectangular skybox ------------------------------------------------ */

static bool gles_create_skybox_program(void)
{
   static const char *vertex_source =
      "attribute vec2 a_position;\n"
      "varying vec2 v_ndc;\n"
      "void main() {\n"
      "  v_ndc = a_position;\n"
      "  gl_Position = vec4(a_position, 0.999, 1.0);\n"
      "}\n";
   static const char *fragment_source =
      "precision mediump float;\n"
      "varying vec2 v_ndc;\n"
      "uniform mat4 u_inv_vp;\n"
      "uniform sampler2D u_skybox_tex;\n"
      "void main() {\n"
      "  vec4 world = u_inv_vp * vec4(v_ndc, 1.0, 1.0);\n"
      "  vec3 dir = normalize(world.xyz / world.w);\n"
      "  float u = atan(dir.z, dir.x) / (2.0 * 3.14159265) + 0.5;\n"
      "  float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265 + 0.5;\n"
      "  gl_FragColor = texture2D(u_skybox_tex, vec2(u, v));\n"
      "}\n";

   GLuint vertex = gles_compile_shader(GL_VERTEX_SHADER, vertex_source);
   GLuint fragment = gles_compile_shader(GL_FRAGMENT_SHADER, fragment_source);
   if (!vertex || !fragment) {
      if (vertex)  gles.DeleteShader(vertex);
      if (fragment) gles.DeleteShader(fragment);
      return false;
   }
   GLuint program = gles.CreateProgram();
   gles.AttachShader(program, vertex);
   gles.AttachShader(program, fragment);
   gles.LinkProgram(program);
   gles.DeleteShader(vertex);
   gles.DeleteShader(fragment);
   GLint status = 0;
   gles.GetProgramiv(program, GL_LINK_STATUS, &status);
   if (!status) {
      gles.DeleteProgram(program);
      nova64_log_line(RETRO_LOG_WARN, "[nova64] skybox program link failed; skybox disabled");
      return false;
   }
   gles.skybox_program = program;
   gles.skybox_position_attrib    = gles.GetAttribLocation(program, "a_position");
   gles.skybox_inv_view_proj_uniform = gles.GetUniformLocation(program, "u_inv_vp");
   gles.skybox_texture_uniform    = gles.GetUniformLocation(program, "u_skybox_tex");
   gles.skybox_resources_ready = true;
   return gles.skybox_position_attrib >= 0;
}

static void gles_destroy_skybox_resources(void)
{
   if (gles.skybox_program && gles.DeleteProgram)
      gles.DeleteProgram(gles.skybox_program);
   gles.skybox_program = 0;
   gles.skybox_resources_ready = false;
}

/* Renders a full-screen equirectangular skybox using the texture at
   g_skybox_tex_handle.  Must be called after Clear() and before any
   geometry so depth writes overwrite the background pixels. */
static void render_gles_skybox(const float view[16], const float projection[16])
{
   if (g_skybox_tex_handle <= 0)
      return;
   struct nova64_texture *tex = texture_from_handle(g_skybox_tex_handle);
   if (!tex || !tex->gl_name)
      return;

   if (!gles.skybox_resources_ready) {
      if (!gles_create_skybox_program())
         return;
   }

   float vp[16];
   float inv_vp[16];
   mat4_multiply(vp, projection, view);
   mat4_inverse(inv_vp, vp);

   gles.Disable(GL_DEPTH_TEST);
   gles.UseProgram(gles.skybox_program);

   gles.ActiveTexture(GL_TEXTURE0);
   gles.BindTexture(GL_TEXTURE_2D, tex->gl_name);
   gles.Uniform1i(gles.skybox_texture_uniform, 0);
   gles.UniformMatrix4fv(gles.skybox_inv_view_proj_uniform, 1, GL_FALSE, inv_vp);

   /* Re-use the overlay quad VBO (x, y, u, v interleaved — stride = 4 floats) */
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.overlay_vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.overlay_ibo);
   gles.EnableVertexAttribArray((GLuint)gles.skybox_position_attrib);
   gles.VertexAttribPointer((GLuint)gles.skybox_position_attrib, 2, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 4), NULL);
   gles.DrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, NULL);
   gles.DisableVertexAttribArray((GLuint)gles.skybox_position_attrib);

   gles.BindBuffer(GL_ARRAY_BUFFER, 0);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
   gles.Enable(GL_DEPTH_TEST);
}

static void render_gles_overlay(void)
{
   if (!convert_framebuffer_to_overlay_rgba())
      return;

   gles.ActiveTexture(GL_TEXTURE0);
   gles.BindTexture(GL_TEXTURE_2D, gles.overlay_texture);
   gles.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, NOVA64_WIDTH, NOVA64_HEIGHT,
      GL_RGBA, GL_UNSIGNED_BYTE, overlay_rgba_framebuffer);

   gles.Disable(GL_DEPTH_TEST);
   gles.Enable(GL_BLEND);
   gles.BlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
   gles.UseProgram(gles.overlay_program);
   gles.Uniform1i(gles.overlay_texture_uniform, 0);
   gles.BindBuffer(GL_ARRAY_BUFFER, gles.overlay_vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.overlay_ibo);
   gles.EnableVertexAttribArray((GLuint)gles.overlay_position_attrib);
   gles.EnableVertexAttribArray((GLuint)gles.overlay_uv_attrib);
   gles.VertexAttribPointer((GLuint)gles.overlay_position_attrib, 2, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 4), NULL);
   gles.VertexAttribPointer((GLuint)gles.overlay_uv_attrib, 2, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 4), (const void *)(sizeof(GLfloat) * 2));
   gles.DrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, NULL);
   gles.DisableVertexAttribArray((GLuint)gles.overlay_uv_attrib);
   gles.DisableVertexAttribArray((GLuint)gles.overlay_position_attrib);
   gles.Disable(GL_BLEND);
   gles.Enable(GL_DEPTH_TEST);
}

static bool gles_has_fbo_procs(void)
{
   return gles.GenFramebuffers && gles.BindFramebuffer && gles.FramebufferTexture2D &&
          gles.CheckFramebufferStatus && gles.DeleteFramebuffers &&
          gles.GenRenderbuffers && gles.BindRenderbuffer && gles.RenderbufferStorage &&
          gles.FramebufferRenderbuffer && gles.DeleteRenderbuffers;
}

static bool gles_create_post_program(void)
{
   static const char *vertex_source =
      "attribute vec2 a_position;\n"
      "attribute vec2 a_uv;\n"
      "varying vec2 v_uv;\n"
      "void main() {\n"
      "  v_uv = a_uv;\n"
      "  gl_Position = vec4(a_position, 0.0, 1.0);\n"
      "}\n";
   /* Post-processing fragment shader: CRT, vignette, pixelate, bloom, chromatic, colorgrade, posterize */
   static const char *fragment_source =
      "precision mediump float;\n"
      "varying vec2 v_uv;\n"
      "uniform sampler2D u_scene;\n"
      "uniform int u_crt;\n"
      "uniform float u_vignette;\n"
      "uniform int u_pixelate;\n"
      "uniform vec2 u_resolution;\n"
      "uniform float u_bloom;\n"
      "uniform float u_chromatic;\n"
      "uniform vec3 u_color_grade;\n"
      "uniform int u_posterize;\n"
      "void main() {\n"
      "  vec2 uv = v_uv;\n"
      "  if (u_pixelate > 0) {\n"
      "    float px = float(u_pixelate) / u_resolution.x;\n"
      "    float py = float(u_pixelate) / u_resolution.y;\n"
      "    uv = floor(uv / vec2(px, py)) * vec2(px, py) + vec2(px, py) * 0.5;\n"
      "  }\n"
      /* chromatic aberration: shift R/B channels along screen radial */
      "  vec4 color;\n"
      "  if (u_chromatic > 0.0) {\n"
      "    vec2 dir = (uv - 0.5) * u_chromatic;\n"
      "    color.r = texture2D(u_scene, uv + dir).r;\n"
      "    color.g = texture2D(u_scene, uv).g;\n"
      "    color.b = texture2D(u_scene, uv - dir).b;\n"
      "    color.a = 1.0;\n"
      "  } else {\n"
      "    color = texture2D(u_scene, uv);\n"
      "  }\n"
      "  if (u_crt != 0) {\n"
      "    float line = sin(v_uv.y * u_resolution.y * 3.14159265);\n"
      "    float scanline = pow(abs(line) * 0.5 + 0.5, 0.35) * 0.88 + 0.12;\n"
      "    color.rgb *= scanline;\n"
      "    vec2 centered = uv - 0.5;\n"
      "    float barrel = dot(centered, centered) * 0.08;\n"
      "    uv = uv + centered * barrel;\n"
      "    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)\n"
      "      color = vec4(0.0, 0.0, 0.0, 1.0);\n"
      "    else\n"
      "      color = texture2D(u_scene, uv) * vec4(color.rgb / (texture2D(u_scene, v_uv).rgb + 0.001), color.a);\n"
      "  }\n"
      /* bloom: 5-tap cross bright-pass added back */
      "  if (u_bloom > 0.0) {\n"
      "    vec2 ts = vec2(2.0 / u_resolution.x, 2.0 / u_resolution.y);\n"
      "    vec3 s = texture2D(u_scene, uv + vec2(ts.x, 0.0)).rgb\n"
      "           + texture2D(u_scene, uv - vec2(ts.x, 0.0)).rgb\n"
      "           + texture2D(u_scene, uv + vec2(0.0, ts.y)).rgb\n"
      "           + texture2D(u_scene, uv - vec2(0.0, ts.y)).rgb;\n"
      "    vec3 avg = s * 0.25;\n"
      "    float luma = dot(avg, vec3(0.299, 0.587, 0.114));\n"
      "    color.rgb += avg * max(0.0, luma - 0.45) * u_bloom * 2.2;\n"
      "  }\n"
      /* posterize: quantize to N levels */
      "  if (u_posterize > 1) {\n"
      "    float levels = float(u_posterize);\n"
      "    color.rgb = floor(color.rgb * levels + 0.5) / levels;\n"
      "  }\n"
      /* color grade: per-channel tint multiply */
      "  color.rgb *= u_color_grade;\n"
      "  if (u_vignette > 0.0) {\n"
      "    vec2 cv = v_uv - 0.5;\n"
      "    float vt = clamp(1.0 - dot(cv, cv) * 4.0 * u_vignette, 0.0, 1.0);\n"
      "    color.rgb *= vt;\n"
      "  }\n"
      "  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), 1.0);\n"
      "}\n";

   GLuint vertex = gles_compile_shader(GL_VERTEX_SHADER, vertex_source);
   GLuint fragment = gles_compile_shader(GL_FRAGMENT_SHADER, fragment_source);
   if (!vertex || !fragment) {
      if (vertex) gles.DeleteShader(vertex);
      if (fragment) gles.DeleteShader(fragment);
      return false;
   }
   GLuint program = gles.CreateProgram();
   gles.AttachShader(program, vertex);
   gles.AttachShader(program, fragment);
   gles.LinkProgram(program);
   gles.DeleteShader(vertex);
   gles.DeleteShader(fragment);
   GLint status = 0;
   gles.GetProgramiv(program, GL_LINK_STATUS, &status);
   if (!status) {
      gles.DeleteProgram(program);
      nova64_log_line(RETRO_LOG_WARN, "[nova64] post program link failed; effects disabled");
      return false;
   }
   gles.post_program = program;
   gles.post_position_attrib = gles.GetAttribLocation(program, "a_position");
   gles.post_uv_attrib = gles.GetAttribLocation(program, "a_uv");
   gles.post_scene_uniform = gles.GetUniformLocation(program, "u_scene");
   gles.post_crt_uniform = gles.GetUniformLocation(program, "u_crt");
   gles.post_vignette_uniform = gles.GetUniformLocation(program, "u_vignette");
   gles.post_pixelate_uniform = gles.GetUniformLocation(program, "u_pixelate");
   gles.post_resolution_uniform = gles.GetUniformLocation(program, "u_resolution");
   gles.post_bloom_uniform = gles.GetUniformLocation(program, "u_bloom");
   gles.post_chromatic_uniform = gles.GetUniformLocation(program, "u_chromatic");
   gles.post_color_grade_uniform = gles.GetUniformLocation(program, "u_color_grade");
   gles.post_posterize_uniform = gles.GetUniformLocation(program, "u_posterize");
   return gles.post_position_attrib >= 0 && gles.post_uv_attrib >= 0;
}

static void gles_destroy_post_resources(void)
{
   if (!gles_has_fbo_procs())
      return;
   if (gles.post_fbo)
      gles.DeleteFramebuffers(1, &gles.post_fbo);
   if (gles.post_rbo)
      gles.DeleteRenderbuffers(1, &gles.post_rbo);
   if (gles.post_color_texture && gles.DeleteTextures)
      gles.DeleteTextures(1, &gles.post_color_texture);
   if (gles.post_program && gles.DeleteProgram)
      gles.DeleteProgram(gles.post_program);
   gles.post_fbo = 0;
   gles.post_rbo = 0;
   gles.post_color_texture = 0;
   gles.post_program = 0;
   gles.post_resources_ready = false;
}

static bool gles_init_post_resources(void)
{
   if (gles.post_resources_ready)
      return true;
   if (!gles_has_fbo_procs())
      return false;
   if (!gles_create_post_program())
      return false;

   gles.GenTextures(1, &gles.post_color_texture);
   gles.BindTexture(GL_TEXTURE_2D, gles.post_color_texture);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
   gles.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
   gles.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, NOVA64_WIDTH, NOVA64_HEIGHT, 0,
      GL_RGBA, GL_UNSIGNED_BYTE, NULL);
   gles.BindTexture(GL_TEXTURE_2D, 0);

   gles.GenRenderbuffers(1, &gles.post_rbo);
   gles.BindRenderbuffer(GL_RENDERBUFFER, gles.post_rbo);
   gles.RenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT16, NOVA64_WIDTH, NOVA64_HEIGHT);
   gles.BindRenderbuffer(GL_RENDERBUFFER, 0);

   gles.GenFramebuffers(1, &gles.post_fbo);
   gles.BindFramebuffer(GL_FRAMEBUFFER, gles.post_fbo);
   gles.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, gles.post_color_texture, 0);
   gles.FramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, gles.post_rbo);
   GLenum status = gles.CheckFramebufferStatus(GL_FRAMEBUFFER);
   gles.BindFramebuffer(GL_FRAMEBUFFER, 0);
   if (status != GL_FRAMEBUFFER_COMPLETE) {
      gles_destroy_post_resources();
      nova64_log_line(RETRO_LOG_WARN, "[nova64] post FBO incomplete; effects disabled");
      return false;
   }
   gles.post_resources_ready = true;
   nova64_log_line(RETRO_LOG_INFO, "[nova64] post-processing FBO ready");
   return true;
}

/* Renders the post-processing fullscreen quad using the FBO color texture.
   Uses the same overlay VBO/IBO quad (reused geometry, different program). */
static void render_gles_post_pass(GLuint hw_fbo)
{
   gles.BindFramebuffer(GL_FRAMEBUFFER, hw_fbo);
   gles.Viewport(0, 0, NOVA64_WIDTH, NOVA64_HEIGHT);
   gles.Disable(GL_DEPTH_TEST);
   gles.ClearColor(0.0f, 0.0f, 0.0f, 1.0f);
   gles.Clear(GL_COLOR_BUFFER_BIT);

   gles.UseProgram(gles.post_program);
   gles.ActiveTexture(GL_TEXTURE0);
   gles.BindTexture(GL_TEXTURE_2D, gles.post_color_texture);
   if (gles.post_scene_uniform >= 0)
      gles.Uniform1i(gles.post_scene_uniform, 0);
   if (gles.post_crt_uniform >= 0)
      gles.Uniform1i(gles.post_crt_uniform, post_state.crt_enabled ? 1 : 0);
   if (gles.post_vignette_uniform >= 0 && gles.Uniform1f)
      gles.Uniform1f(gles.post_vignette_uniform, post_state.vignette);
   if (gles.post_pixelate_uniform >= 0)
      gles.Uniform1i(gles.post_pixelate_uniform, post_state.pixelate);
   if (gles.post_resolution_uniform >= 0)
      gles.Uniform4f(gles.post_resolution_uniform,
         (float)NOVA64_WIDTH, (float)NOVA64_HEIGHT, 0.0f, 0.0f);
   if (gles.post_bloom_uniform >= 0 && gles.Uniform1f)
      gles.Uniform1f(gles.post_bloom_uniform, post_state.bloom);
   if (gles.post_chromatic_uniform >= 0 && gles.Uniform1f)
      gles.Uniform1f(gles.post_chromatic_uniform, post_state.chromatic);
   if (gles.post_color_grade_uniform >= 0 && gles.Uniform4f)
      gles.Uniform4f(gles.post_color_grade_uniform,
         post_state.color_grade[0], post_state.color_grade[1], post_state.color_grade[2], 0.0f);
   if (gles.post_posterize_uniform >= 0)
      gles.Uniform1i(gles.post_posterize_uniform, post_state.posterize);

   gles.BindBuffer(GL_ARRAY_BUFFER, gles.overlay_vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gles.overlay_ibo);
   gles.EnableVertexAttribArray((GLuint)gles.post_position_attrib);
   gles.EnableVertexAttribArray((GLuint)gles.post_uv_attrib);
   gles.VertexAttribPointer((GLuint)gles.post_position_attrib, 2, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 4), NULL);
   gles.VertexAttribPointer((GLuint)gles.post_uv_attrib, 2, GL_FLOAT, GL_FALSE,
      (GLsizei)(sizeof(GLfloat) * 4), (const void *)(sizeof(GLfloat) * 2));
   gles.DrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, NULL);
   gles.DisableVertexAttribArray((GLuint)gles.post_uv_attrib);
   gles.DisableVertexAttribArray((GLuint)gles.post_position_attrib);
   gles.BindTexture(GL_TEXTURE_2D, 0);
   gles.Enable(GL_DEPTH_TEST);
}

static void render_gles_scene(void)
{
   if (!gles.active || !gles_load_functions())
      return;

   if (!gles_init_resources())
      return;

   /* When post effects are requested and the FBO is available, render 3D into
      the offscreen post_fbo then blit to the RetroArch HW framebuffer via the
      post program. The 2D overlay is always composited last on top. */
   bool use_post = post_is_active() && gles_init_post_resources();
   GLuint hw_fbo = hw_render.get_current_framebuffer ? hw_render.get_current_framebuffer() : 0;

   /* Shadow pass — depth-only render from the light's perspective */
   bool use_shadow = g_shadow_map_size > 0 && gles_any_cast_shadow_mesh()
      && gles_init_shadow_resources();
   if (use_shadow) {
      build_shadow_light_vp(g_shadow_light_vp);
      render_gles_shadow_pass(g_shadow_light_vp);
      /* Restore main viewport and framebuffer */
      if (use_post)
         gles.BindFramebuffer(GL_FRAMEBUFFER, gles.post_fbo);
      else
         gles.BindFramebuffer(GL_FRAMEBUFFER, hw_fbo);
      gles.Viewport(0, 0, NOVA64_WIDTH, NOVA64_HEIGHT);
   }

   if (!use_shadow && use_post)
      gles.BindFramebuffer(GL_FRAMEBUFFER, gles.post_fbo);

   uint32_t clear_color;
   if (sky_color_enabled) {
      clear_color = sky_top_color;
   } else {
      clear_color = color_with_intensity(light_state.ambient, light_state.ambient_intensity);
   }
   float r = (float)((clear_color >> 24) & 0xffU) / 255.0f;
   float g = (float)((clear_color >> 16) & 0xffU) / 255.0f;
   float b = (float)((clear_color >>  8) & 0xffU) / 255.0f;
   gles.Viewport(0, 0, NOVA64_WIDTH, NOVA64_HEIGHT);
   gles.Enable(GL_DEPTH_TEST);
   gles.ClearColor(r, g, b, 1.0f);
   gles.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

   float projection[16];
   float view[16];
   float view_projection[16];
   float up[3] = {0.0f, 1.0f, 0.0f};
   if (camera_state.is_ortho) {
      float hw = camera_state.ortho_width  * 0.5f;
      float hh = camera_state.ortho_height * 0.5f;
      mat4_ortho(projection, -hw, hw, -hh, hh, 0.05f, 100.0f);
   } else {
      mat4_perspective(projection, camera_state.fov, (float)NOVA64_WIDTH / (float)NOVA64_HEIGHT, 0.05f, 100.0f);
   }
   {
      float eye[3], tgt[3];
      float sx = (g_shake_intensity > 0.0f) ? (float)(perlin_noise_2d((double)frame_count * 0.31, 0.0) * g_shake_intensity) : 0.0f;
      float sy = (g_shake_intensity > 0.0f) ? (float)(perlin_noise_2d((double)frame_count * 0.31, 1.7) * g_shake_intensity) : 0.0f;
      eye[0] = camera_state.position[0] + sx; eye[1] = camera_state.position[1] + sy; eye[2] = camera_state.position[2];
      tgt[0] = camera_state.target[0]   + sx; tgt[1] = camera_state.target[1]   + sy; tgt[2] = camera_state.target[2];
      mat4_look_at(view, eye, tgt, up);
   }
   mat4_multiply(view_projection, projection, view);

   /* Draw equirectangular skybox behind all geometry (GLES only) */
   render_gles_skybox(view, projection);

   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (!meshes[i].used || !meshes[i].visible || meshes[i].opacity <= 0.0f)
         continue;
      if (meshes[i].type == NOVA64_MESH_CUBE)
         render_gles_cube(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_PLANE)
         render_gles_plane(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_SPHERE)
         render_gles_sphere(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_CAPSULE)
         render_gles_capsule(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_CYLINDER)
         render_gles_cylinder(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_CUSTOM)
         render_gles_custom_mesh(&meshes[i], view_projection);
      else if (meshes[i].type == NOVA64_MESH_INSTANCED)
         render_gles_instanced_mesh(&meshes[i], view_projection);
   }

   if (use_post) {
      /* Post pass: blit the FBO color texture to the RetroArch HW framebuffer */
      render_gles_post_pass(hw_fbo);
      /* Re-bind HW framebuffer so overlay compositing lands on the right target */
      gles.BindFramebuffer(GL_FRAMEBUFFER, hw_fbo);
   }

   render_gles_overlay();
}

static void renderer_context_reset(void)
{
   switch (renderer_preference) {
      case NOVA64_RENDERER_VULKAN12:
      case NOVA64_RENDERER_GLES3:
      default:
         gles_context_reset();
         break;
   }
}

static void renderer_context_destroy(void)
{
   switch (renderer_preference) {
      case NOVA64_RENDERER_VULKAN12:
      case NOVA64_RENDERER_GLES3:
      default:
         gles_context_destroy();
         break;
   }
}

static void renderer_request_hardware_context(retro_environment_t cb)
{
   renderer_preference = read_renderer_preference();
   if (renderer_preference == NOVA64_RENDERER_VULKAN12) {
      nova64_log_line(RETRO_LOG_WARN,
            "[nova64] Vulkan 1.2 renderer selected, but the Vulkan backend is staged; requesting OpenGL ES 3.1 fallback");
   } else {
      char renderer_message[96];
      snprintf(renderer_message, sizeof(renderer_message), "[nova64] renderer backend: %s",
            renderer_backend_name(renderer_preference));
      nova64_log_line(RETRO_LOG_INFO, renderer_message);
   }

   memset(&hw_render, 0, sizeof(hw_render));
   hw_render.context_type = RETRO_HW_CONTEXT_OPENGLES3;
   hw_render.context_reset = renderer_context_reset;
   hw_render.context_destroy = renderer_context_destroy;
   hw_render.depth = true;
   hw_render.stencil = false;
   hw_render.bottom_left_origin = true;
   hw_render.version_major = 3;
   hw_render.version_minor = 1;
   hw_render.cache_context = false;
   gles.requested = cb(RETRO_ENVIRONMENT_SET_HW_RENDER, &hw_render);
   if (!gles.requested)
      nova64_log_line(RETRO_LOG_WARN, "[nova64] GLES3 hardware rendering unavailable; using software 2D output");
}

static bool renderer_has_hardware_frame(void)
{
   switch (renderer_preference) {
      case NOVA64_RENDERER_VULKAN12:
      case NOVA64_RENDERER_GLES3:
      default:
         return gles.requested && gles.active;
   }
}

static void renderer_render_hardware_frame(void)
{
   switch (renderer_preference) {
      case NOVA64_RENDERER_VULKAN12:
      case NOVA64_RENDERER_GLES3:
      default:
         render_gles_scene();
         break;
   }
}

static char *read_file_to_memory(const char *path, size_t *out_size)
{
   FILE *file = fopen(path, "rb");
   if (!file)
      return NULL;
   if (fseek(file, 0, SEEK_END) != 0) {
      fclose(file);
      return NULL;
   }
   long length = ftell(file);
   if (length < 0) {
      fclose(file);
      return NULL;
   }
   rewind(file);
   char *buffer = (char *)malloc((size_t)length + 1);
   if (!buffer) {
      fclose(file);
      return NULL;
   }
   size_t read_count = fread(buffer, 1, (size_t)length, file);
   fclose(file);
   if (read_count != (size_t)length) {
      free(buffer);
      return NULL;
   }
   buffer[length] = '\0';
   *out_size = (size_t)length;
   return buffer;
}

static bool extract_zip_entry(const uint8_t *archive, size_t archive_size,
      uint32_t local_offset, uint32_t compressed_size, uint32_t uncompressed_size,
      uint16_t method, char **out_source, size_t *out_size)
{
   if ((size_t)local_offset + 30 > archive_size)
      return false;
   const uint8_t *local = archive + local_offset;
   if (read_u32_le(local) != NOVA64_ZIP_LOCAL_SIGNATURE)
      return false;

   uint16_t local_name_len = read_u16_le(local + 26);
   uint16_t local_extra_len = read_u16_le(local + 28);
   size_t data_offset = (size_t)local_offset + 30 + local_name_len + local_extra_len;
   if (data_offset > archive_size || compressed_size > archive_size - data_offset)
      return false;

   char *source = (char *)malloc((size_t)uncompressed_size + 1);
   if (!source)
      return false;

   if (method == 0) {
      if (compressed_size != uncompressed_size) {
         free(source);
         return false;
      }
      memcpy(source, archive + data_offset, uncompressed_size);
   } else if (method == 8) {
      z_stream stream;
      memset(&stream, 0, sizeof(stream));
      stream.next_in = (Bytef *)(archive + data_offset);
      stream.avail_in = compressed_size;
      stream.next_out = (Bytef *)source;
      stream.avail_out = uncompressed_size;
      if (inflateInit2(&stream, -MAX_WBITS) != Z_OK) {
         free(source);
         return false;
      }
      int result = inflate(&stream, Z_FINISH);
      inflateEnd(&stream);
      if (result != Z_STREAM_END || stream.total_out != uncompressed_size) {
         free(source);
         return false;
      }
   } else {
      free(source);
      return false;
   }

   source[uncompressed_size] = '\0';
   *out_source = source;
   *out_size = uncompressed_size;
   return true;
}

static bool extract_zip_named_entry(const uint8_t *archive, size_t archive_size,
      uint16_t entry_count, uint32_t central_offset, const char *expected_name,
      char **out_source, size_t *out_size)
{
   size_t offset = central_offset;
   for (uint16_t i = 0; i < entry_count && offset + 46 <= archive_size; i++) {
      const uint8_t *entry = archive + offset;
      if (read_u32_le(entry) != NOVA64_ZIP_CENTRAL_SIGNATURE)
         return false;
      uint16_t method = read_u16_le(entry + 10);
      uint32_t compressed_size = read_u32_le(entry + 20);
      uint32_t uncompressed_size = read_u32_le(entry + 24);
      uint16_t name_len = read_u16_le(entry + 28);
      uint16_t extra_len = read_u16_le(entry + 30);
      uint16_t comment_len = read_u16_le(entry + 32);
      uint32_t local_offset = read_u32_le(entry + 42);
      if (offset + 46 + name_len + extra_len + comment_len > archive_size)
         return false;

      const uint8_t *name = entry + 46;
      if (bytes_equal_name(name, name_len, expected_name))
         return extract_zip_entry(archive, archive_size, local_offset, compressed_size,
               uncompressed_size, method, out_source, out_size);
      offset += 46 + name_len + extra_len + comment_len;
   }
   return false;
}

static const char *skip_json_ws(const char *cursor, const char *end)
{
   while (cursor < end && (*cursor == ' ' || *cursor == '\t' || *cursor == '\r' || *cursor == '\n'))
      cursor++;
   return cursor;
}

static bool is_safe_package_path(const char *path)
{
   return path && path[0] && !strstr(path, "..") && path[0] != '/' && path[0] != '\\';
}

static void clear_package_assets(void)
{
   for (int i = 0; i < NOVA64_MAX_PACKAGE_ASSETS; i++) {
      free(package_assets[i].data);
      memset(&package_assets[i], 0, sizeof(package_assets[i]));
   }
}

static const struct nova64_package_asset *find_package_asset(const char *path)
{
   if (!path)
      return NULL;
   for (int i = 0; i < NOVA64_MAX_PACKAGE_ASSETS; i++) {
      if (package_assets[i].used && !strcmp(package_assets[i].path, path))
         return &package_assets[i];
   }
   return NULL;
}

static bool store_package_asset(const char *path, char *data, size_t size)
{
   if (!path || !data)
      return false;
   for (int i = 0; i < NOVA64_MAX_PACKAGE_ASSETS; i++) {
      if (package_assets[i].used && !strcmp(package_assets[i].path, path)) {
         free(package_assets[i].data);
         package_assets[i].data = (uint8_t *)data;
         package_assets[i].size = size;
         return true;
      }
   }
   for (int i = 0; i < NOVA64_MAX_PACKAGE_ASSETS; i++) {
      if (!package_assets[i].used) {
         package_assets[i].used = true;
         snprintf(package_assets[i].path, sizeof(package_assets[i].path), "%s", path);
         package_assets[i].data = (uint8_t *)data;
         package_assets[i].size = size;
         return true;
      }
   }
   return false;
}

static bool normalize_package_module_path(const char *base, const char *name, char *out, size_t out_size)
{
   if (!name || !out || out_size == 0 || strchr(name, '\\'))
      return false;

   char combined[512];
   if ((name[0] == '.' && name[1] == '/') || (name[0] == '.' && name[1] == '.' && name[2] == '/')) {
      char base_dir[256];
      base_dir[0] = '\0';
      if (base) {
         snprintf(base_dir, sizeof(base_dir), "%s", base);
         char *slash = strrchr(base_dir, '/');
         if (slash)
            slash[1] = '\0';
         else
            base_dir[0] = '\0';
      }
      if (snprintf(combined, sizeof(combined), "%s%s", base_dir, name) >= (int)sizeof(combined))
         return false;
   } else {
      if (snprintf(combined, sizeof(combined), "%s", name) >= (int)sizeof(combined))
         return false;
   }

   out[0] = '\0';
   char *cursor = combined;
   while (*cursor) {
      while (*cursor == '/')
         cursor++;
      char *segment = cursor;
      while (*cursor && *cursor != '/')
         cursor++;
      char saved = *cursor;
      *cursor = '\0';

      if (!strcmp(segment, "..")) {
         char *slash = strrchr(out, '/');
         if (slash)
            *slash = '\0';
         else
            return false;
      } else if (segment[0] && strcmp(segment, ".")) {
         size_t used = strlen(out);
         int written = snprintf(out + used, out_size - used, "%s%s", used ? "/" : "", segment);
         if (written < 0 || (size_t)written >= out_size - used)
            return false;
      }

      *cursor = saved;
      if (saved)
         cursor++;
   }

   return is_safe_package_path(out);
}

static char *js_module_normalize(JSContext *ctx, const char *module_base_name,
      const char *module_name, void *opaque)
{
   (void)opaque;
   char path[256];
   if (!normalize_package_module_path(module_base_name, module_name, path, sizeof(path))) {
      JS_ThrowReferenceError(ctx, "unsafe module import '%s'", module_name ? module_name : "");
      return NULL;
   }

   size_t len = strlen(path);
   char *normalized = (char *)js_malloc(ctx, len + 1);
   if (!normalized)
      return NULL;
   memcpy(normalized, path, len + 1);
   return normalized;
}

static JSModuleDef *js_module_loader(JSContext *ctx, const char *module_name, void *opaque)
{
   (void)opaque;
   const struct nova64_package_asset *asset = find_package_asset(module_name);
   if (!asset) {
      JS_ThrowReferenceError(ctx, "module not found '%s'", module_name ? module_name : "");
      return NULL;
   }
   JSValue compiled = JS_Eval(ctx, (const char *)asset->data, asset->size, module_name,
         JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
   if (JS_IsException(compiled))
      return NULL;
   return (JSModuleDef *)JS_VALUE_GET_PTR(compiled);
}

static bool make_directory_if_missing(const char *path)
{
   if (!path || !path[0])
      return false;
#ifdef _WIN32
   return _mkdir(path) == 0 || errno == EEXIST;
#else
   return mkdir(path, 0755) == 0 || errno == EEXIST;
#endif
}

static void sanitize_identifier(const char *input, char *out, size_t out_size, const char *fallback)
{
   if (!out || out_size == 0)
      return;

   size_t written = 0;
   if (input) {
      for (const char *cursor = input; *cursor && written + 1 < out_size; cursor++) {
         char ch = *cursor;
         bool safe = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
                     (ch >= '0' && ch <= '9') || ch == '-' || ch == '_';
         out[written++] = safe ? ch : '_';
      }
   }

   if (written == 0 && fallback) {
      while (*fallback && written + 1 < out_size)
         out[written++] = *fallback++;
   }
   out[written] = '\0';
}

static const char *path_basename(const char *path)
{
   if (!path || !path[0])
      return NULL;
   const char *base = path;
   for (const char *cursor = path; *cursor; cursor++) {
      if (*cursor == '/' || *cursor == '\\')
         base = cursor + 1;
   }
   return base;
}

static void update_storage_cart_id(void)
{
   char id_source[256];
   id_source[0] = '\0';
   if (package_manifest_name[0]) {
      snprintf(id_source, sizeof(id_source), "%s", package_manifest_name);
   } else {
      const char *base = path_basename(cart_path);
      if (base && base[0]) {
         size_t written = 0;
         while (base[written] && base[written] != '.' && written + 1 < sizeof(id_source)) {
            id_source[written] = base[written];
            written++;
         }
         id_source[written] = '\0';
      }
   }
   sanitize_identifier(id_source, storage_cart_id, sizeof(storage_cart_id), "cart");
}

static void refresh_storage_save_directory(void)
{
   const char *env_save_dir = getenv("NOVA64_SAVE_DIR");
   if (env_save_dir && env_save_dir[0]) {
      snprintf(storage_save_directory, sizeof(storage_save_directory), "%s", env_save_dir);
      return;
   }

   if (environ_cb) {
      const char *retro_save_dir = NULL;
      if (environ_cb(RETRO_ENVIRONMENT_GET_SAVE_DIRECTORY, &retro_save_dir) &&
            retro_save_dir && retro_save_dir[0]) {
         snprintf(storage_save_directory, sizeof(storage_save_directory), "%s", retro_save_dir);
         return;
      }
   }

   snprintf(storage_save_directory, sizeof(storage_save_directory), ".");
}

static bool storage_root_dir(char *out, size_t out_size)
{
   if (!out || out_size == 0)
      return false;
   if (!storage_save_directory[0])
      refresh_storage_save_directory();
   int len = snprintf(out, out_size, "%s%snova64", storage_save_directory, NOVA64_PATH_SEPARATOR);
   return len >= 0 && (size_t)len < out_size;
}

static bool storage_path_for_key(const char *key, char *out, size_t out_size)
{
   if (!key || !key[0] || !out || out_size == 0)
      return false;

   char safe_key[128];
   sanitize_identifier(key, safe_key, sizeof(safe_key), NULL);
   if (!safe_key[0])
      return false;

   if (!storage_save_directory[0])
      refresh_storage_save_directory();
   if (!storage_cart_id[0])
      update_storage_cart_id();

   char root[1200];
   if (!storage_root_dir(root, sizeof(root)))
      return false;
   if (!make_directory_if_missing(storage_save_directory) || !make_directory_if_missing(root))
      return false;

   int path_len = snprintf(out, out_size, "%s%s%s_%s.json", root, NOVA64_PATH_SEPARATOR,
         storage_cart_id[0] ? storage_cart_id : "cart", safe_key);
   return path_len >= 0 && (size_t)path_len < out_size;
}

static bool parse_manifest_string_field(const char *manifest, size_t manifest_size,
      const char *field, char *out, size_t out_size, bool require_safe_path)
{
   if (!manifest || !field || !out || out_size == 0)
      return false;

   const char *cursor = manifest;
   const char *end = manifest + manifest_size;
   char key_pattern[64];
   snprintf(key_pattern, sizeof(key_pattern), "\"%s\"", field);
   while (cursor < end) {
      const char *key = strstr(cursor, key_pattern);
      if (!key || key >= end)
         return false;
      cursor = key + strlen(key_pattern);
      cursor = skip_json_ws(cursor, end);
      if (cursor >= end || *cursor != ':')
         continue;
      cursor++;
      cursor = skip_json_ws(cursor, end);
      if (cursor >= end || *cursor != '"')
         return false;
      cursor++;
      size_t len = 0;
      while (cursor < end && *cursor != '"' && *cursor != '\\' && len + 1 < out_size)
         out[len++] = *cursor++;
      out[len] = '\0';
      if (len == 0)
         return false;
      if (require_safe_path && !is_safe_package_path(out))
         return false;
      return true;
   }
   return false;
}

static bool parse_manifest_main(const char *manifest, size_t manifest_size, char *out_path, size_t out_path_size)
{
   return parse_manifest_string_field(manifest, manifest_size, "main", out_path, out_path_size, true);
}

static void parse_manifest_asset_list_metadata(const char *manifest, size_t manifest_size,
      const uint8_t *archive, size_t archive_size, uint16_t entry_count, uint32_t central_offset)
{
   if (!manifest)
      return;

   const char *end = manifest + manifest_size;
   const char *key = strstr(manifest, "\"assets\"");
   if (!key || key >= end)
      return;
   const char *cursor = skip_json_ws(key + 8, end);
   if (cursor >= end || *cursor != ':')
      return;
   cursor = skip_json_ws(cursor + 1, end);
   if (cursor >= end || *cursor != '[')
      return;
   cursor++;

   while (cursor < end) {
      cursor = skip_json_ws(cursor, end);
      if (cursor >= end || *cursor == ']')
         break;
      if (*cursor != '"')
         return;
      cursor++;
      char path[256];
      size_t len = 0;
      while (cursor < end && *cursor != '"' && *cursor != '\\' && len + 1 < sizeof(path))
         path[len++] = *cursor++;
      path[len] = '\0';
      if (cursor >= end || *cursor != '"')
         return;
      if (is_safe_package_path(path)) {
         char *asset_data = NULL;
         size_t asset_size = 0;
         if (extract_zip_named_entry(archive, archive_size, entry_count, central_offset,
               path, &asset_data, &asset_size)) {
            if (package_manifest_asset_bytes + asset_size <= package_asset_quota_bytes &&
                  store_package_asset(path, asset_data, asset_size)) {
               package_manifest_asset_count++;
               package_manifest_asset_bytes += asset_size;
            } else {
               free(asset_data);
               package_asset_quota_rejected_count++;
            }
         } else {
            free(asset_data);
            package_manifest_missing_asset_count++;
         }
      }
      cursor++;
      cursor = skip_json_ws(cursor, end);
      if (cursor < end && *cursor == ',')
         cursor++;
   }
}

static void reset_package_manifest_metadata(void)
{
   clear_package_assets();
   const char *quota_text = getenv("NOVA64_ASSET_QUOTA");
   package_asset_quota_bytes = NOVA64_DEFAULT_ASSET_QUOTA_BYTES;
   if (quota_text && quota_text[0]) {
      char *end = NULL;
      unsigned long long value = strtoull(quota_text, &end, 10);
      if (end && *end == '\0')
         package_asset_quota_bytes = (size_t)value;
   }
   package_manifest_name[0] = '\0';
   package_manifest_title[0] = '\0';
   package_manifest_author[0] = '\0';
   package_manifest_version[0] = '\0';
   package_manifest_main[0] = '\0';
   package_manifest_asset_count = 0;
   package_manifest_missing_asset_count = 0;
   package_manifest_asset_bytes = 0;
   package_asset_quota_rejected_count = 0;
}

static bool extract_nova_code_js(const char *archive_text, size_t archive_size, char **out_source, size_t *out_size)
{
   const uint8_t *archive = (const uint8_t *)archive_text;
   if (archive_size < 22 || read_u32_le(archive) != NOVA64_ZIP_LOCAL_SIGNATURE)
      return false;

   size_t search = archive_size < NOVA64_ZIP_MAX_EOCD_SEARCH ? archive_size : NOVA64_ZIP_MAX_EOCD_SEARCH;
   size_t eocd_offset = archive_size;
   for (size_t back = 22; back <= search; back++) {
      size_t offset = archive_size - back;
      if (read_u32_le(archive + offset) == NOVA64_ZIP_EOCD_SIGNATURE) {
         eocd_offset = offset;
         break;
      }
   }
   if (eocd_offset == archive_size)
      return false;

   const uint8_t *eocd = archive + eocd_offset;
   uint16_t entry_count = read_u16_le(eocd + 10);
   uint32_t central_size = read_u32_le(eocd + 12);
   uint32_t central_offset = read_u32_le(eocd + 16);
   if ((size_t)central_offset + central_size > archive_size)
      return false;

   char *manifest = NULL;
   size_t manifest_size = 0;
   char manifest_main[256];
   if (extract_zip_named_entry(archive, archive_size, entry_count, central_offset,
         "manifest.json", &manifest, &manifest_size)) {
      parse_manifest_string_field(manifest, manifest_size, "name",
            package_manifest_name, sizeof(package_manifest_name), false);
      parse_manifest_string_field(manifest, manifest_size, "title",
            package_manifest_title, sizeof(package_manifest_title), false);
      parse_manifest_string_field(manifest, manifest_size, "author",
            package_manifest_author, sizeof(package_manifest_author), false);
      parse_manifest_string_field(manifest, manifest_size, "version",
            package_manifest_version, sizeof(package_manifest_version), false);
      parse_manifest_asset_list_metadata(manifest, manifest_size, archive, archive_size,
            entry_count, central_offset);
      if (parse_manifest_main(manifest, manifest_size, manifest_main, sizeof(manifest_main))) {
         snprintf(package_manifest_main, sizeof(package_manifest_main), "%s", manifest_main);
         bool loaded_main = extract_zip_named_entry(archive, archive_size, entry_count,
               central_offset, manifest_main, out_source, out_size);
         free(manifest);
         if (loaded_main) {
            if (log_cb)
               log_cb(RETRO_LOG_INFO, "[nova64] extracted %s from .nova manifest\n", manifest_main);
            return true;
         }
      } else {
         free(manifest);
      }
   }

   const char *candidate_names[] = {
      "code.js",
      "game/code.js",
      "src/code.js",
   };

   for (size_t c = 0; c < sizeof(candidate_names) / sizeof(candidate_names[0]); c++) {
      if (extract_zip_named_entry(archive, archive_size, entry_count, central_offset,
            candidate_names[c], out_source, out_size)) {
         if (log_cb)
            log_cb(RETRO_LOG_INFO, "[nova64] extracted %s from .nova package\n", candidate_names[c]);
         return true;
      }
   }
   return false;
}

void RETRO_CALLCONV retro_init(void)
{
   framebuffer = (uint32_t *)calloc((size_t)NOVA64_WIDTH * NOVA64_HEIGHT, sizeof(uint32_t));
   rgb565_framebuffer = (uint16_t *)calloc((size_t)NOVA64_WIDTH * NOVA64_HEIGHT, sizeof(uint16_t));
   overlay_rgba_framebuffer = (uint8_t *)calloc((size_t)NOVA64_WIDTH * NOVA64_HEIGHT * 4, sizeof(uint8_t));
   if (!framebuffer || !rgb565_framebuffer || !overlay_rgba_framebuffer) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] failed to allocate framebuffers");
      free(framebuffer);
      free(rgb565_framebuffer);
      free(overlay_rgba_framebuffer);
      framebuffer = NULL;
      rgb565_framebuffer = NULL;
      overlay_rgba_framebuffer = NULL;
      return;
   }

   clear_framebuffer(rgba8(0, 0, 0, 255));
   reset_scene_state();
   const char *command_log = getenv("NOVA64_RENDER_COMMAND_LOG");
   if (command_log && command_log[0]) {
      snprintf(renderer_command_log_path, sizeof(renderer_command_log_path), "%s", command_log);
      FILE *file = fopen(renderer_command_log_path, "wb");
      if (file) {
         fprintf(file, "nova64-render-command-log-v1\n");
         fclose(file);
      } else {
         renderer_command_log_path[0] = '\0';
         nova64_log_line(RETRO_LOG_WARN, "[nova64] could not initialize renderer command log");
      }
   } else {
      renderer_command_log_path[0] = '\0';
   }
   initialized = true;
   nova64_log_line(RETRO_LOG_INFO, "[nova64] core initialized");
}

void RETRO_CALLCONV retro_deinit(void)
{
   js_host_free();
   clear_textures();
   clear_render_targets();
   reset_package_manifest_metadata();
   free(framebuffer);
   free(rgb565_framebuffer);
   free(overlay_rgba_framebuffer);
   free(cart_content);
   framebuffer = NULL;
   rgb565_framebuffer = NULL;
   overlay_rgba_framebuffer = NULL;
   cart_content = NULL;
   cart_size = 0;
   initialized = false;
}

unsigned RETRO_CALLCONV retro_api_version(void)
{
   return RETRO_API_VERSION;
}

void RETRO_CALLCONV retro_set_controller_port_device(unsigned port, unsigned device)
{
   (void)port;
   (void)device;
}

void RETRO_CALLCONV retro_get_system_info(struct retro_system_info *info)
{
   memset(info, 0, sizeof(*info));
   info->library_name = "Nova64";
   info->library_version = NOVA64_CORE_VERSION;
   info->valid_extensions = "js|nova";
   info->need_fullpath = false;
   info->block_extract = false;
}

void RETRO_CALLCONV retro_get_system_av_info(struct retro_system_av_info *info)
{
   memset(info, 0, sizeof(*info));
   info->timing.fps = NOVA64_FPS;
   info->timing.sample_rate = NOVA64_SAMPLE_RATE;
   info->geometry.base_width  = g_res_width;
   info->geometry.base_height = g_res_height;
   info->geometry.max_width   = 1280;
   info->geometry.max_height  = 720;
   info->geometry.aspect_ratio = (float)g_res_width / (float)g_res_height;
}

void RETRO_CALLCONV retro_set_environment(retro_environment_t cb)
{
   environ_cb = cb;

   bool no_content = false;
   cb(RETRO_ENVIRONMENT_SET_SUPPORT_NO_GAME, &no_content);

   struct retro_log_callback logger;
   if (cb(RETRO_ENVIRONMENT_GET_LOG_INTERFACE, &logger))
      log_cb = logger.log;

   set_core_variables();
   cb(RETRO_ENVIRONMENT_SET_PIXEL_FORMAT, &pixel_format);
   renderer_request_hardware_context(cb);

   /* Try to acquire rumble interface */
   struct nova64_rumble_iface rif;
   memset(&rif, 0, sizeof(rif));
   if (cb(RETRO_ENVIRONMENT_GET_RUMBLE_INTERFACE, &rif) && rif.set_rumble_state)
      rumble_fn = rif.set_rumble_state;

   /* Signal achievement support stub (RETRO_ENVIRONMENT_SET_SUPPORT_ACHIEVEMENTS = 63) */
   bool achievements_supported = true;
   cb(63, &achievements_supported);

   /* Apply audio latency hint (RETRO_ENVIRONMENT_SET_MINIMUM_AUDIO_LATENCY = 62) */
   {
      unsigned latency_ms = read_audio_latency_ms();
      if (latency_ms > 0)
         cb(62, &latency_ms);
   }

   /* Expose cheevos RAM via SET_MEMORY_MAPS (RETRO_ENVIRONMENT = 36) */
   {
      static struct retro_memory_descriptor mdesc;
      static struct retro_memory_map mmap;
      memset(&mdesc, 0, sizeof(mdesc));
      mdesc.flags    = RETRO_MEMDESC_SYSTEM_RAM;
      mdesc.ptr      = g_cheevos_ram;
      mdesc.start    = 0x0000;
      mdesc.len      = NOVA64_CHEEVOS_RAM_SIZE;
      mmap.descriptors = &mdesc;
      mmap.num_descriptors = 1;
      cb(36, &mmap);
   }
}

void RETRO_CALLCONV retro_set_audio_sample(retro_audio_sample_t cb)
{
   audio_cb = cb;
}

void RETRO_CALLCONV retro_set_audio_sample_batch(retro_audio_sample_batch_t cb)
{
   audio_batch_cb = cb;
}

void RETRO_CALLCONV retro_set_input_poll(retro_input_poll_t cb)
{
   input_poll_cb = cb;
}

void RETRO_CALLCONV retro_set_input_state(retro_input_state_t cb)
{
   input_state_cb = cb;
}

void RETRO_CALLCONV retro_set_video_refresh(retro_video_refresh_t cb)
{
   video_cb = cb;
}

void RETRO_CALLCONV retro_reset(void)
{
   memset(buttons, 0, sizeof(buttons));
   memset(previous_buttons, 0, sizeof(previous_buttons));
   memset(pressed_buttons, 0, sizeof(pressed_buttons));
   memset(key_held, 0, sizeof(key_held));
   memset(key_prev_held, 0, sizeof(key_prev_held));
   mouse_rel_x = 0; mouse_rel_y = 0;
   memset(mouse_btns, 0, sizeof(mouse_btns));
   memset(mouse_prev_btns, 0, sizeof(mouse_prev_btns));
   touch_x = touch_y = touch_count = 0;
   memset(analog_axes, 0, sizeof(analog_axes));
   memset(analog_triggers, 0, sizeof(analog_triggers));
   memset(mp_buttons, 0, sizeof(mp_buttons));
   memset(mp_prev_buttons, 0, sizeof(mp_prev_buttons));
   memset(mp_pressed_buttons, 0, sizeof(mp_pressed_buttons));
   clip_active = false;
   clip_stack_depth = 0;
   cam2d_x = cam2d_y = 0;
   cam2d_zoom = 1.0f;
   cam2d_rotation = 0.0f;
   camera2d_stack_depth = 0;
   blend_2d_mode = NOVA64_BLEND_NORMAL;
   blend_stack_depth = 0;
   palette_stack_depth = 0;
   reset_palette_state();
   frame_count = 0;
   clear_framebuffer(rgba8(0, 0, 0, 255));
   reset_scene_state();
   reset_audio_state();
   reset_post_state();
   clear_textures();
   clear_render_targets();
   destroy_all_tilemaps();
   clear_all_spritesheets();
   memset(perf_timers, 0, sizeof(perf_timers));
   reset_colliders();
   reset_particles();
   reset_fonts();
   memset(audio_channels, 0, sizeof(audio_channels));
   memset(g_tweens, 0, sizeof(g_tweens));
   memset(g_timers, 0, sizeof(g_timers));
   memset(g_grids,  0, sizeof(g_grids));
   reset_canvases();
   g_shake_intensity = 0.0f; g_shake_timer = 0.0f; g_shake_duration = 0.0f;
   g_flash_timer = 0.0f; g_flash_duration = 0.0f;
   g_path_count = 0; g_path_closed = 0;
   memset(g_hotspots,    0, sizeof(g_hotspots));
   memset(g_btn_repeat,  0, sizeof(g_btn_repeat));
   memset(g_scroll_texts, 0, sizeof(g_scroll_texts));
   memset(g_anims,       0, sizeof(g_anims));
   memset(g_float_texts, 0, sizeof(g_float_texts));
   memset(g_dialogs,     0, sizeof(g_dialogs));
   memset(g_fsm,         0, sizeof(g_fsm));
   memset(g_rngs,        0, sizeof(g_rngs));
   rng_seed_from_environment();
   /* Hot reload: re-read cart from disk if NOVA64_HOT_RELOAD=1 */
   const char *hot_reload_env = getenv("NOVA64_HOT_RELOAD");
   if (hot_reload_env && hot_reload_env[0] == '1' && cart_path[0]) {
      size_t new_size = 0;
      char *new_data = read_file_to_memory(cart_path, &new_size);
      if (new_data) {
         free(cart_content);
         cart_content = new_data;
         cart_size    = new_size;
      }
   }
   if (cart_content && cart_size)
      js_host_load_cart(cart_content, cart_size, cart_path[0] ? cart_path : "<nova64-cart>");
}

void RETRO_CALLCONV retro_run(void)
{
   if (!initialized || !video_cb)
      return;

   /* Re-read resolution option each frame in case user changed it */
   if (environ_cb) {
      bool updated = false;
      if (environ_cb(RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE, &updated) && updated) {
         struct retro_variable v = { "nova64_resolution", NULL };
         if (environ_cb(RETRO_ENVIRONMENT_GET_VARIABLE, &v) && v.value) {
            unsigned nw = g_res_width, nh = g_res_height;
            if (parse_resolution(v.value, &nw, &nh) && (nw != g_res_width || nh != g_res_height)) {
               g_res_width  = nw;
               g_res_height = nh;
               struct retro_game_geometry geom;
               memset(&geom, 0, sizeof(geom));
               geom.base_width  = g_res_width;
               geom.base_height = g_res_height;
               geom.max_width   = 1280;
               geom.max_height  = 720;
               geom.aspect_ratio = (float)g_res_width / (float)g_res_height;
               environ_cb(RETRO_ENVIRONMENT_SET_GEOMETRY, &geom);
            }
         }
      }
   }

   update_input();

   /* advance camera shake */
   if (g_shake_timer > 0.0f) {
      g_shake_timer -= (float)(1.0 / NOVA64_FPS);
      if (g_shake_timer <= 0.0f) { g_shake_timer = 0.0f; g_shake_intensity = 0.0f; }
      else if (g_shake_duration > 0.0f)
         g_shake_intensity = g_shake_intensity * (g_shake_timer / g_shake_duration);
   }

   /* advance tweens */
   for (int _ti = 0; _ti < NOVA64_MAX_TWEENS; _ti++) {
      struct nova64_tween *tw = &g_tweens[_ti];
      if (!tw->used || tw->done) continue;
      tw->elapsed += (float)(1.0 / NOVA64_FPS);
      if (tw->elapsed >= tw->duration) { tw->elapsed = tw->duration; tw->done = 1; }
   }

   /* advance timers */
   for (int _timer_i = 0; _timer_i < NOVA64_MAX_TIMERS; _timer_i++) {
      struct nova64_timer *tmr = &g_timers[_timer_i];
      if (!tmr->used || tmr->elapsed >= tmr->duration) continue;
      tmr->elapsed += (float)(1.0 / NOVA64_FPS);
      if (tmr->elapsed > tmr->duration) tmr->elapsed = tmr->duration;
   }

   /* advance screen flash */
   if (g_flash_timer > 0.0f) {
      g_flash_timer -= (float)(1.0 / NOVA64_FPS);
      if (g_flash_timer < 0.0f) g_flash_timer = 0.0f;
   }

   /* advance sprite anims */
   for (int _ai = 0; _ai < NOVA64_MAX_ANIMS; _ai++) {
      if (!g_anims[_ai].used || g_anims[_ai].fps <= 0.0f) continue;
      g_anims[_ai].elapsed += (float)(1.0 / NOVA64_FPS);
   }
   /* advance floating texts */
   for (int _fti = 0; _fti < NOVA64_MAX_FLOAT_TEXTS; _fti++) {
      struct nova64_float_text *ft = &g_float_texts[_fti];
      if (!ft->used) continue;
      ft->y    += ft->vy * (float)(1.0 / NOVA64_FPS);
      ft->life -= (float)(1.0 / NOVA64_FPS);
      if (ft->life <= 0.0f) memset(ft, 0, sizeof(*ft));
   }
   /* advance dialogs */
   for (int _di = 0; _di < NOVA64_MAX_DIALOGS; _di++) {
      if (!g_dialogs[_di].used) continue;
      g_dialogs[_di].elapsed += (float)(1.0 / NOVA64_FPS);
   }
   /* advance FSM elapsed */
   for (int _fi = 0; _fi < NOVA64_MAX_FSM; _fi++) {
      if (!g_fsm[_fi].used) continue;
      g_fsm[_fi].elapsed += (float)(1.0 / NOVA64_FPS);
   }
   /* advance scroll texts */
   for (int _sti = 0; _sti < NOVA64_MAX_SCROLL_TEXTS; _sti++) {
      if (!g_scroll_texts[_sti].used) continue;
      g_scroll_texts[_sti].pos += g_scroll_texts[_sti].speed * (float)(1.0 / NOVA64_FPS);
   }

   /* advance btn repeat counters */
   for (int _bri = 0; _bri < NOVA64_BUTTON_COUNT; _bri++) {
      if (buttons[_bri]) g_btn_repeat[_bri].count++;
      else g_btn_repeat[_bri].count = 0;
   }

   js_host_call_frame(1.0 / NOVA64_FPS);

   /* Apply screen flash overlay */
   if (g_flash_timer > 0.0f && g_flash_duration > 0.0f && framebuffer) {
      float alpha = g_flash_timer / g_flash_duration;
      uint8_t fr = (uint8_t)((g_flash_color >> 24) & 0xff);
      uint8_t fg = (uint8_t)((g_flash_color >> 16) & 0xff);
      uint8_t fb = (uint8_t)((g_flash_color >>  8) & 0xff);
      for (size_t _fi = 0; _fi < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; _fi++) {
         uint32_t dst = framebuffer[_fi];
         uint8_t dr = (uint8_t)((dst >> 24) & 0xff);
         uint8_t dg = (uint8_t)((dst >> 16) & 0xff);
         uint8_t db = (uint8_t)((dst >>  8) & 0xff);
         framebuffer[_fi] = rgba8(
            (uint8_t)(fr * alpha + dr * (1.0f - alpha)),
            (uint8_t)(fg * alpha + dg * (1.0f - alpha)),
            (uint8_t)(fb * alpha + db * (1.0f - alpha)), 255);
      }
   }

   /* Developer console overlay: draw lines at bottom of software framebuffer */
   if (g_developer_mode && g_dev_con_count > 0) {
      int con_y = NOVA64_HEIGHT - g_dev_con_count * 10 - 2;
      for (int ci = 0; ci < g_dev_con_count; ci++) {
         int ridx = (g_dev_con_head + ci) % NOVA64_DEV_CON_LINES;
         draw_text_pixels(g_dev_con[ridx], 2, con_y + ci * 10, rgba8(0, 220, 255, 255));
      }
   }

   write_renderer_command_log();
   audio_mix_frame();

   if (renderer_has_hardware_frame()) {
      renderer_render_hardware_frame();
      video_cb((const void *)RETRO_HW_FRAME_BUFFER_VALID, NOVA64_WIDTH, NOVA64_HEIGHT, 0);
   } else {
      convert_framebuffer_to_rgb565();
      video_cb(rgb565_framebuffer, NOVA64_WIDTH, NOVA64_HEIGHT, NOVA64_WIDTH * sizeof(uint16_t));
   }

   frame_count++;
   (void)audio_cb;
}

bool RETRO_CALLCONV retro_load_game(const struct retro_game_info *info)
{
   free(cart_content);
   cart_content = NULL;
   cart_size = 0;
   cart_path[0] = '\0';
   storage_cart_id[0] = '\0';
   storage_save_directory[0] = '\0';
   reset_package_manifest_metadata();

   if (!info) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] no game info provided");
      return false;
   }

   if (info->path)
      snprintf(cart_path, sizeof(cart_path), "%s", info->path);

   if (info->data && info->size > 0) {
      cart_size = info->size;
      cart_content = (char *)malloc(cart_size + 1);
      if (!cart_content)
         return false;
      memcpy(cart_content, info->data, cart_size);
      cart_content[cart_size] = '\0';
   } else if (info->path) {
      cart_content = read_file_to_memory(info->path, &cart_size);
   }

   if (!cart_content || cart_size == 0) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] failed to load .js cart");
      return false;
   }

   char *package_source = NULL;
   size_t package_source_size = 0;
   if (extract_nova_code_js(cart_content, cart_size, &package_source, &package_source_size)) {
      free(cart_content);
      cart_content = package_source;
      cart_size = package_source_size;
   } else if ((uint8_t)cart_content[0] == 0x50 && cart_size > 4 &&
         (uint8_t)cart_content[1] == 0x4b) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] .nova package did not contain code.js");
      return false;
   }

   clear_framebuffer(rgba8(0, 0, 0, 255));
   reset_scene_state();
   reset_audio_state();
   destroy_all_tilemaps();
   clear_all_spritesheets();
   reset_colliders();
   reset_particles();
   reset_fonts();
   memset(audio_channels, 0, sizeof(audio_channels));
   memset(perf_timers, 0, sizeof(perf_timers));
   memset(g_tweens, 0, sizeof(g_tweens));
   memset(g_timers, 0, sizeof(g_timers));
   memset(g_grids,  0, sizeof(g_grids));
   reset_canvases();
   g_shake_intensity = 0.0f; g_shake_timer = 0.0f; g_shake_duration = 0.0f;
   g_flash_timer = 0.0f; g_flash_duration = 0.0f;
   g_path_count = 0; g_path_closed = 0;
   memset(g_hotspots,    0, sizeof(g_hotspots));
   memset(g_btn_repeat,  0, sizeof(g_btn_repeat));
   memset(g_scroll_texts, 0, sizeof(g_scroll_texts));
   memset(g_anims,       0, sizeof(g_anims));
   memset(g_float_texts, 0, sizeof(g_float_texts));
   memset(g_dialogs,     0, sizeof(g_dialogs));
   memset(g_fsm,         0, sizeof(g_fsm));
   memset(g_rngs,        0, sizeof(g_rngs));
   rng_seed_from_environment();
   frame_count = 0;

   if (!js_host_load_cart(cart_content, cart_size, cart_path[0] ? cart_path : "<nova64-cart>")) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] cart failed to compile/load");
      return false;
   }

   if (log_cb)
      log_cb(RETRO_LOG_INFO, "[nova64] loaded JS cart (%zu bytes)\n", cart_size);
   return true;
}

bool RETRO_CALLCONV retro_load_game_special(unsigned game_type, const struct retro_game_info *info, size_t num_info)
{
   (void)game_type;
   if (!info || num_info == 0)
      return false;
   return retro_load_game(info);
}

void RETRO_CALLCONV retro_unload_game(void)
{
   log_perf_report_if_requested();
   js_host_free();
   clear_textures();
   clear_render_targets();
   destroy_all_tilemaps();
   clear_all_spritesheets();
   memset(perf_timers, 0, sizeof(perf_timers));
   free(cart_content);
   cart_content = NULL;
   cart_size = 0;
   cart_path[0] = '\0';
   storage_cart_id[0] = '\0';
   storage_save_directory[0] = '\0';
   reset_package_manifest_metadata();
}

unsigned RETRO_CALLCONV retro_get_region(void)
{
   return RETRO_REGION_NTSC;
}

size_t RETRO_CALLCONV retro_serialize_size(void)
{
   return sizeof(struct nova64_save_header) +
          ((size_t)NOVA64_WIDTH * NOVA64_HEIGHT * sizeof(uint32_t)) +
          sizeof(meshes) + sizeof(point_lights) + sizeof(camera_state) + sizeof(light_state);
}

bool RETRO_CALLCONV retro_serialize(void *data, size_t size)
{
   size_t required = retro_serialize_size();
   if (!data || size < required || !framebuffer)
      return false;

   struct nova64_save_header header;
   memset(&header, 0, sizeof(header));
   header.magic = NOVA64_SAVE_MAGIC;
   header.version = NOVA64_SAVE_VERSION;
   header.width = NOVA64_WIDTH;
   header.height = NOVA64_HEIGHT;
   header.frame_count = frame_count;
   header.framebuffer_bytes = (uint32_t)((size_t)NOVA64_WIDTH * NOVA64_HEIGHT * sizeof(uint32_t));
   header.mesh_bytes = (uint32_t)sizeof(meshes);
   for (int i = 0; i < NOVA64_BUTTON_COUNT; i++) {
      header.buttons[i] = buttons[i] ? 1 : 0;
      header.previous_buttons[i] = previous_buttons[i] ? 1 : 0;
   }

   uint8_t *cursor = (uint8_t *)data;
   memcpy(cursor, &header, sizeof(header));
   cursor += sizeof(header);
   memcpy(cursor, framebuffer, header.framebuffer_bytes);
   cursor += header.framebuffer_bytes;
   memcpy(cursor, meshes, sizeof(meshes));
   cursor += sizeof(meshes);
   memcpy(cursor, point_lights, sizeof(point_lights));
   cursor += sizeof(point_lights);
   memcpy(cursor, &camera_state, sizeof(camera_state));
   cursor += sizeof(camera_state);
   memcpy(cursor, &light_state, sizeof(light_state));
   return true;
}

bool RETRO_CALLCONV retro_unserialize(const void *data, size_t size)
{
   size_t required = retro_serialize_size();
   if (!data || size < required || !framebuffer)
      return false;

   const uint8_t *cursor = (const uint8_t *)data;
   struct nova64_save_header header;
   memcpy(&header, cursor, sizeof(header));
   cursor += sizeof(header);

   if (header.magic != NOVA64_SAVE_MAGIC || header.version != NOVA64_SAVE_VERSION ||
         header.width != NOVA64_WIDTH || header.height != NOVA64_HEIGHT)
      return false;

   memcpy(framebuffer, cursor, header.framebuffer_bytes);
   cursor += header.framebuffer_bytes;
   memcpy(meshes, cursor, sizeof(meshes));
   cursor += sizeof(meshes);
   memcpy(point_lights, cursor, sizeof(point_lights));
   cursor += sizeof(point_lights);
   memcpy(&camera_state, cursor, sizeof(camera_state));
   cursor += sizeof(camera_state);
   memcpy(&light_state, cursor, sizeof(light_state));
   frame_count = header.frame_count;
   for (int i = 0; i < NOVA64_BUTTON_COUNT; i++) {
      buttons[i] = header.buttons[i] != 0;
      previous_buttons[i] = header.previous_buttons[i] != 0;
      pressed_buttons[i] = buttons[i] && !previous_buttons[i];
   }
   return true;
}

void *RETRO_CALLCONV retro_get_memory_data(unsigned id)
{
   return id == RETRO_MEMORY_SYSTEM_RAM ? framebuffer : NULL;
}

size_t RETRO_CALLCONV retro_get_memory_size(unsigned id)
{
   return id == RETRO_MEMORY_SYSTEM_RAM ? (size_t)NOVA64_WIDTH * NOVA64_HEIGHT * sizeof(uint32_t) : 0;
}

void RETRO_CALLCONV retro_cheat_reset(void) {}
void RETRO_CALLCONV retro_cheat_set(unsigned index, bool enabled, const char *code)
{
   (void)index;
   (void)enabled;
   (void)code;
}
