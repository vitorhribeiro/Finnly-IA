"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, MessageSquare, PieChart, Shield, Smartphone, Target, TrendingUp, Zap, Sparkles, LayoutDashboard, Wallet, Plane, Home as HomeIcon, Car, PiggyBank, Mail, User } from "lucide-react";
import { motion, useScroll, useTransform, animate, useInView } from "framer-motion";
import Image from "next/image";
import AnimatedChat from "@/components/AnimatedChat";
import AnimatedWhatsAppChat from "@/components/AnimatedWhatsAppChat";
import { Fireworks } from "@/components/Fireworks";
const AnimatedLinesBackground = ({
  className = "fixed inset-0",
  bgClass = "bg-[#F8FAF9]",
  opacity = "opacity-[0.1]"
}: {
  className?: string;
  bgClass?: string;
  opacity?: string;
} = {}) => {
  return (
    <div className={`${className} z-[-1] pointer-events-none flex items-center justify-center overflow-hidden ${bgClass}`}>
      <svg
        viewBox="0 0 1000 1000"
        className={`absolute w-[200vw] h-[200vh] min-w-[1200px] min-h-[1200px] ${opacity}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g strokeWidth="1.5" fill="none">
          {[
            { color: "#016B4C", d: "M-500,500 C-200,200 200,800 500,500 C800,200 1200,800 1500,500 C1800,200 2200,800 2500,500", duration: 25, delay: 0, swayX: -200, swayY: 50, strokeOpacity: 0.6 },
            { color: "#F57C00", d: "M-500,450 C-100,100 300,900 600,450 C900,0 1300,900 1600,450 C1900,0 2300,900 2600,450", duration: 35, delay: 2, swayX: 200, swayY: -50, strokeOpacity: 0.5 },
            { color: "#FFB300", d: "M-500,550 C-300,800 100,200 400,550 C700,900 1100,200 1400,550 C1700,900 2100,200 2400,550", duration: 30, delay: 5, swayX: -150, swayY: 100, strokeOpacity: 0.5 },
            { color: "#01A374", d: "M-500,600 C-200,900 200,300 500,600 C800,900 1200,300 1500,600 C1800,900 2200,300 2500,600", duration: 40, delay: 1, swayX: 300, swayY: -80, strokeOpacity: 0.4 },
            { color: "#016B4C", d: "M-500,400 C-250,150 150,750 450,400 C750,150 1150,750 1450,400 C1750,150 2150,750 2450,400", duration: 20, delay: 0, swayX: -250, swayY: 60, width: 1, strokeOpacity: 0.5 },
          ].map((line, i) => (
            <motion.path
              key={i}
              stroke={line.color}
              strokeWidth={line.width || 1.5}
              strokeOpacity={line.strokeOpacity}
              d={line.d}
              initial={{ x: 0, y: 0 }}
              animate={{
                x: [0, line.swayX, 0],
                y: [0, line.swayY, 0]
              }}
              transition={{
                duration: line.duration,
                delay: line.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAF9] via-transparent to-[#F8FAF9]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAF9] via-transparent to-[#F8FAF9]" />
    </div>
  );
};

const AnimatedCounter = ({ value, delay = 0.5, duration = 1.5 }: { value: number, delay?: number, duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      const controls = animate(0, value, {
        duration,
        delay,
        ease: "easeOut",
        onUpdate(v) {
          setCount(Math.round(v));
        }
      });
      return () => controls.stop();
    }
  }, [inView, value, delay, duration]);

  return <span ref={ref}>{count}</span>;
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  const yPos = useTransform(scrollY, [0, 1000], [0, 1000]);

  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['inicio', 'ia-financeira', 'como-funciona', 'whatsapp', 'planos'];
      let current = 'inicio';

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 3) {
            current = section;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'inicio', label: 'Início', href: '#inicio' },
    { id: 'ia-financeira', label: 'IA Financeira', href: '#ia-financeira' },
    { id: 'como-funciona', label: 'Como Funciona', href: '#como-funciona' },
    { id: 'whatsapp', label: 'WhatsApp', href: '#whatsapp' },
    { id: 'planos', label: 'Metas', href: '#planos' },
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#111827] font-sans selection:bg-[#016B4C]/20 overflow-x-hidden relative">
      <AnimatedLinesBackground />
      {/* Navbar Floating Pill */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50">
        <div className="bg-white/70 backdrop-blur-xl border border-gray-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-full pl-3 pr-3 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden relative">
              <Image src="/images/logosemfundo.png" alt="Finnly Logo" fill className="object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#016B4C] hidden md:block">Finnly</span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-500">
            {navLinks.map((link) => (
              <div key={link.id} className="relative flex flex-col items-center group">
                <a
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`transition-colors py-1 ${activeSection === link.id ? 'text-[#F57C00] font-semibold' : 'hover:text-gray-900'}`}
                >
                  {link.label}
                </a>
                {activeSection === link.id && (
                  <motion.div
                    layoutId="navbar-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#F57C00] rounded-full"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <a href="/login?mode=signup">
              <Button className="bg-[#01A374] hover:bg-[#018F63] text-white rounded-full px-4 md:px-6 h-10 shadow-lg shadow-[#01A374]/20 transition-all hover:-translate-y-0.5 font-semibold text-xs md:text-sm">
                Começar Grátis
              </Button>
            </a>
            <div className="h-5 w-px bg-gray-200"></div>
            <a href="/login?mode=login">
              <button className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gray-50 hover:bg-[#016B4C]/10 text-gray-500 hover:text-[#016B4C] transition-all rounded-full border border-gray-200 hover:border-[#016B4C]/30 shadow-sm hover:shadow-md cursor-pointer">
                <User className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
              </button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="min-h-[100svh] lg:h-screen lg:max-h-[900px] lg:min-h-[600px] flex items-center pt-28 pb-10 px-4 md:px-6 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#016B4C]/5 to-transparent -z-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-10 items-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-4 relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#016B4C]/10 text-[#016B4C] text-xs md:text-sm font-medium w-fit shadow-sm">
              <Sparkles className="w-4 h-4 text-[#F57C00]" />
              Sua Consultoria Financeira Inteligente
            </div>
            <h1 className="text-[36px] sm:text-5xl lg:text-[52px] font-bold leading-[1.1] tracking-tight text-[#111827]">
              Você não precisa entender de finanças.<br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#016B4C] to-[#01A374]">
                O Finnly entende por você.
              </span>
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed max-w-lg">
              Seu consultor financeiro com IA acompanha suas metas, seus gastos e seus objetivos para ajudar você a tomar decisões melhores.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 pt-1 w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-[#016B4C] hover:bg-[#01533B] text-white rounded-full px-6 h-14 sm:h-12 text-base font-medium shadow-xl shadow-[#016B4C]/25 transition-all hover:shadow-2xl hover:-translate-y-1">
                Começar Gratuitamente
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-6 h-14 sm:h-12 text-base font-medium border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all hover:-translate-y-1 shadow-sm">
                Ver Demonstração
              </Button>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200/60">
              <span className="text-sm font-medium text-gray-500">Nossos canais:</span>
              <div className="flex items-center gap-2">
                <a href="#" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#E1306C] hover:border-[#E1306C] shadow-sm transition-all hover:-translate-y-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#25D366] hover:border-[#25D366] shadow-sm transition-all hover:-translate-y-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#01A374] hover:border-[#01A374] shadow-sm transition-all hover:-translate-y-0.5">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>

          <div className="hidden lg:block w-full h-[500px]"></div>

          <motion.div
            className="hidden md:block relative lg:absolute lg:top-[calc(50%+64px)] lg:-translate-y-1/2 lg:left-[calc(50%+24px)] lg:w-[calc(min(50%,700px)-48px)] h-[320px] md:h-[400px] lg:h-[500px] w-full lg:translate-x-4 z-0 pointer-events-none mt-10 lg:mt-0"
          >
            {/* [INTERFACE DO APLICATIVO / DASHBOARD] */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              {/* Fade Esquerdo reduzido para expor mais a imagem */}
              <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#F8FAF9] via-[#F8FAF9]/80 to-transparent z-20 pointer-events-none"></div>

              {/* Fades nas outras bordas para remover qualquer linha dura da imagem */}
              <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[#F8FAF9] to-transparent z-20 pointer-events-none"></div>
              <div className="absolute inset-x-0 top-0 h-[15%] bg-gradient-to-b from-[#F8FAF9] to-transparent z-20 pointer-events-none"></div>
              <div className="absolute inset-x-0 bottom-0 h-[15%] bg-gradient-to-t from-[#F8FAF9] to-transparent z-20 pointer-events-none"></div>

              <Image
                src="/images/webp/dashboard.webp"
                alt="Dashboard Finnly IA"
                fill
                className="object-cover object-right z-10"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 2: Conversational UI */}
      <section id="ia-financeira" className="py-16 md:py-24 px-4 md:px-6 bg-white/90 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20 relative"
          >
            {/* Subtle glow behind the title */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#F57C00]/[0.06] blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#F57C00]/20 text-[#F57C00] text-sm font-semibold mb-6 shadow-sm shadow-[#F57C00]/5">
                <Sparkles className="w-4 h-4 text-[#F57C00]" />
                IA Financeira
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[56px] font-extrabold tracking-tight text-[#111827] mb-6 leading-[1.1]">
                Pergunte qualquer coisa sobre sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F57C00] to-[#FFB300]">vida financeira.</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium">
                Uma conversa simples, natural e direta. O Finnly analisa seus dados em tempo real para dar a resposta exata.
              </p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <motion.div
              {...fadeInUp}
              className="lg:col-span-7 bg-[#F8FAF9] rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-100 p-4 px-6 flex items-center gap-4 shadow-sm z-10">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#016B4C] to-[#01A374] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">Finnly IA</h3>
                  <p className="text-xs text-[#016B4C] font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01A374] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#01A374]"></span>
                    </span>
                    Sempre online
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <AnimatedChat />
            </motion.div>

            <motion.div
              {...fadeInUp}
              className="hidden md:flex lg:col-span-5 h-[250px] sm:h-[300px] md:h-[400px] lg:h-[500px] w-full items-center justify-center relative mt-6 lg:mt-0"
            >
              {/* [MASCOTE EXPLICANDO] */}
              <Image
                src="/images/webp/comofunciona.webp"
                alt="Como o Finnly Funciona"
                fill
                className="object-contain"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Central Intelligence */}
      <section id="como-funciona" className="py-16 md:py-24 px-4 md:px-6 bg-[#0B1210] text-white relative overflow-hidden">
        {/* Subtle background glowing orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#016B4C]/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            <motion.div
              {...fadeInUp}
              className="order-2 lg:order-1 h-[350px] sm:h-[400px] lg:h-[500px] w-full flex items-center justify-center relative lg:mt-20"
            >
              {/* Magical Aura */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-[#01A374]/30 blur-[80px] rounded-full pointer-events-none"></div>

              {/* Orbital Path / Radar rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full border border-white/5 border-dashed"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[480px] md:h-[480px] rounded-full border border-white/5 border-dashed"></div>

              {/* Floating Nodes */}
              <div className="absolute inset-0 scale-90 sm:scale-100 origin-center transition-transform duration-500 z-20 pointer-events-none">
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0B1210]/90 border border-white/10 flex items-center justify-center absolute top-[5%] left-[10%] lg:top-[5%] lg:left-[10%] shadow-xl z-20"
                >
                  <Wallet className="w-6 h-6 md:w-7 md:h-7 text-[#01A374]" />
                </motion.div>

                <motion.div
                  animate={{ y: [10, -10, 10] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0B1210]/90 border border-white/10 flex items-center justify-center absolute bottom-[10%] left-[15%] lg:bottom-[15%] lg:left-[5%] shadow-xl z-20"
                >
                  <PieChart className="w-6 h-6 md:w-7 md:h-7 text-[#F57C00]" />
                </motion.div>

                <motion.div
                  animate={{ y: [-12, 12, -12] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0B1210]/90 border border-white/10 flex items-center justify-center absolute top-[20%] right-[5%] lg:top-[15%] lg:right-[0%] shadow-xl z-20"
                >
                  <Target className="w-6 h-6 md:w-7 md:h-7 text-[#FFB300]" />
                </motion.div>

                <motion.div
                  animate={{ y: [8, -8, 8] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0B1210]/90 border border-white/10 flex items-center justify-center absolute bottom-[15%] right-[10%] lg:bottom-[20%] lg:right-[5%] shadow-xl z-20"
                >
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#25D366]" />
                </motion.div>

                <motion.div
                  animate={{ y: [-15, 15, -15] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0B1210]/90 border border-white/10 flex items-center justify-center absolute top-[45%] left-[-5%] lg:top-[50%] lg:left-[-5%] shadow-xl z-20"
                >
                  <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                </motion.div>

                <motion.div
                  animate={{ y: [12, -12, 12] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0B1210]/90 border border-white/10 flex items-center justify-center absolute top-[55%] right-[-5%] lg:top-[60%] lg:right-[-5%] shadow-xl z-20"
                >
                  <Zap className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                </motion.div>
              </div>

              {/* [MASCOTE OBSERVANDO OS DADOS] */}
              <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] lg:w-[450px] lg:h-[450px] z-10 relative">
                <Image
                  src="/images/webp/analisando.webp"
                  alt="Mascote Analisando Dados"
                  fill
                  className="object-contain"
                />
              </div>
            </motion.div>

            <motion.div
              {...fadeInUp}
              className="order-1 lg:order-2 flex flex-col gap-8 lg:pl-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#01A374] text-sm font-medium mb-6">
                  <Zap className="w-4 h-4" /> Inteligência Ativa
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[52px] font-extrabold tracking-tight text-white leading-[1.1]">
                  O Finnly entende <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01A374] to-[#016B4C]">sua realidade.</span>
                </h2>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                {/* Feature 1 */}
                <div className="group flex gap-5 p-5 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#01A374]/20 to-[#016B4C]/20 border border-[#01A374]/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-6 h-6 text-[#01A374]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1.5">Receitas e Despesas</h3>
                    <p className="text-gray-400 leading-relaxed">Tudo categorizado automaticamente para você saber exatamente para onde seu dinheiro vai.</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="group flex gap-5 p-5 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F57C00]/20 to-[#E65100]/20 border border-[#F57C00]/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-6 h-6 text-[#F57C00]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1.5">Metas Inteligentes</h3>
                    <p className="text-gray-400 leading-relaxed">Defina objetivos e deixe o Finnly calcular a rota mais segura e rápida para alcançá-los.</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="group flex gap-5 p-5 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFB300]/20 to-[#FF8F00]/20 border border-[#FFB300]/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <LayoutDashboard className="w-6 h-6 text-[#FFB300]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1.5">Visão Conectada</h3>
                    <p className="text-gray-400 leading-relaxed">Suas finanças em um único lugar, analisadas por uma inteligência que aprende com seus hábitos.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 4: WhatsApp Integration */}
      <section id="whatsapp" className="py-16 md:py-24 px-4 md:px-6 bg-white/90 relative overflow-hidden">
        {/* Subtle WhatsApp green glow */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-[#25D366]/[0.04] blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              {...fadeInUp}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#25D366]/15 to-[#128C7E]/10 border border-[#25D366]/20 text-[#075E54] text-sm font-semibold w-fit shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <MessageSquare className="w-4 h-4" />
                Sempre com você
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[52px] font-extrabold tracking-tight text-[#111827] leading-[1.1]">
                Seu consultor também está no <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] to-[#128C7E]">WhatsApp.</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-xl font-medium">
                Acesse o Finnly de onde estiver, como se estivesse conversando com um amigo no WhatsApp. Sem precisar abrir o app.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {[
                  { text: '"Gastei R$ 50 no mercado"', color: 'bg-red-500', shadow: 'shadow-red-500/40', border: 'hover:border-red-500/30' },
                  { text: '"Recebi R$ 3.000"', color: 'bg-[#25D366]', shadow: 'shadow-[#25D366]/40', border: 'hover:border-[#25D366]/30' },
                  { text: '"Quanto tenho disponível?"', color: 'bg-blue-500', shadow: 'shadow-blue-500/40', border: 'hover:border-blue-500/30' },
                  { text: '"Posso comprar um videogame?"', color: 'bg-purple-500', shadow: 'shadow-purple-500/40', border: 'hover:border-purple-500/30' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={`bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl flex items-center gap-4 cursor-pointer transition-all duration-300 ${item.border} group`}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className={`absolute w-5 h-5 rounded-full ${item.color} opacity-20 group-hover:animate-ping`} />
                      <div className={`relative w-3 h-3 rounded-full ${item.color} shadow-[0_0_8px_var(--tw-shadow-color)] ${item.shadow}`} />
                    </div>
                    <span className="font-medium text-gray-700 text-[15px] group-hover:text-gray-900 transition-colors">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...fadeInUp}
              className="relative flex justify-center items-center h-[600px]"
            >
              {/* Smartphone Mockup */}
              <div className="w-[300px] h-[600px] bg-[#111] rounded-[3rem] p-2 shadow-2xl relative z-10 ring-1 ring-gray-200">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075E54] text-white p-4 pt-10 flex items-center gap-3 shadow-md z-10">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center relative overflow-hidden ring-2 ring-white/20">
                      {/* Logo Profile Picture */}
                      <Image
                        src="/images/webp/finn.webp"
                        alt="Finnly Profile"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold leading-tight">Finnly IA</div>
                      <div className="text-[10px] text-white/80">online</div>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <AnimatedWhatsAppChat />
                </div>
              </div>

              {/* [MASCOTE AO LADO DO SMARTPHONE] */}
              <motion.div 
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 lg:-right-24 bottom-4 lg:bottom-12 w-[180px] h-[180px] lg:w-[260px] lg:h-[260px] z-20 rounded-full overflow-hidden"
              >
                <Image
                  src="/images/webp/investigando-v2.webp"
                  alt="Mascote Investigando Celular"
                  fill
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 5: Goals & Plans */}
      <section id="planos" className="py-16 md:py-32 px-4 md:px-6 bg-[#F8FAF9] relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#016B4C]/[0.03] to-transparent rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#F57C00]/[0.03] to-transparent rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#016B4C]/10 text-[#016B4C] text-sm font-semibold mb-6 shadow-sm">
              <Target className="w-4 h-4 text-[#F57C00]" />
              Metas Inteligentes
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[56px] font-extrabold tracking-tight text-[#111827] mb-6 leading-[1.1]">
              Transforme objetivos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#016B4C] to-[#01A374]">planos reais.</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium">
              Acompanhe o progresso do seu dinheiro com widgets interativos. O Finnly calcula exatamente quanto falta para você alcançar o que deseja.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Widget 1: Viagem Europa (Span 2) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 bg-white rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 md:mb-12 gap-4">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
                    <Plane className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Viagem Europa</h3>
                  <p className="text-gray-500 font-medium">Objetivo para Dezembro 2026</p>
                </div>
                <div className="text-left md:text-right">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-50 text-green-700 text-sm font-bold rounded-full border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    No caminho certo
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Acumulado</div>
                    <span className="text-gray-900 text-3xl sm:text-4xl font-extrabold tracking-tight">R$ 15.600</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Meta</div>
                    <span className="text-gray-400 text-2xl font-bold">R$ 24.000</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "65%" }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    className="bg-blue-500 h-full rounded-full relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/30 to-transparent"></div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Widget 2: Reserva (Span 1) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-1 bg-gradient-to-br from-[#016B4C] to-[#014A34] text-white rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_rgba(1,107,76,0.2)] hover:shadow-[0_20px_40px_rgba(1,107,76,0.3)] transition-all duration-500 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
              <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                <Shield className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-5 backdrop-blur-md border border-white/20">
                  <PiggyBank className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight">Reserva de Emergência</h3>
              </div>
              <div className="relative z-10 mt-8">
                <div className="text-5xl md:text-6xl font-black tracking-tighter mb-2"><AnimatedCounter value={80} delay={0.2} duration={1.5} /><span className="text-3xl">%</span></div>
                <p className="text-emerald-100/80 text-sm font-medium leading-relaxed">Faltam apenas 2 meses para atingir a sua meta de segurança.</p>
              </div>
            </motion.div>

            {/* Widget 3: Carro (Span 1) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="md:col-span-1 bg-white rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                  <Car className="w-7 h-7" />
                </div>
                <div className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-sm font-bold border border-orange-100">Carro Zero</div>
              </div>
              
              <div className="flex flex-col items-center justify-center py-6 relative">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-100" />
                    <motion.circle 
                      strokeDasharray="440"
                      initial={{ strokeDashoffset: 440 }}
                      whileInView={{ strokeDashoffset: 440 - (440 * 0.45) }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" strokeLinecap="round" 
                      className="text-orange-500" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="text-4xl font-black text-gray-900 tracking-tighter"
                    >
                      <AnimatedCounter value={45} delay={0.5} duration={1.5} />%
                    </motion.div>
                  </div>
                </div>
              </div>
              <div className="text-center mt-2">
                <p className="text-gray-500 font-medium">Troca programada em breve</p>
              </div>
            </motion.div>

            {/* Widget 4: Casa Própria (Span 2) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="md:col-span-2 bg-white rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10"
            >
              <div className="shrink-0 w-full md:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-5 border border-teal-100">
                  <HomeIcon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Casa Própria</h3>
                <p className="text-gray-500 font-medium text-sm">Entrada do Financiamento</p>
              </div>

              <div className="flex-1 w-full pt-6 md:pt-0 pl-0 md:pl-10 border-t md:border-t-0 md:border-l border-gray-100">
                {/* Milestone tracker */}
                <div className="relative pt-4 pb-8">
                  {/* Track line */}
                  <div className="absolute top-4 left-0 w-full h-2 bg-gray-100 rounded-full"></div>
                  {/* Progress line */}
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "32%" }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                    className="absolute top-4 left-0 h-2 bg-teal-500 rounded-full"
                  ></motion.div>
                  
                  {/* Milestones */}
                  <div className="relative flex justify-between top-3.5">
                    <div className="flex flex-col items-center group cursor-default">
                      <div className="w-3 h-3 rounded-full bg-teal-500 ring-4 ring-teal-100 z-10 transition-transform group-hover:scale-150"></div>
                      <span className="text-xs font-bold text-gray-900 mt-4">Início</span>
                    </div>
                    <div className="flex flex-col items-center group cursor-default" style={{ position: 'absolute', left: '32%', transform: 'translateX(-50%)' }}>
                      <div className="w-5 h-5 rounded-full bg-white border-4 border-teal-500 z-10 shadow-md transition-transform group-hover:scale-125"></div>
                      <span className="text-xs font-bold text-teal-600 mt-3 bg-teal-50 px-2 py-0.5 rounded-md">Hoje (32%)</span>
                    </div>
                    <div className="flex flex-col items-center group cursor-default">
                      <div className="w-3 h-3 rounded-full bg-gray-200 border-2 border-white z-10 transition-transform group-hover:scale-150"></div>
                      <span className="text-xs font-bold text-gray-400 mt-4">Meta Final</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Section 6: Benefits Grid */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-white/90 border-t border-gray-100/50 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#016B4C]/[0.03] blur-[100px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20 relative"
          >
            {/* Title Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#01A374]/[0.08] blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#016B4C]/10 text-[#016B4C] text-sm font-semibold mb-6 shadow-sm shadow-[#016B4C]/5">
                <Zap className="w-4 h-4 text-[#F57C00]" />
                Por que o Finnly?
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[56px] font-extrabold tracking-tight text-[#111827] mb-6 leading-[1.1]">
                Menos ansiedade.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#016B4C] to-[#01A374]">Mais clareza.</span>
              </h2>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: LayoutDashboard,
                color: "text-[#016B4C]",
                bg: "bg-[#016B4C]/10",
                borderColor: "border-[#016B4C]/20",
                title: "Organização",
                desc: "Tudo em um só lugar. Uma visão limpa e clara da sua vida financeira sem planilhas complexas e desatualizadas."
              },
              {
                icon: Shield,
                color: "text-[#F57C00]",
                bg: "bg-[#F57C00]/10",
                borderColor: "border-[#F57C00]/20",
                title: "Segurança",
                desc: "Sistemas bancários criptografados. O Finnly apenas lê seus dados para te aconselhar, sem risco de movimentações."
              },
              {
                icon: TrendingUp,
                color: "text-[#FFB300]",
                bg: "bg-[#FFB300]/10",
                borderColor: "border-[#FFB300]/20",
                title: "Planejamento",
                desc: "Projeções baseadas em inteligência artificial para o seu futuro financeiro. Saiba exatamente onde você vai chegar."
              },
              {
                icon: Plane,
                color: "text-[#01A374]",
                bg: "bg-[#01A374]/10",
                borderColor: "border-[#01A374]/20",
                title: "Liberdade",
                desc: "Saiba que está tomando as decisões certas e gaste seu dinheiro sem dor de cabeça ou culpa."
              }
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1 overflow-hidden"
              >
                {/* Subtle background glow on hover */}
                <div className={`absolute top-0 right-0 w-48 h-48 rounded-full ${card.bg} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none translate-x-1/3 -translate-y-1/3`} />

                <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
                  <div className={`w-16 h-16 rounded-2xl ${card.bg} flex items-center justify-center shrink-0 border ${card.borderColor} shadow-sm group-hover:scale-110 transition-transform duration-500 ease-out`}>
                    <card.icon className={`w-8 h-8 ${card.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold mb-3 text-gray-900">{card.title}</h3>
                    <p className="text-gray-500 leading-relaxed font-medium text-sm sm:text-base">{card.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-32 px-4 md:px-6 bg-[#F8FAF9] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-[#016B4C]/5 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative group">
          {/* Outer glow for the container itself */}
          <div className="absolute inset-0 bg-[#016B4C]/20 blur-[100px] rounded-3xl md:rounded-[3rem] pointer-events-none transition-all duration-700 group-hover:bg-[#016B4C]/30" />
          
          <div className="bg-gradient-to-br from-[#002B1D] via-[#015C41] to-[#00422E] rounded-3xl md:rounded-[3rem] p-8 md:p-16 lg:p-20 relative overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(1,107,76,0.3)]">
            
            {/* Premium Background Textures */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#FFB300]/20 via-transparent to-transparent opacity-60 translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

            {/* Fireworks covering the whole CTA background */}
            <Fireworks />

            <div className="relative z-10 grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 flex flex-col gap-8 text-white">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-emerald-100 text-sm font-semibold mb-6 backdrop-blur-md">
                    <Sparkles className="w-4 h-4 text-[#FFB300]" />
                    Transforme sua vida hoje
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white mb-6">
                    Seu futuro <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-400">financeiro</span> começa com a próxima decisão.
                  </h2>
                  <p className="text-lg md:text-xl text-emerald-50/70 max-w-lg font-medium leading-relaxed">
                    E o Finnly te ajuda a tomar a decisão certa. Junte-se a milhares de pessoas que já alcançaram a clareza financeira definitiva.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-4">
                  <div className="relative group/btn w-full sm:w-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-white to-emerald-200 rounded-full blur opacity-30 group-hover/btn:opacity-60 transition duration-500"></div>
                    <Button size="lg" className="relative w-full sm:w-auto bg-white text-[#003B29] hover:bg-gray-50 hover:text-[#016B4C] rounded-full px-10 h-16 text-lg font-extrabold shadow-2xl transition-all duration-300 hover:scale-105 group/arrow">
                      Criar Conta Gratuita
                      <ArrowRight className="w-5 h-5 ml-2 group-hover/arrow:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-100/60 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400/80" />
                    <span>Sem cartão de crédito</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 h-[250px] sm:h-[350px] md:h-[450px] relative flex items-center justify-center mt-6 lg:mt-0">
                {/* Glow effect behind mascot */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#FFB300]/20 to-emerald-400/20 blur-[60px] rounded-full pointer-events-none scale-90"></div>

                {/* Subtle pedestal shadow */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/30 blur-2xl rounded-[100%]"></div>

                <Image
                  src="/images/webp/celebrando1.webp"
                  alt="Mascote Finnly Comemorando"
                  fill
                  className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative z-10 hover:scale-[1.03] hover:-translate-y-2 transition-all duration-700 ease-out"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Fat Footer */}
      <footer className="bg-white border-t border-gray-100 pt-16 md:pt-20 pb-10 px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden relative">
                  <Image src="/images/logosemfundo.png" alt="Finnly Logo" fill className="object-contain" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-[#016B4C]">Finnly</span>
              </div>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                Sua consultoria financeira inteligente. O Finnly entende suas finanças para você focar no que realmente importa: viver a vida com tranquilidade.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-[#016B4C] hover:text-white transition-all hover:-translate-y-1 cursor-pointer text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-[#016B4C] hover:text-white transition-all hover:-translate-y-1 cursor-pointer text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-[#016B4C] hover:text-white transition-all hover:-translate-y-1 cursor-pointer text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" /></svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-semibold text-gray-900 mb-2">Produto</h4>
              <a href="#ia-financeira" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">IA Financeira</a>
              <a href="#como-funciona" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Como Funciona</a>
              <a href="#whatsapp" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Integração WhatsApp</a>
              <a href="#planos" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Metas Inteligentes</a>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-semibold text-gray-900 mb-2">Empresa</h4>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Sobre o Finnly</a>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Carreiras</a>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Blog</a>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Contato</a>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-semibold text-gray-900 mb-2">Legal</h4>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Termos de Uso</a>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Política de Privacidade</a>
              <a href="#" className="text-sm text-gray-500 hover:text-[#F57C00] transition-colors">Segurança de Dados</a>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-gray-400">
            <p>© 2026 Finnly Consultoria Financeira. Todos os direitos reservados.</p>
            <div className="flex items-center gap-1.5">
              <span>Feito com</span>
              <span className="text-red-500 animate-pulse">♥</span>
              <span>no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
