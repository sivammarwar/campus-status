import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, LogOut as LogOutIcon, DoorOpen, Shield, Radio } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOutIcon className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome</h2>
            <p className="text-muted-foreground">
              Select an option to view student data
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate('/registered-users')}
            >
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">All Registered Users</CardTitle>
                <CardDescription>
                  View all students registered in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Users</Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-warning transition-colors"
              onClick={() => navigate('/out-students')}
            >
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-2">
                  <DoorOpen className="w-6 h-6 text-warning" />
                </div>
                <CardTitle className="text-lg">Out Students</CardTitle>
                <CardDescription>
                  View students currently outside campus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-warning text-warning hover:bg-warning hover:text-warning-foreground">
                  View Out Students
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => navigate('/rfid-logs')}
            >
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2">
                  <Radio className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle className="text-lg">RFID Logs</CardTitle>
                <CardDescription>
                  View all RFID entry/exit logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">
                  View Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
