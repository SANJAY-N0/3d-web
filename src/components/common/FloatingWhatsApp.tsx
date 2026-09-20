import React from 'react';
import { MessageSquare } from 'lucide-react';
import { getSupportConfig, getWhatsAppLink } from '../../lib/supportConfig';

export const FloatingWhatsApp: React.FC = () => {
  const support = getSupportConfig();
  const whatsappUrl = getWhatsAppLink(support.whatsapp, 'Hello PrintLab 3D! I have a question about 3D printing orders.');

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl shadow-emerald-950/40 hover:shadow-emerald-600/30 transition-all duration-300 active:scale-95 cursor-pointer font-sans"
        title="Chat on WhatsApp"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full" />
        </div>
        <span className="text-xs font-semibold tracking-wide pr-1">WhatsApp Support</span>
      </a>
    </div>
  );
};
