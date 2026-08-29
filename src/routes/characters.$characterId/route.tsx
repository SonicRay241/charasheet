import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

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
      <div className="flex gap-4 px-3 pt-3">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ characterId }}
            className={cn(
              "terminal-label cursor-pointer px-1 pb-1",
              "hover:bg-foreground hover:text-background",
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