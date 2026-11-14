#ifndef NOVA64_GAUSSIAN_WORLDS_H
#define NOVA64_GAUSSIAN_WORLDS_H
/* Experimental CPU Gaussian reference shared by Godot and libretro.
 * Standard 32-byte .splat, source X/pi convention used by the browser experiment.
 * Two resident worlds, independent per-view sort, one upright linked doorway.
 * The image owns its depth/compositing; it does not mix with host 3D meshes. */
#include <math.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <float.h>

typedef struct { float p[3], c[6], color[3], alpha; } n64gs_splat;
typedef struct { n64gs_splat *items; size_t count; } n64gs_cloud;
typedef struct {
    float x, y, depth, a, b, c, rx, ry;
    size_t index;
} n64gs_projected;
typedef struct {
    n64gs_cloud cloud[2];
    n64gs_projected *order;
    float *main_image, *portal_image, *depth;
    uint8_t *rgba;
    int width, height;
    float gaussian[1024], linear[256];
    uint8_t srgb[4096];
    size_t visible[2];
} n64gs_scene;

static inline void n64gs_destroy(n64gs_scene *s) {
    free(s->cloud[0].items); free(s->cloud[1].items); free(s->order);
    free(s->main_image); free(s->portal_image); free(s->depth); free(s->rgba);
    memset(s, 0, sizeof(*s));
}
static inline float n64gs_float(const uint8_t *p) {
    uint32_t u = (uint32_t)p[0] | (uint32_t)p[1]<<8 | (uint32_t)p[2]<<16 | (uint32_t)p[3]<<24;
    float f; memcpy(&f, &u, 4); return f;
}
static inline float n64gs_linear(float c) {
    return c <= 0.04045f ? c/12.92f : powf((c+0.055f)/1.055f, 2.4f);
}
static inline int n64gs_decode(n64gs_cloud *out, const uint8_t *bytes, size_t length) {
    if (!bytes || !length || length % 32 || length/32 > 250000) return 0;
    n64gs_splat *items = (n64gs_splat *)calloc(length/32, sizeof(*items));
    if (!items) return 0;
    for (size_t i=0; i<length/32; i++) {
        const uint8_t *b=bytes+i*32; n64gs_splat *s=items+i;
        float scale[3], q[4], norm=0;
        for (int j=0;j<3;j++) {
            s->p[j]=n64gs_float(b+j*4)*(j ? -1.0f:1.0f);
            scale[j]=n64gs_float(b+12+j*4);
            if (!isfinite(s->p[j]) || fabsf(s->p[j])>10000 ||
                !isfinite(scale[j]) || scale[j]<=0 || scale[j]>100) { free(items); return 0; }
            s->color[j]=n64gs_linear(b[24+j]/255.0f);
        }
        for (int j=0;j<4;j++) { q[j]=(b[28+j]-128.0f)/128.0f; norm+=q[j]*q[j]; }
        if (norm<1e-8f) { free(items); return 0; }
        norm=1/sqrtf(norm); for(int j=0;j<4;j++) q[j]*=norm;
        float w=q[0],x=q[1],y=q[2],z=q[3];
        float r[3][3]={{1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y)},
                       {2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x)},
                       {2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y)}};
        /* Rx(pi) is applied to both center and covariance, once. */
        for(int a=1;a<3;a++) for(int j=0;j<3;j++) r[a][j]=-r[a][j];
        int pairs[6][2]={{0,0},{0,1},{0,2},{1,1},{1,2},{2,2}};
        for(int a=0;a<6;a++) for(int j=0;j<3;j++)
            s->c[a]+=r[pairs[a][0]][j]*r[pairs[a][1]][j]*scale[j]*scale[j];
        s->alpha=b[27]/255.0f;
    }
    out->items=items; out->count=length/32; return 1;
}
static inline int n64gs_load(n64gs_scene *scene, const uint8_t *a,size_t na,const uint8_t *b,size_t nb) {
    n64gs_scene next; memset(&next,0,sizeof(next));
    if (!n64gs_decode(&next.cloud[0],a,na) || !n64gs_decode(&next.cloud[1],b,nb)) {
        n64gs_destroy(&next); return 0;
    }
    size_t n=next.cloud[0].count>next.cloud[1].count ? next.cloud[0].count:next.cloud[1].count;
    next.order=(n64gs_projected *)malloc(n*sizeof(*next.order));
    if (!next.order) { n64gs_destroy(&next); return 0; }
    for(int i=0;i<1024;i++) next.gaussian[i]=expf(-0.5f*(9.0f*i/1023));
    for(int i=0;i<256;i++) next.linear[i]=n64gs_linear(i/255.0f);
    for(int i=0;i<4096;i++) {
        float c=i/4095.0f, s=c<=0.0031308f ? c*12.92f:1.055f*powf(c,1/2.4f)-0.055f;
        next.srgb[i]=(uint8_t)floorf(s*255+0.5f);
    }
    n64gs_destroy(scene); *scene=next; return 1;
}
static inline float n64gs_cov(const float c[6], const float a[3],const float b[3]) {
    return a[0]*(c[0]*b[0]+c[1]*b[1]+c[2]*b[2])+
           a[1]*(c[1]*b[0]+c[3]*b[1]+c[4]*b[2])+
           a[2]*(c[2]*b[0]+c[4]*b[1]+c[5]*b[2]);
}
static inline int n64gs_compare(const void *a,const void *b) {
    const n64gs_projected *x=(const n64gs_projected *)a,*y=(const n64gs_projected *)b;
    if(x->depth!=y->depth) return x->depth>y->depth ? -1:1;
    return x->index<y->index ? -1:x->index>y->index;
}
static inline void n64gs_fill(n64gs_scene *s,float *image,uint32_t rgb) {
    float color[3]={s->linear[(rgb>>16)&255],s->linear[(rgb>>8)&255],s->linear[rgb&255]};
    for(int i=0;i<s->width*s->height;i++) memcpy(image+i*3,color,sizeof(color));
}
static inline size_t n64gs_view(n64gs_scene *s,int world,const float eye[3],float yaw,float focal,
        float clip_z, float *image,const float *depth,const int *roi) {
    const n64gs_cloud *cloud=&s->cloud[world];
    float sy=sinf(yaw),cy=cosf(yaw),right[3]={cy,0,-sy},forward[3]={-sy,0,-cy};
    int min_x=roi ? roi[0]:0,min_y=roi ? roi[1]:0;
    int max_x=roi ? roi[2]:s->width-1,max_y=roi ? roi[3]:s->height-1;
    size_t count=0;
    for(size_t i=0;i<cloud->count;i++) {
        const n64gs_splat *g=cloud->items+i;
        if(g->alpha<1/255.0f || g->p[2]<clip_z) continue;
        float dx=g->p[0]-eye[0],dy=g->p[1]-eye[1],dz=g->p[2]-eye[2];
        float vx=cy*dx-sy*dz, d=-sy*dx-cy*dz;
        if(d<0.1f || d>150) continue;
        float f=focal/d, jx[3],jy[3];
        /* Bound the Jacobian to the view frustum. Offscreen splats close to
           the eye otherwise expand across the entire image (3DGS convention). */
        float ratio_x=fmaxf(-0.65f*s->width/focal,fminf(0.65f*s->width/focal,vx/d));
        float ratio_y=fmaxf(-0.65f*s->height/focal,fminf(0.65f*s->height/focal,dy/d));
        for(int j=0;j<3;j++) {
            jx[j]=f*(right[j]-ratio_x*forward[j]);
            jy[j]=f*((j==1 ? -1.0f:0.0f)+ratio_y*forward[j]);
        }
        float a=n64gs_cov(g->c,jx,jx)+0.3f,b=n64gs_cov(g->c,jx,jy),c=n64gs_cov(g->c,jy,jy)+0.3f;
        float determinant=a*c-b*b;
        if(!(determinant>0) || !isfinite(determinant)) continue;
        n64gs_projected p;
        p.x=s->width*0.5f+f*vx; p.y=s->height*0.5f-f*dy;
        p.rx=3*sqrtf(a); p.ry=3*sqrtf(c); p.depth=d; p.index=i;
        if(p.x+p.rx<min_x || p.y+p.ry<min_y || p.x-p.rx>max_x || p.y-p.ry>max_y) continue;
        p.a=c/determinant; p.b=-2*b/determinant; p.c=a/determinant;
        s->order[count++]=p;
    }
    qsort(s->order,count,sizeof(*s->order),n64gs_compare);
    for(size_t i=0;i<count;i++) {
        const n64gs_projected *p=s->order+i;
        const n64gs_splat *g=cloud->items+p->index;
        int x0=(int)fmaxf(min_x,floorf(p->x-p->rx)),x1=(int)fminf(max_x,ceilf(p->x+p->rx));
        int y0=(int)fmaxf(min_y,floorf(p->y-p->ry)),y1=(int)fminf(max_y,ceilf(p->y+p->ry));
        for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++) {
            size_t index=(size_t)y*s->width+x;
            if(depth && p->depth>depth[index]) continue;
            float dx=x+0.5f-p->x,dy=y+0.5f-p->y;
            float r=p->a*dx*dx+p->b*dx*dy+p->c*dy*dy;
            if(r<0 || r>9) continue;
            float alpha=g->alpha*s->gaussian[(int)(r*(1023.0f/9))];
            for(int j=0;j<3;j++) image[index*3+j]+=(g->color[j]-image[index*3+j])*alpha;
        }
    }
    return count;
}
static inline int n64gs_resize(n64gs_scene *s,int width,int height) {
    if(width==s->width && height==s->height) return 1;
    if(width<1 || height<1 || width>1280 || height>720) return 0;
    size_t n=(size_t)width*height;
    float *main_image=(float *)malloc(n*3*sizeof(float)),*portal=(float *)malloc(n*3*sizeof(float));
    float *depth=(float *)malloc(n*sizeof(float)); uint8_t *rgba=(uint8_t *)malloc(n*4);
    if(!main_image || !portal || !depth || !rgba) {
        free(main_image);free(portal);free(depth);free(rgba);return 0;
    }
    free(s->main_image);free(s->portal_image);free(s->depth);free(s->rgba);
    s->main_image=main_image;s->portal_image=portal;s->depth=depth;s->rgba=rgba;s->width=width;s->height=height;
    return 1;
}
static inline int n64gs_render(n64gs_scene *s,int world,const float eye[3],float yaw,float fov,
        int width,int height,int portals) {
    if(!s->order || (world!=0 && world!=1) || !isfinite(yaw) || !isfinite(fov) || fov<10 || fov>120)
        return 0;
    for(int i=0;i<3;i++) if(!isfinite(eye[i]) || fabsf(eye[i])>10000) return 0;
    if(!n64gs_resize(s,width,height)) return 0;
    float focal=height*0.5f/tanf(fov*0.008726646259971648f);
    float entry=world==0 ? -2.0f:0.0f,exit=world==0 ? 0.0f:-2.0f;
    uint32_t background[2]={0x17233d,0x607d80},accent[2]={0x9c83ff,0xf5c98d};
    n64gs_fill(s,s->main_image,background[world]);
    for(int i=0;i<width*height;i++) s->depth[i]=FLT_MAX;
    s->visible[1-world]=0;
    /* Aperture ray intersection: camera mapping preserves screen coordinates.
       Rendering the second view with its own order prevents portal sort reuse. */
    int roi[4]={width,height,-1,-1},front=0;
    float sy=sinf(yaw),cy=cosf(yaw);
    for(int side=-1;side<=1;side+=2) for(int top=-1;top<=1;top+=2) {
        float dx=side*1.24f-eye[0],dy=1.6f+top*1.74f-eye[1],dz=entry-eye[2];
        float d=-sy*dx-cy*dz;
        if(d<=0.1f) continue;
        front++;
        float x=width*0.5f+focal*(cy*dx-sy*dz)/d,y=height*0.5f-focal*dy/d;
        roi[0]=(int)fminf(roi[0],floorf(fmaxf(-1,fminf(width,x))));
        roi[1]=(int)fminf(roi[1],floorf(fmaxf(-1,fminf(height,y))));
        roi[2]=(int)fmaxf(roi[2],ceilf(fmaxf(-1,fminf(width,x))));
        roi[3]=(int)fmaxf(roi[3],ceilf(fmaxf(-1,fminf(height,y))));
    }
    if(front>0 && front<4) {roi[0]=0;roi[1]=0;roi[2]=width-1;roi[3]=height-1;}
    roi[0]=(int)fmaxf(0,roi[0]);roi[1]=(int)fmaxf(0,roi[1]);
    roi[2]=(int)fminf(width-1,roi[2]);roi[3]=(int)fminf(height-1,roi[3]);
    if(portals && eye[2]>entry && front && roi[0]<=roi[2] && roi[1]<=roi[3]) {
        float remote[3]={-eye[0],eye[1],exit-(eye[2]-entry)};
        n64gs_fill(s,s->portal_image,background[1-world]);
        s->visible[1-world]=n64gs_view(s,1-world,remote,yaw+3.14159265358979323846f,
            focal,exit+0.015f,s->portal_image,NULL,roi);
        for(int y=roi[1];y<=roi[3];y++) for(int x=roi[0];x<=roi[2];x++) {
            float vx=(x+0.5f-width*0.5f)/focal,vy=-(y+0.5f-height*0.5f)/focal;
            float rz=-cy-vx*sy;
            if(fabsf(rz)<1e-8f) continue;
            float t=(entry-eye[2])/rz;
            if(t<0.1f) continue;
            float hx=eye[0]+(-sy+vx*cy)*t,hy=eye[1]+vy*t-1.6f;
            if(fabsf(hx)>1.24f || fabsf(hy)>1.74f) continue;
            size_t i=(size_t)y*width+x;
            s->depth[i]=t;
            if(fabsf(hx)<=1.1f && fabsf(hy)<=1.6f)
                memcpy(s->main_image+i*3,s->portal_image+i*3,3*sizeof(float));
            else for(int j=0;j<3;j++) s->main_image[i*3+j]=s->linear[(accent[world]>>(16-j*8))&255];
        }
    }
    s->visible[world]=n64gs_view(s,world,eye,yaw,focal,-FLT_MAX,s->main_image,s->depth,NULL);
    for(int i=0;i<width*height;i++) {
        for(int j=0;j<3;j++) {
            int v=(int)(fmaxf(0,fminf(1,s->main_image[i*3+j]))*4095+0.5f);
            s->rgba[i*4+j]=s->srgb[v];
        }
        s->rgba[i*4+3]=255;
    }
    return 1;
}
#endif
