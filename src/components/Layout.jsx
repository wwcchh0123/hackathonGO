import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: '聊天', icon: <ChatIcon />, path: '/' },
    { text: '设置', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#1e1e1e', borderRight: '1px solid #333' }}>
      <Toolbar sx={{ borderBottom: '1px solid #333' }}>
        <Typography variant="h6" noWrap component="div" sx={{ color: '#e07b39', fontWeight: 600 }}>
          九点半
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'rgba(224, 123, 57, 0.15)',
                  borderRight: '2px solid #e07b39',
                  '&:hover': {
                    bgcolor: 'rgba(224, 123, 57, 0.25)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? '#e07b39' : '#999' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar
          sx={{
            display: { sm: 'none' },
            borderBottom: '1px solid #333',
            bgcolor: '#1e1e1e',
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ color: '#e07b39' }}>
            九点半
          </Typography>
        </Toolbar>
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
