import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ height: 'calc(100% - 48px)' }}>
      {value === index && <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>{children}</Box>}
    </div>
  );
}

function SettingsPage() {
  const { config, setConfig } = useConfig();
  const [tabValue, setTabValue] = useState(0);
  const [modelDialog, setModelDialog] = useState({ open: false, model: null, index: -1 });
  const [mcpDialog, setMcpDialog] = useState({ open: false, service: null, index: -1 });

  const handleSystemPromptChange = (e) => {
    setConfig({ ...config, systemPrompt: e.target.value });
  };

  const handleAddModel = () => {
    setModelDialog({ open: true, model: { name: '', apiKey: '', endpoint: '' }, index: -1 });
  };

  const handleEditModel = (model, index) => {
    setModelDialog({ open: true, model: { ...model }, index });
  };

  const handleDeleteModel = (index) => {
    const newModels = config.llmModels.filter((_, i) => i !== index);
    setConfig({ ...config, llmModels: newModels });
  };

  const handleSaveModel = () => {
    const newModels = [...config.llmModels];
    if (modelDialog.index === -1) {
      newModels.push(modelDialog.model);
    } else {
      newModels[modelDialog.index] = modelDialog.model;
    }
    setConfig({ ...config, llmModels: newModels });
    setModelDialog({ open: false, model: null, index: -1 });
  };

  const handleAddMCP = () => {
    setMcpDialog({ open: true, service: { name: '', endpoint: '', config: '' }, index: -1 });
  };

  const handleEditMCP = (service, index) => {
    setMcpDialog({ open: true, service: { ...service }, index });
  };

  const handleDeleteMCP = (index) => {
    const newServices = config.mcpServices.filter((_, i) => i !== index);
    setConfig({ ...config, mcpServices: newServices });
  };

  const handleSaveMCP = () => {
    const newServices = [...config.mcpServices];
    if (mcpDialog.index === -1) {
      newServices.push(mcpDialog.service);
    } else {
      newServices[mcpDialog.index] = mcpDialog.service;
    }
    setConfig({ ...config, mcpServices: newServices });
    setMcpDialog({ open: false, service: null, index: -1 });
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1e1e1e',
      }}
    >
      <Box sx={{ borderBottom: '1px solid #333' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: '#999',
              '&.Mui-selected': {
                color: '#e07b39',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#e07b39',
            },
          }}
        >
          <Tab label="大模型配置" />
          <Tab label="系统提示词" />
          <Tab label="MCP服务" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#ccc' }}>
              大模型列表
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddModel}
              variant="contained"
              sx={{ bgcolor: '#e07b39', '&:hover': { bgcolor: '#c96a2e' } }}
            >
              添加模型
            </Button>
          </Box>
          {config.llmModels.length === 0 ? (
            <Paper sx={{ p: 3, bgcolor: '#252525', textAlign: 'center' }}>
              <Typography sx={{ color: '#666' }}>暂无配置的大模型</Typography>
            </Paper>
          ) : (
            <List sx={{ bgcolor: '#252525', borderRadius: 1 }}>
              {config.llmModels.map((model, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        onClick={() => handleEditModel(model, index)}
                        sx={{ color: '#999', mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteModel(index)}
                        sx={{ color: '#999' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                  sx={{ borderBottom: '1px solid #333' }}
                >
                  <ListItemText
                    primary={model.name}
                    secondary={model.endpoint}
                    primaryTypographyProps={{ color: '#ccc' }}
                    secondaryTypographyProps={{ color: '#666' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ color: '#ccc' }}>
            系统提示词
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={config.systemPrompt}
            onChange={handleSystemPromptChange}
            placeholder="输入系统提示词..."
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#252525',
                '& fieldset': {
                  borderColor: '#333',
                },
                '&:hover fieldset': {
                  borderColor: '#555',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e07b39',
                },
              },
            }}
          />
        </Stack>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#ccc' }}>
              MCP服务列表
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddMCP}
              variant="contained"
              sx={{ bgcolor: '#e07b39', '&:hover': { bgcolor: '#c96a2e' } }}
            >
              添加服务
            </Button>
          </Box>
          {config.mcpServices.length === 0 ? (
            <Paper sx={{ p: 3, bgcolor: '#252525', textAlign: 'center' }}>
              <Typography sx={{ color: '#666' }}>暂无配置的MCP服务</Typography>
            </Paper>
          ) : (
            <List sx={{ bgcolor: '#252525', borderRadius: 1 }}>
              {config.mcpServices.map((service, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        onClick={() => handleEditMCP(service, index)}
                        sx={{ color: '#999', mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteMCP(index)}
                        sx={{ color: '#999' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                  sx={{ borderBottom: '1px solid #333' }}
                >
                  <ListItemText
                    primary={service.name}
                    secondary={service.endpoint}
                    primaryTypographyProps={{ color: '#ccc' }}
                    secondaryTypographyProps={{ color: '#666' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </TabPanel>

      <Dialog
        open={modelDialog.open}
        onClose={() => setModelDialog({ open: false, model: null, index: -1 })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#252525' } }}
      >
        <DialogTitle sx={{ color: '#ccc' }}>
          {modelDialog.index === -1 ? '添加大模型' : '编辑大模型'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="模型名称"
              value={modelDialog.model?.name || ''}
              onChange={(e) =>
                setModelDialog({
                  ...modelDialog,
                  model: { ...modelDialog.model, name: e.target.value },
                })
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1e1e1e',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#e07b39' },
                },
              }}
            />
            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={modelDialog.model?.apiKey || ''}
              onChange={(e) =>
                setModelDialog({
                  ...modelDialog,
                  model: { ...modelDialog.model, apiKey: e.target.value },
                })
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1e1e1e',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#e07b39' },
                },
              }}
            />
            <TextField
              fullWidth
              label="API Endpoint"
              value={modelDialog.model?.endpoint || ''}
              onChange={(e) =>
                setModelDialog({
                  ...modelDialog,
                  model: { ...modelDialog.model, endpoint: e.target.value },
                })
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1e1e1e',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#e07b39' },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setModelDialog({ open: false, model: null, index: -1 })}
            sx={{ color: '#999' }}
          >
            取消
          </Button>
          <Button
            onClick={handleSaveModel}
            variant="contained"
            sx={{ bgcolor: '#e07b39', '&:hover': { bgcolor: '#c96a2e' } }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={mcpDialog.open}
        onClose={() => setMcpDialog({ open: false, service: null, index: -1 })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#252525' } }}
      >
        <DialogTitle sx={{ color: '#ccc' }}>
          {mcpDialog.index === -1 ? '添加MCP服务' : '编辑MCP服务'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="服务名称"
              value={mcpDialog.service?.name || ''}
              onChange={(e) =>
                setMcpDialog({
                  ...mcpDialog,
                  service: { ...mcpDialog.service, name: e.target.value },
                })
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1e1e1e',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#e07b39' },
                },
              }}
            />
            <TextField
              fullWidth
              label="服务端点"
              value={mcpDialog.service?.endpoint || ''}
              onChange={(e) =>
                setMcpDialog({
                  ...mcpDialog,
                  service: { ...mcpDialog.service, endpoint: e.target.value },
                })
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1e1e1e',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#e07b39' },
                },
              }}
            />
            <TextField
              fullWidth
              label="配置 (JSON)"
              multiline
              rows={4}
              value={mcpDialog.service?.config || ''}
              onChange={(e) =>
                setMcpDialog({
                  ...mcpDialog,
                  service: { ...mcpDialog.service, config: e.target.value },
                })
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1e1e1e',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#e07b39' },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setMcpDialog({ open: false, service: null, index: -1 })}
            sx={{ color: '#999' }}
          >
            取消
          </Button>
          <Button
            onClick={handleSaveMCP}
            variant="contained"
            sx={{ bgcolor: '#e07b39', '&:hover': { bgcolor: '#c96a2e' } }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SettingsPage;
