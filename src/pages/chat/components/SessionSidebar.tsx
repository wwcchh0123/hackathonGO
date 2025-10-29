import React from 'react'
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Divider,
  useTheme
} from '@mui/material'
import {
  Close as CloseIcon,
  Add as AddIcon,
  Chat as ChatIcon,
  DeleteOutline as DeleteOutlineIcon
} from '@mui/icons-material'
import { Session } from '../../../types/session'

interface SessionSidebarProps {
  open: boolean
  onClose: () => void
  sessions: Session[]
  activeSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession?: (sessionId: string) => void
}

const SIDEBAR_WIDTH = 280

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession
}) => {
  const theme = useTheme()

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: open ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: 'none',
          bgcolor: '#fafafa'
        },
      }}
    >
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 'none',
          bgcolor: 'white'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            会话历史
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* New Session Button */}
        <Box sx={{ p: 2, bgcolor: 'white' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNewSession}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            新建会话
          </Button>
        </Box>

        <Divider />

        {/* Sessions List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {sessions.length === 0 ? (
            <Box sx={{ 
              p: 3, 
              textAlign: 'center',
              color: 'text.secondary'
            }}>
              <ChatIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">
                暂无会话记录
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {sessions.map((session) => (
                <ListItem key={session.id} disablePadding secondaryAction={
                  onDeleteSession ? (
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSession?.(session.id)
                      }}
                      sx={{
                        color: 'grey.600',
                        '&:hover': { color: 'error.main' }
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  ) : undefined
                }>
                  <ListItemButton
                    onClick={() => onSessionSelect(session.id)}
                    selected={activeSessionId === session.id}
                    sx={{
                      py: 1.5,
                      pl: 2,
                      pr: 1,
                      '&.Mui-selected': {
                        bgcolor: theme.palette.primary.main + '20',
                        borderRight: `3px solid ${theme.palette.primary.main}`,
                        '&:hover': {
                          bgcolor: theme.palette.primary.main + '30',
                        }
                      }
                    }}
                  >
                    <ListItemText
                      primary={truncateTitle(session.title)}
                      secondary={formatDate(new Date(session.updatedAt))}
                      primaryTypographyProps={{
                        fontWeight: activeSessionId === session.id ? 600 : 400,
                        fontSize: '0.9rem',
                        noWrap: true
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.75rem'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
