// src/contexts/ToastContext.tsx

import React, { createContext, useContext, useState } from 'react'
import { Snackbar, Alert } from '@mui/material'
import type { AlertColor } from '@mui/material'

interface ToastState {
	open: boolean
	message: string
	severity: AlertColor
}

interface ToastContextValue {
	showToast: (message: string, severity?: AlertColor) => void
	hideToast: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = () => {
	const context = useContext(ToastContext)
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider')
	}
	return context
}

interface ToastProviderProps {
	children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
	const [toast, setToast] = useState<ToastState>({
		open: false,
		message: '',
		severity: 'success',
	})

	const showToast = (message: string, severity: AlertColor = 'success') => {
		setToast({
			open: true,
			message,
			severity,
		})
	}

	const hideToast = () => {
		setToast((prev) => ({ ...prev, open: false }))
	}

	return (
		<ToastContext.Provider value={{ showToast, hideToast }}>
			{children}
			<Snackbar
				open={toast.open}
				autoHideDuration={4000}
				onClose={hideToast}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				sx={{
					'& .MuiSnackbarContent-root': {
						minWidth: '300px',
					},
				}}>
				<Alert
					onClose={hideToast}
					severity={toast.severity}
					variant='filled'
					sx={{
						width: '100%',
						fontWeight: 500,
						'& .MuiAlert-action': {
							color: 'inherit',
						},
					}}>
					{toast.message}
				</Alert>
			</Snackbar>
		</ToastContext.Provider>
	)
}
