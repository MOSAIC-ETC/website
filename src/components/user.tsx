"use client";

import { ChevronRightIcon, LogInIcon, LogOutIcon, ShieldIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type UserProps = React.ComponentProps<"button"> & {
  variant?: "icon" | "sidebar";
};

const ADMIN_PERMISSIONS = [
  "files.upload",
  "files.delete",
  "files.restore",
  "params.edit",
  "params.revert",
  "users.manage",
  "roles.manage",
] as const;

function hasAnyAdminPerm(permissions: readonly string[] | undefined): boolean {
  if (!permissions) return false;
  return permissions.some((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p));
}

export function User({ variant = "icon", className, ...props }: UserProps) {
  const t = useTranslations("user");
  const { data: session } = useSession();

  const isAuthenticated = !!session?.user;
  const showAdminLink = isAuthenticated && hasAnyAdminPerm(session.user.permissions);

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
          <p className="font-medium">{isAuthenticated ? session.user.name : t("anonymous")}</p>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1 text-primary text-sm hover:underline"
            >
              {t("sign-out")} <ChevronRightIcon size={12} />
            </button>
          ) : (
            <Link href="/login" className="flex items-center gap-1 text-primary text-sm hover:underline">
              {t("sign-in")}
              <ChevronRightIcon size={12} />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-lg" className={cn("hidden lg:flex rounded-full", className)} {...props}>
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
        <DropdownMenuLabel className="font-medium">
          {isAuthenticated ? (
            <>
              {session.user.name}
              <div className="text-muted-foreground text-xs font-normal">{session.user.email}</div>
            </>
          ) : (
            t("anonymous")
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAuthenticated ? (
          <>
            {showAdminLink && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="w-full flex items-center gap-2">
                  <ShieldIcon size={14} />
                  {t("admin")}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOutIcon size={14} />
              {t("sign-out")}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/login" className="w-full flex items-center gap-2">
              <LogInIcon size={14} />
              {t("sign-in")}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
