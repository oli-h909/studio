import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, Activity, Calculator, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

const featureCards = [
  { title: 'Реєстр активів', description: 'Каталогізуйте свої корпоративні активи.', icon: Archive, href: '/assets', cta: 'Керувати активами' },
  { title: 'Моніторинг у реальному часі', description: 'Перегляд симульованих даних про мережеві події.', icon: Activity, href: '/monitoring', cta: 'Переглянути події' },
  { title: 'Калькулятор ризиків', description: 'Оцінюйте ризики та вразливості.', icon: Calculator, href: '/risk-calculator', cta: 'Розрахувати ризики' },
  { title: 'Панель звітів', description: 'Створюйте звіти про безпеку.', icon: FileText, href: '/reporting', cta: 'Переглянути звіти' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden relative">
        <ShieldCheck className="absolute top-4 right-4 h-24 w-24 text-primary/10" />
        <div className="md:flex">
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary">Ласкаво просимо до КіберСтраж</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Ваш інтелектуальний партнер у навігації складним ландшафтом кібербезпеки.
              Відстежуйте, аналізуйте та зміцнюйте свій цифровий захист.
            </p>
            <div className="mt-6">
              <Link href="/assets">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Розпочати <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 relative h-64 md:h-auto">
            <Image
              src="https://placehold.co/800x600.png"
              alt="Ілюстрація панелі кібербезпеки"
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
