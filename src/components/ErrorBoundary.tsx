// src/components/ErrorBoundary.tsx

import { Component } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Button, Alert, Container } from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'

interface ErrorBoundaryState {
	hasError: boolean
	error: Error | null
}

interface ErrorBoundaryProps {
	children: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = {
			hasError: false,
			error: null,
		}
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			error,
		}
	}

	componentDidCatch() {
		// Error caught - handle silently in production
	}

	handleReload = () => {
		this.setState({
			hasError: false,
			error: null,
		})
		window.location.reload()
	}

	render() {
		if (this.state.hasError) {
			return (
				<Container maxWidth='sm' sx={{ py: 8 }}>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							textAlign: 'center',
							gap: 3,
						}}>
						<Alert
							severity='error'
							sx={{
								width: '100%',
								borderRadius: 3,
								'& .MuiAlert-message': {
									width: '100%',
								},
							}}>
							<Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
								Something Went Wrong
							</Typography>
							<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
								The application encountered an unexpected error. Please try
								refreshing the page.
							</Typography>
							{import.meta.env.DEV && this.state.error && (
								<Typography
									variant='caption'
									sx={{
										fontFamily: 'monospace',
										display: 'block',
										mt: 2,
										p: 2,
										bgcolor: 'rgba(0,0,0,0.1)',
										borderRadius: 1,
									}}>
									{this.state.error.message}
								</Typography>
							)}
						</Alert>

						<Button
							variant='contained'
							startIcon={<RefreshIcon />}
							onClick={this.handleReload}
							size='large'
							sx={{
								background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
								'&:hover': {
									background:
										'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
								},
								px: 4,
							}}>
							Reload Application
						</Button>
					</Box>
				</Container>
			)
		}

		return this.props.children
	}
}

export default ErrorBoundary
