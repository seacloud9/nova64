#include <math.h>
#include <stddef.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <zlib.h>

#include "libretro.h"
#include "quickjs.h"

#define NOVA64_WIDTH 640
#define NOVA64_HEIGHT 360
#define NOVA64_FPS 60.0
#define NOVA64_SAMPLE_RATE 44100.0
#define NOVA64_CORE_VERSION "0.3.0"
#define NOVA64_MAX_MESHES 1024
#define NOVA64_SAVE_MAGIC 0x5344364eU
#define NOVA64_SAVE_VERSION 1U
#define NOVA64_ZIP_EOCD_SIGNATURE 0x06054b50U
#define NOVA64_ZIP_CENTRAL_SIGNATURE 0x02014b50U
#define NOVA64_ZIP_LOCAL_SIGNATURE 0x04034b50U
#define NOVA64_ZIP_MAX_EOCD_SEARCH 65557U
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
typedef void (*PFNGLUNIFORM4FPROC)(GLint location, GLfloat v0, GLfloat v1, GLfloat v2, GLfloat v3);
typedef void (*PFNGLGENBUFFERSPROC)(GLsizei n, GLuint *buffers);
typedef void (*PFNGLBINDBUFFERPROC)(GLenum target, GLuint buffer);
typedef void (*PFNGLBUFFERDATAPROC)(GLenum target, GLsizeiptr size, const void *data, GLenum usage);
typedef void (*PFNGLDELETEBUFFERSPROC)(GLsizei n, const GLuint *buffers);
typedef void (*PFNGLENABLEVERTEXATTRIBARRAYPROC)(GLuint index);
typedef void (*PFNGLDISABLEVERTEXATTRIBARRAYPROC)(GLuint index);
typedef void (*PFNGLVERTEXATTRIBPOINTERPROC)(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void *pointer);
typedef void (*PFNGLDRAWELEMENTSPROC)(GLenum mode, GLsizei count, GLenum type, const void *indices);

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
   NOVA64_MESH_PLANE
};

struct nova64_mesh {
   bool used;
   enum nova64_mesh_type type;
   float position[3];
   float rotation[3];
   float scale[3];
   uint32_t color;
};

struct nova64_camera {
   float position[3];
   float target[3];
   float fov;
};

struct nova64_light {
   uint32_t ambient;
   float direction[3];
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
   PFNGLUNIFORM4FPROC Uniform4f;
   PFNGLGENBUFFERSPROC GenBuffers;
   PFNGLBINDBUFFERPROC BindBuffer;
   PFNGLBUFFERDATAPROC BufferData;
   PFNGLDELETEBUFFERSPROC DeleteBuffers;
   PFNGLENABLEVERTEXATTRIBARRAYPROC EnableVertexAttribArray;
   PFNGLDISABLEVERTEXATTRIBARRAYPROC DisableVertexAttribArray;
   PFNGLVERTEXATTRIBPOINTERPROC VertexAttribPointer;
   PFNGLDRAWELEMENTSPROC DrawElements;
   GLuint cube_vbo;
   GLuint cube_ibo;
   GLuint plane_vbo;
   GLuint plane_ibo;
   GLuint cube_program;
   GLint cube_position_attrib;
   GLint cube_mvp_uniform;
   GLint cube_color_uniform;
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
static char *cart_content;
static size_t cart_size;
static char cart_path[1024];
static bool initialized;
static uint64_t frame_count;

static bool buttons[NOVA64_BUTTON_COUNT];
static bool previous_buttons[NOVA64_BUTTON_COUNT];
static bool pressed_buttons[NOVA64_BUTTON_COUNT];

static struct nova64_mesh meshes[NOVA64_MAX_MESHES];
static struct nova64_camera camera_state;
static struct nova64_light light_state;
static struct nova64_js_host js_host;
static struct nova64_gles_backend gles;
static struct retro_hw_render_callback hw_render;
static enum retro_pixel_format pixel_format = RETRO_PIXEL_FORMAT_RGB565;
static bool drawing_scene_preview;

static bool scene_has_visible_meshes(void);
static void render_software_scene(void);

static void nova64_log_line(enum retro_log_level level, const char *message)
{
   if (log_cb)
      log_cb(level, "%s\n", message);
   else
      fprintf(stderr, "%s\n", message);
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
   memset(meshes, 0, sizeof(meshes));
   camera_state.position[0] = 0.0f;
   camera_state.position[1] = 1.5f;
   camera_state.position[2] = 6.0f;
   camera_state.target[0] = 0.0f;
   camera_state.target[1] = 0.0f;
   camera_state.target[2] = 0.0f;
   camera_state.fov = 60.0f;
   light_state.ambient = rgba8(48, 48, 56, 255);
   light_state.direction[0] = -0.4f;
   light_state.direction[1] = -0.8f;
   light_state.direction[2] = -0.3f;
}

static void clear_framebuffer(uint32_t color)
{
   if (!framebuffer)
      return;
   for (size_t i = 0; i < (size_t)NOVA64_WIDTH * NOVA64_HEIGHT; i++)
      framebuffer[i] = color;
}

static void set_pixel(int x, int y, uint32_t color)
{
   if (!framebuffer)
      return;
   if (x < 0 || y < 0 || x >= NOVA64_WIDTH || y >= NOVA64_HEIGHT)
      return;
   framebuffer[(size_t)y * NOVA64_WIDTH + (size_t)x] = color;
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
      if (meshes[i].used)
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
      uint32_t face_color = lit_face_color(mesh->color, world[face[0]], world[face[1]], world[face[2]]);
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
      -0.8f, 0.0f, -0.8f,
       0.8f, 0.0f, -0.8f,
       0.8f, 0.0f,  0.8f,
      -0.8f, 0.0f,  0.8f,
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

   draw_filled_quad(screen, shade_color(mesh->color, 0.72f));
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
   uint32_t color = shade_color(mesh->color, 1.15f);
   int last_x = sx + radius;
   int last_y = sy;
   for (int i = 1; i <= 48; i++) {
      float a = ((float)i / 48.0f) * 2.0f * (float)M_PI;
      int x = sx + (int)(cosf(a) * radius);
      int y = sy + (int)(sinf(a) * radius);
      draw_line_pixels(last_x, last_y, x, y, color);
      last_x = x;
      last_y = y;
   }
   draw_line_pixels(sx - radius, sy, sx + radius, sy, shade_color(mesh->color, 0.8f));
   draw_line_pixels(sx, sy - radius, sx, sy + radius, shade_color(mesh->color, 0.8f));
}

static void render_software_scene(void)
{
   if (!scene_has_visible_meshes())
      return;

   drawing_scene_preview = true;
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      const struct nova64_mesh *mesh = &meshes[i];
      if (!mesh->used)
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
         default:
            break;
      }
   }
   drawing_scene_preview = false;
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

static int allocate_mesh(enum nova64_mesh_type type)
{
   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (!meshes[i].used) {
         meshes[i].used = true;
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
         meshes[i].color = rgba8(255, 255, 255, 255);
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
         JS_FreeCString(ctx, stack_text);
      }
   }
   JS_FreeValue(ctx, stack);
   JS_FreeValue(ctx, exception);
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

static JSValue js_cls(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   uint32_t color = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, rgba8(0, 0, 0, 255));
   clear_framebuffer(color);
   if (!drawing_scene_preview && scene_has_visible_meshes())
      render_software_scene();
   return JS_UNDEFINED;
}

static JSValue js_pset(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int y = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   uint32_t color = color_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   set_pixel(x, y, color);
   return JS_UNDEFINED;
}

static JSValue js_line(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x0 = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int y0 = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int x1 = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int y1 = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_line_pixels(x0, y0, x1, y1, color);
   return JS_UNDEFINED;
}

static JSValue js_rect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int x = int_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, 0);
   int y = int_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, 0);
   int w = int_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, 0);
   int h = int_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, 0);
   uint32_t color = color_from_js(ctx, argc > 4 ? argv[4] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   bool filled = argc > 5 ? JS_ToBool(ctx, argv[5]) : true;
   draw_rect_pixels(x, y, w, h, color, filled);
   return JS_UNDEFINED;
}

static JSValue js_draw_print(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   if (argc < 3)
      return js_console_log(ctx, this_val, argc, argv);
   const char *text = JS_ToCString(ctx, argv[0]);
   int x = int_from_js(ctx, argv[1], 0);
   int y = int_from_js(ctx, argv[2], 0);
   uint32_t color = color_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, rgba8(255, 255, 255, 255));
   draw_text_pixels(text, x, y, color);
   if (text)
      JS_FreeCString(ctx, text);
   return JS_UNDEFINED;
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
   return JS_NewBool(ctx, index >= 0 ? buttons[index] : false);
}

static JSValue js_btnp(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   int index = argc > 0 ? button_index_from_js(ctx, argv[0]) : -1;
   return JS_NewBool(ctx, index >= 0 ? pressed_buttons[index] : false);
}

static JSValue js_create_mesh(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, enum nova64_mesh_type type)
{
   int handle = allocate_mesh(type);
   if (!handle)
      return JS_ThrowInternalError(ctx, "Nova64 mesh table is full");
   struct nova64_mesh *mesh = mesh_from_handle(handle);
   if (mesh && argc > 0)
      mesh->color = color_from_js(ctx, argv[0], mesh->color);
   return JS_NewInt32(ctx, handle);
}

static JSValue js_create_cube(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   return js_create_mesh(ctx, this_val, argc, argv, NOVA64_MESH_CUBE);
}

static JSValue js_create_sphere(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   return js_create_mesh(ctx, this_val, argc, argv, NOVA64_MESH_SPHERE);
}

static JSValue js_create_plane(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   return js_create_mesh(ctx, this_val, argc, argv, NOVA64_MESH_PLANE);
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
   target[0] = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, target[0]);
   target[1] = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, target[1]);
   target[2] = (float)double_from_js(ctx, argc > 3 ? argv[3] : JS_UNDEFINED, target[2]);
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
   return mesh ? js_set_vec3(ctx, this_val, argc, argv, mesh->scale) : JS_UNDEFINED;
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

static JSValue js_set_ambient_light(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   light_state.ambient = color_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, light_state.ambient);
   return JS_UNDEFINED;
}

static JSValue js_set_light_direction(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   light_state.direction[0] = (float)double_from_js(ctx, argc > 0 ? argv[0] : JS_UNDEFINED, light_state.direction[0]);
   light_state.direction[1] = (float)double_from_js(ctx, argc > 1 ? argv[1] : JS_UNDEFINED, light_state.direction[1]);
   light_state.direction[2] = (float)double_from_js(ctx, argc > 2 ? argv[2] : JS_UNDEFINED, light_state.direction[2]);
   return JS_UNDEFINED;
}

static JSValue js_clear_scene(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
   reset_scene_state();
   return JS_UNDEFINED;
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

   set_function(ctx, draw, "rgba8", js_rgba8, 4);
   set_function(ctx, draw, "cls", js_cls, 1);
   set_function(ctx, draw, "pset", js_pset, 3);
   set_function(ctx, draw, "line", js_line, 5);
   set_function(ctx, draw, "rect", js_rect, 6);
   set_function(ctx, draw, "print", js_draw_print, 4);

   set_function(ctx, input, "btn", js_btn, 1);
   set_function(ctx, input, "btnp", js_btnp, 1);

   set_function(ctx, scene, "createCube", js_create_cube, 1);
   set_function(ctx, scene, "createSphere", js_create_sphere, 1);
   set_function(ctx, scene, "createPlane", js_create_plane, 1);
   set_function(ctx, scene, "destroyMesh", js_destroy_mesh, 1);
   set_function(ctx, scene, "setPosition", js_set_position, 4);
   set_function(ctx, scene, "setRotation", js_set_rotation, 4);
   set_function(ctx, scene, "setScale", js_set_scale, 4);
   set_function(ctx, scene, "clearScene", js_clear_scene, 0);

   set_function(ctx, camera, "setPosition", js_set_camera_position, 3);
   set_function(ctx, camera, "setTarget", js_set_camera_target, 3);
   set_function(ctx, camera, "setFOV", js_set_camera_fov, 1);

   set_function(ctx, light, "setAmbient", js_set_ambient_light, 1);
   set_function(ctx, light, "setDirection", js_set_light_direction, 3);

   JS_SetPropertyStr(ctx, nova64, "draw", draw);
   JS_SetPropertyStr(ctx, nova64, "input", input);
   JS_SetPropertyStr(ctx, nova64, "scene", scene);
   JS_SetPropertyStr(ctx, nova64, "camera", camera);
   JS_SetPropertyStr(ctx, nova64, "light", light);
   JS_SetPropertyStr(ctx, global, "nova64", nova64);

   set_function(ctx, global, "rgba8", js_rgba8, 4);
   set_function(ctx, global, "cls", js_cls, 1);
   set_function(ctx, global, "pset", js_pset, 3);
   set_function(ctx, global, "line", js_line, 5);
   set_function(ctx, global, "rect", js_rect, 6);
   set_function(ctx, global, "print", js_draw_print, 4);
   set_function(ctx, global, "btn", js_btn, 1);
   set_function(ctx, global, "btnp", js_btnp, 1);
   set_function(ctx, global, "createCube", js_create_cube, 1);
   set_function(ctx, global, "createSphere", js_create_sphere, 1);
   set_function(ctx, global, "createPlane", js_create_plane, 1);
   set_function(ctx, global, "destroyMesh", js_destroy_mesh, 1);
   set_function(ctx, global, "setPosition", js_set_position, 4);
   set_function(ctx, global, "setRotation", js_set_rotation, 4);
   set_function(ctx, global, "setScale", js_set_scale, 4);
   set_function(ctx, global, "setCameraPosition", js_set_camera_position, 3);
   set_function(ctx, global, "setCameraTarget", js_set_camera_target, 3);
   set_function(ctx, global, "setCameraFOV", js_set_camera_fov, 1);
   set_function(ctx, global, "setAmbientLight", js_set_ambient_light, 1);
   set_function(ctx, global, "setLightDirection", js_set_light_direction, 3);
   set_function(ctx, global, "clearScene", js_clear_scene, 0);

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
   JSValue compiled = JS_Eval(ctx, source, source_size, filename ? filename : "<nova64-cart>",
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
      "uniform mat4 u_mvp;\n"
      "void main() {\n"
      "  gl_Position = u_mvp * vec4(a_position, 1.0);\n"
      "}\n";
   static const char *fragment_source =
      "precision mediump float;\n"
      "uniform vec4 u_color;\n"
      "void main() {\n"
      "  gl_FragColor = u_color;\n"
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
   gles.cube_mvp_uniform = gles.GetUniformLocation(program, "u_mvp");
   gles.cube_color_uniform = gles.GetUniformLocation(program, "u_color");
   return gles.cube_position_attrib >= 0 && gles.cube_mvp_uniform >= 0 && gles.cube_color_uniform >= 0;
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
   if (gles.cube_program && gles.DeleteProgram)
      gles.DeleteProgram(gles.cube_program);
   gles.cube_vbo = 0;
   gles.cube_ibo = 0;
   gles.plane_vbo = 0;
   gles.plane_ibo = 0;
   gles.cube_program = 0;
   gles.resources_ready = false;
}

static bool gles_init_resources(void)
{
   if (gles.resources_ready)
      return true;

   static const GLfloat cube_vertices[] = {
      -0.5f, -0.5f, -0.5f,
       0.5f, -0.5f, -0.5f,
       0.5f,  0.5f, -0.5f,
      -0.5f,  0.5f, -0.5f,
      -0.5f, -0.5f,  0.5f,
       0.5f, -0.5f,  0.5f,
       0.5f,  0.5f,  0.5f,
      -0.5f,  0.5f,  0.5f,
   };
   static const unsigned short cube_indices[] = {
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      0, 4, 5, 0, 5, 1,
      3, 2, 6, 3, 6, 7,
      1, 5, 6, 1, 6, 2,
      0, 3, 7, 0, 7, 4,
   };
   static const GLfloat plane_vertices[] = {
      -0.5f, 0.0f, -0.5f,
       0.5f, 0.0f, -0.5f,
       0.5f, 0.0f,  0.5f,
      -0.5f, 0.0f,  0.5f,
   };
   static const unsigned short plane_indices[] = {
      0, 1, 2, 0, 2, 3,
   };

   if (!gles_create_cube_program())
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
   gles.Uniform4f = (PFNGLUNIFORM4FPROC)load_gles_proc("glUniform4f");
   gles.GenBuffers = (PFNGLGENBUFFERSPROC)load_gles_proc("glGenBuffers");
   gles.BindBuffer = (PFNGLBINDBUFFERPROC)load_gles_proc("glBindBuffer");
   gles.BufferData = (PFNGLBUFFERDATAPROC)load_gles_proc("glBufferData");
   gles.DeleteBuffers = (PFNGLDELETEBUFFERSPROC)load_gles_proc("glDeleteBuffers");
   gles.EnableVertexAttribArray = (PFNGLENABLEVERTEXATTRIBARRAYPROC)load_gles_proc("glEnableVertexAttribArray");
   gles.DisableVertexAttribArray = (PFNGLDISABLEVERTEXATTRIBARRAYPROC)load_gles_proc("glDisableVertexAttribArray");
   gles.VertexAttribPointer = (PFNGLVERTEXATTRIBPOINTERPROC)load_gles_proc("glVertexAttribPointer");
   gles.DrawElements = (PFNGLDRAWELEMENTSPROC)load_gles_proc("glDrawElements");

   gles.functions_loaded = gles.Viewport && gles.ClearColor && gles.Clear &&
      gles.CreateShader && gles.ShaderSource && gles.CompileShader && gles.GetShaderiv &&
      gles.DeleteShader && gles.CreateProgram && gles.AttachShader && gles.LinkProgram &&
      gles.GetProgramiv && gles.DeleteProgram && gles.UseProgram && gles.GetAttribLocation &&
      gles.GetUniformLocation && gles.UniformMatrix4fv && gles.Uniform4f &&
      gles.GenBuffers && gles.BindBuffer && gles.BufferData && gles.DeleteBuffers &&
      gles.EnableVertexAttribArray && gles.DisableVertexAttribArray &&
      gles.VertexAttribPointer && gles.DrawElements;
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
   gles.Uniform4f = NULL;
   gles.GenBuffers = NULL;
   gles.BindBuffer = NULL;
   gles.BufferData = NULL;
   gles.DeleteBuffers = NULL;
   gles.EnableVertexAttribArray = NULL;
   gles.DisableVertexAttribArray = NULL;
   gles.VertexAttribPointer = NULL;
   gles.DrawElements = NULL;
   nova64_log_line(RETRO_LOG_INFO, "[nova64] GLES3 hardware context destroyed");
}

static void render_gles_primitive(const struct nova64_mesh *mesh, const float view_projection[16],
      GLuint vbo, GLuint ibo, GLsizei index_count)
{
   float model[16];
   float mvp[16];
   mat4_from_mesh(model, mesh);
   mat4_multiply(mvp, view_projection, model);

   uint32_t color = mesh->color;
   float r = (float)((color >> 24) & 0xffU) / 255.0f;
   float g = (float)((color >> 16) & 0xffU) / 255.0f;
   float b = (float)((color >> 8) & 0xffU) / 255.0f;
   float a = (float)(color & 0xffU) / 255.0f;

   gles.UseProgram(gles.cube_program);
   gles.UniformMatrix4fv(gles.cube_mvp_uniform, 1, GL_FALSE, mvp);
   gles.Uniform4f(gles.cube_color_uniform, r, g, b, a);
   gles.BindBuffer(GL_ARRAY_BUFFER, vbo);
   gles.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);
   gles.EnableVertexAttribArray((GLuint)gles.cube_position_attrib);
   gles.VertexAttribPointer((GLuint)gles.cube_position_attrib, 3, GL_FLOAT, GL_FALSE, 0, NULL);
   gles.DrawElements(GL_TRIANGLES, index_count, GL_UNSIGNED_SHORT, NULL);
   gles.DisableVertexAttribArray((GLuint)gles.cube_position_attrib);
}

static void render_gles_cube(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.cube_vbo, gles.cube_ibo, 36);
}

static void render_gles_plane(const struct nova64_mesh *mesh, const float view_projection[16])
{
   render_gles_primitive(mesh, view_projection, gles.plane_vbo, gles.plane_ibo, 6);
}

static void render_gles_scene(void)
{
   if (!gles.active || !gles_load_functions())
      return;

   uint32_t ambient = light_state.ambient;
   float r = (float)((ambient >> 24) & 0xffU) / 255.0f;
   float g = (float)((ambient >> 16) & 0xffU) / 255.0f;
   float b = (float)((ambient >> 8) & 0xffU) / 255.0f;
   if (gles.Viewport)
      gles.Viewport(0, 0, NOVA64_WIDTH, NOVA64_HEIGHT);
   if (gles.Enable)
      gles.Enable(GL_DEPTH_TEST);
   gles.ClearColor(r, g, b, 1.0f);
   gles.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

   if (!gles_init_resources())
      return;

   float projection[16];
   float view[16];
   float view_projection[16];
   float up[3] = {0.0f, 1.0f, 0.0f};
   mat4_perspective(projection, camera_state.fov, (float)NOVA64_WIDTH / (float)NOVA64_HEIGHT, 0.05f, 100.0f);
   mat4_look_at(view, camera_state.position, camera_state.target, up);
   mat4_multiply(view_projection, projection, view);

   for (int i = 0; i < NOVA64_MAX_MESHES; i++) {
      if (meshes[i].used && meshes[i].type == NOVA64_MESH_CUBE)
         render_gles_cube(&meshes[i], view_projection);
      else if (meshes[i].used && meshes[i].type == NOVA64_MESH_PLANE)
         render_gles_plane(&meshes[i], view_projection);
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

static bool parse_manifest_main(const char *manifest, size_t manifest_size, char *out_path, size_t out_path_size)
{
   if (!manifest || !out_path || out_path_size == 0)
      return false;

   const char *cursor = manifest;
   const char *end = manifest + manifest_size;
   while (cursor < end) {
      const char *key = strstr(cursor, "\"main\"");
      if (!key || key >= end)
         return false;
      cursor = key + 6;
      while (cursor < end && (*cursor == ' ' || *cursor == '\t' || *cursor == '\r' || *cursor == '\n'))
         cursor++;
      if (cursor >= end || *cursor != ':')
         continue;
      cursor++;
      while (cursor < end && (*cursor == ' ' || *cursor == '\t' || *cursor == '\r' || *cursor == '\n'))
         cursor++;
      if (cursor >= end || *cursor != '"')
         return false;
      cursor++;
      size_t len = 0;
      while (cursor < end && *cursor != '"' && *cursor != '\\' && len + 1 < out_path_size)
         out_path[len++] = *cursor++;
      out_path[len] = '\0';
      if (len == 0 || strstr(out_path, "..") || out_path[0] == '/' || out_path[0] == '\\')
         return false;
      return true;
   }
   return false;
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
      if (parse_manifest_main(manifest, manifest_size, manifest_main, sizeof(manifest_main))) {
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
   if (!framebuffer || !rgb565_framebuffer) {
      nova64_log_line(RETRO_LOG_ERROR, "[nova64] failed to allocate framebuffers");
      free(framebuffer);
      free(rgb565_framebuffer);
      framebuffer = NULL;
      rgb565_framebuffer = NULL;
      return;
   }

   clear_framebuffer(rgba8(0, 0, 0, 255));
   reset_scene_state();
   initialized = true;
   nova64_log_line(RETRO_LOG_INFO, "[nova64] core initialized");
}

void RETRO_CALLCONV retro_deinit(void)
{
   js_host_free();
   free(framebuffer);
   free(rgb565_framebuffer);
   free(cart_content);
   framebuffer = NULL;
   rgb565_framebuffer = NULL;
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

   cb(RETRO_ENVIRONMENT_SET_PIXEL_FORMAT, &pixel_format);

   memset(&hw_render, 0, sizeof(hw_render));
   hw_render.context_type = RETRO_HW_CONTEXT_OPENGLES3;
   hw_render.context_reset = gles_context_reset;
   hw_render.context_destroy = gles_context_destroy;
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
   frame_count = 0;
   clear_framebuffer(rgba8(0, 0, 0, 255));
   reset_scene_state();
   if (cart_content && cart_size)
      js_host_load_cart(cart_content, cart_size, cart_path[0] ? cart_path : "<nova64-cart>");
}

void RETRO_CALLCONV retro_run(void)
{
   if (!initialized || !video_cb)
      return;

   update_input();
   js_host_call_frame(1.0 / NOVA64_FPS);

   if (gles.requested && gles.active) {
      render_gles_scene();
      video_cb((const void *)RETRO_HW_FRAME_BUFFER_VALID, NOVA64_WIDTH, NOVA64_HEIGHT, 0);
   } else {
      convert_framebuffer_to_rgb565();
      video_cb(rgb565_framebuffer, NOVA64_WIDTH, NOVA64_HEIGHT, NOVA64_WIDTH * sizeof(uint16_t));
   }

   frame_count++;
   (void)audio_batch_cb;
   (void)audio_cb;
}

bool RETRO_CALLCONV retro_load_game(const struct retro_game_info *info)
{
   free(cart_content);
   cart_content = NULL;
   cart_size = 0;
   cart_path[0] = '\0';

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
   js_host_free();
   free(cart_content);
   cart_content = NULL;
   cart_size = 0;
   cart_path[0] = '\0';
}

unsigned RETRO_CALLCONV retro_get_region(void)
{
   return RETRO_REGION_NTSC;
}

size_t RETRO_CALLCONV retro_serialize_size(void)
{
   return sizeof(struct nova64_save_header) +
          ((size_t)NOVA64_WIDTH * NOVA64_HEIGHT * sizeof(uint32_t)) +
          sizeof(meshes) + sizeof(camera_state) + sizeof(light_state);
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
