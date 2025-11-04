// src/components/Tasks.tsx

import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../contexts/ToastContext'
import signalRService from '../services/signalr'
import {
	Box,
	Card,
	CardContent,
	CardActions,
	Typography,
	Button,
	Chip,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	IconButton,
	Fab,
	Pagination,
	Alert,
	Skeleton,
	Menu,
	MenuItem,
	Divider,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	CircularProgress,
} from '@mui/material'
import {
	Add as AddIcon,
	Edit as EditIcon,
	Delete as DeleteIcon,
	CheckCircle as CompleteIcon,
	RadioButtonUnchecked as IncompleteIcon,
	Search as SearchIcon,
	MoreVert as MoreVertIcon,
	Note as NoteIcon,
	CalendarToday as DateIcon,
	Assignment as TaskIcon,
	Close as CloseIcon,
	TrendingUp as TrendIcon,
} from '@mui/icons-material'
import {
	getTasks,
	createTask,
	updateTask,
	deleteTask,
	toggleTaskCompletion,
} from '../services/api'
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '../types'

interface TaskDialogData {
	title: string
	description: string
}

const Tasks: React.FC = () => {
	// Toast notifications
	const { showToast } = useToast()

	// State management
	const [tasks, setTasks] = useState<Task[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [taskDialogOpen, setTaskDialogOpen] = useState(false)
	const [editingTask, setEditingTask] = useState<Task | null>(null)
	const [taskDialogData, setTaskDialogData] = useState<TaskDialogData>({
		title: '',
		description: '',
	})
	const [actionLoading, setActionLoading] = useState<string | null>(null)
	const [menuAnchor, setMenuAnchor] = useState<{
		[key: string]: HTMLElement | null
	}>({})
	const [recentUpdateType, setRecentUpdateType] = useState<string | null>(null)

	const itemsPerPage = 6

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

	// Fetch tasks on component mount
	useEffect(() => {
		const fetchTasks = async () => {
			try {
				setLoading(true)
				setError(null)
				const tasksData = await getTasks()
				setTasks(tasksData)
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to fetch tasks'
				setError(errorMessage)
			} finally {
				setLoading(false)
			}
		}

		fetchTasks()
	}, [])

	// SignalR event listeners for real-time updates
	useEffect(() => {
		// Task events - show different messages for user's own actions vs others' actions
		const unsubscribeTaskCreated = signalRService.onTaskCreated((newTask) => {
			setTasks((prev) => [newTask, ...prev])
			showUpdateNotification(
				'task',
				`📋 New task created: "${newTask.title}"`,
				'success'
			)
		})

		const unsubscribeTaskUpdated = signalRService.onTaskUpdated(
			(updatedTask) => {
				setTasks((prev) =>
					prev.map((task) =>
						task.id === updatedTask.id
							? { ...updatedTask, notes: updatedTask.notes || task.notes || [] }
							: task
					)
				)
				showUpdateNotification(
					'task',
					`✏️ Task updated: "${updatedTask.title}"`,
					'info'
				)
			}
		)

		const unsubscribeTaskDeleted = signalRService.onTaskDeleted((taskId) => {
			setTasks((prev) => prev.filter((task) => task.id !== taskId))
			showUpdateNotification('task', '🗑️ A task was deleted', 'warning')
		})

		const unsubscribeTaskCompletionChanged =
			signalRService.onTaskCompletionChanged((data) => {
				setTasks((prev) =>
					prev.map((task) =>
						task.id === data.id
							? {
									...task,
									isCompleted: data.isCompleted,
									updatedAt: data.updatedAt,
							  }
							: task
					)
				)
				const statusIcon = data.isCompleted ? '✅' : '🔄'
				const statusText = data.isCompleted ? 'completed' : 'reopened'
				showUpdateNotification(
					'task',
					`${statusIcon} Task ${statusText}: "${data.title}"`,
					'info'
				)
			})

		// Note events - show notifications about note changes
		const unsubscribeNoteAdded = signalRService.onNoteAdded((newNote) => {
			// Update tasks to include the new note
			setTasks((prev) =>
				prev.map((task) =>
					task.id === newNote.taskId
						? { ...task, notes: [newNote, ...(task.notes || [])] }
						: task
				)
			)
			showUpdateNotification('note', '📝 New note added to a task', 'info')
		})

		const unsubscribeNoteUpdated = signalRService.onNoteUpdated(
			(updatedNote) => {
				// Update tasks to reflect the updated note
				setTasks((prev) =>
					prev.map((task) => ({
						...task,
						notes:
							task.notes?.map((note) =>
								note.id === updatedNote.id ? updatedNote : note
							) || [],
					}))
				)
				showUpdateNotification('note', '✏️ A note was updated', 'info')
			}
		)

		const unsubscribeNoteDeleted = signalRService.onNoteDeleted((data) => {
			// Remove note from tasks
			setTasks((prev) =>
				prev.map((task) => ({
					...task,
					notes: task.notes?.filter((note) => note.id !== data.id) || [],
				}))
			)
			showUpdateNotification('note', '🗑️ A note was deleted', 'info')
		})

		// Activity events - show general activity notifications
		const unsubscribeActivityUpdate = signalRService.onActivityUpdate(
			(activity) => {
				showUpdateNotification('activity', `💡 ${activity.description}`, 'info')
			}
		)

		// Cleanup event listeners
		return () => {
			unsubscribeTaskCreated()
			unsubscribeTaskUpdated()
			unsubscribeTaskDeleted()
			unsubscribeTaskCompletionChanged()
			unsubscribeNoteAdded()
			unsubscribeNoteUpdated()
			unsubscribeNoteDeleted()
			unsubscribeActivityUpdate()
		}
	}, [showToast])

	// Filter and paginate tasks
	const filteredTasks = useMemo(() => {
		if (!searchQuery.trim()) return tasks

		const query = searchQuery.toLowerCase()
		return tasks.filter(
			(task) =>
				task.title.toLowerCase().includes(query) ||
				(task.description && task.description.toLowerCase().includes(query))
		)
	}, [tasks, searchQuery])

	const paginatedTasks = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage
		return filteredTasks.slice(startIndex, startIndex + itemsPerPage)
	}, [filteredTasks, currentPage])

	const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)

	// Handle page change
	const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
		setCurrentPage(page)
	}

	// Handle search
	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(event.target.value)
		setCurrentPage(1) // Reset to first page when searching
	}

	// Dialog handlers
	const openCreateDialog = () => {
		setEditingTask(null)
		setTaskDialogData({ title: '', description: '' })
		setTaskDialogOpen(true)
	}

	const openEditDialog = (task: Task) => {
		setEditingTask(task)
		setTaskDialogData({
			title: task.title,
			description: task.description || '',
		})
		setTaskDialogOpen(true)
	}

	const closeDialog = () => {
		setTaskDialogOpen(false)
		setEditingTask(null)
		setTaskDialogData({ title: '', description: '' })
	}

	// CRUD operations
	const handleCreateTask = async () => {
		if (!taskDialogData.title.trim()) return

		try {
			setActionLoading('create')
			const createRequest: CreateTaskRequest = {
				title: taskDialogData.title.trim(),
				description: taskDialogData.description.trim() || undefined,
			}

			await createTask(createRequest)
			// Note: Don't manually add to tasks array - SignalR will handle real-time updates
			closeDialog()
			showToast('Task created successfully!', 'success')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to create task'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	const handleUpdateTask = async () => {
		if (!editingTask || !taskDialogData.title.trim()) return

		try {
			setActionLoading('update')
			const updateRequest: UpdateTaskRequest = {
				title: taskDialogData.title.trim(),
				description: taskDialogData.description.trim() || undefined,
				isCompleted: editingTask.isCompleted,
			}

			await updateTask(editingTask.id, updateRequest)
			// Note: Don't manually update tasks array - SignalR will handle real-time updates
			closeDialog()
			showToast('Task updated successfully!', 'success')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to update task'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	const handleToggleComplete = async (task: Task) => {
		try {
			setActionLoading(`toggle-${task.id}`)
			const result = await toggleTaskCompletion(task.id)
			if (result) {
				const newCompletionStatus = !task.isCompleted
				// Note: Don't manually update tasks array - SignalR will handle real-time updates
				showToast(
					`Task ${
						newCompletionStatus ? 'completed' : 'reopened'
					} successfully!`,
					'success'
				)
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to toggle task completion'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	const handleDeleteTask = async (taskId: string) => {
		try {
			setActionLoading(`delete-${taskId}`)
			await deleteTask(taskId)
			// Note: Don't manually remove from tasks array - SignalR will handle real-time updates
			handleCloseMenu(taskId)
			showToast('Task deleted successfully!', 'success')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to delete task'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	// Menu handlers
	const handleOpenMenu = (
		event: React.MouseEvent<HTMLElement>,
		taskId: string
	) => {
		setMenuAnchor((prev) => ({ ...prev, [taskId]: event.currentTarget }))
	}

	const handleCloseMenu = (taskId: string) => {
		setMenuAnchor((prev) => ({ ...prev, [taskId]: null }))
	}

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	// Loading state
	if (loading) {
		return (
			<Box sx={{ p: 4 }}>
				<Skeleton variant='text' width='40%' height={60} sx={{ mb: 3 }} />
				<Skeleton
					variant='rectangular'
					height={60}
					sx={{ mb: 3, borderRadius: 2 }}
				/>
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: {
							xs: '1fr',
							md: '1fr 1fr',
							lg: '1fr 1fr 1fr',
						},
						gap: 3,
					}}>
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton
							key={index}
							variant='rectangular'
							height={200}
							sx={{ borderRadius: 2 }}
						/>
					))}
				</Box>
			</Box>
		)
	}

	return (
		<Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
			{/* Header */}
			<Box sx={{ mb: { xs: 3, md: 4 } }}>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						mb: 1,
						flexWrap: 'wrap',
						gap: 2,
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
						<TaskIcon
							sx={{
								fontSize: { xs: '2rem', sm: '2.2rem', md: '2.5rem' },
								color: '#667eea',
							}}
						/>
						Tasks
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
					Manage your tasks and track progress
				</Typography>
			</Box>

			{/* Error Alert */}
			{error && (
				<Alert
					severity='error'
					sx={{
						mb: 3,
						borderRadius: 3,
						'& .MuiAlert-message': {
							width: '100%',
						},
					}}
					onClose={() => setError(null)}
					action={
						<Button
							color='inherit'
							size='small'
							onClick={() => {
								setError(null)
								window.location.reload()
							}}
							sx={{ fontWeight: 600 }}>
							Retry
						</Button>
					}>
					<Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
						Operation Failed
					</Typography>
					<Typography variant='body2'>{error}</Typography>
				</Alert>
			)}

			{/* Search and Actions */}
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 3,
					flexWrap: 'wrap',
					gap: 2,
				}}>
				<TextField
					placeholder='Search tasks by title or description...'
					value={searchQuery}
					onChange={handleSearchChange}
					variant='outlined'
					size='medium'
					sx={{
						minWidth: { xs: '100%', sm: 300 },
						flex: { xs: '1 1 100%', sm: '0 1 auto' },
						'& .MuiOutlinedInput-root': {
							borderRadius: 3,
						},
					}}
					InputProps={{
						startAdornment: (
							<SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
						),
					}}
				/>

				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Typography variant='body2' color='text.secondary'>
						{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}{' '}
						found
					</Typography>
					<Fab
						color='primary'
						onClick={openCreateDialog}
						sx={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							'&:hover': {
								background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
							},
						}}>
						<AddIcon />
					</Fab>
				</Box>
			</Box>

			{/* Tasks Grid */}
			{paginatedTasks.length === 0 ? (
				<Box
					sx={{
						textAlign: 'center',
						py: 8,
						color: 'text.secondary',
					}}>
					<TaskIcon sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
					<Typography variant='h6' gutterBottom>
						{searchQuery ? 'No tasks match your search' : 'No tasks yet'}
					</Typography>
					<Typography variant='body1'>
						{searchQuery
							? 'Try adjusting your search terms'
							: 'Create your first task to get started'}
					</Typography>
					{!searchQuery && (
						<Button
							variant='contained'
							startIcon={<AddIcon />}
							onClick={openCreateDialog}
							sx={{
								mt: 2,
								background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
								'&:hover': {
									background:
										'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
								},
							}}>
							Create Task
						</Button>
					)}
				</Box>
			) : (
				<>
					<Box
						sx={{
							display: 'grid',
							gridTemplateColumns: {
								xs: '1fr',
								md: '1fr 1fr',
								lg: '1fr 1fr 1fr',
							},
							gap: 3,
							mb: 4,
						}}>
						{paginatedTasks.map((task) => (
							<Card
								key={task.id}
								sx={{
									height: 'fit-content',
									transition: 'all 0.3s ease',
									border: '1px solid #e1e8ed',
									'&:hover': {
										transform: 'translateY(-4px)',
										boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
									},
									opacity: task.isCompleted ? 0.8 : 1,
								}}>
								<CardContent sx={{ pb: 1 }}>
									{/* Task Header */}
									<Box
										sx={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'flex-start',
											mb: 2,
										}}>
										<Typography
											variant='h6'
											sx={{
												fontWeight: 600,
												textDecoration: task.isCompleted
													? 'line-through'
													: 'none',
												color: task.isCompleted
													? 'text.secondary'
													: 'text.primary',
												flex: 1,
												mr: 1,
												lineHeight: 1.3,
											}}>
											{task.title}
										</Typography>
										<Box
											sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
											<Chip
												label={task.isCompleted ? 'Completed' : 'Pending'}
												size='small'
												color={task.isCompleted ? 'success' : 'warning'}
												variant='outlined'
											/>
											<IconButton
												size='small'
												onClick={(e) => handleOpenMenu(e, task.id)}
												disabled={actionLoading !== null}>
												<MoreVertIcon fontSize='small' />
											</IconButton>
										</Box>
									</Box>

									{/* Task Description */}
									{task.description && (
										<Typography
											variant='body2'
											color='text.secondary'
											sx={{
												mb: 2,
												textDecoration: task.isCompleted
													? 'line-through'
													: 'none',
											}}>
											{task.description}
										</Typography>
									)}

									{/* Task Metadata */}
									<Box
										sx={{
											display: 'flex',
											alignItems: 'center',
											gap: 2,
											mb: 2,
											flexWrap: 'wrap',
										}}>
										<Box
											sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
											<DateIcon
												sx={{ fontSize: 16, color: 'text.secondary' }}
											/>
											<Typography variant='caption' color='text.secondary'>
												Created {formatDate(task.createdAt)}
											</Typography>
										</Box>
										{task.notes && task.notes.length > 0 && (
											<Box
												sx={{
													display: 'flex',
													alignItems: 'center',
													gap: 0.5,
												}}>
												<NoteIcon
													sx={{ fontSize: 16, color: 'text.secondary' }}
												/>
												<Typography variant='caption' color='text.secondary'>
													{task.notes.length} note
													{task.notes.length !== 1 ? 's' : ''}
												</Typography>
											</Box>
										)}
									</Box>

									{/* Notes Preview */}
									{task.notes && task.notes.length > 0 && (
										<Box
											sx={{
												bgcolor: '#f8f9fa',
												borderRadius: 2,
												p: 2,
												mb: 2,
												border: '1px solid #e1e8ed',
											}}>
											<Typography
												variant='subtitle2'
												sx={{ mb: 1, fontWeight: 600 }}>
												Notes ({task.notes.length})
											</Typography>
											<List dense sx={{ p: 0 }}>
												{task.notes.slice(0, 2).map((note) => (
													<ListItem key={note.id} sx={{ px: 0, py: 0.5 }}>
														<ListItemIcon sx={{ minWidth: 24 }}>
															<NoteIcon
																sx={{ fontSize: 16, color: 'text.secondary' }}
															/>
														</ListItemIcon>
														<ListItemText
															primary={
																note.content.length > 60
																	? `${note.content.substring(0, 60)}...`
																	: note.content
															}
															primaryTypographyProps={{ variant: 'body2' }}
														/>
													</ListItem>
												))}
											</List>
											{task.notes && task.notes.length > 2 && (
												<Typography variant='caption' color='text.secondary'>
													+{task.notes.length - 2} more note
													{task.notes.length - 2 !== 1 ? 's' : ''}
												</Typography>
											)}
										</Box>
									)}
								</CardContent>

								<CardActions
									sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
									<Button
										startIcon={
											task.isCompleted ? <CompleteIcon /> : <IncompleteIcon />
										}
										onClick={() => handleToggleComplete(task)}
										disabled={actionLoading === `toggle-${task.id}`}
										color={task.isCompleted ? 'success' : 'primary'}
										variant='outlined'
										size='small'>
										{task.isCompleted ? 'Completed' : 'Mark Complete'}
									</Button>

									<Button
										startIcon={<EditIcon />}
										onClick={() => openEditDialog(task)}
										disabled={actionLoading !== null}
										variant='text'
										size='small'>
										Edit
									</Button>
								</CardActions>

								{/* Task Menu */}
								<Menu
									anchorEl={menuAnchor[task.id]}
									open={Boolean(menuAnchor[task.id])}
									onClose={() => handleCloseMenu(task.id)}
									transformOrigin={{ horizontal: 'right', vertical: 'top' }}
									anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
									<MenuItem
										onClick={() => {
											openEditDialog(task)
											handleCloseMenu(task.id)
										}}>
										<ListItemIcon>
											<EditIcon fontSize='small' />
										</ListItemIcon>
										<ListItemText>Edit Task</ListItemText>
									</MenuItem>
									<MenuItem
										onClick={() => {
											handleToggleComplete(task)
											handleCloseMenu(task.id)
										}}>
										<ListItemIcon>
											{task.isCompleted ? (
												<IncompleteIcon fontSize='small' />
											) : (
												<CompleteIcon fontSize='small' />
											)}
										</ListItemIcon>
										<ListItemText>
											{task.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
										</ListItemText>
									</MenuItem>
									<Divider />
									<MenuItem
										onClick={() => handleDeleteTask(task.id)}
										disabled={actionLoading === `delete-${task.id}`}
										sx={{ color: 'error.main' }}>
										<ListItemIcon>
											<DeleteIcon
												fontSize='small'
												sx={{ color: 'error.main' }}
											/>
										</ListItemIcon>
										<ListItemText>Delete Task</ListItemText>
									</MenuItem>
								</Menu>
							</Card>
						))}
					</Box>

					{/* Pagination */}
					{totalPages > 1 && (
						<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
							<Pagination
								count={totalPages}
								page={currentPage}
								onChange={handlePageChange}
								color='primary'
								size='large'
								showFirstButton
								showLastButton
							/>
						</Box>
					)}
				</>
			)}

			{/* Task Dialog */}
			<Dialog
				open={taskDialogOpen}
				onClose={closeDialog}
				maxWidth='sm'
				fullWidth
				PaperProps={{
					sx: {
						borderRadius: 3,
						minHeight: 280,
						minWidth: { xs: '90vw', sm: 450 },
					},
				}}>
				<DialogTitle
					sx={{
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						color: 'white',
						fontWeight: 600,
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						pr: 1,
						mb: 1,
					}}>
					<Typography variant='h6' component='div' sx={{ fontWeight: 600 }}>
						{editingTask ? 'Edit Task' : 'Create New Task'}
					</Typography>
					<IconButton
						onClick={closeDialog}
						sx={{
							color: 'white',
							'&:hover': {
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
							},
						}}
						disabled={actionLoading !== null}>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent sx={{ p: 3, pt: 2 }}>
					<TextField
						autoFocus
						label='Task Title'
						fullWidth
						variant='outlined'
						value={taskDialogData.title}
						onChange={(e) =>
							setTaskDialogData((prev) => ({ ...prev, title: e.target.value }))
						}
						sx={{ mb: 3, mt: 1 }}
						required
					/>
					<TextField
						label='Description (Optional)'
						fullWidth
						variant='outlined'
						multiline
						rows={4}
						value={taskDialogData.description}
						onChange={(e) =>
							setTaskDialogData((prev) => ({
								...prev,
								description: e.target.value,
							}))
						}
						placeholder='Add a detailed description of your task...'
					/>
				</DialogContent>
				<DialogActions sx={{ p: 3, pt: 1, gap: 2, justifyContent: 'flex-end' }}>
					<Button
						onClick={closeDialog}
						disabled={actionLoading !== null}
						variant='outlined'
						sx={{ minWidth: 100, px: 3 }}>
						CANCEL
					</Button>
					<Button
						onClick={editingTask ? handleUpdateTask : handleCreateTask}
						variant='contained'
						disabled={!taskDialogData.title.trim() || actionLoading !== null}
						sx={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							'&:hover': {
								background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
							},
							minWidth: 120,
							gap: 1,
						}}
						startIcon={
							actionLoading === 'create' || actionLoading === 'update' ? (
								<CircularProgress size={16} color='inherit' />
							) : null
						}>
						{actionLoading === 'create' || actionLoading === 'update'
							? 'SAVING...'
							: editingTask
							? 'UPDATE TASK'
							: 'CREATE TASK'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

export default Tasks
