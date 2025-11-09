import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Search() {
  return (
    <Button variant="ghost" size="icon">
      <SearchIcon />
    </Button>
  );
}
