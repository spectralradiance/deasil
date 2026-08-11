'use client'

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
import ListItemIcon from '@mui/material/ListItemIcon';
import MuiMenu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Slide from '@mui/material/Slide';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import MenuIcon from '@mui/icons-material/Menu';
import TocIcon from '@mui/icons-material/Toc';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import PrintIcon from '@mui/icons-material/Print';
import SolSvg from './SolSvg';
import ShellSvg from './ShellSvg';
import Link from 'next/link';
import { TocContext } from './TocContext';

export default function AppBar() {
  const [logo, setLogo] = React.useState('shell');
  const [shareAnchor, setShareAnchor] = React.useState<null | HTMLElement>(null);
  const [navAnchor, setNavAnchor] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode, setMode } = useContext(ThemeModeContext);
  const { hasToc, setTocOpen } = useContext(TocContext);
  const trigger = useScrollTrigger();

  const handleThemeToggle = () => setMode(mode === 'light' ? 'dark' : 'light');
  const handleLogoToggle = () => setLogo(logo === 'sol' ? 'shell' : 'sol');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareAnchor(null);
  };

  const handleEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(document.title)}&body=${encodeURIComponent(window.location.href)}`;
    setShareAnchor(null);
  };

  const handlePrint = () => {
    window.print();
    setShareAnchor(null);
  };

  const menuOptions = [
    { label: 'writing',      href: '/writing'  },
    { label: 'photography',  href: '/photos'   },
    { label: 'programs',     href: '/programs' },
    { label: 'about',        href: '/about'    },
  ];

  const noRipple = { '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } };

  return (
    <>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1200 }}>
          <Slide appear={false} direction="down" in={!isMobile || !trigger}>
            <MuiAppBar position={isMobile ? 'fixed' : 'static'} sx={{ backgroundColor: 'background.default', boxShadow: 'none', borderBottom: '1px solid var(--foreground)' }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, fontFamily: 'Baloo 2, cursive', fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' } }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ display: 'flex', alignItems: 'center', marginRight: 8, color: 'var(--foreground)', cursor: 'pointer' }} onClick={handleLogoToggle}>
                    {logo === 'sol' ? <SolSvg style={{ width: 40, height: 40 }} /> : <ShellSvg style={{ width: 40, height: 40 }} />}
                  </span>
                  Deasil
                </Link>
              </Typography>

              {!isMobile && menuOptions.map((item) => (
                <Button key={item.label} component={Link} href={item.href} color="inherit"
                  sx={{ textTransform: 'lowercase', '&:hover': { backgroundColor: 'transparent' } }}
                >
                  {item.label}
                </Button>
              ))}

              {isMobile && hasToc && (
                <IconButton onClick={() => setTocOpen(true)} color="inherit" aria-label="table of contents" sx={noRipple}>
                  <TocIcon />
                </IconButton>
              )}

              <IconButton onClick={handleThemeToggle} color="inherit" aria-label="toggle theme" sx={noRipple}>
                {mode === 'dark' ? <DarkMode /> : <LightMode />}
              </IconButton>

              <IconButton onClick={(e) => setShareAnchor(e.currentTarget)} color="inherit" aria-label="share" sx={noRipple}>
                <ShareIcon />
              </IconButton>

              {isMobile && (
                <IconButton size="large" edge="end" color="inherit" aria-label="menu"
                  onClick={(e) => setNavAnchor(e.currentTarget)} sx={noRipple}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Toolbar>
            </MuiAppBar>
          </Slide>

          <MuiMenu anchorEl={navAnchor} open={Boolean(navAnchor)} onClose={() => setNavAnchor(null)}>
            {menuOptions.map((item) => (
              <MenuItem key={item.label} component={Link} href={item.href} onClick={() => setNavAnchor(null)}
                sx={{ textTransform: 'lowercase' }}
              >
                {item.label}
              </MenuItem>
            ))}
          </MuiMenu>

          <MuiMenu anchorEl={shareAnchor} open={Boolean(shareAnchor)} onClose={() => setShareAnchor(null)}>
            <MenuItem onClick={handleCopyLink}>
              <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
              Copy link
            </MenuItem>
            <MenuItem onClick={handleEmail}>
              <ListItemIcon><EmailIcon fontSize="small" /></ListItemIcon>
              Send email
            </MenuItem>
            <MenuItem onClick={handlePrint}>
              <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
              Print / Save PDF
            </MenuItem>
          </MuiMenu>
        </Box>
      </Box>
      {/* Spacer so content doesn't hide under the fixed AppBar on mobile */}
      {isMobile && <Toolbar />}
    </>
  );
}
