'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Play, RefreshCcw } from 'lucide-react';
import { apiFetch, ApiError, getApiUrl, getStoredToken } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface RecordingDto {
  id: string;
  callUuid: string;
  filename: string;
  sizeBytes: number;
  recordedAt: string;
  updatedAt: string;
}

export default function RecordingsPage() {
  const { dictionary } = useI18n();
  const [recordings, setRecordings] = useState<RecordingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [audioMap, setAudioMap] = useState<Record<string, string>>({});
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<RecordingDto[]>('/recordings');
      setRecordings(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.recordings.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.recordings.errors.load]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const formatDateTime = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }, []);

  const formatSize = useCallback((sizeBytes: number) => {
    if (!Number.isFinite(sizeBytes)) {
      return '—';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeBytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }, []);

  const sortedRecordings = useMemo(
    () =>
      [...recordings].sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      ),
    [recordings],
  );

  const handleDownload = useCallback(
    async (recording: RecordingDto) => {
      setDownloadingId(recording.id);
      try {
        const token = getStoredToken();
        if (!token) {
          throw new ApiError(dictionary.recordings.errors.authRequired, 401);
        }
        const response = await fetch(`${getApiUrl()}/recordings/${recording.callUuid}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new ApiError(await response.text(), response.status);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = recording.filename || `${recording.callUuid}.wav`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(dictionary.recordings.errors.download);
        }
      } finally {
        setDownloadingId(null);
      }
    },
    [dictionary.recordings.errors.authRequired, dictionary.recordings.errors.download],
  );

  const handlePlay = useCallback(
    async (recording: RecordingDto) => {
      if (audioMap[recording.id]) {
        return;
      }
      setLoadingAudioId(recording.id);
      try {
        const token = getStoredToken();
        if (!token) {
          throw new ApiError(dictionary.recordings.errors.authRequired, 401);
        }
        const response = await fetch(`${getApiUrl()}/recordings/${recording.callUuid}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new ApiError(await response.text(), response.status);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioMap((prev) => ({ ...prev, [recording.id]: url }));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(dictionary.recordings.errors.play);
        }
      } finally {
        setLoadingAudioId(null);
      }
    },
    [audioMap, dictionary.recordings.errors.authRequired, dictionary.recordings.errors.play],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.recordings.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.recordings.subtitle}</p>
        </div>
        <Button variant="outline" onClick={loadRecordings} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" /> {dictionary.recordings.buttons.refresh}
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{dictionary.recordings.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <RecordingsSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : sortedRecordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.recordings.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.recordings.table.callUuid}</TableHead>
                    <TableHead>{dictionary.recordings.table.filename}</TableHead>
                    <TableHead>{dictionary.recordings.table.recordedAt}</TableHead>
                    <TableHead>{dictionary.recordings.table.size}</TableHead>
                    <TableHead>{dictionary.recordings.table.listen}</TableHead>
                    <TableHead className="text-right">{dictionary.recordings.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRecordings.map((recording) => (
                    <TableRow key={recording.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {recording.callUuid}
                      </TableCell>
                      <TableCell>{recording.filename}</TableCell>
                      <TableCell>{formatDateTime(recording.recordedAt)}</TableCell>
                      <TableCell>{formatSize(recording.sizeBytes)}</TableCell>
                      <TableCell>
                        {audioMap[recording.id] ? (
                          <audio controls src={audioMap[recording.id]} className="h-8 w-full" />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlay(recording)}
                            disabled={loadingAudioId === recording.id}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {dictionary.recordings.buttons.listen}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(recording)}
                          disabled={downloadingId === recording.id}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {dictionary.recordings.buttons.download}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecordingsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  );
}
