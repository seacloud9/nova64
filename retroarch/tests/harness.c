#include <dlfcn.h>
#include <errno.h>
#include <math.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "../libretro.h"

/* ── EGL/GLES3 headless context ─────────────────────────────────────────────
 * All EGL types and functions are loaded dynamically via dlopen so that
 * no EGL dev headers are required. libEGL.so.1 ships with libegl-mesa0.
 * GL functions are retrieved via eglGetProcAddress after context creation.
 * ───────────────────────────────────────────────────────────────────────── */

/* EGL opaque handle types */
typedef void *HarnessEGLDisplay;
typedef void *HarnessEGLContext;
typedef void *HarnessEGLSurface;
typedef void *HarnessEGLConfig;
typedef int   HarnessEGLBoolean;
typedef int   HarnessEGLint;
typedef unsigned int HarnessEGLenum;

#define HARNESS_EGL_DEFAULT_DISPLAY  ((void *)0)
#define HARNESS_EGL_NO_DISPLAY       ((HarnessEGLDisplay)0)
#define HARNESS_EGL_NO_CONTEXT       ((HarnessEGLContext)0)
#define HARNESS_EGL_NO_SURFACE       ((HarnessEGLSurface)0)
#define HARNESS_EGL_OPENGL_ES_API    0x30A0
#define HARNESS_EGL_CONTEXT_CLIENT_VERSION 0x3098
#define HARNESS_EGL_NONE             0x3038
#define HARNESS_EGL_TRUE             1

/* GL constants needed for FBO setup */
#define HARNESS_GL_RGBA              0x1908
#define HARNESS_GL_UNSIGNED_BYTE     0x1401
#define HARNESS_GL_TEXTURE_2D        0x0DE1
#define HARNESS_GL_RENDERBUFFER      0x8D41
#define HARNESS_GL_FRAMEBUFFER       0x8D40
#define HARNESS_GL_COLOR_ATTACHMENT0 0x8CE0
#define HARNESS_GL_DEPTH_ATTACHMENT  0x8D00
#define HARNESS_GL_DEPTH_COMPONENT16 0x81A5
#define HARNESS_GL_FRAMEBUFFER_COMPLETE 0x8CD5

/* EGL function pointer types */
typedef HarnessEGLDisplay (*pfn_eglGetDisplay)(void *);
typedef HarnessEGLBoolean (*pfn_eglInitialize)(HarnessEGLDisplay, HarnessEGLint *, HarnessEGLint *);
typedef HarnessEGLBoolean (*pfn_eglBindAPI)(HarnessEGLenum);
typedef HarnessEGLContext (*pfn_eglCreateContext)(HarnessEGLDisplay, HarnessEGLConfig, HarnessEGLContext, const HarnessEGLint *);
typedef HarnessEGLBoolean (*pfn_eglMakeCurrent)(HarnessEGLDisplay, HarnessEGLSurface, HarnessEGLSurface, HarnessEGLContext);
typedef HarnessEGLBoolean (*pfn_eglDestroyContext)(HarnessEGLDisplay, HarnessEGLContext);
typedef HarnessEGLBoolean (*pfn_eglTerminate)(HarnessEGLDisplay);
typedef void *(*pfn_eglGetProcAddress)(const char *);
typedef HarnessEGLint (*pfn_eglGetError)(void);

/* GL function pointer types (unsigned int = GLuint/GLenum, int = GLint/GLsizei) */
typedef void (*pfn_glGenFramebuffers)(int, unsigned int *);
typedef void (*pfn_glBindFramebuffer)(unsigned int, unsigned int);
typedef void (*pfn_glGenTextures)(int, unsigned int *);
typedef void (*pfn_glBindTexture)(unsigned int, unsigned int);
typedef void (*pfn_glTexImage2D)(unsigned int, int, int, int, int, int, unsigned int, unsigned int, const void *);
typedef void (*pfn_glTexParameteri)(unsigned int, unsigned int, int);
typedef void (*pfn_glGenRenderbuffers)(int, unsigned int *);
typedef void (*pfn_glBindRenderbuffer)(unsigned int, unsigned int);
typedef void (*pfn_glRenderbufferStorage)(unsigned int, unsigned int, int, int);
typedef void (*pfn_glFramebufferTexture2D)(unsigned int, unsigned int, unsigned int, unsigned int, int);
typedef void (*pfn_glFramebufferRenderbuffer)(unsigned int, unsigned int, unsigned int, unsigned int);
typedef unsigned int (*pfn_glCheckFramebufferStatus)(unsigned int);
typedef void (*pfn_glReadPixels)(int, int, int, int, unsigned int, unsigned int, void *);
typedef void (*pfn_glDeleteFramebuffers)(int, const unsigned int *);
typedef void (*pfn_glDeleteTextures)(int, const unsigned int *);
typedef void (*pfn_glDeleteRenderbuffers)(int, const unsigned int *);
typedef void (*pfn_glFinish)(void);

/* Runtime-loaded EGL state */
static void *g_egl_lib = NULL;
static pfn_eglGetDisplay      g_eglGetDisplay;
static pfn_eglInitialize      g_eglInitialize;
static pfn_eglBindAPI         g_eglBindAPI;
static pfn_eglCreateContext   g_eglCreateContext;
static pfn_eglMakeCurrent     g_eglMakeCurrent;
static pfn_eglDestroyContext  g_eglDestroyContext;
static pfn_eglTerminate       g_eglTerminate;
static pfn_eglGetProcAddress  g_eglGetProcAddress;
static pfn_eglGetError        g_eglGetError;

/* Runtime-loaded GL state */
static pfn_glGenFramebuffers       g_glGenFramebuffers;
static pfn_glBindFramebuffer       g_glBindFramebuffer;
static pfn_glGenTextures           g_glGenTextures;
static pfn_glBindTexture           g_glBindTexture;
static pfn_glTexImage2D            g_glTexImage2D;
static pfn_glTexParameteri         g_glTexParameteri;
static pfn_glGenRenderbuffers      g_glGenRenderbuffers;
static pfn_glBindRenderbuffer      g_glBindRenderbuffer;
static pfn_glRenderbufferStorage   g_glRenderbufferStorage;
static pfn_glFramebufferTexture2D  g_glFramebufferTexture2D;
static pfn_glFramebufferRenderbuffer g_glFramebufferRenderbuffer;
static pfn_glCheckFramebufferStatus g_glCheckFramebufferStatus;
static pfn_glReadPixels            g_glReadPixels;
static pfn_glDeleteFramebuffers    g_glDeleteFramebuffers;
static pfn_glDeleteTextures        g_glDeleteTextures;
static pfn_glDeleteRenderbuffers   g_glDeleteRenderbuffers;
static pfn_glFinish                g_glFinish;

/* EGL/GL state */
static HarnessEGLDisplay g_egl_dpy = NULL;
static HarnessEGLContext g_egl_ctx = NULL;
static unsigned int g_fbo = 0, g_fbo_tex = 0, g_fbo_depth = 0;
static unsigned g_hw_width = 640, g_hw_height = 360;
static bool g_gles_active = false;    /* GLES3 context successfully created */
static bool g_request_gles = false;   /* --gles flag passed */
static uint8_t *g_hw_pixels = NULL;   /* readback buffer for GLES frames */
static bool g_hw_last_frame = false;  /* last frame was a HW readback */
static struct retro_hw_render_callback g_hw_render;

static retro_proc_address_t harness_get_proc_address(const char *sym)
{
   return (retro_proc_address_t)(uintptr_t)g_eglGetProcAddress(sym);
}

static uintptr_t harness_get_current_framebuffer(void)
{
   return (uintptr_t)g_fbo;
}

static bool harness_load_egl(void)
{
   g_egl_lib = dlopen("libEGL.so.1", RTLD_NOW | RTLD_GLOBAL);
   if (!g_egl_lib) {
      fprintf(stderr, "[harness] dlopen libEGL.so.1 failed: %s\n", dlerror());
      return false;
   }
#define LEGL(fn) g_##fn = (pfn_##fn)dlsym(g_egl_lib, #fn); if (!g_##fn) { fprintf(stderr,"[harness] missing EGL sym: %s\n",#fn); return false; }
   LEGL(eglGetDisplay)
   LEGL(eglInitialize)
   LEGL(eglBindAPI)
   LEGL(eglCreateContext)
   LEGL(eglMakeCurrent)
   LEGL(eglDestroyContext)
   LEGL(eglTerminate)
   LEGL(eglGetProcAddress)
   LEGL(eglGetError)
#undef LEGL
   return true;
}

static void harness_load_gl(void)
{
#define LGL(fn) g_##fn = (pfn_##fn)((uintptr_t)g_eglGetProcAddress(#fn));
   LGL(glGenFramebuffers)
   LGL(glBindFramebuffer)
   LGL(glGenTextures)
   LGL(glBindTexture)
   LGL(glTexImage2D)
   LGL(glTexParameteri)
   LGL(glGenRenderbuffers)
   LGL(glBindRenderbuffer)
   LGL(glRenderbufferStorage)
   LGL(glFramebufferTexture2D)
   LGL(glFramebufferRenderbuffer)
   LGL(glCheckFramebufferStatus)
   LGL(glReadPixels)
   LGL(glDeleteFramebuffers)
   LGL(glDeleteTextures)
   LGL(glDeleteRenderbuffers)
   LGL(glFinish)
#undef LGL
}

static bool harness_setup_gles3(void)
{
   if (!harness_load_egl())
      return false;

   g_egl_dpy = g_eglGetDisplay(HARNESS_EGL_DEFAULT_DISPLAY);
   if (!g_egl_dpy) { fprintf(stderr, "[harness] eglGetDisplay failed\n"); return false; }

   HarnessEGLint major = 0, minor = 0;
   if (!g_eglInitialize(g_egl_dpy, &major, &minor)) {
      fprintf(stderr, "[harness] eglInitialize failed: %x\n", g_eglGetError());
      return false;
   }
   fprintf(stderr, "[harness] EGL %d.%d\n", major, minor);

   if (!g_eglBindAPI(HARNESS_EGL_OPENGL_ES_API)) {
      fprintf(stderr, "[harness] eglBindAPI GLES failed\n"); return false;
   }

   /* EGL_KHR_no_config_context: pass NULL config */
   HarnessEGLint ctx_attrs[] = { HARNESS_EGL_CONTEXT_CLIENT_VERSION, 3, HARNESS_EGL_NONE };
   g_egl_ctx = g_eglCreateContext(g_egl_dpy, NULL, HARNESS_EGL_NO_CONTEXT, ctx_attrs);
   if (!g_egl_ctx) {
      fprintf(stderr, "[harness] eglCreateContext GLES3 failed: %x\n", g_eglGetError());
      return false;
   }

   /* EGL_KHR_surfaceless_context: make current with no surface */
   if (!g_eglMakeCurrent(g_egl_dpy, HARNESS_EGL_NO_SURFACE, HARNESS_EGL_NO_SURFACE, g_egl_ctx)) {
      fprintf(stderr, "[harness] eglMakeCurrent surfaceless failed: %x\n", g_eglGetError());
      return false;
   }

   harness_load_gl();

   if (!g_glGenFramebuffers) {
      fprintf(stderr, "[harness] GL functions unavailable via eglGetProcAddress\n");
      return false;
   }

   /* Allocate pixel readback buffer */
   g_hw_pixels = (uint8_t *)malloc((size_t)g_hw_width * g_hw_height * 4);
   if (!g_hw_pixels) return false;

   /* Create FBO */
   g_glGenFramebuffers(1, &g_fbo);
   g_glBindFramebuffer(HARNESS_GL_FRAMEBUFFER, g_fbo);

   g_glGenTextures(1, &g_fbo_tex);
   g_glBindTexture(HARNESS_GL_TEXTURE_2D, g_fbo_tex);
   g_glTexImage2D(HARNESS_GL_TEXTURE_2D, 0, (int)HARNESS_GL_RGBA,
      (int)g_hw_width, (int)g_hw_height, 0,
      HARNESS_GL_RGBA, HARNESS_GL_UNSIGNED_BYTE, NULL);
   g_glFramebufferTexture2D(HARNESS_GL_FRAMEBUFFER, HARNESS_GL_COLOR_ATTACHMENT0,
      HARNESS_GL_TEXTURE_2D, g_fbo_tex, 0);

   g_glGenRenderbuffers(1, &g_fbo_depth);
   g_glBindRenderbuffer(HARNESS_GL_RENDERBUFFER, g_fbo_depth);
   g_glRenderbufferStorage(HARNESS_GL_RENDERBUFFER, HARNESS_GL_DEPTH_COMPONENT16,
      (int)g_hw_width, (int)g_hw_height);
   g_glFramebufferRenderbuffer(HARNESS_GL_FRAMEBUFFER, HARNESS_GL_DEPTH_ATTACHMENT,
      HARNESS_GL_RENDERBUFFER, g_fbo_depth);

   unsigned int status = g_glCheckFramebufferStatus(HARNESS_GL_FRAMEBUFFER);
   if (status != HARNESS_GL_FRAMEBUFFER_COMPLETE) {
      fprintf(stderr, "[harness] FBO incomplete: %x\n", status);
      return false;
   }

   fprintf(stderr, "[harness] GLES3 headless FBO ready (%ux%u)\n", g_hw_width, g_hw_height);
   return true;
}

static void harness_teardown_gles3(void)
{
   if (g_egl_ctx && g_egl_dpy) {
      g_eglMakeCurrent(g_egl_dpy, HARNESS_EGL_NO_SURFACE, HARNESS_EGL_NO_SURFACE, HARNESS_EGL_NO_CONTEXT);
      if (g_fbo)       { g_glDeleteFramebuffers(1, &g_fbo);       g_fbo = 0; }
      if (g_fbo_tex)   { g_glDeleteTextures(1, &g_fbo_tex);       g_fbo_tex = 0; }
      if (g_fbo_depth) { g_glDeleteRenderbuffers(1, &g_fbo_depth); g_fbo_depth = 0; }
      g_eglDestroyContext(g_egl_dpy, g_egl_ctx);
      g_eglTerminate(g_egl_dpy);
      g_egl_ctx = NULL;
      g_egl_dpy = NULL;
   }
   free(g_hw_pixels); g_hw_pixels = NULL;
   if (g_egl_lib) { dlclose(g_egl_lib); g_egl_lib = NULL; }
   g_gles_active = false;
}

static retro_log_printf_t g_log;
static uint64_t g_checksum;
static uint64_t g_audio_checksum = 1469598103934665603ULL;
static unsigned g_video_frames;
static unsigned g_audio_frames;
static bool g_joypad[16];       /* port 0 joypad */
static bool g_joypad_mp[4][16]; /* multi-port joypad (port 0 mirrors g_joypad) */
static int  g_active_port = 0;  /* port target for --btn injections */
static bool g_keyboard[512];
static int16_t g_mouse_x;
static int16_t g_mouse_y;
static bool g_mouse_btn[3]; /* left, right, middle */
static int16_t g_touch_x;
static int16_t g_touch_y;
static bool g_touch_pressed;
static int16_t g_touch_count;
/* Analog: [port][side 0=L,1=R][axis 0=X,1=Y] */
static int16_t g_analog[4][2][2];
/* Triggers: [port][0=L2,1=R2] */
static int16_t g_trigger[4][2];
static const char *g_renderer_option;
static uint16_t *g_last_frame;
static unsigned g_last_width;
static unsigned g_last_height;

static bool parse_u64_hex(const char *text, uint64_t *out)
{
   if (!text || !out)
      return false;
   errno = 0;
   char *end = NULL;
   unsigned long long value = strtoull(text, &end, 16);
   if (errno != 0 || !end || *end != '\0')
      return false;
   *out = (uint64_t)value;
   return true;
}

static void harness_log(enum retro_log_level level, const char *fmt, ...)
{
   (void)level;
   va_list args;
   va_start(args, fmt);
   vfprintf(stderr, fmt, args);
   va_end(args);
}

static bool harness_environment(unsigned cmd, void *data)
{
   switch (cmd) {
      case RETRO_ENVIRONMENT_GET_LOG_INTERFACE: {
         struct retro_log_callback *logger = (struct retro_log_callback *)data;
         logger->log = g_log;
         return true;
      }
      case RETRO_ENVIRONMENT_SET_PIXEL_FORMAT:
      case RETRO_ENVIRONMENT_SET_SUPPORT_NO_GAME:
      case RETRO_ENVIRONMENT_SET_VARIABLES:
         return true;
      case RETRO_ENVIRONMENT_GET_VARIABLE: {
         struct retro_variable *variable = (struct retro_variable *)data;
         if (variable && variable->key && !strcmp(variable->key, "nova64_renderer")) {
            variable->value = g_renderer_option ? g_renderer_option : "opengles3";
            return true;
         }
         return false;
      }
      case RETRO_ENVIRONMENT_SET_HW_RENDER: {
         if (!g_request_gles)
            return false;
         struct retro_hw_render_callback *hw = (struct retro_hw_render_callback *)data;
         if (!harness_setup_gles3())
            return false;
         hw->get_current_framebuffer = harness_get_current_framebuffer;
         hw->get_proc_address = harness_get_proc_address;
         g_hw_render = *hw;
         g_gles_active = true;
         return true;
      }
      default:
         return false;
   }
}

static void harness_video(const void *data, unsigned width, unsigned height, size_t pitch)
{
   g_video_frames++;

   /* RETRO_HW_FRAME_BUFFER_VALID sentinel: read back from FBO */
   if (data == (const void *)(uintptr_t)(-1)) {
      if (g_gles_active && g_hw_pixels) {
         g_glFinish();
         g_glBindFramebuffer(HARNESS_GL_FRAMEBUFFER, g_fbo);
         g_glReadPixels(0, 0, (int)g_hw_width, (int)g_hw_height,
            HARNESS_GL_RGBA, HARNESS_GL_UNSIGNED_BYTE, g_hw_pixels);
         g_checksum = 1469598103934665603ULL;
         size_t n = (size_t)g_hw_width * g_hw_height * 4;
         for (size_t i = 0; i < n; i++) {
            g_checksum ^= g_hw_pixels[i];
            g_checksum *= 1099511628211ULL;
         }
         g_last_width  = g_hw_width;
         g_last_height = g_hw_height;
         g_hw_last_frame = true;
      }
      return;
   }

   if (!data)
      return;

   /* Software frame: RGB565 */
   g_hw_last_frame = false;
   size_t pixels = (size_t)width * height;
   uint16_t *copy = (uint16_t *)realloc(g_last_frame, pixels * sizeof(uint16_t));
   if (copy) {
      g_last_frame = copy;
      g_last_width = width;
      g_last_height = height;
      for (unsigned y = 0; y < height; y++)
         memcpy(&g_last_frame[(size_t)y * width], (const uint8_t *)data + (size_t)y * pitch, width * sizeof(uint16_t));
   }

   const uint8_t *bytes = (const uint8_t *)data;
   g_checksum = 1469598103934665603ULL;
   for (unsigned y = 0; y < height; y++) {
      const uint8_t *row = bytes + (size_t)y * pitch;
      for (unsigned x = 0; x < width * 2; x++) {
         g_checksum ^= row[x];
         g_checksum *= 1099511628211ULL;
      }
   }
}

static void harness_audio(int16_t left, int16_t right)
{
   int16_t samples[2] = {left, right};
   const uint8_t *bytes = (const uint8_t *)samples;
   for (size_t i = 0; i < sizeof(samples); i++) {
      g_audio_checksum ^= bytes[i];
      g_audio_checksum *= 1099511628211ULL;
   }
   g_audio_frames++;
}

static size_t harness_audio_batch(const int16_t *data, size_t frames)
{
   if (data) {
      const uint8_t *bytes = (const uint8_t *)data;
      size_t byte_count = frames * 2 * sizeof(int16_t);
      for (size_t i = 0; i < byte_count; i++) {
         g_audio_checksum ^= bytes[i];
         g_audio_checksum *= 1099511628211ULL;
      }
   }
   g_audio_frames += (unsigned)frames;
   return frames;
}

static void harness_input_poll(void) {}

static int harness_btn_id(const char *name)
{
   if (!name) return -1;
   if (!strcmp(name, "b"))      return RETRO_DEVICE_ID_JOYPAD_B;
   if (!strcmp(name, "y"))      return RETRO_DEVICE_ID_JOYPAD_Y;
   if (!strcmp(name, "select")) return RETRO_DEVICE_ID_JOYPAD_SELECT;
   if (!strcmp(name, "start"))  return RETRO_DEVICE_ID_JOYPAD_START;
   if (!strcmp(name, "up"))     return RETRO_DEVICE_ID_JOYPAD_UP;
   if (!strcmp(name, "down"))   return RETRO_DEVICE_ID_JOYPAD_DOWN;
   if (!strcmp(name, "left"))   return RETRO_DEVICE_ID_JOYPAD_LEFT;
   if (!strcmp(name, "right"))  return RETRO_DEVICE_ID_JOYPAD_RIGHT;
   if (!strcmp(name, "a"))      return RETRO_DEVICE_ID_JOYPAD_A;
   if (!strcmp(name, "x"))      return RETRO_DEVICE_ID_JOYPAD_X;
   if (!strcmp(name, "l"))      return RETRO_DEVICE_ID_JOYPAD_L;
   if (!strcmp(name, "r"))      return RETRO_DEVICE_ID_JOYPAD_R;
   if (!strcmp(name, "l2"))     return RETRO_DEVICE_ID_JOYPAD_L2;
   if (!strcmp(name, "r2"))     return RETRO_DEVICE_ID_JOYPAD_R2;
   if (!strcmp(name, "l3"))     return RETRO_DEVICE_ID_JOYPAD_L3;
   if (!strcmp(name, "r3"))     return RETRO_DEVICE_ID_JOYPAD_R3;
   return -1;
}

static int harness_key_code(const char *name)
{
   if (!name) return -1;
   if (!strcmp(name, "up"))     return 273;
   if (!strcmp(name, "down"))   return 274;
   if (!strcmp(name, "right"))  return 275;
   if (!strcmp(name, "left"))   return 276;
   if (!strcmp(name, "space"))  return 32;
   if (!strcmp(name, "enter") || !strcmp(name, "return")) return 13;
   if (!strcmp(name, "escape") || !strcmp(name, "esc"))   return 27;
   if (!strcmp(name, "backspace")) return 8;
   if (!strcmp(name, "tab"))    return 9;
   if (!strcmp(name, "shift") || !strcmp(name, "lshift")) return 304;
   if (!strcmp(name, "rshift")) return 303;
   if (!strcmp(name, "ctrl") || !strcmp(name, "lctrl"))   return 306;
   if (!strcmp(name, "rctrl"))  return 305;
   if (!strcmp(name, "alt") || !strcmp(name, "lalt"))     return 308;
   if (!strcmp(name, "ralt"))   return 307;
   if (name[0] >= 'a' && name[0] <= 'z' && name[1] == '\0') return (int)name[0];
   if (name[0] >= '0' && name[0] <= '9' && name[1] == '\0') return (int)name[0];
   if (name[0] == 'f' || name[0] == 'F') {
      int fn = (int)strtol(name + 1, NULL, 10);
      if (fn >= 1 && fn <= 12) return 282 + (fn - 1);
   }
   return -1;
}

static int16_t harness_input_state(unsigned port, unsigned device, unsigned index, unsigned id)
{
   if (device == RETRO_DEVICE_KEYBOARD) {
      if (id < 512)
         return g_keyboard[id] ? 1 : 0;
      return 0;
   }
   if (device == RETRO_DEVICE_MOUSE) {
      (void)port;
      switch (id) {
         case 0: return g_mouse_x;
         case 1: return g_mouse_y;
         case 2: return g_mouse_btn[0] ? 1 : 0;
         case 3: return g_mouse_btn[1] ? 1 : 0;
         case 6: return g_mouse_btn[2] ? 1 : 0;
         default: return 0;
      }
   }
   if (device == RETRO_DEVICE_POINTER) {
      (void)port;
      (void)index;
      switch (id) {
         case 0: return g_touch_x;
         case 1: return g_touch_y;
         case 2: return g_touch_pressed ? 1 : 0;
         case 3: return g_touch_count;
         default: return 0;
      }
   }
   /* RETRO_DEVICE_ANALOG == 5 */
   if (device == 5) {
      unsigned p = port < 4 ? port : 0;
      if (index < 2 && id < 2)
         return g_analog[p][index][id];
      if (index == 2) {
         /* triggers: id 10 = L2, id 11 = R2 */
         if (id == 10) return g_trigger[p][0];
         if (id == 11) return g_trigger[p][1];
      }
      return 0;
   }
   if (device != RETRO_DEVICE_JOYPAD || id >= 16)
      return 0;
   unsigned p = port < 4 ? port : 0;
   return g_joypad_mp[p][id] ? 1 : 0;
}

static char *read_file(const char *path, size_t *out_size)
{
   FILE *file = fopen(path, "rb");
   if (!file)
      return NULL;
   fseek(file, 0, SEEK_END);
   long length = ftell(file);
   rewind(file);
   if (length < 0) {
      fclose(file);
      return NULL;
   }
   char *data = (char *)malloc((size_t)length + 1);
   if (!data) {
      fclose(file);
      return NULL;
   }
   size_t read_count = fread(data, 1, (size_t)length, file);
   fclose(file);
   if (read_count != (size_t)length) {
      free(data);
      return NULL;
   }
   data[length] = '\0';
   *out_size = (size_t)length;
   return data;
}

static bool write_ppm(const char *path)
{
   if (!path || !g_last_width || !g_last_height)
      return false;

   FILE *file = fopen(path, "wb");
   if (!file)
      return false;

   fprintf(file, "P6\n%u %u\n255\n", g_last_width, g_last_height);

   if (g_hw_last_frame && g_hw_pixels) {
      /* RGBA8 readback is bottom-up from glReadPixels; PPM rows are top-down. */
      for (unsigned y = 0; y < g_last_height; y++) {
         unsigned src_y = g_last_height - 1 - y;
         for (unsigned x = 0; x < g_last_width; x++) {
            const uint8_t *p = g_hw_pixels + ((size_t)src_y * g_last_width + x) * 4;
            fwrite(p, 1, 3, file);
         }
      }
   } else if (g_last_frame) {
      /* RGB565 software frame */
      for (unsigned y = 0; y < g_last_height; y++) {
         for (unsigned x = 0; x < g_last_width; x++) {
            uint16_t pixel = g_last_frame[(size_t)y * g_last_width + x];
            uint8_t rgb[3];
            rgb[0] = (uint8_t)(((pixel >> 11) & 0x1f) * 255 / 31);
            rgb[1] = (uint8_t)(((pixel >> 5) & 0x3f) * 255 / 63);
            rgb[2] = (uint8_t)((pixel & 0x1f) * 255 / 31);
            fwrite(rgb, 1, sizeof(rgb), file);
         }
      }
   } else {
      fclose(file);
      return false;
   }

   fclose(file);
   return true;
}

static void *load_symbol(void *core, const char *name)
{
   void *symbol = dlsym(core, name);
   if (!symbol)
      fprintf(stderr, "missing symbol: %s\n", name);
   return symbol;
}

static uint64_t harness_now_ns(void)
{
   struct timespec ts;
   if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0)
      return 0;
   return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec;
}

int main(int argc, char **argv)
{
   if (argc < 3) {
      fprintf(stderr, "usage: %s <nova64_libretro.so> <cart.js|cart.nova> [--capture path] [--command-log path] [--renderer opengles3|vulkan12] [--gles] [--expect checksum] [--expect-audio checksum] [--frames n] [--warmup-frames n] [--measure-fps] [--seed n] [--perf] [--verbose] [--key name] [--port 0-3] [--btn name] [--touch-x n --touch-y n --touch-count n]\n", argv[0]);
      return 2;
   }

   const char *capture_path = NULL;
   const char *command_log_path = NULL;
   bool has_expected_checksum = false;
   uint64_t expected_checksum = 0;
   bool has_expected_audio_checksum = false;
   uint64_t expected_audio_checksum = 0;
   unsigned frames_to_run = 3;
   unsigned warmup_frames = 0;
   const char *seed_option = NULL;
   bool perf_enabled = false;
   bool measure_fps = false;
   double measured_fps = 0.0;
   double measured_frame_ms = 0.0;

   /* --press FRAME=KEY scheduling: holds key for that frame only so the
    * DOM-event bridge sees both a keydown (rising edge) and a keyup
    * (falling edge on the next frame). */
   struct press_event { unsigned frame; int code; };
   struct press_event press_events[32];
   unsigned press_count = 0;

   for (int i = 3; i < argc; i++) {
      if (!strcmp(argv[i], "--capture")) {
         if (++i >= argc) {
            fprintf(stderr, "--capture requires a path\n");
            return 2;
         }
         capture_path = argv[i];
      } else if (!strcmp(argv[i], "--command-log")) {
         if (++i >= argc) {
            fprintf(stderr, "--command-log requires a path\n");
            return 2;
         }
         command_log_path = argv[i];
      } else if (!strcmp(argv[i], "--renderer")) {
         if (++i >= argc) {
            fprintf(stderr, "--renderer requires opengles3 or vulkan12\n");
            return 2;
         }
         g_renderer_option = argv[i];
      } else if (!strcmp(argv[i], "--expect")) {
         if (++i >= argc || !parse_u64_hex(argv[i], &expected_checksum)) {
            fprintf(stderr, "--expect requires a hex checksum\n");
            return 2;
         }
         has_expected_checksum = true;
      } else if (!strcmp(argv[i], "--expect-audio")) {
         if (++i >= argc || !parse_u64_hex(argv[i], &expected_audio_checksum)) {
            fprintf(stderr, "--expect-audio requires a hex checksum\n");
            return 2;
         }
         has_expected_audio_checksum = true;
      } else if (!strcmp(argv[i], "--frames")) {
         if (++i >= argc) {
            fprintf(stderr, "--frames requires a count\n");
            return 2;
         }
         frames_to_run = (unsigned)strtoul(argv[i], NULL, 10);
         if (frames_to_run == 0)
            frames_to_run = 1;
      } else if (!strcmp(argv[i], "--warmup-frames")) {
         if (++i >= argc) {
            fprintf(stderr, "--warmup-frames requires a count\n");
            return 2;
         }
         warmup_frames = (unsigned)strtoul(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--seed")) {
         if (++i >= argc) {
            fprintf(stderr, "--seed requires a non-negative integer\n");
            return 2;
         }
         seed_option = argv[i];
      } else if (!strcmp(argv[i], "--gles")) {
         g_request_gles = true;
      } else if (!strcmp(argv[i], "--measure-fps")) {
         measure_fps = true;
      } else if (!strcmp(argv[i], "--perf")) {
         perf_enabled = true;
      } else if (!strcmp(argv[i], "--verbose")) {
         setenv("NOVA64_VERBOSE", "1", 1);
      } else if (!strcmp(argv[i], "--key")) {
         if (++i >= argc) {
            fprintf(stderr, "--key requires a key name\n");
            return 2;
         }
         int code = harness_key_code(argv[i]);
         if (code < 0 || code >= 512) {
            fprintf(stderr, "--key: unknown key '%s'\n", argv[i]);
            return 2;
         }
         g_keyboard[code] = true;
      } else if (!strcmp(argv[i], "--press")) {
         if (++i >= argc) {
            fprintf(stderr, "--press requires FRAME=KEY\n");
            return 2;
         }
         char *eq = strchr(argv[i], '=');
         if (!eq) { fprintf(stderr, "--press needs FRAME=KEY\n"); return 2; }
         *eq = '\0';
         unsigned f = (unsigned)strtoul(argv[i], NULL, 10);
         int code = harness_key_code(eq + 1);
         if (code < 0 || code >= 512) {
            fprintf(stderr, "--press: unknown key '%s'\n", eq + 1);
            return 2;
         }
         if (press_count < 32) {
            press_events[press_count].frame = f;
            press_events[press_count].code = code;
            press_count++;
         }
      } else if (!strcmp(argv[i], "--mouse-x")) {
         if (++i >= argc) {
            fprintf(stderr, "--mouse-x requires a value\n");
            return 2;
         }
         g_mouse_x = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--mouse-y")) {
         if (++i >= argc) {
            fprintf(stderr, "--mouse-y requires a value\n");
            return 2;
         }
         g_mouse_y = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--mouse-btn")) {
         if (++i >= argc) {
            fprintf(stderr, "--mouse-btn requires left|right|middle\n");
            return 2;
         }
         if (!strcmp(argv[i], "left"))        g_mouse_btn[0] = true;
         else if (!strcmp(argv[i], "right"))  g_mouse_btn[1] = true;
         else if (!strcmp(argv[i], "middle")) g_mouse_btn[2] = true;
         else {
            fprintf(stderr, "--mouse-btn: unknown button '%s'\n", argv[i]);
            return 2;
         }
      } else if (!strcmp(argv[i], "--touch-x")) {
         if (++i >= argc) { fprintf(stderr, "--touch-x requires a value\n"); return 2; }
         g_touch_x = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--touch-y")) {
         if (++i >= argc) { fprintf(stderr, "--touch-y requires a value\n"); return 2; }
         g_touch_y = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--touch-count")) {
         if (++i >= argc) { fprintf(stderr, "--touch-count requires a count\n"); return 2; }
         g_touch_count = (int16_t)strtol(argv[i], NULL, 10);
         g_touch_pressed = g_touch_count > 0;
      } else if (!strcmp(argv[i], "--port")) {
         if (++i >= argc) { fprintf(stderr, "--port requires 0-3\n"); return 2; }
         g_active_port = (int)strtoul(argv[i], NULL, 10);
         if (g_active_port < 0 || g_active_port > 3) {
            fprintf(stderr, "--port: port must be 0-3\n"); return 2;
         }
      } else if (!strcmp(argv[i], "--btn")) {
         if (++i >= argc) { fprintf(stderr, "--btn requires a button name\n"); return 2; }
         int bid = harness_btn_id(argv[i]);
         if (bid < 0) { fprintf(stderr, "--btn: unknown button '%s'\n", argv[i]); return 2; }
         unsigned p = (unsigned)(g_active_port < 4 ? g_active_port : 0);
         g_joypad_mp[p][bid] = true;
         if (p == 0) g_joypad[bid] = true;
      } else if (!strcmp(argv[i], "--analog-lx")) {
         if (++i >= argc) { fprintf(stderr, "--analog-lx requires a value\n"); return 2; }
         g_analog[0][0][0] = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--analog-ly")) {
         if (++i >= argc) { fprintf(stderr, "--analog-ly requires a value\n"); return 2; }
         g_analog[0][0][1] = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--analog-rx")) {
         if (++i >= argc) { fprintf(stderr, "--analog-rx requires a value\n"); return 2; }
         g_analog[0][1][0] = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--analog-ry")) {
         if (++i >= argc) { fprintf(stderr, "--analog-ry requires a value\n"); return 2; }
         g_analog[0][1][1] = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--trigger-l")) {
         if (++i >= argc) { fprintf(stderr, "--trigger-l requires a value\n"); return 2; }
         g_trigger[0][0] = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!strcmp(argv[i], "--trigger-r")) {
         if (++i >= argc) { fprintf(stderr, "--trigger-r requires a value\n"); return 2; }
         g_trigger[0][1] = (int16_t)strtol(argv[i], NULL, 10);
      } else if (!capture_path) {
         capture_path = argv[i];
      } else {
         fprintf(stderr, "unknown argument: %s\n", argv[i]);
         return 2;
      }
   }

   /* Mirror port 0 joypad into multi-port array */
   for (int j = 0; j < 16; j++)
      g_joypad_mp[0][j] = g_joypad[j];

   void *core = dlopen(argv[1], RTLD_NOW);
   if (!core) {
      fprintf(stderr, "dlopen failed: %s\n", dlerror());
      return 1;
   }

   retro_set_environment_t set_environment = load_symbol(core, "retro_set_environment");
   retro_set_video_refresh_t set_video = load_symbol(core, "retro_set_video_refresh");
   retro_set_audio_sample_t set_audio = load_symbol(core, "retro_set_audio_sample");
   retro_set_audio_sample_batch_t set_audio_batch = load_symbol(core, "retro_set_audio_sample_batch");
   retro_set_input_poll_t set_input_poll = load_symbol(core, "retro_set_input_poll");
   retro_set_input_state_t set_input_state = load_symbol(core, "retro_set_input_state");
   retro_init_t init = load_symbol(core, "retro_init");
   retro_deinit_t deinit = load_symbol(core, "retro_deinit");
   retro_load_game_t load_game = load_symbol(core, "retro_load_game");
   retro_unload_game_t unload_game = load_symbol(core, "retro_unload_game");
   retro_run_t run = load_symbol(core, "retro_run");

   if (!set_environment || !set_video || !set_audio || !set_audio_batch ||
         !set_input_poll || !set_input_state || !init || !deinit ||
         !load_game || !unload_game || !run) {
      dlclose(core);
      return 1;
   }

   size_t cart_size = 0;
   char *cart = read_file(argv[2], &cart_size);
   if (!cart) {
      fprintf(stderr, "failed to read cart: %s\n", argv[2]);
      dlclose(core);
      return 1;
   }

   g_log = harness_log;
   if (command_log_path)
      setenv("NOVA64_RENDER_COMMAND_LOG", command_log_path, 1);
   if (seed_option)
      setenv("NOVA64_SEED", seed_option, 1);
   if (perf_enabled)
      setenv("NOVA64_PERF", "1", 1);
   set_environment(harness_environment);
   set_video(harness_video);
   set_audio(harness_audio);
   set_audio_batch(harness_audio_batch);
   set_input_poll(harness_input_poll);
   set_input_state(harness_input_state);
   init();

   struct retro_game_info game;
   memset(&game, 0, sizeof(game));
   game.path = argv[2];
   game.data = cart;
   game.size = cart_size;
   bool ok = load_game(&game);
   if (ok && g_gles_active && g_hw_render.context_reset)
      g_hw_render.context_reset();
   if (ok) {
      uint64_t run_start_ns = measure_fps && warmup_frames == 0 ? harness_now_ns() : 0;
      unsigned total_frames = frames_to_run + warmup_frames;
      for (unsigned frame = 0; frame < total_frames; frame++) {
         if (measure_fps && frame == warmup_frames)
            run_start_ns = harness_now_ns();
         g_joypad[RETRO_DEVICE_ID_JOYPAD_B] = frame == 1;
         for (unsigned p = 0; p < press_count; p++) {
            if (press_events[p].frame == frame) {
               g_keyboard[press_events[p].code] = true;
               fprintf(stderr, "[harness] press frame=%u code=%d\n", frame, press_events[p].code);
            }
            if (press_events[p].frame + 1 == frame) {
               g_keyboard[press_events[p].code] = false;
            }
         }
         run();
      }
      uint64_t run_end_ns = measure_fps ? harness_now_ns() : 0;
      if (measure_fps && run_end_ns > run_start_ns) {
         double elapsed_s = (double)(run_end_ns - run_start_ns) / 1000000000.0;
         measured_fps = (double)frames_to_run / elapsed_s;
         measured_frame_ms = (elapsed_s * 1000.0) / (double)frames_to_run;
      }
      g_joypad[RETRO_DEVICE_ID_JOYPAD_B] = false;
   }

   unload_game();
   if (g_gles_active && g_hw_render.context_destroy)
      g_hw_render.context_destroy();

   /* Write capture BEFORE teardown so g_hw_pixels is still valid */
   if (capture_path && !write_ppm(capture_path)) {
      fprintf(stderr, "failed to write capture: %s\n", capture_path);
      harness_teardown_gles3();
      deinit();
      free(cart);
      dlclose(core);
      free(g_last_frame);
      return 1;
   }

   harness_teardown_gles3();
   deinit();
   free(cart);
   dlclose(core);

   if (has_expected_checksum && g_checksum != expected_checksum) {
      fprintf(stderr, "checksum mismatch: expected=%016llx actual=%016llx\n",
            (unsigned long long)expected_checksum, (unsigned long long)g_checksum);
      if (!capture_path) {
         /* auto-save a failure capture so the frame is visible without a re-run */
         const char *base = strrchr(argv[2], '/');
         base = base ? base + 1 : argv[2];
         char fail_path[512];
         snprintf(fail_path, sizeof(fail_path), "/tmp/nova64-fail-%s.ppm", base);
         if (write_ppm(fail_path))
            fprintf(stderr, "failure capture: %s\n", fail_path);
      }
      free(g_last_frame);
      return 1;
   }

   if (has_expected_audio_checksum && g_audio_checksum != expected_audio_checksum) {
      fprintf(stderr, "audio checksum mismatch: expected=%016llx actual=%016llx\n",
            (unsigned long long)expected_audio_checksum, (unsigned long long)g_audio_checksum);
      free(g_last_frame);
      return 1;
   }

   free(g_last_frame);
   if (measure_fps) {
      printf("ok=%d frames=%u measured_frames=%u checksum=%016llx audio_frames=%u audio_checksum=%016llx width=%u height=%u measured_fps=%.2f frame_ms=%.4f\n",
            ok ? 1 : 0, g_video_frames, frames_to_run, (unsigned long long)g_checksum,
            g_audio_frames, (unsigned long long)g_audio_checksum,
            g_last_width, g_last_height, measured_fps, measured_frame_ms);
   } else {
      printf("ok=%d frames=%u checksum=%016llx audio_frames=%u audio_checksum=%016llx width=%u height=%u\n",
            ok ? 1 : 0, g_video_frames, (unsigned long long)g_checksum,
            g_audio_frames, (unsigned long long)g_audio_checksum,
            g_last_width, g_last_height);
   }
   return ok ? 0 : 1;
}
