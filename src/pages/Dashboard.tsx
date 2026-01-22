import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Device } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, LogOut as LogOutIcon, Shield, Radio, MapPin, RefreshCw } from 'lucide-react';

interface PlaceWithCount extends Device {
  studentCount: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [places, setPlaces] = useState<PlaceWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch devices (places)
    const { data: devicesData } = await supabase
      .from('devices')
      .select('*')
      .eq('is_active', true);

    // Fetch admin_table to count students in each place
    const { data: adminData } = await supabase
      .from('admin_table')
      .select('*');

    // Fetch total registered users
    const { count } = await supabase
      .from('valid_users')
      .select('*', { count: 'exact', head: true });

    setTotalUsers(count || 0);

    if (devicesData && adminData) {
      const placesWithCounts: PlaceWithCount[] = devicesData.map(device => {
        const columnName = device.place_name.toLowerCase().replace(/ /g, '_');
        const count = adminData.filter(entry => {
          // Check if the column exists and has value 1
          return (entry as Record<string, unknown>)[columnName] === 1;
        }).length;
        return { ...device, studentCount: count };
      });
      setPlaces(placesWithCounts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_table' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, fetchData)
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatPlaceName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getPlaceIcon = (placeName: string) => {
    const name = placeName.toLowerCase();
    if (name.includes('gate')) return '🚪';
    if (name.includes('library')) return '📚';
    if (name.includes('gym')) return '🏋️';
    if (name.includes('class')) return '📖';
    if (name.includes('lab')) return '🔬';
    if (name.includes('cafe') || name.includes('canteen')) return '🍽️';
    return '📍';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Campus Access</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOutIcon className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate('/registered-users')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Registered Users</CardTitle>
                    <CardDescription>{totalUsers} total students</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => navigate('/master-logs')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Radio className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Master Logs</CardTitle>
                    <CardDescription>View all entry/exit logs</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Places Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Places</h2>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="py-6">
                      <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : places.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No places configured yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {places.map(place => (
                  <Card
                    key={place.id}
                    className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                    onClick={() => navigate(`/place/${place.place_name}`)}
                  >
                    <CardContent className="py-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getPlaceIcon(place.place_name)}</span>
                          <div>
                            <h3 className="font-medium">{formatPlaceName(place.place_name)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {place.studentCount} inside
                            </p>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${place.studentCount > 0 ? 'bg-green-500' : 'bg-muted'}`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
