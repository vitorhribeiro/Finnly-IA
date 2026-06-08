import React from 'react';
import Image from 'next/image';

export function FinnlyAuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#FAF8F5] flex items-center justify-center">
      
      {/* Imagem de Fundo Pronta */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <Image 
          src="/images/webp/background.webp" 
          alt="Background Finnly" 
          fill 
          priority
          unoptimized={true}
          className="object-cover object-center" 
          quality={100}
        />
      </div>

      {/* Conteúdo Principal por cima de tudo */}
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
