# Nova64 RetroArch Core Makefile v0.3.0
# QuickJS + software 2D + native GLES command bridge

TARGET_NAME = nova64
VERSION = 0.3.0
DEBUG = 0
GIT_VERSION := " $(shell git rev-parse --short HEAD || echo unknown)"
ifneq ($(GIT_VERSION)," unknown")
   CFLAGS += -DGIT_VERSION=\"$(GIT_VERSION)\"
endif
CFLAGS += -DNOVA64_VERSION=\"$(VERSION)\"

ifeq ($(platform),)
platform = unix
ifeq ($(shell uname -a),)
   platform = win
else ifneq ($(findstring MINGW,$(shell uname -a)),)
   platform = win
else ifneq ($(findstring Darwin,$(shell uname -a)),)
   platform = osx
else ifneq ($(findstring win,$(shell uname -a)),)
   platform = win
endif
endif

# Windows shells can leak a win platform value into WSL. Native WSL builds should
# still produce the Linux libretro shared object unless explicitly cross-built.
ifneq ($(findstring Linux,$(shell uname -s 2>/dev/null)),)
ifneq ($(findstring MINGW,$(shell uname -a)),MINGW)
ifeq ($(platform),win)
   platform = unix
endif
endif
endif

# system platform
system_platform = unix
ifeq ($(shell uname -a),)
	EXE_EXT = .exe
	system_platform = win
else ifneq ($(findstring Darwin,$(shell uname -a)),)
	system_platform = osx
	arch = intel
ifeq ($(shell uname -p),powerpc)
	arch = ppc
endif
else ifneq ($(findstring MINGW,$(shell uname -a)),)
	system_platform = win
endif

LIBRETRO_DIR := .
CORE_DIR := .

TARGET_NAME := $(TARGET_NAME)_libretro

ifeq ($(DEBUG), 1)
   CFLAGS += -O0 -g
else
   CFLAGS += -O3
endif

ifeq ($(platform), osx)
   TARGET := $(TARGET_NAME).dylib
   fpic := -fPIC
   SHARED := -dynamiclib
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifeq ($(platform), ios)
   TARGET := $(TARGET_NAME)_ios.dylib
   fpic := -fPIC
   SHARED := -dynamiclib
   DEFINES := -DIOS
   CC = cc -arch armv7 -isysroot $(IOSSDK)
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifeq ($(platform), ios9)
   TARGET := $(TARGET_NAME)_ios9.dylib
   fpic := -fPIC
   SHARED := -dynamiclib
   DEFINES := -DIOS
   CC = cc -arch arm64 -isysroot $(IOSSDK)
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifeq ($(platform), tvos-arm64)
   TARGET := $(TARGET_NAME)_tvos.dylib
   fpic := -fPIC
   SHARED := -dynamiclib
   DEFINES := -DIOS
   CC = cc -arch arm64 -isysroot $(TVOSSDK)
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifneq (,$(findstring ios,$(platform)))
   TARGET := $(TARGET_NAME)_ios.dylib
   fpic := -fPIC
   SHARED := -dynamiclib
   DEFINES := -DIOS
   CC = cc -arch armv7 -isysroot $(IOSSDK)
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifeq ($(platform), android)
   TARGET := $(TARGET_NAME)_android.so
   fpic := -fPIC
   SHARED := -shared
   CFLAGS += -DANDROID
else ifeq ($(platform), unix)
   TARGET := $(TARGET_NAME).so
   fpic := -fPIC
   SHARED := -shared
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifeq ($(platform), linux-portable)
   TARGET := $(TARGET_NAME).so
   fpic := -fPIC -nostdlib
   SHARED := -shared -Wl,--version-script=$(LIBRETRO_DIR)/link.T
   LIBM :=
   CFLAGS += -DHAVE_POSIX_MEMALIGN
else ifeq ($(platform), win)
   CC = gcc
   TARGET := $(TARGET_NAME).dll
   SHARED := -shared -static-libgcc -static-libstdc++ -s -Wl,--version-script=$(LIBRETRO_DIR)/link.T
   CFLAGS += -I.
else ifeq ($(platform), ctr)
   TARGET := $(TARGET_NAME)_ctr.a
   CC = $(DEVKITARM)/bin/arm-none-eabi-gcc$(EXE_EXT)
   AR = $(DEVKITARM)/bin/arm-none-eabi-ar$(EXE_EXT)
   CFLAGS += -DARM11 -D_3DS -Os -s -I$(CTRULIB)/include/
   CFLAGS += -DHAVE_MKDIR
   CFLAGS += -march=armv6k -mtune=mpcore -mfloat-abi=hard
   CFLAGS += -Wall -mword-relocations
   CFLAGS += -fomit-frame-pointer -fstrict-aliasing -ffast-math
   CFLAGS += -DDISABLE_NON_ASCII
   CXXFLAGS = $(CFLAGS) -fno-rtti -fno-exceptions -std=gnu++11
   CFLAGS += -std=gnu99
   STATIC_LINKING = 1
else ifeq ($(platform), vita)
   TARGET := $(TARGET_NAME)_vita.a
   CC = arm-vita-eabi-gcc$(EXE_EXT)
   AR = arm-vita-eabi-ar$(EXE_EXT)
   CFLAGS += -Wl,-q -Wall -O3 -fno-short-enums
   STATIC_LINKING = 1
else
   CC = gcc
   TARGET := $(TARGET_NAME).dll
   SHARED := -shared -static-libgcc -static-libstdc++ -s -Wl,--version-script=$(LIBRETRO_DIR)/link.T
   CFLAGS += -I.
endif

CFLAGS += -Wall -D__LIBRETRO__ $(fpic)

ifeq ($(DEBUG), 1)
   CFLAGS += -O0 -g -DDEBUG
else
   CFLAGS += -O3 -DNDEBUG
endif

include Makefile.common

OBJDIR := build
OBJECTS := $(addprefix $(OBJDIR)/,$(notdir $(SOURCES_C:.c=.o)))

CFLAGS += -std=c99 $(DEFINES)

ifeq ($(STATIC_LINKING), 1)
all: $(TARGET)
$(TARGET): $(OBJECTS)
	$(AR) rcs $@ $(OBJECTS)
else
all: $(TARGET)
$(TARGET): $(OBJECTS)
	$(CC) $(fpic) $(SHARED) $(INCLUDES) -o $@ $(OBJECTS) $(LIBM)
endif

$(OBJDIR):
	mkdir -p $(OBJDIR)

$(OBJDIR)/nova64_libretro.o: $(CORE_DIR)/nova64_libretro.c | $(OBJDIR)
	$(CC) $(CFLAGS) $(fpic) -c -o $@ $<

$(OBJDIR)/%.o: $(QUICKJS_DIR)/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) $(fpic) -c -o $@ $<

clean:
	rm -rf $(OBJDIR) $(TARGET)

harness: $(TARGET)
	mkdir -p build
	cc -I. -o build/harness tests/harness.c -ldl -lm

conformance: harness $(TARGET)
	bash tests/run_conformance.sh

info:
	@cat nova64_libretro.info 2>/dev/null || echo "(not found)"

.PHONY: clean harness conformance info
