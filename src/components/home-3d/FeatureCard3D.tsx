import { type LucideIcon  } from "lucide-react";
import { Check  } from "lucide-react";
import { TiltPanel3D } from "./TiltPanel3D";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
};

export function FeatureCard3D({ icon: Icon, title, description, items }: Props) {
  return (
    <TiltPanel3D intensity={0.85}>
      <div className="group flex h-full flex-col rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-[#0f0f0f] via-[#0c1018] to-[#080c14] p-6 transition-shadow duration-300 hover:border-[#0095ff]/45 hover:shadow-[0_0_40px_rgba(0,149,255,0.14)] md:p-7">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0095ff]/12 text-[#0095ff] ring-1 ring-[#0095ff]/25 transition-colors group-hover:bg-[#0095ff]/18">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#94a3b8]">{description}</p>
          </div>
        </div>
        <ul className="mt-auto space-y-2.5 border-t border-white/[0.06] pt-5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-snug text-[#cbd5e1]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </TiltPanel3D>
  );
}
