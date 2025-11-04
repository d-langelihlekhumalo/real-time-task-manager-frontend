// src/services/api.ts

import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type {
	Task,
	Note,
	CreateTaskRequest,
	UpdateTaskRequest,
	CreateNoteRequest,
	UpdateNoteRequest,
	Activity,
	DashboardResponse,
} from '../types'
import { errorTracker } from '../utils/errorTracking'

// Rate limiting helper
class RateLimiter {
	private requests: number[] = []
	private readonly maxRequests = 10
	private readonly timeWindow = 60000 // 1 minute

	canMakeRequest(): boolean {
		const now = Date.now()
		this.requests = this.requests.filter((time) => now - time < this.timeWindow)

		if (this.requests.length >= this.maxRequests) {
			return false
		}

		this.requests.push(now)
		return true
	}
}

const rateLimiter = new RateLimiter()

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
	baseURL: '/api', // Use proxy path instead of direct URL
	timeout: 30000, // Increased timeout for production
	headers: {
		'Content-Type': 'application/json',
	},
})

// Request interceptor for rate limiting
apiClient.interceptors.request.use(
	(config) => {
		if (!rateLimiter.canMakeRequest()) {
			throw new Error('Rate limit exceeded. Please try again later.')
		}
		return config
	},
	(error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
	(response: AxiosResponse) => response,
	(error) => {
		// Log error for monitoring
		errorTracker.logError(error, {
			url: error.config?.url,
			method: error.config?.method,
			status: error.response?.status,
		})

		if (error.response) {
			// Server responded with error status
			const message =
				error.response.data?.message ||
				error.response.statusText ||
				'Server error'
			throw new Error(`API Error (${error.response.status}): ${message}`)
		} else if (error.request) {
			// Request was made but no response received
			throw new Error('Network error: Unable to reach the server')
		} else {
			// Something happened in setting up the request
			throw new Error(`Request error: ${error.message}`)
		}
	}
)

// Generic API response handler - API now returns data directly
const handleApiResponse = <T>(response: AxiosResponse<T>): T => {
	return response.data
}

// =============================================================================
// TASK API FUNCTIONS
// =============================================================================

/**
 * Get all tasks
 */
export const getTasks = async (): Promise<Task[]> => {
	const response = await apiClient.get<Task[]>('/Task')
	return handleApiResponse(response)
}

/**
 * Get a specific task by ID
 */
export const getTask = async (id: string): Promise<Task> => {
	const response = await apiClient.get<Task>(`/Task/${id}`)
	return handleApiResponse(response)
}

/**
 * Create a new task
 */
export const createTask = async (task: CreateTaskRequest): Promise<Task> => {
	const response = await apiClient.post<Task>('/Task', task)
	return handleApiResponse(response)
}

/**
 * Update an existing task
 */
export const updateTask = async (
	id: string,
	task: UpdateTaskRequest
): Promise<Task> => {
	const response = await apiClient.put<Task>(`/Task/${id}`, task)
	return handleApiResponse(response)
}

/**
 * Toggle task completion status
 */
export const toggleTaskCompletion = async (id: string): Promise<boolean> => {
	const response = await apiClient.patch<boolean>(
		`/Task/${id}/toggle-completion`
	)
	return handleApiResponse(response)
}

/**
 * Delete a task
 */
export const deleteTask = async (id: string): Promise<boolean> => {
	const response = await apiClient.delete<boolean>(`/Task/${id}`)
	return handleApiResponse(response)
}

// =============================================================================
// NOTE API FUNCTIONS
// =============================================================================

/**
 * Get notes for a specific task
 */
export const getNotesByTask = async (taskId: string): Promise<Note[]> => {
	const response = await apiClient.get<Note[]>(`/Note/task/${taskId}`)
	return handleApiResponse(response)
}

/**
 * Get a specific note by ID
 */
export const getNote = async (id: string): Promise<Note> => {
	const response = await apiClient.get<Note>(`/Note/${id}`)
	return handleApiResponse(response)
}

/**
 * Create a new note
 */
export const createNote = async (note: CreateNoteRequest): Promise<Note> => {
	const response = await apiClient.post<Note>('/Note', note)
	return handleApiResponse(response)
}

/**
 * Update an existing note
 */
export const updateNote = async (
	id: string,
	note: UpdateNoteRequest
): Promise<Note> => {
	const response = await apiClient.put<Note>(`/Note/${id}`, note)
	return handleApiResponse(response)
}

/**
 * Delete a note
 */
export const deleteNote = async (id: string): Promise<boolean> => {
	const response = await apiClient.delete<boolean>(`/Note/${id}`)
	return handleApiResponse(response)
}

// =============================================================================
// DASHBOARD API FUNCTIONS
// =============================================================================

/**
 * Get dashboard statistics and data
 */
export const getDashboard = async (): Promise<DashboardResponse> => {
	const response = await apiClient.get<DashboardResponse>('/Dashboard')
	return handleApiResponse(response)
}

/**
 * Get recent activities
 */
export const getActivities = async (
	count: number = 20
): Promise<Activity[]> => {
	const response = await apiClient.get<Activity[]>(`/Dashboard/${count}`)
	return handleApiResponse(response)
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get API base URL for debugging/info
 */
export const getApiBaseUrl = (): string => {
	return apiClient.defaults.baseURL || ''
}

// Export the configured axios instance for direct use if needed
export { apiClient }
