import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppRouter />
      </Providers>
    </BrowserRouter>
  );
}

export default App;
