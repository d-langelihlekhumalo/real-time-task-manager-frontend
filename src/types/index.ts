// src/types/index.ts

export interface Task {
	id: string
	title: string
	description?: string
	isCompleted: boolean
	createdAt: string
	updatedAt: string
	notes?: Note[] // Made optional since backend may not always include notes
}

export interface Note {
	id: string
	taskId: string
	content: string
	createdAt: string
	task?: Task // This might be included if we fetch notes via tasks
}

export interface CreateTaskRequest {
	title: string
	description?: string
}

export interface UpdateTaskRequest {
	title: string
	description?: string
	isCompleted: boolean
}

export interface CreateNoteRequest {
	taskId: string
	content: string
}

export interface UpdateNoteRequest {
	content: string
}

export interface Activity {
	id: string
	action: number // Backend returns numeric action codes
	entityType: number // Backend returns numeric entity type codes
	entityId: string
	entityTitle: string
	description: string
	createdAt: string
	actionDisplayName: string // Backend provides display name
	entityTypeDisplayName: string // Backend provides display name
}

export interface DashboardResponse {
	totalTasks: number
	completedTasks: number
	pendingTasks: number
	totalNotes: number
	recentActivities: Activity[]
	completionRate: number
	notesPerTask: number
}
