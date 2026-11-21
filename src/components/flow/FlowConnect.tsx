import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { ConnectProfile } from '../../types';
import {
  Compass,
  UserPlus,
  Check,
  MessageSquare,
  Sparkles,
  MapPin,
  Search,
  Filter,
  Flame,
} from 'lucide-react';

export const FlowConnect: React.FC = () => {
  const { connectProfiles, connectWithProfile, createConversation, allUsers } = useTolkflow();

  const [skillFilter, setSkillFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const skillsList = ['All', 'Generative AI', 'Distributed Systems', 'Cybersecurity', 'WebRTC', 'Spatial Audio', 'Rust'];

  const filtered = connectProfiles.filter((p) => {
    if (skillFilter !== 'All' && !p.interests.includes(skillFilter)) return false;
    if (searchQuery.trim()) {
      const match =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.interests.some((it) => it.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!match) return false;
    }
    return true;
  });

  const handleStartChatWithMatch = (profile: ConnectProfile) => {
    // Find or construct user
    const existing = allUsers.find((u) => u.name === profile.name);
    if (existing) {
      createConversation(existing);
    } else {
      createConversation({
        id: `user_${profile.id}`,
        name: profile.name,
        username: profile.username,
        email: `${profile.username}@tolkflow.io`,
        phone: '+1 555-0100',
        avatar: profile.avatar,
        bio: profile.bio,
        status: 'online',
        verified: true,
        role: 'user',
        interests: profile.interests,
        followersCount: 120,
        followingCount: 90,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Flow Connect
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Discover and collaborate with innovators, architects and researchers based on deep skill compatibility.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 pb-2 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role, or specific tech stack..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-xs text-white placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Skill Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {skillsList.map((skill) => (
            <button
              key={skill}
              onClick={() => setSkillFilter(skill)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                skillFilter === skill
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Profiles Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="p-5 rounded-3xl bg-gradient-to-b from-[#0A1124] to-[#070D1E] border border-slate-800 hover:border-cyan-500/50 shadow-xl flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-cyan-500/40"
                    />
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {profile.name}
                      </h3>
                      <p className="text-xs text-cyan-400 font-medium">{profile.title}</p>
                      <p className="text-[11px] text-slate-400">{profile.company}</p>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{profile.matchScore}% Match</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">{profile.bio}</p>

                {/* Shared skills */}
                <div className="space-y-1.5 mb-4">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Core Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map((it, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" /> {profile.location}
                  </span>
                  <span>• {profile.mutualConnections} mutual connections</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => connectWithProfile(profile.id)}
                  disabled={profile.isConnected}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    profile.isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(0,102,255,0.3)]'
                  }`}
                >
                  {profile.isConnected ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Connected
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Connect Now
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleStartChatWithMatch(profile)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
