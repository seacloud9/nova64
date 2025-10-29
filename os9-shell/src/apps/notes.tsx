// Notes App
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { filesystem } from '../os/filesystem';

function NotesApp() {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('notes.txt');
  const [isSaved, setIsSaved] = useState(true);

  const saveNote = async () => {
    try {
      await filesystem.write(`/Documents/${fileName}`, content);
      setIsSaved(true);
    } catch (error) {
      alert('Error: ' + error);
    }
  };

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
      <div style={{ padding: 12, background: '#2A2A2A', borderBottom: '2px solid #000', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 24 }}>📝</span>
        <input type="text" value={fileName} onChange={(e) => {setFileName(e.target.value); setIsSaved(false);}} style={{ padding: '6px 12px', border: '2px solid #a6c1ee', borderRadius: 6, background: '#1E1E1E', color: '#FFF', width: 250 }} />
        <div style={{ flex: 1 }} />
        <button onClick={saveNote} style={{ padding: '8px 20px', background: isSaved ? '#00DD77' : '#FFA500', border: '2px solid #000', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#000', fontWeight: 'bold' }}>💾 {isSaved ? 'Saved' : 'Save'}</button>
      </div>
      <div style={{ flex: 1, padding: 16 }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.95)', borderRadius: 12, border: '4px solid rgba(0,0,0,0.2)', overflow: 'hidden' }}>
          <textarea value={content} onChange={(e) => {setContent(e.target.value); setIsSaved(false);}} placeholder="Start typing..." style={{ flex: 1, padding: 24, border: 'none', outline: 'none', resize: 'none', fontFamily: 'Georgia, serif', fontSize: 16, lineHeight: 1.8, color: '#1a1a1a' }} />
          <div style={{ padding: '8px 16px', background: '#f8f8f8', borderTop: '2px solid rgba(0,0,0,0.1)', fontSize: 11, color: '#666', fontWeight: 'bold' }}>
            📝 {wordCount} words | {content.length} characters
          </div>
        </div>
      </div>
    </div>
  );
}

const notesApp: Nova64App = {
  id: 'notes',
  name: 'Notes',
  icon: '📝',
  mount(container) {
    const root = createRoot(container);
    root.render(<NotesApp />);
    return () => root.unmount();
  },
  unmount() {},
  getInfo() {
    return { name: 'Notes', version: '2.0', description: 'Text editor', author: 'nova64 OS', icon: '📝' };
  },
};

novaContext.registerApp(notesApp);
export default notesApp;
