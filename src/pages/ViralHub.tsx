import { useState } from 'react';
import GuideManagement from './GuideManagement';
import ViralManagement from './ViralManagement';
import BulkRegistration from './BulkRegistration';
import ProjectInfoPage from './ProjectInfo';

const tabs = [
  { key: 'info', label: '프로젝트정보' },
  { key: 'viral', label: '바이럴 관리' },
  { key: 'guides', label: '가이드 관리' },
  { key: 'bulk', label: '바이럴 등록' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function ViralHub() {
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && <ProjectInfoPage />}
      {activeTab === 'viral' && <ViralManagement />}
      {activeTab === 'guides' && <GuideManagement />}
      {activeTab === 'bulk' && <BulkRegistration />}
    </div>
  );
}
