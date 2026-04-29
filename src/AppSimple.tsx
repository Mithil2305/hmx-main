import React from 'react';
import { Routes, Route } from 'react-router-dom';
import StandaloneBBD from './pages/StandaloneBBD';

function AppSimple() {
  return (
    <Routes>
      <Route path="/" element={<StandaloneBBD />} />
      <Route path="*" element={<StandaloneBBD />} />
    </Routes>
  );
}

export default AppSimple;
