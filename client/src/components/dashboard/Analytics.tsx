import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


const mockData = [
  { name: 'Mon', leads: 12, qualified: 3 },
  { name: 'Tue', leads: 19, qualified: 7 },
  { name: 'Wed', leads: 15, qualified: 4 },
  { name: 'Thu', leads: 22, qualified: 9 },
  { name: 'Fri', leads: 28, qualified: 12 },
  { name: 'Sat', leads: 8, qualified: 2 },
  { name: 'Sun', leads: 5, qualified: 1 },
];

const statusData = [
  { name: 'New', value: 45, color: '#3B82F6' },
  { name: 'Contacted', value: 32, color: '#F59E0B' },
  { name: 'Qualified', value: 18, color: '#10B981' },
  { name: 'Closed', value: 5, color: '#EF4444' },
];

export function DashboardAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Lead Activity Chart */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Weekly Lead Activity</CardTitle>
          <CardDescription>Leads received and qualified this week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="leads" fill="#3B82F6" name="Total Leads" />
              <Bar dataKey="qualified" fill="#10B981" name="Qualified" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Lead Status Distribution</CardTitle>
          <CardDescription>Current status breakdown of all leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-blue-500 rounded-full mb-2"></div>
            <span className="text-sm font-medium text-gray-900">Import Leads</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-green-500 rounded-full mb-2"></div>
            <span className="text-sm font-medium text-gray-900">Create Campaign</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-yellow-500 rounded-full mb-2"></div>
            <span className="text-sm font-medium text-gray-900">View Reports</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-purple-500 rounded-full mb-2"></div>
            <span className="text-sm font-medium text-gray-900">Agent Config</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
