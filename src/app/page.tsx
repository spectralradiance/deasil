"use client";

import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';
import SolSvg from './SolSvg';
import AltarIcon from './programs/AltarIcon';
import SundialIcon from './programs/SundialIcon';

const sections = [
  {
    href: '/photos',
    title: 'Photography',
    description: 'Animals, plants and fungi, and the places they live',
    icon: <PhotoCameraOutlined sx={{ fontSize: 40 }} />,
  },
  { href: '/programs/altar', title: 'Altar', description: 'Tarot, runes, and ogham divination', icon: <AltarIcon /> },
  { href: '/programs/sundial', title: 'Sundial', description: 'Solar, lunar, and yearly clocks', icon: <SundialIcon /> },
];

export default function Home() {
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1200, px: 2, py: { xs: 4, sm: 8 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SolSvg style={{ width: 96, height: 96, color: 'var(--primary)' }} />
        <h1 className="home-heading" style={{ fontSize: '3rem', margin: '16px 0 8px' }}>Deasil</h1>
        <Typography variant="body1" align="center" sx={{ maxWidth: 560, opacity: 0.8 }}>
          A space for exploration and creation: photography and interactive programs.
          Deasil means to move sunwise, the natural direction of the day.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 420, mt: { xs: 4, sm: 6 } }}>
          {sections.map((section) => (
            <Link key={section.href} href={section.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2,
                border: '1px solid transparent', transition: 'border-color 150ms',
                '&:hover': { borderColor: 'var(--foreground)' },
              }}>
                <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {section.icon}
                </Box>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.3em' }}>{section.title}</div>
                  <div style={{ fontSize: '1em', opacity: 0.65, marginTop: 2 }}>{section.description}</div>
                </div>
              </Box>
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
