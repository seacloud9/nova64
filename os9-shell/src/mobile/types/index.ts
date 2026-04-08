// Core types for the eMobile TV Shell

export interface AppInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  icon: string;
}

export interface TVApp {
  id: string;
  name: string;
  icon: string;
  category?: string;
  description?: string;
  mount(el: HTMLElement, ctx: TVContext, args?: unknown): void;
  unmount(): void;
  getInfo?(): AppInfo;
}

export interface WindowState {
  appId: string;
  args: Record<string, unknown>;
}

export type Theme = 'dark' | 'light';

export interface TVContext {
  readonly version: string;
  registerApp(app: TVApp): void;
  launchApp(appId: string, args?: Record<string, unknown>): void;
  quitApp(): void;
  toast(msg: string): void;
}
