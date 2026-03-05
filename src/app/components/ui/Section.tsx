import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
    title: string;
    children: React.ReactNode;
    borderless?: boolean;
    defaultOpen?: boolean;
    rightElement?: React.ReactNode;
}

export const Section = ({title, children, borderless, defaultOpen = true, rightElement}: SectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={borderless
            ? 'mb-14'
            : 'bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg'
        }>
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } }}
                className={`w-full flex items-center justify-between group cursor-pointer ${borderless ? 'mb-0' : 'mb-4'}`}
            >
                <h2 className={`text-white ${borderless ? 'font-semibold text-m' : 'text-xl font-semibold'}`}>{title}</h2>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {rightElement}
                    <ChevronDown
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-4 h-4 text-white/40 group-hover:text-white/60 transition-transform duration-200 cursor-pointer ${isOpen ? '' : '-rotate-90'}`}
                    />
                </div>
            </div>
            {isOpen && (
                <div className={borderless ? 'space-y-4 mt-4 px-5 pt-2' : 'space-y-4'}>
                    {children}
                </div>
            )}
        </div>
    );
};