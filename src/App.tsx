import { useState } from 'react'
import {
	Box,
	Drawer,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Typography,
	IconButton,
	AppBar,
	Toolbar,
	useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
	Dashboard as DashboardIcon,
	Assignment as AssignmentIcon,
	Note as NoteIcon,
	Menu as MenuIcon,
} from '@mui/icons-material'
import Dashboard from './components/Dashboard'
import Tasks from './components/Tasks'
import Notes from './components/Notes'
import SignalRStatus from './components/SignalRStatus'
import { SignalRProvider } from './contexts/SignalRContext'
import { ToastProvider } from './contexts/ToastContext'
import { HealthCheck } from './components/HealthCheck'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { performanceMonitor } from './utils/performance'
import { useEffect } from 'react'
import './App.css'

const drawerWidth = 280
const views = [
	{ key: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
	{ key: 'tasks', label: 'Tasks', icon: AssignmentIcon },
	{ key: 'notes', label: 'Notes', icon: NoteIcon },
]

function App() {
	const [currentView, setCurrentView] = useState('dashboard')
	const [mobileOpen, setMobileOpen] = useState(false)
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))
	const { isOnline } = useNetworkStatus()

	useEffect(() => {
		// Start performance monitoring
		performanceMonitor.measurePageLoad()
	}, [])

	const handleDrawerToggle = () => setMobileOpen(!mobileOpen)
	const handleNavigation = (view: string) => {
		setCurrentView(view)
		if (isMobile) setMobileOpen(false)
	}

	const drawer = (
		<Box>
			<Box
				sx={{
					p: 3,
					textAlign: 'center',
					borderBottom: '1px solid rgba(255,255,255,0.1)',
				}}>
				<Typography
					variant='h5'
					sx={{ fontWeight: 700, fontSize: '1.3rem', mb: 0.5, color: '#fff' }}>
					Task Manager
				</Typography>
				<Box sx={{ mt: 1 }}>
					<SignalRStatus />
				</Box>
			</Box>
			<List sx={{ px: 1, mt: 2 }}>
				{views.map((view) => (
					<ListItem key={view.key} disablePadding sx={{ mb: 1 }}>
						<ListItemButton
							selected={currentView === view.key}
							onClick={() => handleNavigation(view.key)}
							sx={{
								color: '#fff',
								borderRadius: '12px',
								mx: 1,
								py: 1.5,
								'&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.2)' },
								'&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
							}}>
							<ListItemIcon sx={{ color: '#fff', minWidth: 45 }}>
								<view.icon />
							</ListItemIcon>
							<ListItemText primary={view.label} />
						</ListItemButton>
					</ListItem>
				))}
			</List>
		</Box>
	)

	return (
		<SignalRProvider>
			<ToastProvider>
				<HealthCheck />
				{!isOnline && (
					<Box
						sx={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							zIndex: 10000,
							bgcolor: 'error.main',
							color: 'white',
							p: 1,
							textAlign: 'center',
						}}>
						You are offline. Some features may not work properly.
					</Box>
				)}
				<Box sx={{ display: 'flex', height: '100vh' }}>
					{isMobile && (
						<AppBar
							position='fixed'
							sx={{
								background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
								zIndex: theme.zIndex.drawer + 1,
							}}>
							<Toolbar>
								<IconButton
									color='inherit'
									onClick={handleDrawerToggle}
									sx={{ mr: 2 }}>
									<MenuIcon />
								</IconButton>
								<Typography variant='h6' sx={{ flexGrow: 1 }}>
									{views.find((v) => v.key === currentView)?.label}
								</Typography>
								<SignalRStatus />
							</Toolbar>
						</AppBar>
					)}
					<Box
						component='nav'
						sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
						<Drawer
							variant='temporary'
							open={mobileOpen}
							onClose={handleDrawerToggle}
							sx={{
								display: { xs: 'block', md: 'none' },
								'& .MuiDrawer-paper': {
									width: drawerWidth,
									background:
										'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
									color: '#fff',
								},
							}}>
							{drawer}
						</Drawer>
						<Drawer
							variant='permanent'
							sx={{
								display: { xs: 'none', md: 'block' },
								'& .MuiDrawer-paper': {
									width: drawerWidth,
									background:
										'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
									color: '#fff',
								},
							}}>
							{drawer}
						</Drawer>
					</Box>
					<Box
						component='main'
						sx={{
							flexGrow: 1,
							bgcolor: '#fafafa',
							overflow: 'auto',
							marginTop: { xs: '64px', md: 0 },
						}}>
						{currentView === 'dashboard' && <Dashboard onError={() => {}} />}
						{currentView === 'tasks' && <Tasks />}
						{currentView === 'notes' && <Notes />}
					</Box>
				</Box>
			</ToastProvider>
		</SignalRProvider>
	)
}

export default App
