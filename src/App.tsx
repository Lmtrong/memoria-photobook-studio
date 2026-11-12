import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { AlbumEditorPage } from './pages/AlbumEditorPage';
import { BookViewerPage } from './pages/BookViewerPage';
import { SlideshowPage } from './pages/SlideshowPage';
import { ToastContainer } from './components/common/ToastContainer';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/editor/:albumId" element={<AlbumEditorPage />} />
        <Route path="/viewer/:albumId" element={<BookViewerPage />} />
        <Route path="/slideshow/:albumId" element={<SlideshowPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;
