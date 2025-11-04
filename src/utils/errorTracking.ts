// src/utils/errorTracking.ts

interface ErrorReport {
	message: string
	stack?: string
	url: string
	userAgent: string
	timestamp: string
	userId?: string
	sessionId: string
}

class ErrorTracker {
	private sessionId: string
	private isProduction: boolean

	constructor() {
		this.sessionId = this.generateSessionId()
		this.isProduction = import.meta.env.PROD
	}

	private generateSessionId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	logError(error: Error, context?: Record<string, any>): void {
		const errorReport: ErrorReport = {
			message: error.message,
			stack: error.stack,
			url: window.location.href,
			userAgent: navigator.userAgent,
			timestamp: new Date().toISOString(),
			sessionId: this.sessionId,
		}

		// Log to console in development
		if (!this.isProduction) {
			console.error('Error logged:', errorReport, context)
			return
		}

		// In production, send to your logging service
		this.sendErrorReport(errorReport, context)
	}

	private async sendErrorReport(
		errorReport: ErrorReport,
		context?: Record<string, any>
	): Promise<void> {
		try {
			// Replace with your actual error logging endpoint
			const endpoint = import.meta.env.VITE_ERROR_LOGGING_ENDPOINT

			if (!endpoint) {
				console.warn('Error logging endpoint not configured')
				return
			}

			await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					error: errorReport,
					context,
					app: 'task-manager-frontend',
					version: import.meta.env.VITE_APP_VERSION || '1.0.0',
				}),
			})
		} catch (err) {
			// Silently fail - don't cause additional errors
			console.warn('Failed to send error report:', err)
		}
	}

	logUserAction(action: string, data?: Record<string, any>): void {
		if (!this.isProduction) {
			console.log('User action:', action, data)
			return
		}

		// Track user actions for analytics
		// Replace with your analytics service
	}
}

// Global error handler
window.addEventListener('error', (event) => {
	errorTracker.logError(new Error(event.message), {
		filename: event.filename,
		lineno: event.lineno,
		colno: event.colno,
	})
})

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
	errorTracker.logError(new Error(event.reason), {
		type: 'unhandledrejection',
	})
})

export const errorTracker = new ErrorTracker()
export default errorTracker
