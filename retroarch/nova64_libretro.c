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
#define GL_TEXTURE_MIN_FILTER 0x2801
#define GL_TEXTURE_MAG_FILTER 0x2800
#define GL_TEXTURE_WRAP_S 0x2802
#define GL_TEXTURE_WRAP_T 0x2803
#define GL_NEAREST 0x2600
#define GL_CLAMP_TO_EDGE 0x812F
#define GL_RGBA 0x1908
#define GL_UNSIGNED_BYTE 0x1401
#define GL_BLEND 0x0BE2
#define GL_SRC_ALPHA 0x0302
#define GL_ONE_MINUS_SRC_ALPHA 0x0303
/* FBO */
#define GL_FRAMEBUFFER 0x8D40
#define GL_RENDERBUFFER 0x8D41
#define GL_COLOR_ATTACHMENT0 0x8CE0
#define GL_DEPTH_ATTACHMENT 0x8D00
#define GL_FRAMEBUFFER_COMPLETE 0x8CD5
#define GL_DEPTH_COMPONENT16 0x81A5

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
   NOVA64_MESH_CYLINDER
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
   uint32_t emissive_color; /* 0 = none, else RGBA8 */
   float emissive_intensity; /* 0 = off */
   float roughness;         /* 0 = smooth, 1 = rough — stored, not yet wired to shader */
   float metalness;         /* 0 = non-metal, 1 = metal — stored */
   float uv_offset[2];      /* UV scroll offset (u, v) */
   float uv_scale[2];       /* UV tiling scale (u, v) */
   enum nova64_mesh_blend mesh_blend;
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
   GLuint gl_name; /* 0 = not uploaded / software mode */
   int width;
   int height;
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
   GLint cube_emissive_color_uniform;
   GLint cube_emissive_intensity_uniform;
   GLint overlay_position_attrib;
   GLint overlay_uv_attrib;
   GLint overlay_texture_uniform;
};

static retro_environment_t environ_cb;
static retro_video_refresh_t video_cb;
static retro_audio_sample_t audio_cb;
static retro_audio_sample_batch_t audio_batch_cb;
static retro_input_poll_t input_poll_cb;
static retro_input_state_t input_state_cb;
static retro_log_printf_t log_cb;

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

/* Sky/background color — used as GLES clear color when enabled */
static bool sky_color_enabled = false;
static uint32_t sky_top_color    = 0x000000FFU;
static uint32_t sky_bottom_color = 0x000000FFU;

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
static struct nova64_camera camera_state;
static struct nova64_light light_state;
static struct nova64_audio_voice audio_voices[NOVA64_AUDIO_MAX_VOICES];
static int16_t audio_mix_buffer[NOVA64_AUDIO_FRAME_SAMPLES * 2];
static double audio_master_volume = 0.4;

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
      {"nova64_renderer", "Renderer backend; opengles3|vulkan12"},
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
   memset(meshes, 0, sizeof(meshes));
   memset(point_lights, 0, sizeof(point_lights));
}

static int allocate_texture(void)
{
   for (int i = 0; i < NOVA64_MAX_TEXTURES; i++) {
      if (!textures[i].used) {
         textures[i].used = true;
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
   if (tex && tex->gl_name && gles.active && gles.DeleteTextures)
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

static void audio_start_sfx(const struct nova64_sfx_params *input)
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
      voice->pcm_pos += voice->pcm_rate / NOVA64_SAMPLE_RATE;
      return ((left + right) * 0.5) * voice->vol;
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
   voice->phase += current_freq / NOVA64_SAMPLE_RATE;
   voice->phase -= floor(voice->phase);
   voice->elapsed_samples++;
   if (voice->elapsed_samples >= voice->total_samples)
      voice->active = false;
   return value * voice->vol;
}

static void audio_mix_frame(void)
{
   if (!audio_batch_cb)
      return;

   for (size_t i = 0; i < NOVA64_AUDIO_FRAME_SAMPLES; i++) {
      double mixed = 0.0;
      for (size_t v = 0; v < NOVA64_AUDIO_MAX_VOICES; v++) {
         if (audio_voices[v].active)
            mixed += audio_sample_voice(&audio_voices[v]);
      }
      /* Mix music track */
      if (music_state.active && !music_state.paused && music_state.pcm_data) {
         size_t mi = (size_t)music_state.pcm_pos;
         if (mi < music_state.pcm_frames) {
            double s0 = (double)music_state.pcm_data[mi * music_state.pcm_channels] / 32768.0;
            double s1 = (mi + 1 < music_state.pcm_frames)
               ? (double)music_state.pcm_data[(mi + 1) * music_state.pcm_channels] / 32768.0
               : s0;
            double frac = music_state.pcm_pos - (double)mi;
            mixed += (s0 + (s1 - s0) * frac) * music_state.vol;
         }
         music_state.pcm_pos += music_state.pcm_rate / NOVA64_SAMPLE_RATE;
         if ((size_t)music_state.pcm_pos >= music_state.pcm_frames) {
            /* Loop back to start */
            music_state.pcm_pos = 0.0;
         }
      }
      mixed = clamp_double(mixed * audio_master_volume, -1.0, 1.0);
      int16_t sample = (int16_t)(mixed * 32767.0);
      audio_mix_buffer[i * 2 + 0] = sample;
      audio_mix_buffer[i * 2 + 1] = sample;
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

static JSValue js_cls(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
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
   int w = text_pixel_width(text);
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

/* spr(path, dx, dy [, imgw, imgh [, sx, sy [, bw, bh]]]) — blit RGBA asset */
static JSValue js_spr(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   (void)this_val;
   if (argc < 3) return JS_NewBool(ctx, false);
   const char *path = JS_ToCString(ctx, argv[0]);
   if (!path) return JS_NewBool(ctx, false);
   const struct nova64_package_asset *asset = find_package_asset(path);
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewBool(ctx, false);

   int dx = int_from_js(ctx, argv[1], 0) - cam2d_x;
   int dy = int_from_js(ctx, argv[2], 0) - cam2d_y;

   int img_w = argc > 3 ? int_from_js(ctx, argv[3], 0) : 0;
   int img_h = argc > 4 ? int_from_js(ctx, argv[4], 0) : 0;
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
   if (bw <= 0 || bh <= 0) return JS_NewBool(ctx, false);

   blit_rgba((const uint8_t *)asset->data, img_w, img_h, dx, dy, sx, sy, bw, bh);
   return JS_NewBool(ctx, true);
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
   } else if (argc >= 2 && JS_IsNumber(argv[0])) {
      double size = clamp_double(fabs(double_from_js(ctx, argv[0], 1.0)), 0.001, 10000.0);
      mesh->scale[0] = (float)size;
      mesh->scale[1] = (float)size;
      mesh->scale[2] = (float)size;
      mesh->color = color_from_js(ctx, argv[1], mesh->color);
      if (argc > 2)
         set_position_from_js(ctx, argv[2], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
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

   if (argc >= 2 && JS_IsNumber(argv[0])) {
      double radius = clamp_double(fabs(double_from_js(ctx, argv[0], 1.0)), 0.001, 10000.0);
      mesh->scale[0] = (float)(radius * 2.0);
      mesh->scale[1] = (float)(radius * 2.0);
      mesh->scale[2] = (float)(radius * 2.0);
      mesh->color = color_from_js(ctx, argv[1], mesh->color);
      if (argc > 2)
         set_position_from_js(ctx, argv[2], mesh->position);
   } else if (argc > 0) {
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
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
   if (mesh)
      memset(mesh, 0, sizeof(*mesh));
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
   /* uvOffset / uvScale as 2-element JS arrays */
   {
      JSValue uvo = JS_NewArray(ctx);
      JS_SetPropertyUint32(ctx, uvo, 0, JS_NewFloat64(ctx, mesh->uv_offset[0]));
      JS_SetPropertyUint32(ctx, uvo, 1, JS_NewFloat64(ctx, mesh->uv_offset[1]));
      JS_SetPropertyStr(ctx, object, "uvOffset", uvo);
      JSValue uvs = JS_NewArray(ctx);
      JS_SetPropertyUint32(ctx, uvs, 0, JS_NewFloat64(ctx, mesh->uv_scale[0]));
      JS_SetPropertyUint32(ctx, uvs, 1, JS_NewFloat64(ctx, mesh->uv_scale[1]));
      JS_SetPropertyStr(ctx, object, "uvScale", uvs);
   }
   {
      const char *blend_name = "opaque";
      if (mesh->mesh_blend == NOVA64_MESH_BLEND_ADDITIVE)  blend_name = "additive";
      else if (mesh->mesh_blend == NOVA64_MESH_BLEND_MULTIPLY) blend_name = "multiply";
      JS_SetPropertyStr(ctx, object, "meshBlend", JS_NewString(ctx, blend_name));
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

   double vol = argc > 1 ? double_from_js(ctx, argv[1], 1.0) : 1.0;
   bool loop  = argc > 2 ? JS_ToBool(ctx, argv[2]) != 0 : false;

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
   return JS_NewBool(ctx, true);
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

   audio_start_sfx(&params);
   return JS_UNDEFINED;
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
   JS_FreeCString(ctx, path);
   if (!asset || !asset->data || asset->size < 4)
      return JS_NewInt32(ctx, 0);

   int handle = allocate_texture();
   if (!handle)
      return JS_NewInt32(ctx, 0);

   struct nova64_texture *tex = texture_from_handle(handle);
   if (!tex) {
      return JS_NewInt32(ctx, 0);
   }

   /* Determine dimensions from optional width/height args or square-root guess */
   int w = argc > 1 ? int_from_js(ctx, argv[1], 0) : 0;
   int h = argc > 2 ? int_from_js(ctx, argv[2], 0) : 0;
   if (w <= 0 || h <= 0) {
      /* Guess square texture */
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
         GL_RGBA, GL_UNSIGNED_BYTE, asset->data);
      gles.BindTexture(GL_TEXTURE_2D, 0);
   }
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
   set_function(ctx, draw, "spr", js_spr, 9);
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
   set_function(ctx, scene, "destroyTexture", js_destroy_texture, 1);
   set_function(ctx, scene, "setSkyColor", js_set_sky_color, 2);
   set_function(ctx, scene, "clearSkyColor", js_clear_sky_color, 0);
   set_function(ctx, scene, "getSkyColor", js_get_sky_color, 0);
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
   set_function(ctx, global, "spr", js_spr, 9);
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
   set_function(ctx, global, "setMeshColor", js_set_mesh_color, 2);
   set_function(ctx, global, "setMeshEmissive", js_set_mesh_emissive, 3);
   set_function(ctx, global, "setMeshAlpha", js_set_mesh_alpha, 2);
   set_function(ctx, global, "draw3d", js_draw3d, 1);
   set_function(ctx, global, "createTexture", js_create_texture, 3);
   set_function(ctx, global, "setMeshTexture", js_set_mesh_texture, 2);
   set_function(ctx, global, "destroyTexture", js_destroy_texture, 1);
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
      "varying float v_light;\n"
      "varying float v_depth;\n"
      "varying vec2 v_uv;\n"
      "void main() {\n"
      "  vec3 n = normalize(u_normal_matrix * a_normal);\n"
      "  vec3 l = normalize(-u_light_direction.xyz);\n"
      "  float diffuse = max(dot(n, l), 0.0);\n"
      "  v_light = 0.58 + diffuse * 0.42;\n"
      "  gl_Position = u_mvp * vec4(a_position, 1.0);\n"
      "  v_depth = gl_Position.z / gl_Position.w;\n"
      "  v_uv = a_position.xz + 0.5;\n"
      "}\n";
   static const char *fragment_source =
      "precision mediump float;\n"
      "varying float v_light;\n"
      "varying float v_depth;\n"
      "varying vec2 v_uv;\n"
      "uniform vec4 u_color;\n"
      "uniform vec4 u_ambient_color;\n"
      "uniform int u_fog_enabled;\n"
      "uniform vec4 u_fog_color;\n"
      "uniform float u_fog_near;\n"
      "uniform float u_fog_far;\n"
      "uniform int u_has_texture;\n"
      "uniform sampler2D u_texture;\n"
      "uniform vec4 u_emissive_color;\n"
      "uniform float u_emissive_intensity;\n"
      "void main() {\n"
      "  vec3 ambient = u_ambient_color.rgb * 0.35;\n"
      "  vec4 base = (u_has_texture != 0) ? texture2D(u_texture, v_uv) * u_color : u_color;\n"
      "  vec3 lit = clamp(base.rgb * v_light + ambient, 0.0, 1.0);\n"
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
   gles.cube_emissive_color_uniform = gles.GetUniformLocation(program, "u_emissive_color");
   gles.cube_emissive_intensity_uniform = gles.GetUniformLocation(program, "u_emissive_intensity");
   return gles.cube_position_attrib >= 0 && gles.cube_normal_attrib >= 0 &&
      gles.cube_mvp_uniform >= 0 && gles.cube_normal_matrix_uniform >= 0 &&
      gles.cube_color_uniform >= 0 && gles.cube_ambient_uniform >= 0 &&
      gles.cube_light_direction_uniform >= 0;
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
   mat4_from_mesh(model, mesh);
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
   /* texture */
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
   /* enable blending for semi-transparent meshes */
   bool mesh_transparent = mesh->opacity < 0.999f;
   if (mesh_transparent) {
      gles.Enable(GL_BLEND);
      gles.BlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
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
   if (mesh_transparent)
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

   if (use_post)
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
   mat4_look_at(view, camera_state.position, camera_state.target, up);
   mat4_multiply(view_projection, projection, view);

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
   info->geometry.base_width = NOVA64_WIDTH;
   info->geometry.base_height = NOVA64_HEIGHT;
   info->geometry.max_width = NOVA64_WIDTH;
   info->geometry.max_height = NOVA64_HEIGHT;
   info->geometry.aspect_ratio = (float)NOVA64_WIDTH / (float)NOVA64_HEIGHT;
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
   destroy_all_tilemaps();
   clear_all_spritesheets();
   memset(perf_timers, 0, sizeof(perf_timers));
   rng_seed_from_environment();
   if (cart_content && cart_size)
      js_host_load_cart(cart_content, cart_size, cart_path[0] ? cart_path : "<nova64-cart>");
}

void RETRO_CALLCONV retro_run(void)
{
   if (!initialized || !video_cb)
      return;

   update_input();
   js_host_call_frame(1.0 / NOVA64_FPS);
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
   memset(perf_timers, 0, sizeof(perf_timers));
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
