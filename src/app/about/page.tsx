"use client";

import * as React from 'react';
import { Typography, Box } from '@mui/material';
import SolSvg from '../SolSvg';

export default function AboutPage() {
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1200, px: 2, my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <SolSvg style={{ width: 100, height: 100, color: 'var(--primary)' }} />
        </Box>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          About Deasil
        </Typography>
        <Typography variant="body1" align="center" sx={{ maxWidth: 600, mx: 'auto' }}>
          Deasil is a digital space for exploration and creation. This is a place to share writings, photography, and interactive programs. The name 'Deasil' means to move in a sunwise or clockwise direction, representing a path of positive and natural progression.
        </Typography>
      </Box>
    </Box>
  );
}
