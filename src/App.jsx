import { useState } from 'react'
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Stack
} from '@mui/material'
import { 
  Favorite, 
  Menu as MenuIcon,
  Home as HomeIcon 
} from '@mui/icons-material'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Create a custom theme with Baloo 2 font
const theme = createTheme({
  typography: {
    fontFamily: "'Baloo 2', sans-serif",
  },
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
})

function App() {
  const [count, setCount] = useState(0)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <HomeIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Deasil Front
            </Typography>
            <Button color="inherit">Login</Button>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h2" component="h1" gutterBottom>
              Welcome to Deasil Front
            </Typography>
            <Typography variant="h5" color="text.secondary" paragraph>
              A simple web app built with React, Material UI, and Baloo 2 font
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Counter Card */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom>
                    Interactive Counter
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Click the button below to increment the counter
                  </Typography>
                  <Box sx={{ textAlign: 'center', my: 3 }}>
                    <Typography variant="h3" color="primary" gutterBottom>
                      {count}
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={() => setCount((count) => count + 1)}
                    >
                      Increment Counter
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Features Card */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom>
                    Features
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This app demonstrates:
                  </Typography>
                  <Stack direction="column" spacing={1}>
                    <Chip label="React 19" color="primary" variant="outlined" />
                    <Chip label="Material UI" color="secondary" variant="outlined" />
                    <Chip label="Baloo 2 Font" color="success" variant="outlined" />
                    <Chip label="Vite Build Tool" color="info" variant="outlined" />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Additional Card */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Favorite sx={{ color: 'red', mr: 1 }} />
                    <Typography variant="h5" component="h2">
                      About This App
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph>
                    This is the front-end of deasil.org, built with modern web technologies.
                    The Baloo 2 font provides a friendly and rounded aesthetic, while Material UI 
                    ensures a consistent and professional design system.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The app is built with Vite for fast development and optimized production builds.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
