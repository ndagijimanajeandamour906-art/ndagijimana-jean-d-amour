import React from 'react';
import { useTolkflow, MainNavTab } from '../../context/TolkflowContext';
import { MessageSquare, Radio, Compass, Camera, Lock, MoreHorizontal, Globe } from 'lucide-react';

interface MobileNavProps {
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore }) => {
  const { activeTab, setActiveTab, conversations } = useTolkflow();

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const tabs: { id: MainNavTab; label: string; icon: any; badge?: number }[] = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: totalUnreadMessages || undefined },
    { id: 'posts', label: 'Feed', icon: Globe },
    { id: 'status', label: 'Status', icon: Camera },
    { id: 'rooms', label: 'Rooms', icon: Radio },
    { id: 'vault', label: 'Vault', icon: Lock },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#070D1E]/95 backdrop-blur-xl border-t border-slate-800/80 z-40 px-2 flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && (
                <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-cyan-400 text-black text-[10px] font-extrabold">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,1)]" />
            )}
          </button>
        );
      })}

      {/* More / Menu trigger */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center w-14 h-full text-slate-400 hover:text-slate-200 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] mt-1">Menu</span>
      </button>
    </nav>
  );
};
