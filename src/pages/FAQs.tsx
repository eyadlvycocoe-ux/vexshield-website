import { HelpCircle, MessageCircle, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FallingPapers } from "@/components/FallingPapers";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type FaqCategory = {
  title: string;
  faqs: Array<{ question: string; answer: string }>;
};

export default function FAQs() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const faqCategories = t("faq.categories", { returnObjects: true }) as FaqCategory[];

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <FallingPapers />
      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="VexShield" className="h-8 w-auto" />
            <span className="text-lg font-bold text-white">VexShield</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white"
            >
              <Home className="h-4 w-4 mr-1.5 text-sky-400" />
              Back to Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documentation')}
              className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              {t("faq.viewDocs")}
            </Button>
          </div>
        </div>

        <Card className="bg-card/80 border-border/50 backdrop-blur-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">{t("faq.title")}</h1>
                <p className="text-muted-foreground">{t("faq.subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {faqCategories.map((category, catIndex) => (
              <div key={catIndex}>
                <h2 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-border/50">
                  {category.title}
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, faqIndex) => (
                    <AccordionItem 
                      key={faqIndex} 
                      value={`cat-${catIndex}-item-${faqIndex}`} 
                      className="border-border/50"
                    >
                      <AccordionTrigger className="text-left hover:no-underline hover:text-primary transition-colors">
                        <span className="font-medium text-foreground">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pt-2 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* Still Have Questions */}
          <div className="mt-8 p-6 bg-primary/10 rounded-lg border border-primary/30 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("faq.stillQuestions")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("faq.supportPrompt")}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.open('https://discord.gg/5WgtMWbtgD', '_blank')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                {t("faq.joinDiscord")}
              </Button>
              <Button variant="outline" onClick={() => navigate('/documentation')}>
                {t("faq.readDocumentation")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}