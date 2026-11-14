#include "../runtime/shared/gaussian-worlds.h"
#include <assert.h>
#include <stdio.h>

static void put_float(uint8_t *p,float f) {
    uint32_t v;memcpy(&v,&f,4);
    for(int i=0;i<4;i++) p[i]=(uint8_t)(v>>(i*8));
}
static void splat(uint8_t *b,float x,float y,float z,float sx,float sy,float sz,int r,int g,int blue,int alpha) {
    memset(b,0,32);float v[6]={x,-y,-z,sx,sy,sz};
    for(int i=0;i<6;i++) put_float(b+i*4,v[i]);
    b[24]=r;b[25]=g;b[26]=blue;b[27]=alpha;
    b[28]=255;b[29]=b[30]=b[31]=128;
}
static uint8_t *pixel(n64gs_scene *s,int x,int y) {return s->rgba+((size_t)y*s->width+x)*4;}
static float green_center(n64gs_scene *s) {
    double total=0,sum=0;
    for(int y=0;y<s->height;y++) for(int x=0;x<s->width;x++) {
        uint8_t *p=pixel(s,x,y);float w=fmaxf(0,p[1]-fmaxf(p[0],p[2]));total+=w;sum+=x*w;
    }
    assert(total>0);return (float)(sum/total);
}
int main(void) {
    n64gs_scene s={0};uint8_t a[64],b[64];float eye[3]={0,1.6f,2};
    splat(a,0,1.6f,-5,.1f,.1f,.1f,0,0,255,0);
    splat(b,0,1.6f,2,.3f,.3f,.3f,0,255,0,255);
    splat(b+32,0,1.6f,-1,.3f,.3f,.3f,255,0,0,255);
    assert(n64gs_load(&s,a,32,b,64));
    assert(!n64gs_load(&s,a,31,b,64));
    assert(s.cloud[0].count==1); /* Failed replacement preserves the valid scene. */
    assert(n64gs_render(&s,0,eye,0,75,160,90,1));
    uint8_t *p=pixel(&s,80,45);
    assert(p[1]>220 && p[0]<30); /* Red data behind the exit plane is clipped. */
    assert(n64gs_render(&s,0,eye,0,75,160,90,0));
    p=pixel(&s,80,45);assert(p[1]<80); /* The live destination is absent without a portal. */
    splat(a,0,1.6f,0,.2f,.2f,.2f,0,0,255,255);
    assert(n64gs_load(&s,a,32,b,64));assert(n64gs_render(&s,0,eye,0,75,160,90,1));
    p=pixel(&s,80,45);assert(p[2]>220 && p[1]<40); /* Source foreground occludes the aperture. */
    splat(a,0,1.6f,-5,.1f,.1f,.1f,0,0,255,0);
    splat(b,.6f,1.6f,3,.15f,.15f,.15f,0,255,0,255);
    assert(n64gs_load(&s,a,32,b,32));assert(n64gs_render(&s,0,eye,0,75,320,180,1));
    float first=green_center(&s);eye[0]=.4f;
    assert(n64gs_render(&s,0,eye,0,75,320,180,1));
    assert(fabsf(green_center(&s)-first)>5); /* Destination camera responds to lateral movement. */
    eye[0]=0;
    splat(a,0,1.6f,-3,.6f,.08f,.08f,0,255,0,255);
    splat(a+32,-5.6f,2.45f,1.6f,.122f,.122f,.122f,255,0,0,255);
    assert(n64gs_load(&s,a,64,b,32));assert(n64gs_render(&s,0,eye,0,75,160,90,0));
    p=pixel(&s,80,45);assert(p[1]>220 && p[0]<30); /* Near-eye offscreen splats cannot flood the viewport. */
    assert(pixel(&s,85,45)[1]>pixel(&s,80,50)[1]+40); /* Anisotropic ellipse, not a circular point. */
    put_float(a+12,NAN);assert(!n64gs_load(&s,a,64,b,32));
    assert(!n64gs_render(&s,2,eye,0,75,160,90,1));
    assert(!n64gs_render(&s,0,eye,0,75,2000,90,1));
    for(int i=0;i<20;i++) {
        assert(n64gs_load(&s,b,32,b,32));
        assert(n64gs_render(&s,0,eye,0,75,160,90,1));
        n64gs_destroy(&s);n64gs_destroy(&s);
    }
    assert(!s.order && !s.rgba && !s.cloud[0].items);
    puts("PASS Gaussian decode, covariance, frustum bounds, portal clipping/parallax/occlusion and lifecycle");
    return 0;
}
