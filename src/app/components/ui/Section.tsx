export const Section = ({title, children}: {title: string, children: React.ReactNode}) => {
    return (
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">{title}</h2>
            {children}
        </div>
    );
};