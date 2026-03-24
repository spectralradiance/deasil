'use client'

// This enables React hooks like useState in this component
import * as React from 'react';
import { useContext } from 'react';
import { ThemeModeContext } from './layout';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MuiAppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import SolSvg from './SolSvg';
import ShellSvg from './ShellSvg';
import Link from 'next/link';

export default function AppBar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [logo, setLogo] = React.useState('shell');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode, setMode } = useContext(ThemeModeContext);

  const handleThemeToggle = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const handleLogoToggle = () => {
    setLogo(logo === 'sol' ? 'shell' : 'sol');
  };

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuOptions = [
    { label: 'writing', href: '/writing' },
    { label: 'photos', href: '/photos' },
    { label: 'programs', href: '/programs' },
  ];
  const list = (
    <Box
      sx={{ width: 250, height: '100%', backgroundColor: '#0000', color: '#fff' }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {menuOptions.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton component={item.href !== '#' ? Link : 'button'} href={item.href !== '#' ? item.href : undefined}>
              <ListItemText primary={item.label} sx={{ textTransform: 'lowercase' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1200 }}>
          <MuiAppBar position="static" sx={{ backgroundColor: 'transparent', boxShadow: 'none', borderBottom: '1px solid var(--foreground)' }}>
            <Toolbar>
                      <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, fontFamily: 'Baloo 2, cursive', fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' } }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                          <span style={{ display: 'flex', alignItems: 'center', marginRight: 8, color: 'var(--foreground)', cursor: 'pointer' }} onClick={handleLogoToggle}>
                            {logo === 'sol' ? <SolSvg style={{ width: 40, height: 40 }} /> : <ShellSvg style={{ width: 40, height: 40 }} />}
                          </span>
                          Deasil
                        </Link>
                      </Typography>
              {!isMobile && (
                <>
                  <Button color="inherit" component={Link} href="/writing">writing</Button>
                  <Button color="inherit" component={Link} href="/photos">photos</Button>
                  <Button color="inherit" component={Link} href="/programs">programs</Button>
                </>
              )}
              <IconButton
                sx={{ ml: 2, transition: 'color 0.3s', '&:hover': { backgroundColor: 'transparent' } }}
                onClick={handleThemeToggle}
                color="inherit"
                aria-label="toggle theme"
              >
                <span style={{ display: 'inline-block', transformOrigin: "12px 12px", paddingTop: '8px', transition: 'transform 0.3s', transform: mode === 'dark' ? 'rotate(0deg)' : 'rotate(0deg)' }}>
                  {mode === 'dark'
                    ? <DarkMode sx={{ color: 'var(--foreground)' }} />
                    : <LightMode sx={{ color: 'var(--foreground)' }} />}
                </span>
              </IconButton>
              {isMobile && (
                <IconButton
                  size="large"
                  edge="end"
                  color="inherit"
                  aria-label="menu"
                  onClick={toggleDrawer(true)}
                  sx={{ ml: 2, '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Toolbar>
          </MuiAppBar>
          {isMobile && (
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={toggleDrawer(false)}
            >
              {list}
            </Drawer>
          )}
        </Box>
      </Box>
    </>
  );
}
