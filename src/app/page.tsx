import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { getAllTemplates } from '@/lib/templates';
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { InteractiveDemo } from '@/components/landing/interactive-demo';
import { AiWorkflowSection } from '@/components/landing/ai-workflow-section';
import { GridSystemSection } from '@/components/landing/grid-system-section';
import { ConditionalLogicSection } from '@/components/landing/conditional-logic-section';
import { TemplatesShowcase } from '@/components/landing/templates-showcase';
import { FeaturesSection } from '@/components/landing/features-section';
import { CtaSection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export const metadata = {
  title: 'FormFlow — Build forms that feel designed, not configured',
  description: 'Design beautiful forms visually, generate them with AI, and publish them with a structured 12-column grid and conditional logic.',
};

export default async function HomePage() {
  const { userId } = await auth();
  const templates = getAllTemplates();

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] selection:bg-[#007AFF]/20 selection:text-[#007AFF]">
      <Navbar isAuthenticated={Boolean(userId)} />
      <main>
        <Hero isAuthenticated={Boolean(userId)} />
        <InteractiveDemo />
        <AiWorkflowSection isAuthenticated={Boolean(userId)} />
        <GridSystemSection />
        <ConditionalLogicSection />
        <TemplatesShowcase templates={templates} isAuthenticated={Boolean(userId)} />
        <FeaturesSection />
        <CtaSection isAuthenticated={Boolean(userId)} />
      </main>
      <Footer />
    </div>
  );
}
