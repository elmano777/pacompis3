import { Titlebar } from './components/layout/titleBar'
import { Sidebar } from './components/layout/sideBar'
import { CenterPanel } from './components/layout/centerPanel'
import { RightPanel } from './components/layout/rightPanel'

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-base text-text-primary">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  )
}
