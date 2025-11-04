// src/components/Dashboard.tsx

import { useState, useEffect } from 'react'
import {
	Box,
	Card,
	CardContent,
	Typography,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	Alert,
	Skeleton,
	Chip,
	Paper,
	Button,
} from '@mui/material'
import {
	Dashboard as DashboardIcon,
	Assignment as TaskIcon,
	CheckCircle as CompletedIcon,
	Schedule as PendingIcon,
	Note as NoteIcon,
	TrendingUp as TrendIcon,
} from '@mui/icons-material'
import { getDashboard, getActivities } from '../services/api'
import signalRService from '../services/signalr'
import { useToast } from '../contexts/ToastContext'
import type { DashboardResponse, Activity } from '../types'

interface DashboardProps {
	onError?: (hasError: boolean) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onError }) => {
	const { showToast } = useToast()
	const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
		null
	)
	const [activities, setActivities] = useState<Activity[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [recentUpdateType, setRecentUpdateType] = useState<string | null>(null)

	// Helper function to show update notification with visual feedback
	const showUpdateNotification = (
		type: string,
		message: string,
		severity: 'success' | 'info' | 'warning' | 'error' = 'info'
	) => {
		setRecentUpdateType(type)
		showToast(message, severity)
		// Clear the update type after a short delay
		setTimeout(() => setRecentUpdateType(null), 2000)
	}

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true)
				setError(null)

				// Fetch dashboard data first
				const dashboardResponse = await getDashboard()
				setDashboardData(dashboardResponse)

				// Then fetch activities
				try {
					const activitiesResponse = await getActivities(10)
					setActivities(activitiesResponse)
				} catch (activitiesError) {
					setActivities([]) // Set empty array if activities fail
				}

				onError?.(false)
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to fetch dashboard data'
				setError(errorMessage)
				onError?.(true)
			} finally {
				setLoading(false)
			}
		}

		fetchDashboardData()
	}, [onError])

	// SignalR event listeners for real-time dashboard updates
	useEffect(() => {
		const unsubscribeActivityUpdate = signalRService.onActivityUpdate(
			(activity) => {
				setActivities((prev) => [activity, ...prev.slice(0, 9)]) // Keep only latest 10
				showUpdateNotification('activity', `💡 ${activity.description}`, 'info')
			}
		)

		// Task events with toast notifications and dashboard updates
		const unsubscribeTaskCreated = signalRService.onTaskCreated((newTask) => {
			// Refresh dashboard data
			getDashboard()
				.then(setDashboardData)
				.catch(() => {})
			// Show toast notification
			showUpdateNotification(
				'task-created',
				`📋 New task created: "${newTask.title}"`,
				'success'
			)
		})

		const unsubscribeTaskUpdated = signalRService.onTaskUpdated(
			(updatedTask) => {
				// Refresh dashboard data
				getDashboard()
					.then(setDashboardData)
					.catch(() => {})
				// Show toast notification
				showUpdateNotification(
					'task-updated',
					`✏️ Task updated: "${updatedTask.title}"`,
					'info'
				)
			}
		)

		const unsubscribeTaskDeleted = signalRService.onTaskDeleted(() => {
			// Refresh dashboard data
			getDashboard()
				.then(setDashboardData)
				.catch(() => {})
			// Show toast notification
			showUpdateNotification('task-deleted', '🗑️ A task was deleted', 'warning')
		})

		const unsubscribeTaskCompletionChanged =
			signalRService.onTaskCompletionChanged((data) => {
				// Refresh dashboard data
				getDashboard()
					.then(setDashboardData)
					.catch(() => {})
				// Show toast notification
				const statusIcon = data.isCompleted ? '✅' : '🔄'
				const statusText = data.isCompleted ? 'completed' : 'reopened'
				showUpdateNotification(
					'task-completion',
					`${statusIcon} Task ${statusText}: "${data.title}"`,
					'info'
				)
			})

		// Note events with toast notifications
		const unsubscribeNoteAdded = signalRService.onNoteAdded(() => {
			// Refresh dashboard data to update note count
			getDashboard()
				.then(setDashboardData)
				.catch(() => {})
			// Show toast notification
			showUpdateNotification(
				'note-added',
				'📝 New note added to a task',
				'info'
			)
		})

		const unsubscribeNoteUpdated = signalRService.onNoteUpdated(() => {
			// Show toast notification
			showUpdateNotification('note-updated', '✏️ A note was updated', 'info')
		})

		const unsubscribeNoteDeleted = signalRService.onNoteDeleted(() => {
			// Refresh dashboard data to update note count
			getDashboard()
				.then(setDashboardData)
				.catch(() => {})
			// Show toast notification
			showUpdateNotification('note-deleted', '🗑️ A note was deleted', 'warning')
		})

		// Cleanup event listeners
		return () => {
			unsubscribeActivityUpdate()
			unsubscribeTaskCreated()
			unsubscribeTaskUpdated()
			unsubscribeTaskDeleted()
			unsubscribeTaskCompletionChanged()
			unsubscribeNoteAdded()
			unsubscribeNoteUpdated()
			unsubscribeNoteDeleted()
		}
	}, [showToast])

	// Loading state
	if (loading) {
		return (
			<Box sx={{ p: 4 }}>
				<Skeleton variant='text' width='40%' height={60} sx={{ mb: 3 }} />
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: {
							xs: '1fr',
							sm: '1fr 1fr',
							md: '1fr 1fr 1fr 1fr',
						},
						gap: 3,
						mb: 4,
					}}>
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton
							key={index}
							variant='rectangular'
							height={140}
							sx={{ borderRadius: 2 }}
						/>
					))}
				</Box>
				<Skeleton variant='rectangular' height={300} sx={{ borderRadius: 2 }} />
			</Box>
		)
	}

	// Error state
	if (error) {
		return (
			<Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
				<Alert
					severity='error'
					sx={{
						mb: 3,
						borderRadius: 3,
						'& .MuiAlert-message': {
							width: '100%',
						},
					}}
					action={
						<Button
							color='inherit'
							size='small'
							onClick={() => window.location.reload()}
							sx={{ fontWeight: 600 }}>
							Retry
						</Button>
					}>
					<Typography variant='h6' gutterBottom sx={{ fontWeight: 600 }}>
						Dashboard Unavailable
					</Typography>
					<Typography variant='body2' sx={{ mb: 2 }}>
						{error}
					</Typography>
					<Typography variant='caption' color='text.secondary'>
						Please check your connection and try again. The sidebar navigation
						has been disabled until this issue is resolved.
					</Typography>
				</Alert>
			</Box>
		)
	}

	if (!dashboardData) {
		return null
	}

	// Statistics cards data
	const statsCards = [
		{
			title: 'Total Tasks',
			value: dashboardData.totalTasks,
			icon: <TaskIcon sx={{ fontSize: 40 }} />,
			color: '#1976d2',
			bgcolor: '#e3f2fd',
		},
		{
			title: 'Completed',
			value: dashboardData.completedTasks,
			icon: <CompletedIcon sx={{ fontSize: 40 }} />,
			color: '#2e7d32',
			bgcolor: '#e8f5e8',
		},
		{
			title: 'Pending',
			value: dashboardData.pendingTasks,
			icon: <PendingIcon sx={{ fontSize: 40 }} />,
			color: '#ed6c02',
			bgcolor: '#fff3e0',
		},
		{
			title: 'Total Notes',
			value: dashboardData.totalNotes,
			icon: <NoteIcon sx={{ fontSize: 40 }} />,
			color: '#9c27b0',
			bgcolor: '#f3e5f5',
		},
	]

	// Get activity color based on action display name
	const getActivityColor = (
		actionDisplayName: string
	): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
		const lowerAction = actionDisplayName.toLowerCase()
		if (lowerAction.includes('created')) return 'success'
		if (lowerAction.includes('updated')) return 'primary'
		if (lowerAction.includes('deleted')) return 'error'
		if (lowerAction.includes('completed')) return 'success'
		return 'default'
	}

	// Get entity type icon based on entity type display name
	const getEntityTypeIcon = (entityTypeDisplayName: string): string => {
		const lowerType = entityTypeDisplayName.toLowerCase()
		if (lowerType.includes('task')) return 'T'
		if (lowerType.includes('note')) return 'N'
		return entityTypeDisplayName.charAt(0).toUpperCase()
	}

	return (
		<Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
			{/* Header */}
			<Box sx={{ mb: { xs: 3, md: 4 } }}>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						mb: 1,
					}}>
					<Typography
						variant='h3'
						sx={{
							fontSize: { xs: '2rem', sm: '2.2rem', md: '2.5rem' },
							fontWeight: 600,
							color: '#2c3e50',
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
							display: 'flex',
							alignItems: 'center',
							gap: { xs: 1, md: 2 },
						}}>
						<DashboardIcon
							sx={{
								fontSize: { xs: '2rem', sm: '2.2rem', md: '2.5rem' },
								color: '#667eea',
							}}
						/>
						Dashboard
					</Typography>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<Chip
							icon={<TrendIcon fontSize='small' />}
							label='Live Updates'
							color={recentUpdateType ? 'primary' : 'success'}
							size='small'
							variant={recentUpdateType ? 'filled' : 'outlined'}
							sx={{
								fontSize: '0.75rem',
								height: 28,
								transition: 'all 0.3s ease',
								transform: recentUpdateType ? 'scale(1.05)' : 'scale(1)',
								animation: recentUpdateType ? 'pulse 0.5s ease-in-out' : 'none',
								'& .MuiChip-icon': {
									fontSize: '16px',
								},
								'@keyframes pulse': {
									'0%': { transform: 'scale(1)' },
									'50%': { transform: 'scale(1.1)' },
									'100%': { transform: 'scale(1)' },
								},
							}}
						/>
					</Box>
				</Box>
				<Typography
					variant='body1'
					sx={{
						color: '#7f8c8d',
						fontSize: { xs: '1rem', md: '1.1rem' },
					}}>
					Overview of your tasks and recent activities
				</Typography>
			</Box>

			{/* Statistics Cards */}
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: {
						xs: '1fr',
						sm: '1fr 1fr',
						md: '1fr 1fr 1fr 1fr',
					},
					gap: 3,
					mb: 4,
				}}>
				{statsCards.map((stat, index) => (
					<Card
						key={index}
						sx={{
							height: '100%',
							background: stat.bgcolor,
							border: `1px solid ${stat.color}20`,
							transition: 'all 0.3s ease',
							'&:hover': {
								transform: 'translateY(-4px)',
								boxShadow: `0 8px 25px ${stat.color}20`,
							},
						}}>
						<CardContent sx={{ p: 3 }}>
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
								}}>
								<Box>
									<Typography
										variant='h4'
										sx={{ fontWeight: 700, color: stat.color, mb: 1 }}>
										{stat.value.toLocaleString()}
									</Typography>
									<Typography
										variant='body2'
										sx={{ color: stat.color, fontWeight: 500 }}>
										{stat.title}
									</Typography>
								</Box>
								<Box sx={{ color: stat.color }}>{stat.icon}</Box>
							</Box>
						</CardContent>
					</Card>
				))}
			</Box>

			{/* Additional Metrics */}
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
					gap: 3,
					mb: 4,
				}}>
				<Paper
					sx={{
						p: 3,
						borderRadius: 3,
						background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
						border: '1px solid #e1e8ed',
					}}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
						<TrendIcon sx={{ color: '#667eea', fontSize: 30 }} />
						<Typography variant='h6' sx={{ fontWeight: 600, color: '#2c3e50' }}>
							Completion Rate
						</Typography>
					</Box>
					<Typography variant='h3' sx={{ color: '#667eea', fontWeight: 700 }}>
						{dashboardData.completionRate.toFixed(1)}%
					</Typography>
				</Paper>
				<Paper
					sx={{
						p: 3,
						borderRadius: 3,
						background: 'linear-gradient(135deg, #764ba220 0%, #667eea20 100%)',
						border: '1px solid #e1e8ed',
					}}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
						<NoteIcon sx={{ color: '#764ba2', fontSize: 30 }} />
						<Typography variant='h6' sx={{ fontWeight: 600, color: '#2c3e50' }}>
							Notes per Task
						</Typography>
					</Box>
					<Typography variant='h3' sx={{ color: '#764ba2', fontWeight: 700 }}>
						{dashboardData.notesPerTask.toFixed(1)}
					</Typography>
				</Paper>
			</Box>

			{/* Recent Activities */}
			<Paper
				sx={{
					borderRadius: 3,
					overflow: 'hidden',
					border: '1px solid #e1e8ed',
					boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
				}}>
				<Box
					sx={{ p: 3, bgcolor: '#fafafa', borderBottom: '1px solid #e1e8ed' }}>
					<Typography variant='h6' sx={{ fontWeight: 600, color: '#2c3e50' }}>
						Recent Activities
					</Typography>
					<Typography variant='body2' color='text.secondary'>
						Latest updates and changes across your workspace
					</Typography>
				</Box>
				<List sx={{ p: 0 }}>
					{activities.length === 0 ? (
						<ListItem>
							<ListItemText
								primary='No recent activities'
								secondary='Start creating tasks and notes to see activity here'
							/>
						</ListItem>
					) : (
						activities.map((activity, index) => (
							<ListItem
								key={activity.id}
								sx={{
									py: 2,
									px: 3,
									borderBottom:
										index < activities.length - 1
											? '1px solid #f0f0f0'
											: 'none',
									'&:hover': {
										bgcolor: '#f8f9fa',
									},
								}}>
								<ListItemIcon sx={{ minWidth: 40 }}>
									<Box
										sx={{
											width: 32,
											height: 32,
											borderRadius: '50%',
											bgcolor: '#667eea20',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
										}}>
										<Typography
											variant='caption'
											sx={{ color: '#667eea', fontWeight: 600 }}>
											{getEntityTypeIcon(activity.entityTypeDisplayName)}
										</Typography>
									</Box>
								</ListItemIcon>
								<ListItemText
									primary={
										<Box
											sx={{
												display: 'flex',
												alignItems: 'center',
												gap: 1,
												mb: 0.5,
											}}>
											<Typography variant='body1' sx={{ fontWeight: 500 }}>
												{activity.entityTitle}
											</Typography>
											<Chip
												label={activity.actionDisplayName}
												size='small'
												color={getActivityColor(activity.actionDisplayName)}
												variant='outlined'
											/>
										</Box>
									}
									secondary={
										<Box>
											<Typography
												variant='body2'
												color='text.secondary'
												sx={{ mb: 0.5 }}>
												{activity.description}
											</Typography>
											<Typography variant='caption' color='text.disabled'>
												{new Date(activity.createdAt).toLocaleString()}
											</Typography>
										</Box>
									}
								/>
							</ListItem>
						))
					)}
				</List>
			</Paper>
		</Box>
	)
}

export default Dashboard
