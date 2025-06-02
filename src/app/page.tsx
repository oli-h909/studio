import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, Activity, BrainCircuit, Calculator, UserCheck, FileText, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const featureCards = [
  { title: 'Asset Registry', description: 'Catalog your corporate assets.', icon: Archive, href: '/assets', cta: 'Manage Assets' },
  { title: 'Real-time Monitoring', description: 'View simulated network event data.', icon: Activity, href: '/monitoring', cta: 'View Events' },
  { title: 'AI Threat Analyzer', description: 'Analyze potential threats with AI.', icon: BrainCircuit, href: '/threat-analyzer', cta: 'Analyze Threats' },
  { title: 'Risk Calculator', description: 'Evaluate risks and exposures.', icon: Calculator, href: '/risk-calculator', cta: 'Calculate Risks' },
  { title: 'AI Security Advisor', description: 'Get AI-driven security advice.', icon: UserCheck, href: '/security-advisor', cta: 'Get Advice' },
  { title: 'Reporting Panel', description: 'Generate security reports.', icon: FileText, href: '/reporting', cta: 'View Reports' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary">Welcome to CyberGuard AI</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your intelligent partner in navigating the complex landscape of cybersecurity.
              Monitor, analyze, and fortify your digital defenses with cutting-edge AI.
            </p>
            <div className="mt-6">
              <Link href="/assets">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 relative h-64 md:h-auto">
            <Image
              src="https://placehold.co/800x600.png"
              alt="Cybersecurity Dashboard Illustration"
              layout="fill"
              objectFit="cover"
              data-ai-hint="cybersecurity abstract"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent md:bg-gradient-to-r"></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featureCards.map((feature) => (
          <Card key={feature.title} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium font-headline">{feature.title}</CardTitle>
              <feature.icon className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
            <CardContent className="pt-0">
               <Link href={feature.href} passHref>
                <Button variant="outline" className="w-full">
                  {feature.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
