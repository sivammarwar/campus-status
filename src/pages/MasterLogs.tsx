import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, MasterLog } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, RefreshCw, Radio, X } from 'lucide-react';
import { format } from 'date-fns';

export default function MasterLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<MasterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('master_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200);

    if (fetchError) {
      console.error('Error fetching logs:', fetchError);
      setError('Failed to load logs');
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('master-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'master_logs'
        },
        () => fetchLogs()
      )
      .subscribe();

    const interval = setInterval(fetchLogs, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchLogs]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (mainRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (mainRef.current?.scrollTop === 0 && startY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, Math.min(100, currentY - startY.current));
      if (distance > 0) {
        setPullDistance(distance);
        setIsPulling(true);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      await fetchLogs();
    }
    setPullDistance(0);
    setIsPulling(false);
    startY.current = 0;
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, yyyy • h:mm a');
  };

  const formatPlaceName = (place: string) => {
    return place.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      log =>
        log.name.toLowerCase().includes(query) ||
        log.roll_number.toLowerCase().includes(query) ||
        log.place_name.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Master Logs</h1>
                <p className="text-sm text-muted-foreground">
                  {logs.length} log{logs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name, roll number or place..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        className="container mx-auto px-4 py-6 flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isPulling && (
          <div
            className="flex justify-center items-center transition-all duration-200 overflow-hidden"
            style={{ height: pullDistance }}
          >
            <RefreshCw className={`w-6 h-6 text-muted-foreground ${pullDistance > 60 ? 'text-primary animate-spin' : ''}`} />
          </div>
        )}

        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="py-4 text-destructive text-center">
              {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No matching logs found' : 'No logs yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{log.name}</h3>
                        <Badge
                          variant={log.status === 'IN' ? 'default' : 'secondary'}
                          className={log.status === 'IN' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.roll_number}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{formatPlaceName(log.place_name)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
