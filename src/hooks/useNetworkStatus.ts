// src/hooks/useNetworkStatus.ts

import { useState, useEffect } from 'react'

interface NetworkStatus {
	isOnline: boolean
	wasOffline: boolean
}

export const useNetworkStatus = (): NetworkStatus => {
	const [isOnline, setIsOnline] = useState(navigator.onLine)
	const [wasOffline, setWasOffline] = useState(false)

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true)
			if (wasOffline) {
				setWasOffline(false)
				// Could trigger a data refresh here
			}
		}

		const handleOffline = () => {
			setIsOnline(false)
			setWasOffline(true)
		}

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [wasOffline])

	return { isOnline, wasOffline }
}
