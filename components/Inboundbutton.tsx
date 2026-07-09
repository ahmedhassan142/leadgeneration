// src/components/InboundButtons.tsx
'use client';

import { useState } from 'react';
import { 
  ChatBubbleLeftIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BriefcaseIcon,
  NewspaperIcon,
  BellAlertIcon,
  RssIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ChatBubbleOvalLeftEllipsisIcon, // For Discord
  ChatBubbleBottomCenterTextIcon   // For Slack
} from '@heroicons/react/24/outline';
import { FaDiscord, FaSlack } from 'react-icons/fa';
import toast from 'react-hot-toast';

// UPDATED INTERFACE - Added requestBody
interface InboundButtonProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  endpoint: string;
  requestBody?: any;  // <-- ADD THIS for passing JSON body
  onComplete?: () => void;
}

interface InboundButtonsProps {
  onComplete?: () => void;
}

// UPDATED COMPONENT - Now accepts requestBody
function InboundButton({ name, icon, color, endpoint, requestBody = {}, onComplete }: InboundButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const toastId = toast.loading(`🔄 Scraping ${name} for inbound leads...`);

    try {
      const res = await fetch(endpoint, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Only add body if requestBody is provided and not empty
        ...(Object.keys(requestBody).length > 0 ? { body: JSON.stringify(requestBody) } : {})
      });
      
      const data = await res.json();

      if (data.success) {
        toast.success(
          <div>
            <p className="font-semibold">✅ {data.leadsFound} new leads from {name}!</p>
            {data.leadsFound > 0 && (
              <p className="text-xs opacity-90 mt-1">
                🎯 {data.leadsFound} people actively looking for services
              </p>
            )}
          </div>,
          { id: toastId, duration: 5000 }
        );
        onComplete?.();
      } else {
        toast.error(
          <div>
            <p className="font-semibold">❌ {name} scraping failed</p>
            <p className="text-xs opacity-90 mt-1">{data.error || 'Unknown error'}</p>
          </div>,
          { id: toastId }
        );
      }
    } catch (error) {
      toast.error(`❌ Failed to scrape ${name}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-600 hover:bg-orange-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    red: 'bg-red-600 hover:bg-red-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    teal: 'bg-teal-600 hover:bg-teal-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    pink: 'bg-pink-600 hover:bg-pink-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700',
    gray: 'bg-gray-600 hover:bg-gray-700'  // Added for public-only option
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${colorClasses[color]} text-white rounded-lg px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-105 w-full shadow-sm hover:shadow-md`}
    >
      {loading ? (
        <>
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>Scraping...</span>
        </>
      ) : (
        <>
          {icon}
          <span>{name}</span>
        </>
      )}
    </button>
  );
}

export default function InboundButtons({ onComplete }: InboundButtonsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-indigo-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <GlobeAltIcon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Inbound Lead Scrapers</h2>
          <p className="text-sm text-gray-500">Find people already asking for services</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Social Media & Communities */}
        <InboundButton
          name="LinkedIn"
          icon={<BriefcaseIcon className="h-5 w-5" />}
          color="blue"
          endpoint="/api/inbound/linkedin"
          onComplete={onComplete}
        />
        
        <InboundButton
          name="Twitter/X"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/>
            </svg>
          }
          color="blue"
          endpoint="/api/inbound/twitter"
          onComplete={onComplete}
        />
        
        {/* Facebook - Multiple Options */}
        <InboundButton
          name="FB with Cookies"
          icon={<UserGroupIcon className="h-5 w-5" />}
          color="indigo"
          endpoint="/api/inbound/facebook"
          requestBody={{ useCookies: true, maxResults: 20 }}
          onComplete={onComplete}
        />
        
        <InboundButton
          name="FB Public Only"
          icon={<UserGroupIcon className="h-5 w-5" />}
          color="gray"
          endpoint="/api/inbound/facebook"
          requestBody={{ useCookies: false, maxResults: 20 }}
          onComplete={onComplete}
        />
        
        <InboundButton
          name="FB + Groups"
          icon={<UserGroupIcon className="h-5 w-5" />}
          color="purple"
          endpoint="/api/inbound/facebook"
          requestBody={{ useCookies: true, scrapeGroups: true, maxResults: 30 }}
          onComplete={onComplete}
        />
        
        <InboundButton
          name="Reddit"
          icon={<ChatBubbleLeftIcon className="h-5 w-5" />}
          color="orange"
          endpoint="/api/inbound/reddit"
          onComplete={onComplete}
        />
        
        <InboundButton
          name="IndieHackers"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
            </svg>
          }
          color="purple"
          endpoint="/api/inbound/indiehacker"
          onComplete={onComplete}
        />
        
        {/* Discord & Slack */}
        <InboundButton
          name="Discord"
          icon={<FaDiscord className="h-5 w-5" />}
          color="pink"
          endpoint="/api/inbound/discord"
          onComplete={onComplete}
        />
         
        <InboundButton
          name="Slack"
          icon={<FaSlack className="h-5 w-5" />}
          color="cyan"
          endpoint="/api/inbound/slack"
          onComplete={onComplete}
        />

        {/* Job & Freelance */}
        <InboundButton
          name="Job Boards"
          icon={<BriefcaseIcon className="h-5 w-5" />}
          color="green"
          endpoint="/api/inbound/jobboards"
          onComplete={onComplete}
        />
        
        <InboundButton
          name="Forums"
          icon={<NewspaperIcon className="h-5 w-5" />}
          color="purple"
          endpoint="/api/inbound/forums"
          onComplete={onComplete}
        />
        
        <InboundButton
          name="Hacker News"
          icon={<CodeBracketIcon className="h-5 w-5" />}
          color="orange"
          endpoint="/api/inbound/hackernews"
          onComplete={onComplete}
        />

        {/* Alerts & Press */}
        <InboundButton
          name="Google Alerts"
          icon={<BellAlertIcon className="h-5 w-5" />}
          color="red"
          endpoint="/api/inbound/googlealerts"
          onComplete={onComplete}
        />
        
        <InboundButton
          name="Press Releases"
          icon={<DocumentTextIcon className="h-5 w-5" />}
          color="teal"
          endpoint="/api/inbound/press"
          onComplete={onComplete}
        />
        
        <InboundButton
          name="WordPress"
          icon={<CodeBracketIcon className="h-5 w-5" />}
          color="emerald"
          endpoint="/api/inbound/wordpress"
          onComplete={onComplete}
        />
      </div>

      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full"></span>
            <span className="font-medium text-indigo-600">Facebook with Cookies</span>
            <span className="text-gray-400">• Uses your saved login</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-gray-500 rounded-full"></span>
            <span className="font-medium text-gray-600">Facebook Public Only</span>
            <span className="text-gray-400">• No login required</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
            <span className="font-medium text-purple-600">Facebook + Groups</span>
            <span className="text-gray-400">• Includes private groups</span>
          </div>
        </div>
        <p className="mt-2 text-indigo-600">⚠️ Each scraper runs independently with safe rate limits</p>
      </div>
    </div>
  );
}