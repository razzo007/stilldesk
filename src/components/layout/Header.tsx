import { LogOut, Moon, Plus, Settings, Shield, Sun, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase";
import { isLeader } from "../../lib/permissions";
import type { Profile } from "../../types/user";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

interface HeaderProps {
  currentUser: Profile;
  theme: "light" | "dark";
  onAdmin: () => void;
  onNewIssue: () => void;
  onProfile: () => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
}

export function Header({
  currentUser,
  onAdmin,
  onNewIssue,
  onProfile,
  onSignOut,
  onToggleTheme,
  theme,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <header className="glass-panel z-20 flex min-h-16 items-center justify-between gap-4 rounded-none border-x-0 border-t-0 px-4 md:px-6">
      <div>
        <div className="flex items-center gap-3">
          <img
            alt="StillDesk"
            className="h-10 w-44 object-contain object-left"
            src="/assets/stilldesk-logo.png"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isSupabaseConfigured ? (
          <span className="hidden rounded-full border border-desk-border/70 bg-desk-bg px-2.5 py-1 text-[11px] text-desk-muted md:inline-flex">
            Demo mode
          </span>
        ) : null}
        <Button
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={onNewIssue}
          variant="primary"
        >
          New issue
        </Button>
        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-desk-soft"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <Avatar name={currentUser.name} src={currentUser.avatar_url} />
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium text-desk-text">{currentUser.name}</p>
              <p className="text-xs text-desk-muted">
                {currentUser.role === "supreme_leader" ? "Leader view" : currentUser.role}
              </p>
            </div>
          </button>
          {open ? (
            <div className="account-menu absolute right-0 top-12 z-40 w-60 rounded-2xl p-2" role="menu">
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-desk-text hover:bg-desk-soft"
                onClick={() => { onProfile(); setOpen(false); }}
                role="menuitem"
                type="button"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Profile
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-desk-text hover:bg-desk-soft"
                onClick={() => { onProfile(); setOpen(false); }}
                role="menuitem"
                type="button"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </button>
              {isLeader(currentUser) ? (
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-desk-text hover:bg-desk-soft"
                  onClick={() => { onAdmin(); setOpen(false); }}
                  role="menuitem"
                  type="button"
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Users
                </button>
              ) : null}
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-desk-text hover:bg-desk-soft"
                onClick={() => { onToggleTheme(); setOpen(false); }}
                role="menuitem"
                type="button"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <div className="my-1 h-px bg-desk-border" />
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-desk-muted hover:bg-desk-soft hover:text-desk-text"
                onClick={() => { onSignOut(); setOpen(false); }}
                role="menuitem"
                type="button"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
