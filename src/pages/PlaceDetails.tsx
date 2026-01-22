import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, RefreshCw, User, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

interface StudentInPlace {
  uid: string;
  name: string;
  roll_number: string;
  entry_time: string;
}

export default function PlaceDetails() {
  const navigate = useNavigate();
  const { placeName } = useParams<{ placeName: string }>();
  const [students, setStudents] = useState<StudentInPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const displayName = placeName?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const columnName = placeName?.toLowerCase().replace(/ /g, '_') || '';

  const fetchStudentsInPlace = useCallback(async () => {
    if (!placeName) return;
    
    setLoading(true);
    setError(null);

    try {
      // First get all students currently in this place from admin_table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_table')
        .select('uid, name, roll_number')
        .eq(columnName, 1);

      if (adminError) throw adminError;

      if (!adminData || adminData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Get the latest IN entry for each student from master_logs
      const uids = adminData.map(s => s.uid);
      const { data: logsData, error: logsError } = await supabase
        .from('master_logs')
        .select('uid, timestamp')
        .eq('place_name', columnName)
        .eq('status', 'IN')
        .in('uid', uids)
        .order('timestamp', { ascending: false });

      if (logsError) throw logsError;

      // Create a map of uid to latest entry time
      const entryTimeMap = new Map<string, string>();
      logsData?.forEach(log => {
        if (!entryTimeMap.has(log.uid)) {
          entryTimeMap.set(log.uid, log.timestamp);
        }
      });

      // Combine the data
      const studentsWithTime: StudentInPlace[] = adminData.map(student => ({
        uid: student.uid,
        name: student.name,
        roll_number: student.roll_number,
        entry_time: entryTimeMap.get(student.uid) || new Date().toISOString()
      }));

      // Sort by entry time (most recent first)
      studentsWithTime.sort((a, b) => 
        new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
      );

      setStudents(studentsWithTime);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
    }

    setLoading(false);
  }, [placeName, columnName]);

  useEffect(() => {
    fetchStudentsInPlace();

    // Subscribe to realtime changes on admin_table
    const channel = supabase
      .channel(`place-${placeName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_table'
        },
        () => fetchStudentsInPlace()
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStudentsInPlace, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchStudentsInPlace, placeName]);

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
      await fetchStudentsInPlace();
    }
    setPullDistance(0);
    setIsPulling(false);
    startY.current = 0;
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const entryTime = new Date(timestamp);
    const diffMs = now.getTime() - entryTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      student =>
        student.name.toLowerCase().includes(query) ||
        student.roll_number.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

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
                <h1 className="text-xl font-bold">{displayName}</h1>
                <p className="text-sm text-muted-foreground">
                  {students.length} student{students.length !== 1 ? 's' : ''} inside
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchStudentsInPlace}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or roll number..."
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
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No matching students found' : 'No students currently inside'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Card key={student.uid} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.roll_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(student.entry_time)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getTimeAgo(student.entry_time)} ago
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
