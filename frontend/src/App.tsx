import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout'
import { DatasetPage } from './pages/DatasetPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SourcesPage } from './pages/SourcesPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SourcesPage />} />
        <Route path="datasets/:sourceId" element={<DatasetPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
