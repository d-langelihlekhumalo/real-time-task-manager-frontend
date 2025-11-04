// src/utils/performance.ts

interface PerformanceMetric {
	name: string
	value: number
	timestamp: number
	url: string
}

class PerformanceMonitor {
	private isEnabled: boolean
	private metrics: PerformanceMetric[] = []

	constructor() {
		this.isEnabled =
			import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true'

		if (this.isEnabled) {
			this.setupPerformanceObserver()
		}
	}

	private setupPerformanceObserver(): void {
		// Web Vitals monitoring
		if ('PerformanceObserver' in window) {
			const observer = new PerformanceObserver((list) => {
				list.getEntries().forEach((entry) => {
					this.recordMetric(entry.name, entry.duration || 0)
				})
			})

			try {
				observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] })
			} catch (e) {
				console.warn('Performance Observer not fully supported')
			}
		}
	}

	recordMetric(name: string, value: number): void {
		if (!this.isEnabled) return

		const metric: PerformanceMetric = {
			name,
			value,
			timestamp: Date.now(),
			url: window.location.href,
		}

		this.metrics.push(metric)

		// Keep only last 100 metrics
		if (this.metrics.length > 100) {
			this.metrics.shift()
		}

		// Send to analytics in production
		if (import.meta.env.PROD) {
			this.sendMetric(metric)
		}
	}

	private async sendMetric(metric: PerformanceMetric): Promise<void> {
		// Replace with your analytics endpoint
		const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT

		if (!endpoint) return

		try {
			await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'performance',
					data: metric,
					app: 'task-manager-frontend',
				}),
			})
		} catch (error) {
			// Silently fail
		}
	}

	measureUserTiming(name: string, startMark?: string, endMark?: string): void {
		if (!this.isEnabled) return

		try {
			if (startMark && endMark) {
				performance.measure(name, startMark, endMark)
			} else {
				performance.mark(name)
			}
		} catch (error) {
			console.warn('Performance measurement failed:', error)
		}
	}

	getMetrics(): PerformanceMetric[] {
		return [...this.metrics]
	}

	// Core Web Vitals
	measurePageLoad(): void {
		if (!this.isEnabled) return

		window.addEventListener('load', () => {
			setTimeout(() => {
				const navigation = performance.getEntriesByType(
					'navigation'
				)[0] as PerformanceNavigationTiming

				if (navigation) {
					this.recordMetric(
						'page-load-time',
						navigation.loadEventEnd - navigation.fetchStart
					)
					this.recordMetric(
						'dom-content-loaded',
						navigation.domContentLoadedEventEnd - navigation.fetchStart
					)
					this.recordMetric(
						'first-byte',
						navigation.responseStart - navigation.fetchStart
					)
				}
			}, 0)
		})
	}
}

export const performanceMonitor = new PerformanceMonitor()
export default performanceMonitor
