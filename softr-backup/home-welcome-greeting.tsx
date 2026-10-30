import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/user";

const greetingFor = (h: number) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");

export default function Block() {
  const user = useCurrentUser();
  const [now, setNow] = useState(() => new Date());

  // keep the greeting right if the page stays open across noon or evening
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const raw = user?.firstName || user?.fullName?.trim().split(" ")[0] || (user?.email ? user.email.split("@")[0] : "");
  const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="w-full bg-white">
      <div className="container">
        <div className="content border-b border-slate-200 py-8">
          <p className="text-sm text-slate-600">{date}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0B1F4B] sm:text-3xl">
            {greetingFor(now.getHours())}{name ? `, ${name}` : ""}
          </h1>
        </div>
      </div>
    </div>
  );
}
