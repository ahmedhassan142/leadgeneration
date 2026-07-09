// lib/email/templates.ts - COMPLETE UPDATED VERSION
import { logger } from '@/lib/scraper/utils/logger';

export interface EmailTemplate {
  subject: string;
  body: string;
  type: 'intro' | 'followup-1' | 'followup-2' | 'final';
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  template: string;
}

class EmailTemplates {
  // ============================================
  // MAIN OUTREACH TEMPLATES
  // ============================================

  /**
   * Generate intro email based on lead data
   */
  generateIntro(lead: any): GeneratedEmail {
    const domain = this.extractDomain(lead.website);
    const issues = lead.ai?.issues || [];
    const mainIssue = issues[0] || 'improve your online presence';
    const location = lead.location || 'your area';
    const niche = lead.niche || 'business';
    
    // Choose template based on lead quality
    if (lead.quality === 'hot') {
      return this.hotLeadIntro(lead, domain, mainIssue, location, niche);
    } else if (lead.quality === 'warm') {
      return this.warmLeadIntro(lead, domain, mainIssue, location, niche);
    } else {
      return this.coldLeadIntro(lead, domain, mainIssue, location, niche);
    }
  }

  private hotLeadIntro(lead: any, domain: string, issue: string, location: string, niche: string): GeneratedEmail {
    const templates = [
      {
        subject: `Quick question about ${domain}`,
        body: `Hi ${lead.name || 'there'},

I was just checking out ${lead.name || 'your business'} and noticed you could ${issue.toLowerCase()}.

This is a critical issue that, when fixed, could significantly increase your conversions. We've helped similar ${niche} businesses in ${location} achieve 40-60% more leads by addressing exactly this.

I'd love to share some specific solutions with you. Got 10 minutes this week?

Best regards,
[Your Name]`
      },
      {
        subject: `Idea for ${domain}`,
        body: `Hello ${lead.name || 'there'},

Your ${niche} business looks great! I specialize in helping companies like yours with web development and AI integration.

I noticed that ${issue}. Fixing this could be a game-changer for your online presence.

Would you be open to a quick chat? I'm happy to provide some free advice.

Cheers,
[Your Name]`
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return { ...template, template: 'intro-hot' };
  }

  private warmLeadIntro(lead: any, domain: string, issue: string, location: string, niche: string): GeneratedEmail {
    const templates = [
      {
        subject: `Suggestion for ${domain}`,
        body: `Hi ${lead.name || 'there'},

I came across your ${niche} business while researching companies in ${location}. Great work!

I did notice that your website could use some improvements, particularly with ${issue}.

We specialize in helping businesses like yours with exactly these types of issues. Would you be interested in a brief 10-minute call to discuss?

Best regards,
[Your Name]`
      },
      {
        subject: `Quick thought about ${lead.name}`,
        body: `Hello,

I've been following ${lead.name} and really like what you're doing in the ${niche} space.

I specialize in web development and AI integration, and I think I could help you take things to the next level. Specifically, I notice that ${issue}.

Let me know if you'd be open to a quick conversation!

Best,
[Your Name]`
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return { ...template, template: 'intro-warm' };
  }

  private coldLeadIntro(lead: any, domain: string, issue: string, location: string, niche: string): GeneratedEmail {
    const templates = [
      {
        subject: `Quick question about ${domain}`,
        body: `Hi ${lead.name || 'there'},

I'm reaching out because I help ${niche} businesses improve their online presence and get more customers.

I noticed your website could benefit from some optimization, particularly with ${issue}.

If you're interested, I'd be happy to share a few suggestions at no cost.

Best regards,
[Your Name]`
      },
      {
        subject: `Introduction`,
        body: `Hello,

I specialize in web development and AI solutions for ${niche} businesses.

I came across your website and thought you might be interested in how we've helped similar companies grow their online presence.

Let me know if you'd like to learn more!

Thanks,
[Your Name]`
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return { ...template, template: 'intro-cold' };
  }

  // ============================================
  // FOLLOW-UP SEQUENCE TEMPLATES
  // ============================================

  /**
   * First follow-up (2-3 days after intro)
   */
  generateFollowUp1(lead: any, previousDate: Date): GeneratedEmail {
    const daysSince = Math.floor((Date.now() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
    const domain = this.extractDomain(lead.website);
    
    return {
      subject: `Following up re: ${domain}`,
      body: `Hi ${lead.name || 'there'},

Just circling back on my email from ${daysSince} days ago about your website.

I know you're busy, but I genuinely think I could help you improve your online presence and get more customers.

Would 10 minutes next week work for a quick chat?

Best regards,
[Your Name]`,
      template: 'followup-1'
    };
  }

  /**
   * Second follow-up (5-7 days after first follow-up)
   */
  generateFollowUp2(lead: any, previousDate: Date): GeneratedEmail {
    const daysSince = Math.floor((Date.now() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
    const domain = this.extractDomain(lead.website);
    
    const templates = [
      {
        subject: `Still interested in helping ${domain}`,
        body: `Hi ${lead.name || 'there'},

I'm still very interested in potentially working with you. I've helped several ${lead.niche || 'similar'} businesses achieve great results by addressing the issues I mentioned.

Just wanted to check if this is something you'd be open to discussing.

Let me know either way!

Best,
[Your Name]`
      },
      {
        subject: `Quick question about ${domain}`,
        body: `Hello ${lead.name || 'there'},

Following up one last time - I'd still love to help you improve your website if you're interested.

We're currently offering a free website audit that might be valuable for you.

Would you like me to send that over?

Thanks,
[Your Name]`
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return {
      subject: template.subject,
      body: template.body,
      template: 'followup-2'
    };
  }

  /**
   * Final follow-up (10-14 days after intro)
   */
  generateFinalFollowUp(lead: any, previousDate: Date): GeneratedEmail {
    const domain = this.extractDomain(lead.website);
    
    return {
      subject: `One last thought about ${domain}`,
      body: `Hi ${lead.name || 'there'},

I'll keep this brief - I'm wrapping up my outreach for now, but if you ever need help with your website or want to discuss potential improvements, feel free to reach out.

You can always reply to this email to connect.

Wishing you all the best with ${lead.name || 'your business'}!

Best regards,
[Your Name]`,
      template: 'final'
    };
  }

  // ============================================
  // SPECIFIC USE-CASE TEMPLATES
  // ============================================

  /**
   * Template for leads with AI issues
   */
  generateAITemplate(lead: any): GeneratedEmail {
    const domain = this.extractDomain(lead.website);
    
    return {
      subject: `AI integration for ${lead.name || 'your business'}`,
      body: `Hi ${lead.name || 'there'},

I noticed you're working with AI technologies. We specialize in helping businesses like yours integrate AI solutions effectively.

Specifically, I think we could help you with:
• ${lead.ai?.issues?.join('\n• ') || 'AI model optimization and integration'}

Would you be open to a quick chat about how we could accelerate your AI initiatives?

Best regards,
[Your Name]`,
      template: 'ai-specific'
    };
  }

  /**
   * Template for leads with website performance issues
   */
  generatePerformanceTemplate(lead: any): GeneratedEmail {
    const domain = this.extractDomain(lead.website);
    
    return {
      subject: `Website performance for ${domain}`,
      body: `Hi ${lead.name || 'there'},

I was checking out your website and noticed it could be faster. Website speed directly impacts conversion rates - a 1-second delay can reduce conversions by 7%.

We specialize in optimizing website performance. I'd love to show you how we could speed up your site and improve user experience.

Let me know if you're interested!

Best,
[Your Name]`,
      template: 'performance'
    };
  }

  // ============================================
  // 🔥 VALUE-ADD TEMPLATE
  // ============================================
  generateValueAddTemplate(lead: any): GeneratedEmail {
    const domain = this.extractDomain(lead.website);
    
    return {
      subject: `Idea for ${domain}`,
      body: `Hi ${lead.name || 'there'},

I had an idea for your business that I wanted to share. Based on your website, I think you could really benefit from:

1. Improving your site's loading speed
2. Adding a chatbot for instant customer support
3. Implementing better SEO practices

These are exactly the types of things we help businesses with every day.

Would you be open to a quick 10-minute call to discuss?

Best,
[Your Name]`,
      template: 'value-add'
    };
  }

  // ============================================
  // 🔥 SEQUENCE GENERATOR
  // ============================================
  generateForSequence(lead: any, templateName: string, previousDate?: Date): GeneratedEmail {
    switch (templateName) {
      case 'intro':
        return this.generateIntro(lead);
      case 'followup-1':
        return this.generateFollowUp1(lead, previousDate || new Date());
      case 'followup-2':
        return this.generateFollowUp2(lead, previousDate || new Date());
      case 'final':
        return this.generateFinalFollowUp(lead, previousDate || new Date());
      case 'value-add':
        return this.generateValueAddTemplate(lead);
      case 'ai-specific':
        return this.generateAITemplate(lead);
      default:
        return this.generateIntro(lead);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private extractDomain(website: string): string {
    try {
      const url = new URL(website);
      return url.hostname.replace('www.', '');
    } catch {
      return website || 'your website';
    }
  }

  /**
   * Generate email based on lead data and sequence step
   */
  generateForLead(lead: any, step: string, previousDate?: Date): GeneratedEmail {
    return this.generateForSequence(lead, step, previousDate);
  }

  /**
   * Generate custom email with specific focus
   */
  generateCustom(lead: any, focus: 'ai' | 'performance' | 'general'): GeneratedEmail {
    switch (focus) {
      case 'ai':
        return this.generateAITemplate(lead);
      case 'performance':
        return this.generatePerformanceTemplate(lead);
      default:
        return this.generateIntro(lead);
    }
  }
}

// Export singleton instance
export const emailTemplates = new EmailTemplates();

// For backward compatibility
export function generateOutreachEmail(lead: any) {
  return emailTemplates.generateIntro(lead);
}

export function generateFollowUpEmail(lead: any, previousDate: Date) {
  return emailTemplates.generateFollowUp1(lead, previousDate);
}