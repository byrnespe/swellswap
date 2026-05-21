import { useState } from 'react';
import { Waves, MapPin, ArrowRight, ShieldCheck, ArrowLeftRight } from 'lucide-react';

const slides = [
  {
    emoji: '🏄',
    title: 'Buy & Sell Surfboards',
    subtitle: 'The marketplace built for NJ surfers. Find your next board or sell your old one to someone local.',
    color: 'from-cyan-600 to-blue-700',
  },
  {
    icon: MapPin,
    title: 'Local First',
    subtitle: 'See boards near you first. Meet up, check the board in person, and make the deal happen the right way.',
    color: 'from-blue-600 to-violet-700',
  },
  {
    icon: ArrowLeftRight,
    title: 'Trade Your Quiver',
    subtitle: 'Not just buying and selling — match with other surfers open to trades. Swap your fish for a shortboard.',
    color: 'from-violet-600 to-pink-700',
  },
  {
    icon: ShieldCheck,
    title: 'Safe & Simple',
    subtitle: 'Verified sellers, real reviews, direct messaging. No middleman. Just surfers helping surfers.',
    color: 'from-emerald-600 to-cyan-700',
  },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      <div className={`flex-1 bg-gradient-to-br ${slide.color} flex flex-col items-center justify-center px-8 text-center transition-all duration-300`}>
        <div className="mb-8">
          {slide.emoji ? (
            <span className="text-8xl">{slide.emoji}</span>
          ) : (
            <div className="bg-white/20 rounded-full p-6 w-fit mx-auto">
              <slide.icon size={48} className="text-white" />
            </div>
          )}
        </div>
        <h1 className="text-white font-bold text-3xl leading-tight mb-4">{slide.title}</h1>
        <p className="text-white/80 text-base leading-relaxed">{slide.subtitle}</p>
      </div>

      <div className="bg-[#0a0f1e] px-6 py-8">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-cyan-400' : 'w-2 h-2 bg-white/20'}`} />
          ))}
        </div>

        <button
          onClick={() => isLast ? onDone() : setStep(s => s + 1)}
          className="w-full bg-cyan-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
        >
          {isLast ? (
            <>
              <Waves size={18} />
              Get Started
            </>
          ) : (
            <>
              Next
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {!isLast && (
          <button onClick={onDone} className="w-full text-slate-500 text-sm py-3 mt-2">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
