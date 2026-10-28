import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from '../../src/editor/EditorApp';
import '../../src/shared/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);
