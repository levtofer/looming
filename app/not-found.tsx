import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#14151A] flex flex-col items-center justify-center p-4 selection:bg-[#6C7BFF]/30">
      {/* 📟 Main Terminal Error Terminal Container Matrix */}
      <div className="w-full max-w-md p-6 rounded-md bg-[#1B1C22] border border-[#2A2C35] font-mono shadow-2xl relative overflow-hidden">

        {/* Decorative Top Terminal Control Header Dots UwU~ */}
        <div className="flex items-center gap-1.5 border-b border-[#2A2C35] pb-4 mb-4 select-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF9F4A]/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#6C7BFF]/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#8A8D98]/20" />
          <span className="text-[10px] text-[#8A8D98] ml-2 tracking-wider">SYSTEM//ERR_404</span>
        </div>

        {/* Big Glitchy Header Title Text lines */}
        <h1 className="text-4xl font-bold text-[#FF9F4A] mb-2 tracking-tight">
          404://LOST_THREAD
        </h1>

        <p className="text-xs text-[#8A8D98] uppercase tracking-wider mb-6">
          Status: [Vaporized or Non-Existent]
        </p>

        {/* Terminal Narrative Output Box Context */}
        <div className="bg-[#14151A] rounded p-3 border border-[#2A2C35] mb-6 text-sm text-[#EDEAE3] leading-relaxed">
          <span className="text-[#6C7BFF]">looming_user@terminal:~$</span> check --slug <br />
          <span className="text-[#FF9F4A] text-xs mt-1 block">
            ⚠️ WARNING: The folder drop sequence you are trying to reach could not be resolved. It may have crossed its expiration threshold and been automatically wiped from the secure database arrays.
          </span>
        </div>

        {/* Interactive Action Command Deck Buttons */}
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full text-xs text-center font-mono py-2.5 rounded-md bg-[#23242C] text-[#6C7BFF] border border-[#6C7BFF]/20 hover:bg-[#6C7BFF]/10 active:bg-[#6C7BFF]/20 transition-all duration-200"
          >
            &lt; Return to Base Terminal /&gt;
          </Link>

          <div className="text-[10px] text-[#8A8D98]/50 text-center mt-2 select-none">
            looming_ transient file drop network v1.0.0
          </div>
        </div>

      </div>
    </div>
  );
}