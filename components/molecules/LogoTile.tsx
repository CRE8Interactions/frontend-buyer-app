/** LogoTile — glassy square tile with a centered org logo. */
export default function LogoTile({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`tile-glass relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="relative h-[60%] w-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]" />
    </div>
  );
}
