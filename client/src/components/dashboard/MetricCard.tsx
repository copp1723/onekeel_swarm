import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  loading = false,
}) => {
  const getTrendIcon = () => {
    if (!trend && change !== undefined) {
      if (change > 0) return TrendingUp;
      if (change < 0) return TrendingDown;
    }
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getTrendColor = () => {
    if (!trend && change !== undefined) {
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const TrendIcon = getTrendIcon();

  if (loading) {
    return (
      <Card>
        <CardHeader className='pb-2'>
          <div className='h-4 bg-gray-200 rounded w-24 animate-pulse' />
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <div className='h-8 bg-gray-200 rounded w-32 animate-pulse' />
            <div className='h-4 bg-gray-200 rounded w-20 animate-pulse' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-0 shadow-sm hover:shadow-md transition-shadow bg-white'>
      <CardHeader className='pb-2 border-b border-gray-50'>
        <CardTitle className='text-xs font-normal text-gray-500 flex items-center justify-between uppercase tracking-wider'>
          <span>{title}</span>
          {Icon && <Icon className={`h-3.5 w-3.5 text-gray-400`} />}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-4'>
        <div className='space-y-1'>
          <div className='text-xl font-normal text-gray-800'>{value}</div>
          {(change !== undefined || changeLabel) && (
            <div
              className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}
            >
              <TrendIcon className='h-3 w-3' />
              <span>
                {change !== undefined && (
                  <>
                    {change > 0 && '+'}
                    {change}%
                  </>
                )}
                {changeLabel && ` ${changeLabel}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
