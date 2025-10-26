import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'

interface MessageActionsProps {
  content: string
  isUser: boolean
  onPrefillInput?: (text: string) => void
  sx?: SxProps<Theme>
  children?: React.ReactNode
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  content,
  isUser,
  onPrefillInput,
  sx,
  children,
}) => {
  const actionBarBg = isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)'
  const iconColor = isUser ? 'white' : 'inherit'

  return (
    <Box sx={{ position: 'absolute', left: 8, bottom: 8, display: 'flex', gap: 0.5, bgcolor: actionBarBg, borderRadius: 1, px: 0.5, ...(sx || {}) }}>
      <Tooltip title="复制到剪贴板">
        <IconButton
          size="small"
          onClick={() => { navigator.clipboard?.writeText(content) }}
          sx={{ color: iconColor }}
        >
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>

      <Tooltip title="放到输入框">
        <IconButton
          size="small"
          onClick={() => onPrefillInput?.(content)}
          sx={{ color: iconColor }}
        >
          <EditIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>

      {children}
    </Box>
  )
}

