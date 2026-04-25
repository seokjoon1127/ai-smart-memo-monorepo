import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DemoLayout } from '@/components/shell/DemoLayout'
import { MemoPage } from '@/pages/MemoPage'
import { ShareBoxPage } from '@/pages/ShareBoxPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { NotesPage } from '@/pages/NotesPage'
import { TeamPage } from '@/pages/TeamPage'
import { NotificationPage } from '@/pages/NotificationPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DemoLayout />,
    children: [
      { index: true, element: <Navigate to="/memo" replace /> },
      { path: 'memo', element: <MemoPage /> },
      { path: 'sharebox', element: <ShareBoxPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'team', element: <TeamPage /> },
      { path: 'notifications', element: <NotificationPage /> },
      { path: '*', element: <Navigate to="/memo" replace /> },
    ],
  },
])
