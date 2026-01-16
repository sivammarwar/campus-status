import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CurrentStatus } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, DoorOpen, RefreshCw, Clock, Search, X } from 'lucide-react';
import { format } from 'date-fns';

export default function OutStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<CurrentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOutStudents = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from('current_status')
      .select('*')
      .order('last_out_time', { ascending: false });

    if (error) {
      setError('Failed to fetch out students');
      console.error(error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOutStudents();

    // Set up real-time subscription
    const channel = supabase
      .channel('current_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'current_status' },
        () => {
          fetchOutStudents();
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

  const getTimeDiff = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Out Students</h1>
            <p className="text-sm text-muted-foreground">{filteredStudents.length} of {students.length} currently out</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchOutStudents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="container mx-auto px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or roll number..."
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

        {loading && students.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DoorOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No students match your search' : 'All students are on campus'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student, index) => (
              <Card 
                key={student.id} 
                className="animate-fade-in border-l-4 border-l-warning" 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-warning">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{student.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Roll: {student.roll_number}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(student.last_out_time)}</span>
                        <span className="text-warning font-medium ml-2">
                          ({getTimeDiff(student.last_out_time)})
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
