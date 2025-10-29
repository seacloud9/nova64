// System Profiler - Shows system information
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';

const profilerApp: Nova64App = {
  id: 'com.nova64.profiler',
  name: 'System Profiler',
  icon: '💻',

  mount(el: HTMLElement) {
    const info = `
      <div style="
        padding: 20px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.8;
      ">
        <h2 style="margin: 0 0 16px 0; font-size: 16px;">📊 System Profiler</h2>
        
        <div style="background: #F5F5F5; padding: 12px; margin-bottom: 12px; border: 1px solid #CCC;">
          <strong>System Software</strong><br/>
          Operating System: nova64 OS<br/>
          Version: 1.0.0<br/>
          Build: ${new Date().toISOString().split('T')[0]}<br/>
          Kernel: WebOS 2024<br/>
        </div>

        <div style="background: #F5F5F5; padding: 12px; margin-bottom: 12px; border: 1px solid #CCC;">
          <strong>Hardware</strong><br/>
          Processor: ${navigator.hardwareConcurrency || 4} cores<br/>
          Memory: ${(navigator as any).deviceMemory || '?'} GB<br/>
          Display: ${window.innerWidth}×${window.innerHeight}<br/>
          Platform: ${navigator.platform}<br/>
        </div>

        <div style="background: #F5F5F5; padding: 12px; margin-bottom: 12px; border: 1px solid #CCC;">
          <strong>Browser Information</strong><br/>
          User Agent: ${navigator.userAgent.split(' ').slice(0, 3).join(' ')}...<br/>
          Language: ${navigator.language}<br/>
          Online: ${navigator.onLine ? 'Yes' : 'No'}<br/>
          Cookies Enabled: ${navigator.cookieEnabled ? 'Yes' : 'No'}<br/>
        </div>

        <div style="background: #F5F5F5; padding: 12px; margin-bottom: 12px; border: 1px solid #CCC;">
          <strong>Storage</strong><br/>
          IndexedDB: Available<br/>
          LocalStorage: ${typeof localStorage !== 'undefined' ? 'Available' : 'Not Available'}<br/>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: #E8F4FF; border: 1px solid #0066CC;">
          <strong>About nova64 OS</strong><br/>
          A Mac OS 9-inspired operating system shell built with modern web technologies.
          Features include a classic Platinum UI theme, virtual filesystem, window management,
          and extensible application framework.
        </div>
      </div>
    `;

    el.innerHTML = info;
    el.style.overflow = 'auto';
  },

  unmount() {
    // Cleanup
  },

  getInfo() {
    return {
      name: 'System Profiler',
      version: '1.0',
      description: 'View system information and hardware details',
      author: 'nova64 OS',
      icon: '💻',
    };
  },
};

novaContext.registerApp(profilerApp);

export default profilerApp;
