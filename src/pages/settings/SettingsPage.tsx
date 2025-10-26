import React from "react"
import {
  Box,
  Container,
  Typography,
  Stack,
  TextField,
  Button,
  Paper,
  Divider,
  IconButton,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  FolderOpen as FolderOpenIcon,
} from "@mui/icons-material"

interface SettingsPageProps {
  command: string
  setCommand: (value: string) => void
  baseArgs: string[]
  setBaseArgs: (value: string[]) => void
  cwd: string
  setCwd: (value: string) => void
  envText: string
  setEnvText: (value: string) => void
  onPickCwd: () => void
  onBack: () => void
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  command,
  setCommand,
  baseArgs,
  setBaseArgs,
  cwd,
  setCwd,
  envText,
  setEnvText,
  onPickCwd,
  onBack,
}) => {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: "white",
          borderBottom: "1px solid",
          borderColor: "grey.200",
          py: 2,
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={onBack} sx={{ color: "#CC785C" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1a1a1a" }}>
              Settings
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* CLI Configuration */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, color: "#1a1a1a" }}
            >
              CLI Configuration
            </Typography>
            <Stack spacing={3}>
              <TextField
                label="Command"
                placeholder="claude"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": { borderColor: "#CC785C" },
                    "&.Mui-focused fieldset": { borderColor: "#CC785C" },
                  },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#CC785C" },
                }}
              />
              <TextField
                label="Base Arguments"
                placeholder="-p --dangerously-skip-permissions"
                value={baseArgs.join(" ")}
                onChange={(e) =>
                  setBaseArgs(
                    e.target.value.trim() ? e.target.value.split(/\s+/) : []
                  )
                }
                fullWidth
                variant="outlined"
                helperText="Arguments applied before your message"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": { borderColor: "#CC785C" },
                    "&.Mui-focused fieldset": { borderColor: "#CC785C" },
                  },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#CC785C" },
                }}
              />
            </Stack>
          </Paper>

          {/* Environment */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, color: "#1a1a1a" }}
            >
              Environment
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: "grey.700" }}>
                  Working Directory
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    placeholder="Optional working directory"
                    value={cwd}
                    onChange={(e) => setCwd(e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&:hover fieldset": { borderColor: "#CC785C" },
                        "&.Mui-focused fieldset": { borderColor: "#CC785C" },
                      },
                    }}
                  />
                  <Button
                    onClick={onPickCwd}
                    variant="outlined"
                    startIcon={<FolderOpenIcon />}
                    sx={{
                      borderColor: "#CC785C",
                      color: "#CC785C",
                      "&:hover": {
                        borderColor: "#B5694A",
                        bgcolor: "#CC785C0A",
                      },
                    }}
                  >
                    Browse
                  </Button>
                </Stack>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: "grey.700" }}>
                  Environment Variables
                </Typography>
                <TextField
                  placeholder="KEY=VALUE (one per line)"
                  value={envText}
                  onChange={(e) => setEnvText(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": { borderColor: "#CC785C" },
                      "&.Mui-focused fieldset": { borderColor: "#CC785C" },
                    },
                  }}
                />
              </Box>
            </Stack>
          </Paper>

          {/* About */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, color: "#1a1a1a" }}
            >
              About
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.700" }}>
                  XGopilot for Desktop
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  Electron wrapper for XGopilot
                </Typography>
              </Box>
              <Divider />
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                Built with React, TypeScript, and Material-UI
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
