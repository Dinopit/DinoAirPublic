import React from 'react';

interface ArtifactNotificationsProps {
  notifications: string[];
  onDismiss: (index: number) => void;
}

const ArtifactNotifications: React.FC<ArtifactNotificationsProps> = ({
  notifications,
  onDismiss
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in flex items-center gap-2"
          style={{
            animation: 'fadeIn 0.3s ease-in-out',
            animationDelay: `${index * 0.1}s`
          }}
        >
          <span>📄</span>
          <span className="text-sm">{notification}</span>
          <button
            onClick={() => onDismiss(index)}
            className="ml-2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ArtifactNotifications;