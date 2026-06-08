"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const TypingIndicator = ({ isAi = true }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`flex items-center gap-1 px-4 py-3 rounded-2xl w-fit shadow-sm ${
      isAi ? "bg-white border border-gray-100 rounded-tl-sm self-start" : "bg-[#016B4C] rounded-tr-sm self-end"
    }`}
  >
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className={`w-1.5 h-1.5 rounded-full ${isAi ? "bg-gray-400" : "bg-white/70"}`}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
      />
    ))}
  </motion.div>
);

export default function AnimatedChat() {
  const [step, setStep] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    // Sequence timing
    const schedule = [
      { step: 1, delay: 1000 },    // User 1 msg
      { step: 2, delay: 1800 },    // AI 1 typing
      { step: 3, delay: 3500 },    // AI 1 msg
      { step: 4, delay: 5000 },    // User 2 typing
      { step: 5, delay: 6000 },    // User 2 msg
      { step: 6, delay: 7000 },    // AI 2 typing
      { step: 7, delay: 8500 },    // AI 2 msg
      { step: 8, delay: 10000 },   // User 3 typing
      { step: 9, delay: 11000 },   // User 3 msg
      { step: 10, delay: 12000 },  // AI 3 typing
      { step: 11, delay: 14000 },  // AI 3 msg
    ];

    const timeouts = schedule.map(item => 
      setTimeout(() => setStep(item.step), item.delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div ref={containerRef} className="p-6 md:p-8 flex flex-col gap-6 bg-[#F8FAF9] min-h-[450px]">
      <AnimatePresence mode="popLayout">
        {/* Chat 1 */}
        {step === 0 && <TypingIndicator isAi={false} key="t1" />}
        {step >= 1 && (
          <div key="chat1" className="flex flex-col gap-3">
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-end bg-[#016B4C] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
              Posso comprar esse carro?
            </motion.div>
            
            {step === 2 && <TypingIndicator isAi={true} key="t2" />}
            {step >= 3 && (
              <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-white border border-gray-100 text-gray-700 px-5 py-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                <p className="font-medium text-gray-900 mb-1">Sim.</p>
                <p>Mas esperar 4 meses pode economizar mais de <span className="text-[#016B4C] font-semibold">R$ 8.000</span> em juros.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Chat 2 */}
        {step === 4 && <TypingIndicator isAi={false} key="t3" />}
        {step >= 5 && (
          <div key="chat2" className="flex flex-col gap-3">
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-end bg-[#016B4C] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
              Quanto posso gastar esse mês?
            </motion.div>
            
            {step === 6 && <TypingIndicator isAi={true} key="t4" />}
            {step >= 7 && (
              <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-white border border-gray-100 text-gray-700 px-5 py-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                <p>Você possui <span className="text-[#016B4C] font-semibold">R$ 720</span> disponíveis sem comprometer suas metas de fim de ano.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Chat 3 */}
        {step === 8 && <TypingIndicator isAi={false} key="t5" />}
        {step >= 9 && (
          <div key="chat3" className="flex flex-col gap-3">
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-end bg-[#016B4C] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
              Vou conseguir viajar em dezembro?
            </motion.div>
            
            {step === 10 && <TypingIndicator isAi={true} key="t6" />}
            {step >= 11 && (
              <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-white border border-gray-100 text-gray-700 px-5 py-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-600">No Caminho Certo</span>
                </div>
                <p>Mantendo seu ritmo atual, você chegará à meta <span className="text-[#016B4C] font-semibold">1 mês antes</span> da viagem.</p>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
