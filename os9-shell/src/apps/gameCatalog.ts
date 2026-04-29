export interface Game {
  id: string;
  name: string;
  description: string;
  emoji: string;
  path: string;
  category: 'racing' | 'shooter' | 'platformer' | 'adventure' | 'sandbox' | 'demo';
  color1: string;
  color2: string;
}

export const GAMES: Game[] = [
  {
    id: 'fzero',
    name: 'F-ZERO RACING',
    description: 'Hyper-speed quantum racing',
    emoji: '🏎️',
    path: '/examples/f-zero-nova-3d/code.js',
    category: 'racing',
    color1: '#FF006E',
    color2: '#8338EC',
  },
  {
    id: 'space-harrier',
    name: 'SPACE HARRIER',
    description: 'Retro rail shooter',
    emoji: '🛸',
    path: '/examples/space-harrier-3d/code.js',
    category: 'racing',
    color1: '#FF6B9D',
    color2: '#3A0CA3',
  },
  {
    id: 'starfox',
    name: 'STAR FOX NOVA',
    description: 'Epic space combat',
    emoji: '🚀',
    path: '/examples/star-fox-nova-3d/code.js',
    category: 'shooter',
    color1: '#3A86FF',
    color2: '#3A0CA3',
  },
  {
    id: 'space-combat',
    name: 'SPACE COMBAT',
    description: 'Deep space warfare',
    emoji: '🛸',
    path: '/examples/space-combat-3d/code.js',
    category: 'shooter',
    color1: '#8B5CF6',
    color2: '#3A0CA3',
  },
  {
    id: 'fps',
    name: 'FPS DEMO',
    description: 'First-person shooter',
    emoji: '🔫',
    path: '/examples/fps-demo-3d/code.js',
    category: 'shooter',
    color1: '#FF006E',
    color2: '#F72585',
  },
  {
    id: 'shooter',
    name: 'SPACE SHOOTER',
    description: 'Arcade space combat',
    emoji: '🎯',
    path: '/examples/shooter-demo-3d/code.js',
    category: 'shooter',
    color1: '#EF4444',
    color2: '#FFBE0B',
  },
  {
    id: 'strider',
    name: 'GAUNTLET 64',
    description: 'Medieval combat realm',
    emoji: '⚔️',
    path: '/examples/strider-demo-3d/code.js',
    category: 'platformer',
    color1: '#06FFA5',
    color2: '#0066FF',
  },
  {
    id: 'cyberpunk',
    name: 'CYBERPUNK CITY',
    description: 'Neon dystopian adventure',
    emoji: '🌆',
    path: '/examples/cyberpunk-city-3d/code.js',
    category: 'adventure',
    color1: '#FF006E',
    color2: '#FFBE0B',
  },
  {
    id: 'minecraft',
    name: 'VOXEL REALM',
    description: 'Infinite procedural worlds',
    emoji: '⛏️',
    path: '/examples/minecraft-demo/code.js',
    category: 'sandbox',
    color1: '#06FFA5',
    color2: '#FFB703',
  },
  {
    id: 'physics',
    name: 'PHYSICS DEMO',
    description: 'Realistic physics sandbox',
    emoji: '⚛️',
    path: '/examples/physics-demo-3d/code.js',
    category: 'demo',
    color1: '#06B6D4',
    color2: '#4361EE',
  },
  {
    id: 'demoscene',
    name: 'DEMOSCENE TRON',
    description: 'Audiovisual hypnosis',
    emoji: '✨',
    path: '/examples/demoscene/code.js',
    category: 'demo',
    color1: '#4CC9F0',
    color2: '#4361EE',
  },
];
