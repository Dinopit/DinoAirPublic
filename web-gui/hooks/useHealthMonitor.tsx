/**
 * React hooks and components for DinoAir health monitoring
 */

import React from 'react';
import { 
  HealthMonitor, 
  HealthReport, 
  ServiceStatus, 
  HealthCheckConfig,
  defaultHealthConfig 
} from '../lib/health-monitor/health-monitor';

/**
 * React hook for health monitoring
 */
export function useHealthMonitor(config?: Record<string, HealthCheckConfig>) {
  const [healthReport, setHealthReport] = React.useState<HealthReport | null>(null);
  const [isMonitoring, setIsMonitoring] = React.useState(false);
  const monitorRef = React.useRef<HealthMonitor | null>(null);
  
  React.useEffect(() => {
    const monitor = new HealthMonitor(config || defaultHealthConfig);
    monitorRef.current = monitor;
    
    // Set up callbacks
    monitor.onHealthUpdate = (report) => {
      setHealthReport(report);
    };
    
    // Start monitoring
    monitor.start();
    setIsMonitoring(true);
    
    // Cleanup
    return () => {
      monitor.stop();
      setIsMonitoring(false);
    };
  }, []);
  
  const checkNow = React.useCallback(async () => {
    if (monitorRef.current) {
      await monitorRef.current.checkAll();
    }
  }, []);
  
  return {
    healthReport,
    isMonitoring,
    checkNow,
    overallStatus: healthReport?.overallStatus || ServiceStatus.STOPPED
  };
}

/**
 * Health status indicator component
 */
export function HealthStatusIndicator({ 
  status,
  size = 'sm',
  showLabel = false 
}: {
  status: ServiceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  const statusColors = {
    [ServiceStatus.HEALTHY]: 'bg-green-500',
    [ServiceStatus.DEGRADED]: 'bg-yellow-500',
    [ServiceStatus.UNHEALTHY]: 'bg-red-500',
    [ServiceStatus.STARTING]: 'bg-blue-500',
    [ServiceStatus.STOPPING]: 'bg-orange-500',
    [ServiceStatus.STOPPED]: 'bg-gray-500'
  };
  
  const statusLabels = {
    [ServiceStatus.HEALTHY]: 'Healthy',
    [ServiceStatus.DEGRADED]: 'Degraded',
    [ServiceStatus.UNHEALTHY]: 'Unhealthy',
    [ServiceStatus.STARTING]: 'Starting',
    [ServiceStatus.STOPPING]: 'Stopping',
    [ServiceStatus.STOPPED]: 'Stopped'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full ${sizeClasses[size]} ${statusColors[status]} animate-pulse`} />
      {showLabel && (
        <span className="text-sm font-medium">
          {statusLabels[status]}
        </span>
      )}
    </div>
  );
}

/**
 * Health dashboard component
 */
export function HealthDashboard() {
  const { healthReport, isMonitoring, checkNow } = useHealthMonitor();
  
  if (!isMonitoring || !healthReport) {
    return <div className="text-gray-500">Loading health status...</div>;
  }
  
  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Health</h3>
        <HealthStatusIndicator 
          status={healthReport.overallStatus} 
          size="md" 
          showLabel 
        />
      </div>
      
      {/* Services */}
      <div className="space-y-2">
        {Object.values(healthReport.services).map(service => (
          <div 
            key={service.name} 
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <div className="font-medium">{service.name}</div>
              <div className="text-sm text-gray-500">
                {service.lastMessage || 'No status'}
              </div>
              {service.responseTime && (
                <div className="text-xs text-gray-400">
                  Response time: {service.responseTime}ms
                </div>
              )}
            </div>
            <HealthStatusIndicator status={service.status} size="sm" />
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={checkNow}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Now
        </button>
      </div>
      
      {/* Recent Events */}
      {healthReport.recentEvents.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Recent Events</h4>
          <div className="space-y-1 text-sm">
            {healthReport.recentEvents.slice(-5).reverse().map((event, idx) => (
              <div key={idx} className="flex items-center gap-2 text-gray-600">
                <HealthStatusIndicator status={event.status} size="sm" />
                <span>{event.service}: {event.message}</span>
                <span className="text-xs text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact health status widget
 */
export function HealthStatusWidget() {
  const { healthReport } = useHealthMonitor();
  
  if (!healthReport) {
    return null;
  }
  
  const unhealthyCount = Object.values(healthReport.services).filter(
    s => s.status === ServiceStatus.UNHEALTHY
  ).length;
  
  return (
    <div className="flex items-center gap-2">
      <HealthStatusIndicator 
        status={healthReport.overallStatus} 
        size="sm" 
      />
      {unhealthyCount > 0 && (
        <span className="text-xs text-red-600 font-medium">
          {unhealthyCount} service{unhealthyCount > 1 ? 's' : ''} down
        </span>
      )}
    </div>
  );
}