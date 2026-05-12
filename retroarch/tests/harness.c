#include <dlfcn.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../libretro.h"

static retro_log_printf_t g_log;
static uint64_t g_checksum;
static unsigned g_video_frames;
static bool g_joypad[16];
static uint16_t *g_last_frame;
static unsigned g_last_width;
static unsigned g_last_height;

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
         return true;
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
   (void)left;
   (void)right;
}

static size_t harness_audio_batch(const int16_t *data, size_t frames)
{
   (void)data;
   return frames;
}

static void harness_input_poll(void) {}

static int16_t harness_input_state(unsigned port, unsigned device, unsigned index, unsigned id)
{
   (void)port;
   (void)index;
   if (device != RETRO_DEVICE_JOYPAD || id >= 16)
      return 0;
   return g_joypad[id] ? 1 : 0;
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
      fprintf(stderr, "usage: %s <nova64_libretro.so> <cart.js> [capture.ppm]\n", argv[0]);
      return 2;
   }

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
      run();
      g_joypad[RETRO_DEVICE_ID_JOYPAD_B] = true;
      run();
      g_joypad[RETRO_DEVICE_ID_JOYPAD_B] = false;
      run();
   }

   unload_game();
   deinit();
   free(cart);
   dlclose(core);

   if (argc >= 4 && !write_ppm(argv[3])) {
      fprintf(stderr, "failed to write capture: %s\n", argv[3]);
      free(g_last_frame);
      return 1;
   }

   free(g_last_frame);
   printf("ok=%d frames=%u checksum=%016llx\n", ok ? 1 : 0, g_video_frames,
         (unsigned long long)g_checksum);
   return ok ? 0 : 1;
}
