import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/settings/team", label: "Team" },
  { to: "/settings/roles", label: "Roles" },
  { to: "/settings/pipelines", label: "Pipelines" },
  { to: "/settings/custom-fields", label: "Custom fields" },
  { to: "/settings/workspace", label: "Workspace" },
];

export function SettingsNav() {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
      {items.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn("rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100", isActive && "bg-slate-900 text-white hover:bg-slate-900")
          }
          key={item.to}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
