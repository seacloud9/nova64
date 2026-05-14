#include <dlfcn.h>
#include <errno.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../libretro.h"

static retro_log_printf_t g_log;
static uint64_t g_checksum;
static uint64_t g_audio_checksum = 1469598103934665603ULL;
static unsigned g_video_frames;
static unsigned g_audio_frames;
static bool g_joypad[16];       /* port 0 joypad */
static bool g_joypad_mp[4][16]; /* multi-port joypad (port 0 mirrors g_joypad) */
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
      case RETRO_ENVIRONMENT_SET_HW_RENDER:
         return false;
      default:
         return false;
   }
}

static void harness_video(const void *data, unsigned width, unsigned height, size_t pitch)
{
   g_video_frames++;
   if (!data)
      return;

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
   if (!path || !g_last_frame || !g_last_width || !g_last_height)
      return false;

   FILE *file = fopen(path, "wb");
   if (!file)
      return false;

   fprintf(file, "P6\n%u %u\n255\n", g_last_width, g_last_height);
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

int main(int argc, char **argv)
{
   if (argc < 3) {
      fprintf(stderr, "usage: %s <nova64_libretro.so> <cart.js|cart.nova> [--capture path] [--command-log path] [--renderer opengles3|vulkan12] [--expect checksum] [--expect-audio checksum] [--frames n] [--seed n] [--perf] [--verbose] [--key name] [--touch-x n --touch-y n --touch-count n]\n", argv[0]);
      return 2;
   }

   const char *capture_path = NULL;
   const char *command_log_path = NULL;
   bool has_expected_checksum = false;
   uint64_t expected_checksum = 0;
   bool has_expected_audio_checksum = false;
   uint64_t expected_audio_checksum = 0;
   unsigned frames_to_run = 3;
   const char *seed_option = NULL;
   bool perf_enabled = false;

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
      } else if (!strcmp(argv[i], "--seed")) {
         if (++i >= argc) {
            fprintf(stderr, "--seed requires a non-negative integer\n");
            return 2;
         }
         seed_option = argv[i];
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
         /* --port N sets subsequent joypad state to that port (0-3) */
         if (++i >= argc) { fprintf(stderr, "--port requires 0-3\n"); return 2; }
         /* handled via --btn below; for now just parse and ignore as we inject
            per-port via g_joypad_mp directly after all flags are parsed */
         (void)strtoul(argv[i], NULL, 10); /* parsed below */
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
   if (ok) {
      for (unsigned frame = 0; frame < frames_to_run; frame++) {
         g_joypad[RETRO_DEVICE_ID_JOYPAD_B] = frame == 1;
         run();
      }
      g_joypad[RETRO_DEVICE_ID_JOYPAD_B] = false;
   }

   unload_game();
   deinit();
   free(cart);
   dlclose(core);

   if (capture_path && !write_ppm(capture_path)) {
      fprintf(stderr, "failed to write capture: %s\n", capture_path);
      free(g_last_frame);
      return 1;
   }

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
   printf("ok=%d frames=%u checksum=%016llx audio_frames=%u audio_checksum=%016llx width=%u height=%u\n",
         ok ? 1 : 0, g_video_frames, (unsigned long long)g_checksum,
         g_audio_frames, (unsigned long long)g_audio_checksum,
         g_last_width, g_last_height);
   return ok ? 0 : 1;
}
