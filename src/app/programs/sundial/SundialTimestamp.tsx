// Live timestamp display (ms precision) with pause, date-picker, 12/24h, M/D format, and location controls.

'use client';
import { Box, Button, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { getUtcOffset } from './lib/sundial-geo';

function formatTime(date: Date) {
  return {
    year:         date.getFullYear().toString(),
    month:        (date.getMonth() + 1).toString().padStart(2, '0'),
    day:          date.getDate().toString().padStart(2, '0'),
    hours:        date.getHours().toString().padStart(2, '0'),
    minutes:      date.getMinutes().toString().padStart(2, '0'),
    seconds:      date.getSeconds().toString().padStart(2, '0'),
    milliseconds: date.getMilliseconds().toString().padStart(3, '0'),
  };
}

interface Props {
  time: Date;
  use24h: boolean;
  useDMY: boolean;
  paused: boolean;
  coords: { lat: number; lon: number } | null;
  timezone: string;
  onPauseToggle: () => void;
  onCalendarOpen: () => void;
  onToggle24h: () => void;
  onToggleDMY: () => void;
  onLocationOpen: () => void;
}

export default function SundialTimestamp({
  time, use24h, useDMY, paused, coords, timezone,
  onPauseToggle, onCalendarOpen, onToggle24h, onToggleDMY, onLocationOpen,
}: Props) {
  const { year, month, day, hours, minutes, seconds, milliseconds } = formatTime(time);
  const displayHours = use24h ? hours : ((time.getHours() % 12) || 12).toString().padStart(2, '0');
  const ampm = use24h ? null : (time.getHours() >= 12 ? 'PM' : 'AM');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Typography variant="h3" component="div" sx={{ display: 'flex', alignItems: 'baseline', gap: '0.15em' }}>
          <span style={{ display: 'inline-block', width: '4ch', textAlign: 'center' }}>{year}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{useDMY ? day : month}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{useDMY ? month : day}</span>
          <span>  </span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{displayHours}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{minutes}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{seconds}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '3ch', textAlign: 'center' }}>{milliseconds}</span>
          {ampm && <span style={{ fontSize: '0.55em', marginLeft: '0.3em' }}>{ampm}</span>}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
          <IconButton size="small" onClick={onPauseToggle} title={paused ? 'Resume' : 'Pause'}>
            {paused ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
          <IconButton size="small" onClick={onCalendarOpen} title="Pick date & time">
            <CalendarMonthIcon />
          </IconButton>
          <Button size="small" onClick={onToggle24h}
            sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
            {use24h ? '24h' : '12h'}
          </Button>
          <Button size="small" onClick={onToggleDMY}
            sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
            {useDMY ? 'D/M' : 'M/D'}
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {coords ? (
          <Typography variant="h3" component="div">
            {coords.lat.toFixed(6)}&nbsp;&nbsp;{coords.lon.toFixed(6)}
            {timezone && <>&nbsp;&nbsp;<span>{getUtcOffset(timezone)}</span></>}
          </Typography>
        ) : (
          <Typography variant="h3" component="div" color="text.secondary">
            {'< Getting Location >'}
          </Typography>
        )}
        <IconButton size="small" onClick={onLocationOpen} title="Set location">
          <MyLocationIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
