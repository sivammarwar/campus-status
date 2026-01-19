import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, RFIDLog } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Radio, RefreshCw, Search, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

export default function RFIDLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<RFIDLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from('rfid_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      setError('Failed to fetch RFID logs');
      console.error(error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel('rfid_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rfid_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, yyyy • h:mm a');
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(log => log.name.toLowerCase().includes(query));
  }, [logs, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">RFID Logs</h1>
            <p className="text-sm text-muted-foreground">{filteredLogs.length} of {logs.length} entries</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="container mx-auto px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="py-4 text-destructive text-center">
              {error}
            </CardContent>
          </Card>
        )}

        {loading && logs.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? 'No matching logs found' : 'No RFID logs available'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        log.status === 'IN' 
                          ? 'bg-green-500/10' 
                          : 'bg-orange-500/10'
                      }`}>
                        {log.status === 'IN' ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{log.name}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(log.timestamp)}</p>
                      </div>
                    </div>
                    <Badge variant={log.status === 'IN' ? 'default' : 'secondary'} className={
                      log.status === 'IN' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }>
                      {log.status}
                    </Badge>
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
