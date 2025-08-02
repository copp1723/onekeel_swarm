import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trash2, RefreshCw, Mail, Clock, AlertCircle } from 'lucide-react';

interface PendingInvite {
  token: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  expired: boolean;
}

export function InviteManagement() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  const fetchPendingInvites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/invites/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (token: string) => {
    try {
      setRevoking(token);
      const response = await fetch(`/api/users/invites/${token}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        await fetchPendingInvites(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to revoke invitation');
      }
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      alert('Failed to revoke invitation');
    } finally {
      setRevoking(null);
    }
  };

  const getStatusBadge = (invite: PendingInvite) => {
    if (invite.used) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Used</Badge>;
    }
    if (invite.expired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-blue-100 text-blue-800">Pending</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading invitations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Pending Invitations</span>
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchPendingInvites}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.token}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-medium">{invite.email}</span>
                    {getStatusBadge(invite)}
                    <Badge variant="outline" className="text-xs">
                      {invite.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Sent {formatDate(invite.createdAt)}</span>
                    </div>
                    
                    {!invite.used && !invite.expired && (
                      <div className="flex items-center space-x-1">
                        {getDaysUntilExpiry(invite.expiresAt) <= 1 ? (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        <span>
                          {getDaysUntilExpiry(invite.expiresAt) > 0
                            ? `Expires in ${getDaysUntilExpiry(invite.expiresAt)} day(s)`
                            : 'Expires today'
                          }
                        </span>
                      </div>
                    )}
                    
                    {invite.expired && (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>Expired {formatDate(invite.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!invite.used && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeInvite(invite.token)}
                    disabled={revoking === invite.token}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {revoking === invite.token ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="ml-1">Revoke</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
