// app/dashboard/page.tsx - PROFESSIONAL STYLING
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Job } from '@/lib/db/models/Job';
import SerpButton from '@/components/Serp/Serpbutton';
import ScrapingDogButton from '@/components/Scrapingdog/Scrapingdog';
import DashboardStats from '@/components/dashboard/DashboardStats';
import QualityChart from '@/components/dashboard/QualityChart';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickActions from '@/components/dashboard/QuickActions';
import ScrapeProgress from '@/components/dashboard/ScrapeProgress';
import MicroBatchIndicator from '@/components/dashboard/MicroBatchIndicator';
import AgenticButton from './AgenticButton';

export default async function DashboardPage() {
  await connectToDatabase();
  
  const [
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    recentLeads,
    qualityData,
    pendingJobs,
    processingJobs,
    completedJobs,
    contactedLeads
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ quality: 'hot' }),
    Lead.countDocuments({ quality: 'warm' }),
    Lead.countDocuments({ quality: 'cold' }),
    Lead.find().sort({ createdAt: -1 }).limit(5).lean(),
    Lead.aggregate([{ $group: { _id: '$quality', count: { $sum: 1 } } }]),
    Job.countDocuments({ status: 'pending' }),
    Job.countDocuments({ status: 'processing' }),
    Job.countDocuments({ status: 'completed' }),
    Lead.countDocuments({ 'outreach.sent': true })
  ]);
  
  const conversionRate = totalLeads > 0 ? ((contactedLeads / totalLeads) * 100).toFixed(1) : '0';
  const aiJobsCompleted = await Job.countDocuments({ type: 'ai', status: 'completed' });
  
  const aiScores = await Lead.aggregate([
    { $match: { 'ai.designScore': { $exists: true, $ne: null } } },
    { $group: { _id: null, avgScore: { $avg: '$ai.designScore' } } }
  ]);
  const avgAIScore = aiScores.length > 0 ? aiScores[0].avgScore : 0;
  
  const pipelineProgress = {
    scrape: await Job.countDocuments({ type: 'scrape', status: 'completed' }),
    analyze: await Job.countDocuments({ type: 'analyze', status: 'completed' }),
    email: await Job.countDocuments({ type: 'email', status: 'completed' }),
    ai: aiJobsCompleted,
    score: await Job.countDocuments({ type: 'score', status: 'completed' })
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        
        {/* ============================================ */}
        {/* HEADER SECTION */}
        {/* ============================================ */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Lead Generation & Sales Automation
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <MicroBatchIndicator 
              pendingJobs={pendingJobs}
              processingJobs={processingJobs}
              completedJobs={completedJobs}
              pipelineProgress={pipelineProgress}
            />
          </div>
        </div>

        {/* ============================================ */}
        {/* LEAD GENERATION SOURCES */}
        {/* ============================================ */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm shadow-blue-200">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Lead Generation Sources</h2>
                  <p className="text-xs text-slate-400">Click to scrape leads from various sources</p>
                </div>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                {totalLeads} leads collected
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="transform transition-all hover:scale-[1.02] hover:shadow-md rounded-xl">
                <SerpButton />
              </div>
              <div className="transform transition-all hover:scale-[1.02] hover:shadow-md rounded-xl">
                <ScrapingDogButton />
              </div>
              <div className="transform transition-all hover:scale-[1.02] hover:shadow-md rounded-xl">
                <AgenticButton />
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-500">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-slate-500">Rate limits apply</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs text-slate-500">Results appear in leads table</span>
              </div>
              <span className="text-xs text-slate-400 ml-auto font-medium">
                Agentic AI runs CrewAI pipeline
              </span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SCRAPE PROGRESS SECTION */}
        {/* ============================================ */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm shadow-purple-200">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Scrape Progress</h2>
                  <p className="text-xs text-slate-400">Real-time updates on lead processing</p>
                </div>
              </div>
              {processingJobs > 0 && (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  {processingJobs} processing
                </span>
              )}
            </div>
            <ScrapeProgress />
          </div>
        </div>

        {/* ============================================ */}
        {/* STATS SECTION */}
        {/* ============================================ */}
        <div className="mb-8">
          <DashboardStats 
            totalLeads={totalLeads}
            hotLeads={hotLeads}
            warmLeads={warmLeads}
            coldLeads={coldLeads}
            contactedLeads={contactedLeads}
            conversionRate={conversionRate}
            aiJobsCompleted={aiJobsCompleted}
            avgAIScore={avgAIScore}
            pendingJobs={pendingJobs}
            processingJobs={processingJobs}
          />
        </div>

        {/* ============================================ */}
        {/* CHARTS & ACTIVITY GRID */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm shadow-emerald-200">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Recent Activity</h2>
                  <p className="text-xs text-slate-400">Latest leads and updates</p>
                </div>
                <span className="text-xs text-slate-400 ml-auto">{recentLeads.length} recent</span>
              </div>
              <ActivityFeed leads={JSON.parse(JSON.stringify(recentLeads))} />
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-sm shadow-rose-200">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Quality Analysis</h2>
                  <p className="text-xs text-slate-400">Lead quality distribution</p>
                </div>
              </div>
              <QualityChart data={qualityData} aiScores={[{ name: 'Average', score: avgAIScore }]} />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* QUICK ACTIONS */}
        {/* ============================================ */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm shadow-indigo-200">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Quick Actions</h2>
                <p className="text-xs text-slate-400">Common tasks and shortcuts</p>
              </div>
            </div>
            <QuickActions />
          </div>
        </div>

        {/* ============================================ */}
        {/* FOOTER */}
        {/* ============================================ */}
        <div className="mt-8 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Lead Generation Dashboard • All rights reserved
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              System {processingJobs > 0 ? 'processing' : 'idle'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
              {totalLeads} leads
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}