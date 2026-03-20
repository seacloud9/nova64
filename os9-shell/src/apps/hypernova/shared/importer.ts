// hyperNova – importer
import type { HyperNovaProject } from './schema';

export function parseProject(json: string): HyperNovaProject {
  const data = JSON.parse(json) as HyperNovaProject;
  if (data.version !== 1) {
    throw new Error(`Unsupported hyperNova version: ${data.version}`);
  }
  if (!data.stacks || !Array.isArray(data.stacks)) {
    throw new Error('Invalid project: missing stacks');
  }
  return data;
}

export function loadFromFile(): Promise<HyperNovaProject> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hcard.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const project = parseProject(reader.result as string);
          resolve(project);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}
