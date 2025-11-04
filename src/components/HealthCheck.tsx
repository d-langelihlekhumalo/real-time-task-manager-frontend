// src/components/HealthCheck.tsx

import { useState, useEffect } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import { apiClient } from '../services/api'
import signalRService from '../services/signalr'

interface HealthStatus {
	api: 'healthy' | 'unhealthy' | 'checking'
	signalr: 'connected' | 'disconnected' | 'connecting'
	lastCheck: Date | null
}

export const HealthCheck = () => {
	const [health, setHealth] = useState<HealthStatus>({
		api: 'checking',
		signalr: 'connecting',
		lastCheck: null,
	})

	const checkApiHealth = async (): Promise<void> => {
		try {
			await apiClient.get('/health')
			setHealth((prev) => ({ ...prev, api: 'healthy', lastCheck: new Date() }))
		} catch {
			setHealth((prev) => ({
				...prev,
				api: 'unhealthy',
				lastCheck: new Date(),
			}))
		}
	}

	const checkSignalRHealth = (): void => {
		const status = signalRService.isConnected() ? 'connected' : 'disconnected'
		setHealth((prev) => ({ ...prev, signalr: status }))
	}

	useEffect(() => {
		// Initial health check
		checkApiHealth()
		checkSignalRHealth()

		// Periodic health checks
		const healthInterval = setInterval(() => {
			checkApiHealth()
			checkSignalRHealth()
		}, 60000) // Check every minute

		return () => clearInterval(healthInterval)
	}, [])

	const isHealthy = health.api === 'healthy' && health.signalr === 'connected'

	if (isHealthy) return null // Don't show anything when healthy

	return (
		<Box
			sx={{
				position: 'fixed',
				top: 10,
				right: 10,
				zIndex: 9999,
				maxWidth: 300,
			}}>
			<Alert severity={health.api === 'unhealthy' ? 'error' : 'warning'}>
				<Typography variant='body2' sx={{ fontWeight: 600 }}>
					Service Status
				</Typography>
				<Typography variant='caption' display='block'>
					API: {health.api}
				</Typography>
				<Typography variant='caption' display='block'>
					Real-time: {health.signalr}
				</Typography>
				{health.lastCheck && (
					<Typography variant='caption' display='block'>
						Last check: {health.lastCheck.toLocaleTimeString()}
					</Typography>
				)}
			</Alert>
		</Box>
	)
}
