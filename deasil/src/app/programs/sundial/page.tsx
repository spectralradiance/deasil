'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import YardIcon from '@mui/icons-material/Yard';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import GrassIcon from '@mui/icons-material/Grass';
import AppleIcon from '@mui/icons-material/Apple';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import LightModeIcon from '@mui/icons-material/LightMode';

const Sabbats = [
  { name: 'Samhain', icon: <NightsStayIcon /> },
  { name: 'Yule', icon: <AcUnitIcon /> },
  { name: 'Imbolc', icon: <LightModeIcon /> },
  { name: 'Ostara', icon: <YardIcon /> },
  { name: 'Beltane', icon: <LocalFireDepartmentIcon /> },
  { name: 'Litha', icon: <WbSunnyIcon /> },
  { name: 'Lughnasadh', icon: <GrassIcon /> },
  { name: 'Mabon', icon: <AppleIcon /> },
];

const WheelOfYear = () => {
  const size = 400; // Total SVG width/height
  const center = size / 2;
  const radius = 150; // Distance from center to symbols

  // Calculate current day of the year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay); // 1-365

  // Calculate rotation so today is at the top
  // The year starts at the top, so we rotate by the percentage of the year that has passed.
  // We subtract 90 degrees because the circle starts with 0 degrees at the 3 o'clock position.
  const rotation = -((dayOfYear / 365) * 360 + 90);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(${rotation} ${center} ${center})`}>
        {/* Optional: The actual circle line */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#ccc" />

        {Sabbats.map((sabbat, i) => {
          // Calculate the angle for this item (in radians)
          // Subtracting Math.PI / 2 starts the first item at the top (12 o'clock)
          const angle = (i * (360 / Sabbats.length) * Math.PI) / 180 - Math.PI / 2 +0.5;

          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);

          return (
            <g key={sabbat.name} transform={`translate(${x}, ${y})`}>
              {/* Rotate text back to be upright */}
              <g transform={`rotate(${-rotation})`}>
                <foreignObject x="-12" y="-12" width="24" height="24">
                  {sabbat.icon}
                </foreignObject>
                <text y="25" textAnchor="middle" fontSize="12" fill="#666">
                  {sabbat.name}
                </text>
              </g>
            </g>
          );
        })}
      </g>
      {/* Pin for current date at the top */}
      <foreignObject
        x={center - 12}
        y={center - radius - 30}
        width="24"
        height="24"
      >
        <LocationOnIcon sx={{ color: 'red', fontSize: 24 }} />
      </foreignObject>
    </svg>
  );
};

export default function SundialPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1); // Update every millisecond
    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return { year, month, day, hours, minutes, seconds, milliseconds };
  };

  const { year, month, day, hours, minutes, seconds, milliseconds } = formatTime(time);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        textAlign: 'center',
      }}
    >
      <Box>
        <Typography variant="h1" component="div" sx={{ fontFamily: 'monospace', mb: 2 }}>
          {`${hours}:${minutes}:${seconds}.${milliseconds}`}
        </Typography>
        <Typography variant="h4" component="div" sx={{ fontFamily: 'monospace' }}>
          {`${year}-${month}-${day}`}
        </Typography>
      </Box>
      <WheelOfYear />
    </Box>
  );
}
