import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DecisionTreeStudio } from './ui/DecisionTreeStudio';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DecisionTreeStudio />
  </StrictMode>,
);
