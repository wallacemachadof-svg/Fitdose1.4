
'use client'

export default function PlanoAlimentarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8 flex items-start justify-center print:bg-transparent print:p-0">
        {children}
    </div>
  );
}
