// src/components/Notes.tsx

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
	Select,
	FormControl,
	InputLabel,
	ListItemIcon,
	ListItemText,
	CircularProgress,
	Chip,
} from '@mui/material'
import {
	Add as AddIcon,
	Edit as EditIcon,
	Delete as DeleteIcon,
	Search as SearchIcon,
	MoreVert as MoreVertIcon,
	Note as NoteIcon,
	CalendarToday as DateIcon,
	Assignment as TaskIcon,
	CheckCircle as CompleteIcon,
	RadioButtonUnchecked as IncompleteIcon,
	Close as CloseIcon,
	TrendingUp as TrendIcon,
} from '@mui/icons-material'
import { getTasks, createNote, updateNote, deleteNote } from '../services/api'
import type { Task, Note, CreateNoteRequest, UpdateNoteRequest } from '../types'

interface NoteWithTask extends Note {
	taskTitle: string
	taskCompleted: boolean
}

interface NoteDialogData {
	content: string
	taskId: string
}

const Notes: React.FC = () => {
	// Toast notifications
	const { showToast } = useToast()

	// State management
	const [tasks, setTasks] = useState<Task[]>([])
	const [notes, setNotes] = useState<NoteWithTask[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [noteDialogOpen, setNoteDialogOpen] = useState(false)
	const [editingNote, setEditingNote] = useState<NoteWithTask | null>(null)
	const [noteDialogData, setNoteDialogData] = useState<NoteDialogData>({
		content: '',
		taskId: '',
	})
	const [actionLoading, setActionLoading] = useState<string | null>(null)
	const [menuAnchor, setMenuAnchor] = useState<{
		[key: string]: HTMLElement | null
	}>({})
	const [recentUpdateType, setRecentUpdateType] = useState<string | null>(null)

	const itemsPerPage = 10

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

	// Fetch tasks and extract notes on component mount
	useEffect(() => {
		const fetchTasksAndNotes = async () => {
			try {
				setLoading(true)
				setError(null)
				const tasksData = await getTasks()
				setTasks(tasksData)

				// Flatten notes from all tasks and associate with task info
				const allNotes: NoteWithTask[] = []
				tasksData.forEach((task) => {
					if (task.notes) {
						task.notes.forEach((note) => {
							allNotes.push({
								...note,
								taskTitle: task.title,
								taskCompleted: task.isCompleted,
							})
						})
					}
				})

				// Sort notes by creation date (newest first)
				allNotes.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				)
				setNotes(allNotes)
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to fetch notes'
				setError(errorMessage)
			} finally {
				setLoading(false)
			}
		}

		fetchTasksAndNotes()
	}, [])

	// Comprehensive SignalR event listeners for real-time updates and cross-page notifications
	useEffect(() => {
		// Subscribe to note events
		const unsubscribeNoteAdded = signalRService.onNoteAdded((newNote) => {
			// Find the task to get its title and completion status
			const task = tasks.find((t) => t.id === newNote.taskId)
			if (task) {
				const noteWithTask: NoteWithTask = {
					...newNote,
					taskTitle: task.title,
					taskCompleted: task.isCompleted,
				}
				setNotes((prev) => [noteWithTask, ...prev])
				showUpdateNotification(
					'note',
					`New note added to "${task.title}"`,
					'info'
				)
			}
		})

		const unsubscribeNoteUpdated = signalRService.onNoteUpdated(
			(updatedNote) => {
				// Find the task title for better notification
				const currentNote = notes.find((note) => note.id === updatedNote.id)
				setNotes((prev) =>
					prev.map((note) =>
						note.id === updatedNote.id
							? { ...note, content: updatedNote.content }
							: note
					)
				)
				if (currentNote) {
					showUpdateNotification(
						'note',
						`Note updated in "${currentNote.taskTitle}"`,
						'info'
					)
				} else {
					showUpdateNotification('note', 'A note was updated', 'info')
				}
			}
		)

		const unsubscribeNoteDeleted = signalRService.onNoteDeleted((data) => {
			// Find the note before deleting to show task title in notification
			const deletedNote = notes.find((note) => note.id === data.id)
			setNotes((prev) => prev.filter((note) => note.id !== data.id))
			if (deletedNote) {
				showUpdateNotification(
					'note',
					`Note deleted from "${deletedNote.taskTitle}"`,
					'warning'
				)
			} else {
				showUpdateNotification('note', 'A note was deleted', 'warning')
			}
		})

		// Subscribe to task events for cross-page awareness
		const unsubscribeTaskCreated = signalRService.onTaskCreated((newTask) => {
			const taskWithNotes = { ...newTask, notes: newTask.notes || [] }
			setTasks((prev) => [taskWithNotes, ...prev])
			showUpdateNotification(
				'task',
				`New task created: "${newTask.title}"`,
				'success'
			)
		})

		const unsubscribeTaskUpdated = signalRService.onTaskUpdated(
			(updatedTask) => {
				setNotes((prev) =>
					prev.map((note) =>
						note.taskId === updatedTask.id
							? {
									...note,
									taskTitle: updatedTask.title,
									taskCompleted: updatedTask.isCompleted,
							  }
							: note
					)
				)
				// Update tasks state as well
				setTasks((prev) =>
					prev.map((task) =>
						task.id === updatedTask.id ? { ...task, ...updatedTask } : task
					)
				)
				showUpdateNotification(
					'task',
					`Task updated: "${updatedTask.title}"`,
					'info'
				)
			}
		)

		const unsubscribeTaskDeleted = signalRService.onTaskDeleted((taskId) => {
			// Find the task before deleting to show title in notification
			const deletedTask = tasks.find((task) => task.id === taskId)
			setNotes((prev) => prev.filter((note) => note.taskId !== taskId))
			setTasks((prev) => prev.filter((task) => task.id !== taskId))
			if (deletedTask) {
				showUpdateNotification(
					'task',
					`Task deleted: "${deletedTask.title}" (and its notes)`,
					'warning'
				)
			} else {
				showUpdateNotification('task', 'Task and its notes deleted', 'warning')
			}
		})

		const unsubscribeTaskCompletionChanged =
			signalRService.onTaskCompletionChanged((updatedTask) => {
				// Update task completion status in notes
				setNotes((prev) =>
					prev.map((note) =>
						note.taskId === updatedTask.id
							? { ...note, taskCompleted: updatedTask.isCompleted }
							: note
					)
				)
				// Update tasks state as well
				setTasks((prev) =>
					prev.map((task) =>
						task.id === updatedTask.id ? { ...task, ...updatedTask } : task
					)
				)
				const status = updatedTask.isCompleted ? 'completed' : 'reopened'
				const emoji = updatedTask.isCompleted ? '✅' : '🔄'
				showUpdateNotification(
					'task',
					`${emoji} Task ${status}: "${updatedTask.title}"`,
					'info'
				)
			})

		// Subscribe to activity events for broader awareness
		const unsubscribeActivityUpdate = signalRService.onActivityUpdate(
			(activity) => {
				// Show general activity notifications for broader context awareness
				showUpdateNotification(
					'activity',
					`🔔 Recent activity: ${activity.description}`,
					'info'
				)
			}
		)

		// Cleanup event listeners
		return () => {
			unsubscribeNoteAdded()
			unsubscribeNoteUpdated()
			unsubscribeNoteDeleted()
			unsubscribeTaskCreated()
			unsubscribeTaskUpdated()
			unsubscribeTaskDeleted()
			unsubscribeTaskCompletionChanged()
			unsubscribeActivityUpdate()
		}
	}, [tasks, notes, showToast])

	// Filter and paginate notes
	const filteredNotes = useMemo(() => {
		if (!searchQuery.trim()) return notes

		const query = searchQuery.toLowerCase()
		return notes.filter(
			(note) =>
				note.content.toLowerCase().includes(query) ||
				note.taskTitle.toLowerCase().includes(query)
		)
	}, [notes, searchQuery])

	const paginatedNotes = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage
		return filteredNotes.slice(startIndex, startIndex + itemsPerPage)
	}, [filteredNotes, currentPage])

	const totalPages = Math.ceil(filteredNotes.length / itemsPerPage)

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
		setEditingNote(null)
		setNoteDialogData({
			content: '',
			taskId: tasks.length > 0 ? tasks[0].id : '',
		})
		setNoteDialogOpen(true)
	}

	const openEditDialog = (note: NoteWithTask) => {
		setEditingNote(note)
		setNoteDialogData({ content: note.content, taskId: note.taskId })
		setNoteDialogOpen(true)
	}

	const closeDialog = () => {
		setNoteDialogOpen(false)
		setEditingNote(null)
		setNoteDialogData({ content: '', taskId: '' })
	}

	// CRUD operations
	const handleCreateNote = async () => {
		if (!noteDialogData.content.trim() || !noteDialogData.taskId) return

		try {
			setActionLoading('create')
			const createRequest: CreateNoteRequest = {
				taskId: noteDialogData.taskId,
				content: noteDialogData.content.trim(),
			}

			await createNote(createRequest)
			// Note: Don't manually add to notes/tasks arrays - SignalR will handle real-time updates

			closeDialog()
			showToast('Note created successfully!', 'success')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to create note'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	const handleUpdateNote = async () => {
		if (!editingNote || !noteDialogData.content.trim()) return

		try {
			setActionLoading('update')
			const updateRequest: UpdateNoteRequest = {
				content: noteDialogData.content.trim(),
			}

			await updateNote(editingNote.id, updateRequest)
			// Note: Don't manually update notes/tasks arrays - SignalR will handle real-time updates

			closeDialog()
			showToast('Note updated successfully!', 'success')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to update note'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	const handleDeleteNote = async (noteId: string) => {
		try {
			setActionLoading(`delete-${noteId}`)
			await deleteNote(noteId)
			// Note: Don't manually remove from notes/tasks arrays - SignalR will handle real-time updates

			handleCloseMenu(noteId)
			showToast('Note deleted successfully!', 'success')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to delete note'
			setError(errorMessage)
			showToast(errorMessage, 'error')
		} finally {
			setActionLoading(null)
		}
	}

	// Menu handlers
	const handleOpenMenu = (
		event: React.MouseEvent<HTMLElement>,
		noteId: string
	) => {
		setMenuAnchor((prev) => ({ ...prev, [noteId]: event.currentTarget }))
	}

	const handleCloseMenu = (noteId: string) => {
		setMenuAnchor((prev) => ({ ...prev, [noteId]: null }))
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

	// Get available tasks for note creation/editing
	const availableTasks = useMemo(() => {
		return tasks.filter((task) => !task.isCompleted) // Only allow notes on incomplete tasks
	}, [tasks])

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
							height={180}
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
						<NoteIcon
							sx={{
								fontSize: { xs: '2rem', sm: '2.2rem', md: '2.5rem' },
								color: '#667eea',
							}}
						/>
						Notes
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
					Manage notes and annotations for your tasks
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
					placeholder='Search notes by content or task title...'
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
						{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}{' '}
						found
					</Typography>
					<Fab
						color='primary'
						onClick={openCreateDialog}
						disabled={availableTasks.length === 0}
						sx={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							'&:hover': {
								background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
							},
							'&.Mui-disabled': {
								background: '#ccc',
							},
						}}>
						<AddIcon />
					</Fab>
				</Box>
			</Box>

			{/* Notes Grid */}
			{paginatedNotes.length === 0 ? (
				<Box
					sx={{
						textAlign: 'center',
						py: 8,
						color: 'text.secondary',
					}}>
					<NoteIcon sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
					<Typography variant='h6' gutterBottom>
						{searchQuery ? 'No notes match your search' : 'No notes yet'}
					</Typography>
					<Typography variant='body1' sx={{ mb: 2 }}>
						{searchQuery
							? 'Try adjusting your search terms'
							: 'Create your first note to get started'}
					</Typography>
					{!searchQuery && availableTasks.length === 0 && (
						<Typography variant='body2' color='text.secondary'>
							You need to create some tasks first before adding notes
						</Typography>
					)}
					{!searchQuery && availableTasks.length > 0 && (
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
							Create Note
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
						{paginatedNotes.map((note) => (
							<Card
								key={note.id}
								sx={{
									height: 'fit-content',
									transition: 'all 0.3s ease',
									border: '1px solid #e1e8ed',
									'&:hover': {
										transform: 'translateY(-4px)',
										boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
									},
								}}>
								<CardContent sx={{ pb: 1 }}>
									{/* Note Header */}
									<Box
										sx={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'flex-start',
											mb: 2,
										}}>
										<Box sx={{ flex: 1, mr: 1 }}>
											<Box
												sx={{
													display: 'flex',
													alignItems: 'center',
													gap: 1,
													mb: 1,
												}}>
												<TaskIcon
													sx={{ fontSize: 16, color: 'text.secondary' }}
												/>
												<Typography
													variant='subtitle2'
													sx={{
														fontWeight: 600,
														color: note.taskCompleted
															? 'text.secondary'
															: 'primary.main',
														textDecoration: note.taskCompleted
															? 'line-through'
															: 'none',
													}}>
													{note.taskTitle}
												</Typography>
												{note.taskCompleted ? (
													<CompleteIcon
														sx={{ fontSize: 16, color: 'success.main' }}
													/>
												) : (
													<IncompleteIcon
														sx={{ fontSize: 16, color: 'warning.main' }}
													/>
												)}
											</Box>
										</Box>
										<IconButton
											size='small'
											onClick={(e) => handleOpenMenu(e, note.id)}
											disabled={actionLoading !== null}>
											<MoreVertIcon fontSize='small' />
										</IconButton>
									</Box>

									{/* Note Content */}
									<Typography
										variant='body1'
										sx={{
											mb: 2,
											lineHeight: 1.6,
											color: 'text.primary',
											whiteSpace: 'pre-wrap',
											wordBreak: 'break-word',
										}}>
										{note.content}
									</Typography>

									{/* Note Metadata */}
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
										<DateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
										<Typography variant='caption' color='text.secondary'>
											{formatDate(note.createdAt)}
										</Typography>
									</Box>
								</CardContent>

								<CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
									<Button
										startIcon={<EditIcon />}
										onClick={() => openEditDialog(note)}
										disabled={actionLoading !== null}
										variant='outlined'
										size='small'>
										Edit
									</Button>
								</CardActions>

								{/* Note Menu */}
								<Menu
									anchorEl={menuAnchor[note.id]}
									open={Boolean(menuAnchor[note.id])}
									onClose={() => handleCloseMenu(note.id)}
									transformOrigin={{ horizontal: 'right', vertical: 'top' }}
									anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
									<MenuItem
										onClick={() => {
											openEditDialog(note)
											handleCloseMenu(note.id)
										}}>
										<ListItemIcon>
											<EditIcon fontSize='small' />
										</ListItemIcon>
										<ListItemText>Edit Note</ListItemText>
									</MenuItem>
									<Divider />
									<MenuItem
										onClick={() => handleDeleteNote(note.id)}
										disabled={actionLoading === `delete-${note.id}`}
										sx={{ color: 'error.main' }}>
										<ListItemIcon>
											<DeleteIcon
												fontSize='small'
												sx={{ color: 'error.main' }}
											/>
										</ListItemIcon>
										<ListItemText>Delete Note</ListItemText>
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

			{/* Note Dialog */}
			<Dialog
				open={noteDialogOpen}
				onClose={closeDialog}
				maxWidth='md'
				fullWidth
				PaperProps={{
					sx: {
						borderRadius: 3,
						minHeight: 300,
						minWidth: { xs: '90vw', sm: 500 },
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
						{editingNote ? 'Edit Note' : 'Create New Note'}
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
					{!editingNote && (
						<FormControl fullWidth sx={{ mb: 3 }}>
							<InputLabel>Select Task</InputLabel>
							<Select
								value={noteDialogData.taskId}
								label='Select Task'
								onChange={(e) =>
									setNoteDialogData((prev) => ({
										...prev,
										taskId: e.target.value,
									}))
								}>
								{availableTasks.map((task) => (
									<MenuItem key={task.id} value={task.id}>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<TaskIcon sx={{ fontSize: 16 }} />
											{task.title}
										</Box>
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					<TextField
						autoFocus={!!editingNote}
						label='Note Content'
						fullWidth
						variant='outlined'
						multiline
						rows={6}
						value={noteDialogData.content}
						onChange={(e) =>
							setNoteDialogData((prev) => ({
								...prev,
								content: e.target.value,
							}))
						}
						placeholder='Enter your note content here...'
						required
						sx={{ mt: 1 }}
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
						onClick={editingNote ? handleUpdateNote : handleCreateNote}
						variant='contained'
						disabled={
							!noteDialogData.content.trim() ||
							(!editingNote && !noteDialogData.taskId) ||
							actionLoading !== null
						}
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
							: editingNote
							? 'UPDATE NOTE'
							: 'CREATE NOTE'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

export default Notes
