#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdbool.h>

#include "libretro.h"

// Nova64 Enhanced dimensions (v0.2.0)
#define NOVA64_WIDTH  640
#define NOVA64_HEIGHT 360
#define NOVA64_VERSION "0.2.0"

// Global state
static uint16_t *framebuffer = NULL;
static bool initialized = false;
static retro_video_refresh_t video_cb;
static retro_audio_sample_t audio_cb;
static retro_audio_sample_batch_t audio_batch_cb;
static retro_environment_t environ_cb;
static retro_input_poll_t input_poll_cb;
static retro_input_state_t input_state_cb;
static retro_log_printf_t log_cb;

// Cart state
static char *cart_content = NULL;
static size_t cart_size = 0;

// Input mapping for Nova64
enum nova64_buttons {
    NOVA64_LEFT  = 0,
    NOVA64_RIGHT = 1,
    NOVA64_UP    = 2,
    NOVA64_DOWN  = 3,
    NOVA64_Z     = 4,
    NOVA64_X     = 5,
    NOVA64_C     = 6,
    NOVA64_V     = 7
};

// Enhanced JavaScript execution context (stub - would need a real JS engine)
// v0.2.0 adds 3D graphics support requiring OpenGL ES 3.0+ backend
typedef struct {
    bool initialized;
    bool supports_3d;
    // In a real implementation, this would contain QuickJS context + OpenGL state
    // for handling 3D scene graph, materials, lighting, and model loading
} js_context_t;

static js_context_t js_ctx = {0};

// RetroArch API implementation
void retro_init(void) {
    framebuffer = calloc(NOVA64_WIDTH * NOVA64_HEIGHT, sizeof(uint16_t) * 4);
    if (!framebuffer) {
        if (log_cb) log_cb(RETRO_LOG_ERROR, "Failed to allocate framebuffer\n");
        return;
    }
    
    // Initialize JavaScript context (stub)
    js_ctx.initialized = true;
    js_ctx.supports_3d = true; // Would check for OpenGL ES 3.0+ support in real implementation
    
    initialized = true;
    if (log_cb) log_cb(RETRO_LOG_INFO, "Nova64 core initialized\n");
}

void retro_deinit(void) {
    if (framebuffer) {
        free(framebuffer);
        framebuffer = NULL;
    }
    
    if (cart_content) {
        free(cart_content);
        cart_content = NULL;
    }
    
    js_ctx.initialized = false;
    initialized = false;
}

unsigned retro_api_version(void) {
    return RETRO_API_VERSION;
}

void retro_set_controller_port_device(unsigned port, unsigned device) {
    if (log_cb) log_cb(RETRO_LOG_INFO, "Controller port %u device %u\n", port, device);
}

void retro_get_system_info(struct retro_system_info *info) {
    memset(info, 0, sizeof(*info));
    info->library_name     = "Nova64";
    info->library_version  = "1.0.0";
    info->need_fullpath    = false;
    info->valid_extensions = "js|nova";
}

static enum retro_pixel_format fmt = RETRO_PIXEL_FORMAT_RGB565;

void retro_get_system_av_info(struct retro_system_av_info *info) {
    float aspect = (float)NOVA64_WIDTH / (float)NOVA64_HEIGHT;
    
    info->timing = (struct retro_system_timing) {
        .fps = 60.0,
        .sample_rate = 44100.0,
    };
    
    info->geometry = (struct retro_game_geometry) {
        .base_width   = NOVA64_WIDTH,
        .base_height  = NOVA64_HEIGHT,
        .max_width    = NOVA64_WIDTH,
        .max_height   = NOVA64_HEIGHT,
        .aspect_ratio = aspect,
    };
}

void retro_set_environment(retro_environment_t cb) {
    environ_cb = cb;
    
    // Set pixel format
    bool no_content = true;
    cb(RETRO_ENVIRONMENT_SET_SUPPORT_NO_GAME, &no_content);
    
    struct retro_log_callback log;
    if (cb(RETRO_ENVIRONMENT_GET_LOG_INTERFACE, &log))
        log_cb = log.log;
    else
        log_cb = NULL;
        
    cb(RETRO_ENVIRONMENT_SET_PIXEL_FORMAT, &fmt);
}

void retro_set_audio_sample(retro_audio_sample_t cb) {
    audio_cb = cb;
}

void retro_set_audio_sample_batch(retro_audio_sample_batch_t cb) {
    audio_batch_cb = cb;
}

void retro_set_input_poll(retro_input_poll_t cb) {
    input_poll_cb = cb;
}

void retro_set_input_state(retro_input_state_t cb) {
    input_state_cb = cb;
}

void retro_set_video_refresh(retro_video_refresh_t cb) {
    video_cb = cb;
}

void retro_reset(void) {
    if (log_cb) log_cb(RETRO_LOG_INFO, "Nova64 reset\n");
    // Reset JS context and reload cart
}

static void update_input(void) {
    if (!input_poll_cb || !input_state_cb) return;
    
    input_poll_cb();
    
    // Map RetroArch inputs to Nova64 button states
    // This would update the global input state for the JS environment
    bool buttons[8] = {0};
    
    buttons[NOVA64_LEFT]  = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_LEFT);
    buttons[NOVA64_RIGHT] = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_RIGHT);
    buttons[NOVA64_UP]    = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_UP);
    buttons[NOVA64_DOWN]  = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_DOWN);
    buttons[NOVA64_Z]     = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_B);
    buttons[NOVA64_X]     = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_A);
    buttons[NOVA64_C]     = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_Y);
    buttons[NOVA64_V]     = input_state_cb(0, RETRO_DEVICE_JOYPAD, 0, RETRO_DEVICE_ID_JOYPAD_X);
    
    // Update JS context input state (stub)
}

static void execute_js_frame(float delta_time) {
    // This is where we would execute the JavaScript cart
    // In a real implementation, this would:
    // 1. Call cart.update(delta_time)
    // 2. Call cart.draw()
    // 3. Process any API calls (cls, pset, line, rect, print, etc.)
    // 4. Update the framebuffer
    
    // For now, just clear to a test pattern
    for (int y = 0; y < NOVA64_HEIGHT; y++) {
        for (int x = 0; x < NOVA64_WIDTH; x++) {
            int idx = (y * NOVA64_WIDTH + x) * 4;
            uint16_t r = (x * 65535) / NOVA64_WIDTH;
            uint16_t g = (y * 65535) / NOVA64_HEIGHT;
            uint16_t b = 32768;
            uint16_t a = 65535;
            
            framebuffer[idx + 0] = r;
            framebuffer[idx + 1] = g;
            framebuffer[idx + 2] = b;
            framebuffer[idx + 3] = a;
        }
    }
}

static void convert_framebuffer_to_rgb565(uint16_t *output) {
    // Convert RGBA64 framebuffer to RGB565 for RetroArch
    for (int i = 0; i < NOVA64_WIDTH * NOVA64_HEIGHT; i++) {
        uint16_t r64 = framebuffer[i * 4 + 0];
        uint16_t g64 = framebuffer[i * 4 + 1];
        uint16_t b64 = framebuffer[i * 4 + 2];
        
        // Convert 16-bit to 5/6/5 bit
        uint16_t r5 = (r64 >> 11) & 0x1F;
        uint16_t g6 = (g64 >> 10) & 0x3F;
        uint16_t b5 = (b64 >> 11) & 0x1F;
        
        output[i] = (r5 << 11) | (g6 << 5) | b5;
    }
}

void retro_run(void) {
    static uint16_t rgb565_buffer[NOVA64_WIDTH * NOVA64_HEIGHT];
    
    if (!initialized || !framebuffer) return;
    
    // Calculate delta time (stub - would use proper timing)
    float delta_time = 1.0f / 60.0f;
    
    // Update input
    update_input();
    
    // Execute one frame of the JavaScript cart
    execute_js_frame(delta_time);
    
    // Convert RGBA64 framebuffer to RGB565 and send to RetroArch
    convert_framebuffer_to_rgb565(rgb565_buffer);
    video_cb(rgb565_buffer, NOVA64_WIDTH, NOVA64_HEIGHT, NOVA64_WIDTH * sizeof(uint16_t));
    
    // Audio (stub - would generate audio samples)
    // audio_batch_cb(audio_samples, sample_count);
}

bool retro_load_game(const struct retro_game_info *info) {
    if (!info || !info->data || info->size == 0) {
        if (log_cb) log_cb(RETRO_LOG_ERROR, "No game data provided\n");
        return false;
    }
    
    // Store cart content
    cart_size = info->size;
    cart_content = malloc(cart_size + 1);
    if (!cart_content) {
        if (log_cb) log_cb(RETRO_LOG_ERROR, "Failed to allocate cart memory\n");
        return false;
    }
    
    memcpy(cart_content, info->data, cart_size);
    cart_content[cart_size] = '\0'; // Null terminate for JS parsing
    
    if (log_cb) log_cb(RETRO_LOG_INFO, "Loaded Nova64 cart: %zu bytes\n", cart_size);
    
    // Initialize/compile the JavaScript cart (stub)
    // In a real implementation, this would parse and compile the JS module
    
    return true;
}

void retro_unload_game(void) {
    if (cart_content) {
        free(cart_content);
        cart_content = NULL;
        cart_size = 0;
    }
}

unsigned retro_get_region(void) {
    return RETRO_REGION_NTSC;
}

bool retro_load_game_special(unsigned type, const struct retro_game_info *info, size_t num) {
    return retro_load_game(info);
}

size_t retro_serialize_size(void) {
    // Return size needed for save states
    return sizeof(js_ctx) + (NOVA64_WIDTH * NOVA64_HEIGHT * 4 * sizeof(uint16_t));
}

bool retro_serialize(void *data, size_t size) {
    if (size < retro_serialize_size()) return false;
    
    // Save state (stub - would serialize JS context and framebuffer)
    memcpy(data, &js_ctx, sizeof(js_ctx));
    memcpy((char*)data + sizeof(js_ctx), framebuffer, NOVA64_WIDTH * NOVA64_HEIGHT * 4 * sizeof(uint16_t));
    
    return true;
}

bool retro_unserialize(const void *data, size_t size) {
    if (size < retro_serialize_size()) return false;
    
    // Load state (stub - would restore JS context and framebuffer)
    memcpy(&js_ctx, data, sizeof(js_ctx));
    memcpy(framebuffer, (char*)data + sizeof(js_ctx), NOVA64_WIDTH * NOVA64_HEIGHT * 4 * sizeof(uint16_t));
    
    return true;
}

void *retro_get_memory_data(unsigned id) {
    switch (id) {
        case RETRO_MEMORY_SYSTEM_RAM:
            return framebuffer;
        default:
            return NULL;
    }
}

size_t retro_get_memory_size(unsigned id) {
    switch (id) {
        case RETRO_MEMORY_SYSTEM_RAM:
            return NOVA64_WIDTH * NOVA64_HEIGHT * 4 * sizeof(uint16_t);
        default:
            return 0;
    }
}

void retro_cheat_reset(void) {}
void retro_cheat_set(unsigned index, bool enabled, const char *code) {}