/* Copyright  (C) 2010-2020 The RetroArch team
 *
 * ---------------------------------------------------------------------------------------
 * The following license statement only applies to this libretro API header (libretro.h).
 * ---------------------------------------------------------------------------------------
 *
 * Permission is hereby granted, free of charge,
 * to any person obtaining a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#ifndef LIBRETRO_H__
#define LIBRETRO_H__

#include <stdint.h>
#include <stddef.h>
#include <limits.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifndef __cplusplus
#if defined(_MSC_VER) && _MSC_VER < 1800 && !defined(SN_TARGET_PSP2)
/* Hack applied for MSVC when compiling in C89 mode
 * as it isn't C99-compliant. */
#define bool unsigned char
#define true 1
#define false 0
#else
#include <stdbool.h>
#endif
#endif

#ifndef RETRO_CALLCONV
#  if defined(__GNUC__) && defined(__i386__) && !defined(__x86_64__)
#    define RETRO_CALLCONV __attribute__((cdecl))
#  elif defined(_MSC_VER) && defined(_M_IX86) && !defined(_M_X64) && !defined(_M_AMD64)
#    define RETRO_CALLCONV __cdecl
#  else
#    define RETRO_CALLCONV
#  endif
#endif

#define RETRO_API_VERSION         1

#define RETRO_DEVICE_TYPE_SHIFT   8
#define RETRO_DEVICE_MASK         ((1 << RETRO_DEVICE_TYPE_SHIFT) - 1)
#define RETRO_DEVICE_SUBCLASS(base, id) (((id + 1) << RETRO_DEVICE_TYPE_SHIFT) | base)

#define RETRO_DEVICE_NONE         0
#define RETRO_DEVICE_JOYPAD       1
#define RETRO_DEVICE_MOUSE        2
#define RETRO_DEVICE_KEYBOARD     3
#define RETRO_DEVICE_LIGHTGUN     4
#define RETRO_DEVICE_ANALOG       5
#define RETRO_DEVICE_POINTER      6

#define RETRO_DEVICE_ID_JOYPAD_B        0
#define RETRO_DEVICE_ID_JOYPAD_Y        1
#define RETRO_DEVICE_ID_JOYPAD_SELECT   2
#define RETRO_DEVICE_ID_JOYPAD_START    3
#define RETRO_DEVICE_ID_JOYPAD_UP       4
#define RETRO_DEVICE_ID_JOYPAD_DOWN     5
#define RETRO_DEVICE_ID_JOYPAD_LEFT     6
#define RETRO_DEVICE_ID_JOYPAD_RIGHT    7
#define RETRO_DEVICE_ID_JOYPAD_A        8
#define RETRO_DEVICE_ID_JOYPAD_X        9
#define RETRO_DEVICE_ID_JOYPAD_L        10
#define RETRO_DEVICE_ID_JOYPAD_R        11
#define RETRO_DEVICE_ID_JOYPAD_L2       12
#define RETRO_DEVICE_ID_JOYPAD_R2       13
#define RETRO_DEVICE_ID_JOYPAD_L3       14
#define RETRO_DEVICE_ID_JOYPAD_R3       15

#define RETRO_REGION_NTSC  0
#define RETRO_REGION_PAL   1

#define RETRO_MEMORY_MASK        0xff
#define RETRO_MEMORY_SAVE_RAM    0
#define RETRO_MEMORY_RTC         1
#define RETRO_MEMORY_SYSTEM_RAM  2
#define RETRO_MEMORY_VIDEO_RAM   3

enum retro_log_level
{
   RETRO_LOG_DEBUG = 0,
   RETRO_LOG_INFO,
   RETRO_LOG_WARN,
   RETRO_LOG_ERROR,
   RETRO_LOG_DUMMY = INT_MAX
};

typedef void (RETRO_CALLCONV *retro_log_printf_t)(enum retro_log_level level,
      const char *fmt, ...);

struct retro_log_callback
{
   retro_log_printf_t log;
};

enum retro_pixel_format
{
   RETRO_PIXEL_FORMAT_0RGB1555 = 0,
   RETRO_PIXEL_FORMAT_XRGB8888 = 1,
   RETRO_PIXEL_FORMAT_RGB565   = 2,
   RETRO_PIXEL_FORMAT_UNKNOWN  = INT_MAX
};

struct retro_message
{
   const char *msg;
   unsigned    frames;
};

struct retro_input_descriptor
{
   unsigned port;
   unsigned device;
   unsigned index;
   unsigned id;
   const char *description;
};

struct retro_system_info
{
   const char *library_name;
   const char *library_version;
   const char *valid_extensions;
   bool        need_fullpath;
   bool        block_extract;
};

struct retro_game_geometry
{
   unsigned base_width;
   unsigned base_height;
   unsigned max_width;
   unsigned max_height;
   float    aspect_ratio;
};

struct retro_system_timing
{
   double fps;
   double sample_rate;
};

struct retro_system_av_info
{
   struct retro_game_geometry geometry;
   struct retro_system_timing timing;
};

struct retro_variable
{
   const char *key;
   const char *value;
};

struct retro_game_info
{
   const char *path;
   const void *data;
   size_t      size;
   const char *meta;
};

/* Forward declarations for function pointers */
typedef bool (RETRO_CALLCONV *retro_environment_t)(unsigned cmd, void *data);
typedef void (RETRO_CALLCONV *retro_video_refresh_t)(const void *data, unsigned width,
      unsigned height, size_t pitch);
typedef void (RETRO_CALLCONV *retro_audio_sample_t)(int16_t left, int16_t right);
typedef size_t (RETRO_CALLCONV *retro_audio_sample_batch_t)(const int16_t *data, size_t frames);
typedef void (RETRO_CALLCONV *retro_input_poll_t)(void);
typedef int16_t (RETRO_CALLCONV *retro_input_state_t)(unsigned port, unsigned device,
      unsigned index, unsigned id);

typedef void (RETRO_CALLCONV *retro_proc_address_t)(void);
typedef void (RETRO_CALLCONV *retro_set_environment_t)(retro_environment_t);
typedef void (RETRO_CALLCONV *retro_set_video_refresh_t)(retro_video_refresh_t);
typedef void (RETRO_CALLCONV *retro_set_audio_sample_t)(retro_audio_sample_t);
typedef void (RETRO_CALLCONV *retro_set_audio_sample_batch_t)(retro_audio_sample_batch_t);
typedef void (RETRO_CALLCONV *retro_set_input_poll_t)(retro_input_poll_t);
typedef void (RETRO_CALLCONV *retro_set_input_state_t)(retro_input_state_t);

typedef void (RETRO_CALLCONV *retro_init_t)(void);
typedef void (RETRO_CALLCONV *retro_deinit_t)(void);
typedef unsigned (RETRO_CALLCONV *retro_api_version_t)(void);
typedef void (RETRO_CALLCONV *retro_get_system_info_t)(struct retro_system_info *info);
typedef void (RETRO_CALLCONV *retro_get_system_av_info_t)(struct retro_system_av_info *info);
typedef void (RETRO_CALLCONV *retro_set_controller_port_device_t)(unsigned port, unsigned device);
typedef void (RETRO_CALLCONV *retro_reset_t)(void);
typedef void (RETRO_CALLCONV *retro_run_t)(void);
typedef size_t (RETRO_CALLCONV *retro_serialize_size_t)(void);
typedef bool (RETRO_CALLCONV *retro_serialize_t)(void *data, size_t size);
typedef bool (RETRO_CALLCONV *retro_unserialize_t)(const void *data, size_t size);
typedef void (RETRO_CALLCONV *retro_cheat_reset_t)(void);
typedef void (RETRO_CALLCONV *retro_cheat_set_t)(unsigned index, bool enabled, const char *code);
typedef bool (RETRO_CALLCONV *retro_load_game_t)(const struct retro_game_info *game);
typedef bool (RETRO_CALLCONV *retro_load_game_special_t)(unsigned game_type,
      const struct retro_game_info *info, size_t num_info);
typedef void (RETRO_CALLCONV *retro_unload_game_t)(void);
typedef unsigned (RETRO_CALLCONV *retro_get_region_t)(void);
typedef void *(RETRO_CALLCONV *retro_get_memory_data_t)(unsigned id);
typedef size_t (RETRO_CALLCONV *retro_get_memory_size_t)(unsigned id);


#define RETRO_ENVIRONMENT_SET_ROTATION                    1
#define RETRO_ENVIRONMENT_GET_OVERSCAN                    2
#define RETRO_ENVIRONMENT_GET_CAN_DUPE                    3
#define RETRO_ENVIRONMENT_SET_MESSAGE                     6
#define RETRO_ENVIRONMENT_SHUTDOWN                        7
#define RETRO_ENVIRONMENT_SET_PERFORMANCE_LEVEL           8
#define RETRO_ENVIRONMENT_GET_SYSTEM_DIRECTORY            9
#define RETRO_ENVIRONMENT_SET_PIXEL_FORMAT               10
#define RETRO_ENVIRONMENT_SET_INPUT_DESCRIPTORS          11
#define RETRO_ENVIRONMENT_SET_KEYBOARD_CALLBACK          12
#define RETRO_ENVIRONMENT_SET_DISK_CONTROL_INTERFACE     13
#define RETRO_ENVIRONMENT_SET_HW_RENDER                  14
#define RETRO_ENVIRONMENT_GET_VARIABLE                   15
#define RETRO_ENVIRONMENT_SET_VARIABLES                  16
#define RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE            17
#define RETRO_ENVIRONMENT_SET_SUPPORT_NO_GAME            18
#define RETRO_ENVIRONMENT_GET_LIBRETRO_PATH              19
#define RETRO_ENVIRONMENT_SET_FRAME_TIME_CALLBACK        21
#define RETRO_ENVIRONMENT_SET_AUDIO_CALLBACK             22
#define RETRO_ENVIRONMENT_GET_RUMBLE_INTERFACE           23
#define RETRO_ENVIRONMENT_GET_INPUT_DEVICE_CAPABILITIES  24
#define RETRO_ENVIRONMENT_GET_SENSOR_INTERFACE           25
#define RETRO_ENVIRONMENT_GET_CAMERA_INTERFACE           26
#define RETRO_ENVIRONMENT_GET_LOG_INTERFACE              27
#define RETRO_ENVIRONMENT_GET_PERF_INTERFACE             28
#define RETRO_ENVIRONMENT_GET_LOCATION_INTERFACE         29
#define RETRO_ENVIRONMENT_GET_CONTENT_DIRECTORY          30
#define RETRO_ENVIRONMENT_GET_SAVE_DIRECTORY             31
#define RETRO_ENVIRONMENT_SET_SYSTEM_AV_INFO             32
#define RETRO_ENVIRONMENT_SET_PROC_ADDRESS_CALLBACK      33
#define RETRO_ENVIRONMENT_SET_SUBSYSTEM_INFO             34
#define RETRO_ENVIRONMENT_SET_CONTROLLER_INFO            35
#define RETRO_ENVIRONMENT_SET_MEMORY_MAPS                36
#define RETRO_ENVIRONMENT_SET_GEOMETRY                   37
#define RETRO_ENVIRONMENT_GET_USERNAME                   38
#define RETRO_ENVIRONMENT_GET_LANGUAGE                   39

void RETRO_CALLCONV retro_init(void);
void RETRO_CALLCONV retro_deinit(void);
unsigned RETRO_CALLCONV retro_api_version(void);
void RETRO_CALLCONV retro_get_system_info(struct retro_system_info *info);
void RETRO_CALLCONV retro_get_system_av_info(struct retro_system_av_info *info);
void RETRO_CALLCONV retro_set_environment(retro_environment_t);
void RETRO_CALLCONV retro_set_video_refresh(retro_video_refresh_t);
void RETRO_CALLCONV retro_set_audio_sample(retro_audio_sample_t);
void RETRO_CALLCONV retro_set_audio_sample_batch(retro_audio_sample_batch_t);
void RETRO_CALLCONV retro_set_input_poll(retro_input_poll_t);
void RETRO_CALLCONV retro_set_input_state(retro_input_state_t);
void RETRO_CALLCONV retro_set_controller_port_device(unsigned port, unsigned device);
void RETRO_CALLCONV retro_reset(void);
void RETRO_CALLCONV retro_run(void);
size_t RETRO_CALLCONV retro_serialize_size(void);
bool RETRO_CALLCONV retro_serialize(void *data, size_t size);
bool RETRO_CALLCONV retro_unserialize(const void *data, size_t size);
void RETRO_CALLCONV retro_cheat_reset(void);
void RETRO_CALLCONV retro_cheat_set(unsigned index, bool enabled, const char *code);
bool RETRO_CALLCONV retro_load_game(const struct retro_game_info *game);
bool RETRO_CALLCONV retro_load_game_special(unsigned game_type,
      const struct retro_game_info *info, size_t num_info);
void RETRO_CALLCONV retro_unload_game(void);
unsigned RETRO_CALLCONV retro_get_region(void);
void *RETRO_CALLCONV retro_get_memory_data(unsigned id);
size_t RETRO_CALLCONV retro_get_memory_size(unsigned id);

#ifdef __cplusplus
}
#endif

#endif