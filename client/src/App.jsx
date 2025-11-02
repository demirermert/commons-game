import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudentPage } from './pages/StudentPage.jsx';
import { InstructorPage } from './pages/InstructorPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentPage />} />
        <Route path="/instructor" element={<InstructorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
