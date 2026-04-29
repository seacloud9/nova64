import { getCartRunnerUrl } from '../utils/cartCode';

export function DemoScene() {
  return (
    <iframe
      src={getCartRunnerUrl('/examples/demoscene/code.js')}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: '#000',
      }}
      allow="fullscreen"
      title="Nova64 Demoscene"
    />
  );
}
