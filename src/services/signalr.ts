// src/services/signalr.ts

import * as signalR from '@microsoft/signalr'
import type { Task, Note, Activity } from '../types'

class SignalRService {
	private connection: signalR.HubConnection | null = null
	private isConnecting = false
	private reconnectAttempts = 0
	private maxReconnectAttempts = 5

	// Event handlers
	private taskCreatedHandlers: Array<(task: Task) => void> = []
	private taskUpdatedHandlers: Array<(task: Task) => void> = []
	private taskDeletedHandlers: Array<(taskId: string) => void> = []
	private taskCompletionChangedHandlers: Array<
		(task: {
			id: string
			title: string
			isCompleted: boolean
			updatedAt: string
		}) => void
	> = []

	private noteAddedHandlers: Array<(note: Note) => void> = []
	private noteUpdatedHandlers: Array<(note: Note) => void> = []
	private noteDeletedHandlers: Array<
		(data: { id: string; taskId: string }) => void
	> = []

	private activityUpdateHandlers: Array<(activity: Activity) => void> = []

	constructor() {
		this.setupConnection()
	}

	private setupConnection() {
		const hubUrl =
			import.meta.env.VITE_SIGNALR_HUB_URL ||
			'https://localhost:44355/taskManagerHub'

		this.connection = new signalR.HubConnectionBuilder()
			.withUrl(hubUrl, {
				skipNegotiation: true,
				transport: signalR.HttpTransportType.WebSockets,
			})
			.withAutomaticReconnect({
				nextRetryDelayInMilliseconds: (retryContext) => {
					if (retryContext.previousRetryCount < 3) {
						return Math.random() * 2000 + 1000 // 1-3 seconds
					} else {
						return Math.random() * 10000 + 5000 // 5-15 seconds
					}
				},
			})
			.configureLogging(signalR.LogLevel.Information)
			.build()

		this.setupEventHandlers()
	}

	private setupEventHandlers() {
		if (!this.connection) return

		// Task events
		this.connection.on('TaskCreated', (task: Task) => {
			this.taskCreatedHandlers.forEach((handler) => handler(task))
		})

		this.connection.on('TaskUpdated', (task: Task) => {
			this.taskUpdatedHandlers.forEach((handler) => handler(task))
		})

		this.connection.on('TaskDeleted', (data: { taskId: string }) => {
			this.taskDeletedHandlers.forEach((handler) => handler(data.taskId))
		})

		this.connection.on(
			'TaskCompletionChanged',
			(data: {
				id: string
				title: string
				isCompleted: boolean
				updatedAt: string
			}) => {
				this.taskCompletionChangedHandlers.forEach((handler) => handler(data))
			}
		)

		// Note events
		this.connection.on('NoteAdded', (note: Note) => {
			this.noteAddedHandlers.forEach((handler) => handler(note))
		})

		this.connection.on('NoteUpdated', (note: Note) => {
			this.noteUpdatedHandlers.forEach((handler) => handler(note))
		})

		this.connection.on(
			'NoteDeleted',
			(data: { id: string; taskId: string }) => {
				this.noteDeletedHandlers.forEach((handler) => handler(data))
			}
		)

		// Activity events
		this.connection.on('ActivityUpdate', (activity: Activity) => {
			this.activityUpdateHandlers.forEach((handler) => handler(activity))
		})

		// Connection events
		this.connection.onreconnecting(() => {
			// Connection is attempting to reconnect
		})

		this.connection.onreconnected(() => {
			this.reconnectAttempts = 0
		})

		this.connection.onclose((error) => {
			if (error && this.reconnectAttempts < this.maxReconnectAttempts) {
				this.reconnectAttempts++
				setTimeout(() => this.start(), 5000)
			}
		})
	}

	async start(): Promise<void> {
		if (!this.connection || this.isConnecting) return

		try {
			this.isConnecting = true
			await this.connection.start()
			this.reconnectAttempts = 0
		} catch (error) {
			this.reconnectAttempts++
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				setTimeout(() => this.start(), 5000)
			}
		} finally {
			this.isConnecting = false
		}
	}

	async stop(): Promise<void> {
		if (this.connection) {
			await this.connection.stop()
		}
	}

	getConnectionState(): signalR.HubConnectionState {
		return this.connection?.state || signalR.HubConnectionState.Disconnected
	}

	isConnected(): boolean {
		return this.connection?.state === signalR.HubConnectionState.Connected
	}

	// Event subscription methods
	onTaskCreated(handler: (task: Task) => void): () => void {
		this.taskCreatedHandlers.push(handler)
		return () => {
			const index = this.taskCreatedHandlers.indexOf(handler)
			if (index > -1) this.taskCreatedHandlers.splice(index, 1)
		}
	}

	onTaskUpdated(handler: (task: Task) => void): () => void {
		this.taskUpdatedHandlers.push(handler)
		return () => {
			const index = this.taskUpdatedHandlers.indexOf(handler)
			if (index > -1) this.taskUpdatedHandlers.splice(index, 1)
		}
	}

	onTaskDeleted(handler: (taskId: string) => void): () => void {
		this.taskDeletedHandlers.push(handler)
		return () => {
			const index = this.taskDeletedHandlers.indexOf(handler)
			if (index > -1) this.taskDeletedHandlers.splice(index, 1)
		}
	}

	onTaskCompletionChanged(
		handler: (data: {
			id: string
			title: string
			isCompleted: boolean
			updatedAt: string
		}) => void
	): () => void {
		this.taskCompletionChangedHandlers.push(handler)
		return () => {
			const index = this.taskCompletionChangedHandlers.indexOf(handler)
			if (index > -1) this.taskCompletionChangedHandlers.splice(index, 1)
		}
	}

	onNoteAdded(handler: (note: Note) => void): () => void {
		this.noteAddedHandlers.push(handler)
		return () => {
			const index = this.noteAddedHandlers.indexOf(handler)
			if (index > -1) this.noteAddedHandlers.splice(index, 1)
		}
	}

	onNoteUpdated(handler: (note: Note) => void): () => void {
		this.noteUpdatedHandlers.push(handler)
		return () => {
			const index = this.noteUpdatedHandlers.indexOf(handler)
			if (index > -1) this.noteUpdatedHandlers.splice(index, 1)
		}
	}

	onNoteDeleted(
		handler: (data: { id: string; taskId: string }) => void
	): () => void {
		this.noteDeletedHandlers.push(handler)
		return () => {
			const index = this.noteDeletedHandlers.indexOf(handler)
			if (index > -1) this.noteDeletedHandlers.splice(index, 1)
		}
	}

	onActivityUpdate(handler: (activity: Activity) => void): () => void {
		this.activityUpdateHandlers.push(handler)
		return () => {
			const index = this.activityUpdateHandlers.indexOf(handler)
			if (index > -1) this.activityUpdateHandlers.splice(index, 1)
		}
	}
}

// Create singleton instance
const signalRService = new SignalRService()

export default signalRService
