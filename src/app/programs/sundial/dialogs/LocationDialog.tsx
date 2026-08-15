// Location picker: interactive map, lat/lon inputs, timezone autocomplete, with async tz lookup.

'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Autocomplete,
} from '@mui/material';
import { getStandardUtcOffset, lookupTimezone } from '../lib/sundial-geo';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

interface Props {
  open: boolean;
  coords: { lat: number; lon: number } | null;
  timezone: string;
  onSet: (lat: number, lon: number, timezone: string) => void;
  onClose: () => void;
}

export default function LocationDialog({ open, coords, timezone, onSet, onClose }: Props) {
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [modalTimezone, setModalTimezone] = useState('');
  const reqRef = useRef(0);

  // Sync inputs when dialog opens
  useEffect(() => {
    if (!open) return;
    setLatInput(coords ? coords.lat.toString() : '');
    setLonInput(coords ? coords.lon.toString() : '');
    if (timezone) {
      setModalTimezone(timezone);
    } else if (coords) {
      lookupTimezone(coords.lat, coords.lon).then(tz => { if (tz) setModalTimezone(tz); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-lookup timezone when lat/lon inputs change
  useEffect(() => {
    if (!open) return;
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (isNaN(lat) || isNaN(lon)) return;
    const t = setTimeout(() => {
      const id = ++reqRef.current;
      lookupTimezone(lat, lon).then(tz => { if (tz && reqRef.current === id) setModalTimezone(tz); });
    }, 600);
    return () => clearTimeout(t);
  }, [latInput, lonInput, open]);

  const allTimezones = useMemo(() => {
    try {
      return (Intl as any).supportedValuesOf('timeZone').map((tz: string) => ({
        tz, label: `${getStandardUtcOffset(tz)}  ${tz}`,
      }));
    } catch { return []; }
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set location</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {open && (
          <LocationPickerMap
            lat={isNaN(parseFloat(latInput)) ? (coords?.lat ?? 0) : parseFloat(latInput)}
            lon={isNaN(parseFloat(lonInput)) ? (coords?.lon ?? 0) : parseFloat(lonInput)}
            onChange={(lat, lon) => {
              setLatInput(lat.toFixed(6));
              setLonInput(lon.toFixed(6));
              const id = ++reqRef.current;
              lookupTimezone(lat, lon).then(tz => { if (tz && reqRef.current === id) setModalTimezone(tz); });
            }}
          />
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Latitude" type="number" value={latInput}
            onChange={e => setLatInput(e.target.value)}
            inputProps={{ min: -90, max: 90, step: 0.0001 }} fullWidth />
          <TextField label="Longitude" type="number" value={lonInput}
            onChange={e => setLonInput(e.target.value)}
            inputProps={{ min: -180, max: 180, step: 0.0001 }} fullWidth />
        </Box>
        <Autocomplete
          value={allTimezones.find((o: { tz: string }) => o.tz === modalTimezone)
            ?? (modalTimezone ? { tz: modalTimezone, label: `${getStandardUtcOffset(modalTimezone)}  ${modalTimezone}` } : null)}
          onChange={(_, v: { tz: string; label: string } | null) => { if (v) setModalTimezone(v.tz); }}
          options={allTimezones}
          getOptionLabel={(o: { tz: string; label: string }) => o.label}
          renderInput={params => <TextField {...params} label="Timezone" size="small" />}
          fullWidth
          disableClearable
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => navigator.geolocation?.getCurrentPosition(
            pos => { setLatInput(pos.coords.latitude.toFixed(6)); setLonInput(pos.coords.longitude.toFixed(6)); },
            () => {},
          )}
          sx={{ mr: 'auto' }}
        >
          Current Location
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={async () => {
            const lat = parseFloat(latInput);
            const lon = parseFloat(lonInput);
            if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
              const tz = modalTimezone || await lookupTimezone(lat, lon);
              onSet(lat, lon, tz);
            }
            onClose();
          }}
        >
          Set
        </Button>
      </DialogActions>
    </Dialog>
  );
}
