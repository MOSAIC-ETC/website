import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronRightIcon, EllipsisVerticalIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "./ui/separator";

type UserProps = React.ComponentProps<"button"> & {
  variant?: "icon" | "sidebar";
};

export function User({ variant = "icon", className, ...props }: UserProps) {
  const t = useTranslations("user");

  if (variant === "sidebar") {
    return (
      <div className="flex items-center gap-3 bg-muted/80 p-3 rounded-md">
        <Button variant="outline" size="icon-lg" className="rounded-full">
          <Image
            src="/assets/images/default-avatar.png"
            alt="User Avatar"
            width={128}
            height={128}
            className="rounded-full w-full h-full"
          />
        </Button>

        <div className="w-full">
          <p className="font-medium">{t("anonymous")}</p>
          <Link
            href="/login"
            className="flex items-center gap-1 text-primary text-sm hover:underline"
          >
            {t("sign-in")}
            <ChevronRightIcon size={12} />
          </Link>
        </div>

        {/* <Button variant="ghost" size="icon">
          <EllipsisVerticalIcon size={16} />
        </Button> */}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className={cn("hidden lg:flex rounded-full", className)}
          {...props}
        >
          <Image
            src="/assets/images/default-avatar.png"
            alt="User Avatar"
            width={128}
            height={128}
            className="rounded-full w-full h-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="font-medium">{t("anonymous")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login" className="w-full">
            {t("sign-in")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
