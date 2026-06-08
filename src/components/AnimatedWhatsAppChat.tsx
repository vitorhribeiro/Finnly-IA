"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const TypingIndicator = ({ isAi = true }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`px-3 py-2 rounded-lg text-sm shadow-sm relative w-fit ${
      isAi ? "self-start bg-white rounded-tl-none" : "self-end bg-[#DCF8C6] rounded-tr-none"
    }`}
  >
    <div className="flex items-center gap-1 h-5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${isAi ? "bg-gray-400" : "bg-[#075E54]/50"}`}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  </motion.div>
);

export default function AnimatedWhatsAppChat() {
  const [step, setStep] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    const schedule = [
      { step: 1, delay: 1000 },    // User 1 msg
      { step: 2, delay: 1800 },    // AI 1 typing
      { step: 3, delay: 3500 },    // AI 1 msg
      { step: 4, delay: 5000 },    // User 2 typing
      { step: 5, delay: 6000 },    // User 2 msg
      { step: 6, delay: 7000 },    // AI 2 typing
      { step: 7, delay: 9000 },    // AI 2 msg
    ];

    const timeouts = schedule.map(item => 
      setTimeout(() => setStep(item.step), item.delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div ref={containerRef} className="flex-1 bg-[#E5DDD5] p-4 flex flex-col gap-3 relative overflow-hidden">
      <AnimatePresence mode="popLayout">
        {step === 0 && <TypingIndicator isAi={false} key="tw1" />}
        {step >= 1 && (
          <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="msg1" className="self-end bg-[#DCF8C6] px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] text-sm shadow-sm relative text-[#111]">
            Gastei R$ 50 no mercado
            <div className="text-[9px] text-gray-500 text-right mt-1">10:42</div>
          </motion.div>
        )}

        {step === 2 && <TypingIndicator isAi={true} key="tw2" />}
        {step >= 3 && (
          <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="msg2" className="self-start bg-white px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] text-sm shadow-sm text-[#111]">
            Anotado! ✅ <br/>
            Seu orçamento de mercado agora tem R$ 450 restantes para o mês.
            <div className="text-[9px] text-gray-400 text-right mt-1">10:42</div>
          </motion.div>
        )}

        {step === 4 && <TypingIndicator isAi={false} key="tw3" />}
        {step >= 5 && (
          <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="msg3" className="self-end bg-[#DCF8C6] px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] text-sm shadow-sm mt-2 text-[#111]">
            Posso comprar um videogame de R$ 2500?
            <div className="text-[9px] text-gray-500 text-right mt-1">14:15</div>
          </motion.div>
        )}

        {step === 6 && <TypingIndicator isAi={true} key="tw4" />}
        {step >= 7 && (
          <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="msg4" className="self-start bg-white px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] text-sm shadow-sm text-[#111]">
            Analisando... 🤔<br/>
            Recomendo aguardar o bônus do próximo mês. Se comprar agora, você atrasará a meta da Viagem em 2 meses.
            <div className="text-[9px] text-gray-400 text-right mt-1">14:15</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
