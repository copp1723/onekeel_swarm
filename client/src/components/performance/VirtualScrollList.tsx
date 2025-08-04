import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  memo, 
  useMemo,
  ReactNode 
} from 'react';
import { Card } from '@/components/ui/card';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  threshold?: number;
}

function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  getItemKey,
  overscan = 5,
  className = '',
  onScroll,
  loadMore,
  hasNextPage = false,
  isLoading = false,
  threshold = 3
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);

    // Infinite scroll logic
    if (loadMore && hasNextPage && !isLoading) {
      const { scrollHeight, clientHeight } = e.currentTarget;
      const scrolledToBottom = scrollHeight - clientHeight - newScrollTop < itemHeight * threshold;
      
      if (scrolledToBottom) {
        loadMore();
      }
    }
  }, [onScroll, loadMore, hasNextPage, isLoading, itemHeight, threshold]);

  // Scroll to item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;

    let targetScrollTop: number;
    
    switch (align) {
      case 'center':
        targetScrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        targetScrollTop = index * itemHeight - containerHeight + itemHeight;
        break;
      default:
        targetScrollTop = index * itemHeight;
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, items.length * itemHeight - containerHeight));

    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [itemHeight, containerHeight, items.length]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const rendered = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= items.length) break;
      
      const item = items[i];
      const key = getItemKey(item, i);
      
      rendered.push(
        <div
          key={key}
          style={{
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(item, i)}
        </div>
      );
    }
    return rendered;
  }, [visibleRange, items, itemHeight, renderItem, getItemKey]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual container with full height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
      
      {/* Loading indicator */}
      {isLoading && hasNextPage && (
        <div 
          className="flex items-center justify-center py-4"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Loading more...</span>
        </div>
      )}
    </div>
  );
}

// Memoized export
export default memo(VirtualScrollList) as typeof VirtualScrollList;

// Hook for virtual scrolling with search and filtering
export const useVirtualList = <T,>(
  allItems: T[],
  searchQuery: string = '',
  filterFn?: (item: T) => boolean,
  searchFn?: (item: T, query: string) => boolean
) => {
  const filteredItems = useMemo(() => {
    let result = allItems;
    
    // Apply filter
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    // Apply search
    if (searchQuery && searchFn) {
      result = result.filter(item => searchFn(item, searchQuery));
    }
    
    return result;
  }, [allItems, searchQuery, filterFn, searchFn]);

  return filteredItems;
};

// Specialized components for common use cases
export const VirtualLeadsList: React.FC<{
  leads: any[];
  onLeadClick?: (lead: any) => void;
  className?: string;
}> = memo(({ leads, onLeadClick, className }) => {
  const renderLead = useCallback((lead: any, index: number) => (
    <Card 
      className="m-2 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onLeadClick?.(lead)}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
          <p className="text-sm text-gray-600">{lead.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{lead.status}</p>
          <p className="text-xs text-gray-500">{lead.createdAt}</p>
        </div>
      </div>
    </Card>
  ), [onLeadClick]);

  return (
    <VirtualScrollList
      items={leads}
      itemHeight={100}
      containerHeight={600}
      renderItem={renderLead}
      getItemKey={(lead) => lead.id}
      className={className}
    />
  );
});

export const VirtualCampaignsList: React.FC<{
  campaigns: any[];
  onCampaignClick?: (campaign: any) => void;
  className?: string;
}> = memo(({ campaigns, onCampaignClick, className }) => {
  const renderCampaign = useCallback((campaign: any, index: number) => (
    <Card 
      className="m-2 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onCampaignClick?.(campaign)}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="font-medium">{campaign.name}</h3>
          <p className="text-sm text-gray-600">{campaign.description}</p>
          <div className="flex space-x-4 mt-2 text-xs text-gray-500">
            <span>Sent: {campaign.emailsSent}</span>
            <span>Opens: {campaign.opens}</span>
            <span>Clicks: {campaign.clicks}</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {campaign.status}
          </span>
        </div>
      </div>
    </Card>
  ), [onCampaignClick]);

  return (
    <VirtualScrollList
      items={campaigns}
      itemHeight={120}
      containerHeight={600}
      renderItem={renderCampaign}
      getItemKey={(campaign) => campaign.id}
      className={className}
    />
  );
});

VirtualLeadsList.displayName = 'VirtualLeadsList';
VirtualCampaignsList.displayName = 'VirtualCampaignsList';