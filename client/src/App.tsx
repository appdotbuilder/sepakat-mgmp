
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Users, Activity, FileText, Settings, Bell, BookOpen, Clock, TrendingUp, School, Eye, Plus, Upload, Download, Filter, Search, BarChart3, PieChart, UserPlus, Building2, ChevronRight, AlertCircle, CheckCircle, XCircle, MapPin, Briefcase } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Activity as ActivityType, Announcement } from '../../server/src/schema';

interface DashboardStats {
  totalActivities: number;
  upcomingActivities: number;
  completedActivities: number;
  totalParticipants: number;
  totalGroups: number;
  recentActivities: ActivityType[];
}

interface UserSession {
  user: User;
  token: string;
}

function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<ActivityType[]>([]);

  // Utility functions
  const getRoleDisplayName = (role: string): string => {
    const roleNames = {
      'super_admin': 'Super Admin',
      'kepala_cabdin': 'Kepala Cabang Dinas',
      'kepala_bidang': 'Kepala Bidang',
      'pengawas_bina': 'Pengawas Bina',
      'pengawas_sekolah': 'Pengawas Sekolah',
      'admin_grup': 'Admin Grup',
      'guru': 'Guru',
      'kepala_sekolah': 'Kepala Sekolah'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'published': 'bg-blue-100 text-blue-800',
      'ongoing': 'bg-green-100 text-green-800',
      'completed': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string): React.ReactElement => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'ongoing': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const [stats, activeAnnouncements, upcoming] = await Promise.all([
        trpc.getDashboardStats.query({ userId: session.user.id, userRole: session.user.role }),
        trpc.getActiveAnnouncements.query(),
        trpc.getUpcomingActivities.query({ userId: session.user.id })
      ]);
      
      setDashboardStats(stats);
      setAnnouncements(activeAnnouncements);
      setUpcomingActivities(upcoming);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [session]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await trpc.login.mutate(loginForm);
      setSession(response);
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login gagal. Periksa username dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setDashboardStats(null);
    setAnnouncements([]);
    setUpcomingActivities([]);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">SEPAKAT</h1>
            <p className="text-sm text-gray-600 mt-2">Sistem Evaluasi dan Pengendalian Kelompok Kerja Guru</p>
            <p className="text-xs text-gray-500">Versi 1.0.0</p>
          </div>

          {/* Active Announcements */}
          {announcements.length > 0 && (
            <div className="space-y-3">
              {announcements.map((announcement: Announcement) => (
                <Alert key={announcement.id} className="bg-blue-50 border-blue-200">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    <div className="font-medium text-blue-900">{announcement.title}</div>
                    <div className="text-blue-700 mt-1">{announcement.content}</div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-center">Masuk ke Sistem</CardTitle>
              <CardDescription className="text-center">
                Gunakan akun yang telah terdaftar di sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginForm((prev) => ({ ...prev, username: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Memproses...' : 'Masuk'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-gray-500">
            <p>Demo Accounts:</p>
            <p>Super Admin: admin/admin123</p>
            <p>Guru: guru1/guru123</p>
            <p>Admin Grup: mgmp1/admin123</p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based Dashboard Content
  const renderDashboardContent = () => {
    const { user } = session;
    
    switch (user.role) {
      case 'super_admin':
        return <SuperAdminDashboard stats={dashboardStats} />;
      case 'kepala_cabdin':
      case 'kepala_bidang':
        return <LeadershipDashboard stats={dashboardStats} />;
      case 'pengawas_bina':
      case 'pengawas_sekolah':
        return <SupervisorDashboard userRole={user.role} />;
      case 'admin_grup':
        return <GroupAdminDashboard />;
      default:
        return <MemberDashboard upcomingActivities={upcomingActivities} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">SEPAKAT</h1>
                <p className="text-xs text-gray-500">v1.0.0</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="hidden sm:flex">
                {getRoleDisplayName(session.user.role)}
              </Badge>
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {session.user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{session.user.full_name}</p>
                  <p className="text-xs text-gray-500">{session.user.nip}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Selamat datang, {session.user.full_name} 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Dashboard {getRoleDisplayName(session.user.role)} - SEPAKAT v1.0.0
          </p>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📢 Pengumuman Sistem</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {announcements.map((announcement: Announcement) => (
                <Alert key={announcement.id} className="bg-blue-50 border-blue-200">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <div className="font-semibold text-blue-900">{announcement.title}</div>
                    <div className="text-blue-700 text-sm mt-1">{announcement.content}</div>
                    <div className="text-xs text-blue-600 mt-2">
                      {announcement.created_at.toLocaleDateString('id-ID')}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Role-specific Dashboard */}
        {renderDashboardContent()}
      </main>
    </div>
  );
}

// Super Admin Dashboard Component
function SuperAdminDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kegiatan</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActivities || 0}</div>
            <p className="text-xs text-muted-foreground">Kegiatan terdaftar</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kelompok</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGroups || 0}</div>
            <p className="text-xs text-muted-foreground">MGMP/MKKS aktif</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Peserta</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalParticipants || 0}</div>
            <p className="text-xs text-muted-foreground">Guru & kepala sekolah</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kegiatan Mendatang</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingActivities || 0}</div>
            <p className="text-xs text-muted-foreground">Dalam 30 hari ke depan</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tools */}
      <Tabs defaultValue="master-data" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="master-data">Data Master</TabsTrigger>
          <TabsTrigger value="users">Manajemen User</TabsTrigger>
          <TabsTrigger value="groups">Kelompok</TabsTrigger>
          <TabsTrigger value="system">Sistem</TabsTrigger>
        </TabsList>
        
        <TabsContent value="master-data" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Wilayah & Sekolah
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Kelola data wilayah dan sekolah</p>
                <Button size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Kelola
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Mata Pelajaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Kelola data mata pelajaran</p>
                <Button size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Kelola
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Tahun Akademik
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Kelola tahun akademik</p>
                <Button size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Kelola
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Manajemen Pengguna</h3>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600">Kelola akun pengguna untuk semua peran dalam sistem</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                {['Kepala Cabdin', 'Pengawas', 'Admin Grup', 'Guru'].map((role: string) => (
                  <div key={role} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{role}</h4>
                    <p className="text-sm text-gray-600 mt-1">0 akun aktif</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Kelompok MGMP/MKKS</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Buat Kelompok
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600">Buat dan kelola kelompok MGMP/MKKS serta penunjukan Admin Grup</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Pengumuman Sistem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Publikasikan pengumuman untuk semua pengguna</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Pengumuman
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Konfigurasi Sistem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Pengaturan dan konfigurasi sistem</p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Pengaturan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Leadership Dashboard (Kepala Cabdin/Kabid)
function LeadershipDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kegiatan Wilayah</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActivities || 0}</div>
            <p className="text-xs text-muted-foreground">Total kegiatan</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partisipasi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Rata-rata kehadiran</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kelompok Aktif</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGroups || 0}</div>
            <p className="text-xs text-muted-foreground">MGMP/MKKS</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laporan Baru</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Menunggu review</p>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Tools */}
      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
          <TabsTrigger value="analysis">Analisis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-4 w-4 mr-2" />
                  Dashboard Visual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Grafik partisipasi dan frekuensi kegiatan</p>
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  Lihat Dashboard
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Kegiatan Terkini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Kegiatan yang akan datang dan baru selesai</p>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Lihat Jadwal
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Laporan Kegiatan</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600">Akses dan unduh laporan kegiatan yang diunggah oleh Admin Grup</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisis Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Filter dan analisis data berdasarkan tingkat, sekolah, atau rentang waktu</p>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Filter Data
                </Button>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Buat Laporan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Supervisor Dashboard (Pengawas)
function SupervisorDashboard({ userRole }: { userRole: string }) {
  const isSupervisorSekolah = userRole === 'pengawas_sekolah';
  
  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isSupervisorSekolah ? 'Sekolah Binaan' : 'Kluster Binaan'}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Total {isSupervisorSekolah ? 'sekolah' : 'kluster'}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guru Binaan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Guru & kepala sekolah</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laporan Supervisi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kegiatan Diikuti</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">Partisipasi guru binaan</p>
          </CardContent>
        </Card>
      </div>

      {/* Supervision Tools */}
      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="activities">Kegiatan</TabsTrigger>
          <TabsTrigger value="reports">Laporan Supervisi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Entitas Binaan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Pantau daftar {isSupervisorSekolah ? 'guru/kepala sekolah dari sekolah binaan' : 'guru dari kluster binaan'}
              </p>
              <Button>
                <Eye className="h-4 w-4 mr-2" />
                Lihat Daftar Binaan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Akses Informasi Kegiatan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Lihat agenda, materi, dan laporan kegiatan yang diikuti guru binaan</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Workshop SEPAKAT Februari 2024</h4>
                    <p className="text-sm text-gray-600">MGMP Matematika SMP - 15 Feb 2024</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Laporan Supervisi</h3>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Laporan
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Upload laporan supervisi ke profil sekolah yang dikunjungi</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Laporan Supervisi SDN 1 Kota</h4>
                    <p className="text-sm text-gray-600">Tanggal kunjungan: 12 Feb 2024</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Uploaded</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Group Admin Dashboard
function GroupAdminDashboard() {
  const getStatusColor = (status: string): string => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'published': 'bg-blue-100 text-blue-800',
      'ongoing': 'bg-green-100 text-green-800',
      'completed': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anggota Kelompok</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-muted-foreground">Total anggota aktif</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kegiatan Bulan Ini</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Kegiatan terjadwal</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Kehadiran</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">Partisipasi anggota</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laporan Tertunda</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Perlu diselesaikan</p>
          </CardContent>
        </Card>
      </div>

      {/* Group Management Tools */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members">Anggota</TabsTrigger>
          <TabsTrigger value="activities">Kegiatan</TabsTrigger>
          <TabsTrigger value="materials">Materi</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Kelola Anggota Kelompok</h3>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah Anggota
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Tambah atau hapus anggota dari kelompok MGMP/MKKS Anda</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>JS</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">Joko Santoso, S.Pd</h4>
                      <p className="text-sm text-gray-600">SDN 1 Kota - Matematika</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Kelola</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Manajemen Kegiatan</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Buat Agenda Baru
            </Button>
          </div>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">Workshop Pembelajaran Digital</h4>
                    <p className="text-gray-600 mt-1">Sabtu, 24 Februari 2024 • 08:00 - 16:00</p>
                    <p className="text-gray-600">📍 Aula SMPN 1 Kota</p>
                    <p className="text-gray-600">👨‍🏫 Narasumber: Dr. Ahmad Fauzi, M.Pd</p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Badge className={getStatusColor('published')}>
                      Published
                    </Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Materi
                  </Button>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Absensi (0/32)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="materials" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Materi Kegiatan</h3>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Materi
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Upload file materi (PDF, PPT, dll.) untuk akses anggota</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Laporan Pertanggungjawaban</h3>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Buat Laporan
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Isi dan kirim laporan pertanggungjawaban kegiatan sesuai template sistem</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Member Dashboard (Guru & Kepala Sekolah)
function MemberDashboard({ 
  upcomingActivities,
  getStatusColor,
  getStatusIcon
}: { 
  upcomingActivities: ActivityType[];
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactElement;
}) {
  return (
    <div className="space-y-8">
      {/* Personal Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kegiatan Diikuti</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Total partisipasi</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kegiatan Mendatang</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingActivities.length}</div>
            <p className="text-xs text-muted-foreground">Jadwal terdaftar</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokumen Portfolio</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Dokumen tersimpan</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kelompok</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">MGMP/MKKS terdaftar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Kegiatan Mendatang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Tidak ada kegiatan mendatang</p>
              ) : (
                <div className="space-y-4">
                  {upcomingActivities.slice(0, 3).map((activity: ActivityType) => (
                    <div key={activity.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{activity.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.activity_date.toLocaleDateString('id-ID')} • {activity.start_time} - {activity.end_time}
                          </p>
                          <p className="text-sm text-gray-600">📍 {activity.location}</p>
                          {activity.speaker && (
                            <p className="text-sm text-gray-600">👨‍🏫 {activity.speaker}</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(activity.status)}>
                          {getStatusIcon(activity.status)}
                          <span className="ml-1">{activity.status}</span>
                        </Badge>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Materi
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Detail
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Riwayat Kegiatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Workshop Kurikulum Merdeka</h4>
                    <p className="text-sm text-gray-600">MGMP Matematika SMP • 10 Feb 2024</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Hadir
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Seminar Pembelajaran Digital</h4>
                    <p className="text-sm text-gray-600">MKKS SMP • 25 Jan 2024</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Hadir
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Lihat Semua Riwayat
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Portfolio & Groups */}
        <div className="space-y-6">
          {/* Digital Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Portfolio Digital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Kelola dokumen pribadi Anda</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Sertifikat Workshop</p>
                    <p className="text-xs text-gray-500">Pelatihan Sertifikat</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Penelitian PTK</p>
                    <p className="text-xs text-gray-500">Karya Ilmiah</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button size="sm" className="w-full mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Upload Dokumen
              </Button>
            </CardContent>
          </Card>

          {/* My Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Kelompok Saya
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">MGMP Matematika SMP</h4>
                  <p className="text-sm text-gray-600">Wilayah Kota • 32 anggota</p>
                  <Badge variant="outline" className="mt-2">MGMP</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">MKKS SMP Kota</h4>
                  <p className="text-sm text-gray-600">Kepala Sekolah • 15 anggota</p>
                  <Badge variant="outline" className="mt-2">MKKS</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
