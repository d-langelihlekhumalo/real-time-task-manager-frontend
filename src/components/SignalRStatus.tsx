// src/components/SignalRStatus.tsx

import { Chip, Tooltip } from '@mui/material'
import { HubConnectionState } from '@microsoft/signalr'
import {
	Wifi as ConnectedIcon,
	WifiOff as DisconnectedIcon,
	Sync as ConnectingIcon,
} from '@mui/icons-material'
import { useSignalR } from '../contexts/SignalRContext'

const SignalRStatus: React.FC = () => {
	const { connectionState } = useSignalR()

	const getStatusInfo = () => {
		switch (connectionState) {
			case HubConnectionState.Connected:
				return {
					label: 'Real-time Connected',
					color: 'success' as const,
					icon: <ConnectedIcon fontSize='small' />,
					tooltip: 'Real-time updates are active',
				}
			case HubConnectionState.Connecting:
			case HubConnectionState.Reconnecting:
				return {
					label: 'Connecting...',
					color: 'warning' as const,
					icon: <ConnectingIcon fontSize='small' />,
					tooltip: 'Establishing real-time connection',
				}
			case HubConnectionState.Disconnected:
			default:
				return {
					label: 'Disconnected',
					color: 'error' as const,
					icon: <DisconnectedIcon fontSize='small' />,
					tooltip: 'Real-time updates are not available',
				}
		}
	}

	const statusInfo = getStatusInfo()

	return (
		<Tooltip title={statusInfo.tooltip}>
			<Chip
				icon={statusInfo.icon}
				label={statusInfo.label}
				color={statusInfo.color}
				size='small'
				variant='outlined'
				sx={{
					fontSize: '0.75rem',
					height: 24,
					'& .MuiChip-icon': {
						fontSize: '16px',
					},
				}}
			/>
		</Tooltip>
	)
}

export default SignalRStatus
