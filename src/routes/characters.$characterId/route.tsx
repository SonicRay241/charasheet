import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/characters/$characterId")({
  component: CharacterLayout
});

function CharacterLayout() {
  const { characterId } = Route.useParams();

  const tabs = [
    { to: "/characters/$characterId/sheet", label: "Sheet" },
    { to: "/characters/$characterId/lore", label: "Lore" },
  ] as const;

  return (
    <div className="h-full">
      <div className="flex gap-2 px-3 pt-2">
          <Link
            to="/"
            params={{ characterId }}
            className={cn(
              "font-serif text-sm text-muted-foreground items-center gap-1 cursor-pointer flex pb-1 px-1",
              "hover:text-foreground/50",
              "[&.active]:bg-primary [&.active]:text-primary-foreground",
            )}
          >
            <ArrowLeftIcon size={12}/>
            <span>Home</span>
          </Link>
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ characterId }}
            className={cn(
              "font-serif text-sm text-muted-foreground items-center gap-1 cursor-pointer pb-1 px-1",
              "hover:text-foreground/50",
              "[&.active]:bg-primary [&.active]:text-primary-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <hr />
      <Outlet />
    </div>
  );
}