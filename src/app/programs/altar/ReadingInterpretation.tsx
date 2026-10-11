'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Collapse, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { AnyReading } from './ReadingEntry';
import { toInterpretRequest } from './interpret-request';

type Status = 'idle' | 'streaming' | 'done' | 'error';

/** Asks /api/altar/interpret for a written reading of the draw and streams it in. */
export default function ReadingInterpretation({ reading }: { reading: AnyReading }) {
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const interpret = async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setStatus('streaming');
    setText('');
    setError('');
    try {
      const res = await fetch('/api/altar/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInterpretRequest(reading)),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? `The oracle could not be reached (${res.status}).`);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        setText(prev => prev + value);
      }
      setStatus('done');
    } catch (err) {
      if (abort.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'The oracle could not be reached.');
      setStatus('error');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {status !== 'streaming' && (
        <Button
          variant="text"
          size="small"
          startIcon={<AutoAwesomeIcon fontSize="small" />}
          onClick={interpret}
        >
          {status === 'idle' ? 'Interpret' : 'Interpret again'}
        </Button>
      )}
      {status === 'streaming' && !text && <CircularProgress size={20} />}
      <Collapse in={!!text || !!error} timeout={300} sx={{ width: '100%' }}>
        {text && (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
            {text}
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
            {error}
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}
