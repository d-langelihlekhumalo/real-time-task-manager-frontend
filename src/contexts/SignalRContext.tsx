// src/contexts/SignalRContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import signalRService from '../services/signalr'
import { HubConnectionState } from '@microsoft/signalr'

interface SignalRContextType {
	connectionState: HubConnectionState
	isConnected: boolean
	connect: () => Promise<void>
	disconnect: () => Promise<void>
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined)

interface SignalRProviderProps {
	children: ReactNode
}

export const SignalRProvider: React.FC<SignalRProviderProps> = ({
	children,
}) => {
	const [connectionState, setConnectionState] = useState<HubConnectionState>(
		signalRService.getConnectionState()
	)

	const connect = async () => {
		try {
			await signalRService.start()
			setConnectionState(signalRService.getConnectionState())
		} catch (error) {
			// Connection failed - handle silently in production
		}
	}

	const disconnect = async () => {
		try {
			await signalRService.stop()
			setConnectionState(signalRService.getConnectionState())
		} catch (error) {
			// Disconnection failed - handle silently in production
		}
	}

	useEffect(() => {
		// Auto-connect when the provider mounts
		connect()

		// Update connection state periodically
		const interval = setInterval(() => {
			const currentState = signalRService.getConnectionState()
			if (currentState !== connectionState) {
				setConnectionState(currentState)
			}
		}, 1000)

		return () => {
			clearInterval(interval)
			// Don't disconnect here as we want the connection to persist
		}
	}, [])

	const isConnected = connectionState === HubConnectionState.Connected

	const value: SignalRContextType = {
		connectionState,
		isConnected,
		connect,
		disconnect,
	}

	return (
		<SignalRContext.Provider value={value}>{children}</SignalRContext.Provider>
	)
}

export const useSignalR = (): SignalRContextType => {
	const context = useContext(SignalRContext)
	if (context === undefined) {
		throw new Error('useSignalR must be used within a SignalRProvider')
	}
	return context
}

export default SignalRContext
