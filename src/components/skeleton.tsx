export function SectionSkeleton({ title }: { title?: string }) {
  return (
    <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-5">
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[#555555] uppercase tracking-widest">── {title}</span>
          <div className="h-px flex-1 bg-[#1F1F1F]" />
        </div>
      )}
      <p className="text-xs text-[#555555] uppercase tracking-wider cursor-blink">
        ▓▓▓░░░ LOADING...
      </p>
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <SectionSkeleton title="LOADING DATA" />
    </div>
  );
}
