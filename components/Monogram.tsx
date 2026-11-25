import { Thumb } from "@/components/ui/Thumb";

/** A square picture for an entry, or its first letter on a palette block when there's no picture. */
export function Monogram({ title, src, size = 40 }: { title: string; src?: string | null; size?: number }) {
  return (
    <span className="block shrink-0" style={{ width: size, height: size }}>
      <Thumb src={src} title={title} fit="cover" className="h-full w-full" />
    </span>
  );
}
