"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserData } from "@/app/admin/users/page";

interface RoleModalProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (role: "general" | "support" | "admin") => Promise<void> | void;
}

export function EditRoleModal({ user, open, onOpenChange, onSave }: RoleModalProps) {
  const [role, setRole]           = useState<"general" | "support" | "admin">("general");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (open && user?.role) {
      const current = user.role.toLowerCase();
      if (current === "admin")        setRole("admin");
      else if (current === "support") setRole("support");
      else                            setRole("general");
      setIsLoading(false);
      setError("");
    }
  }, [open, user]);

  const handleSave = async () => {
    setError("");
    setIsLoading(true);

    // Optimistic close — modal বন্ধ করে দাও, API background-এ চলুক
    // (role change-এ agent serial assign হওয়ার কারণে backend একটু slow)
    onOpenChange(false);

    try {
      await onSave?.(role);
    } catch {
      // onSave already handles toast.error — nothing extra needed here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base font-normal">
            Change{" "}
            <span className="text-c-emerald-400">{user?.username}&apos;s</span>{" "}
            Role
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Select
            value={role}
            onValueChange={(val) => { setRole(val as typeof role); setError(""); }}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-c-bg-750 border-c-slate-700 w-full">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent className="bg-c-bg-600 border-c-slate-700 text-c-slate-200">
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          {error && (
            <p className="text-xs text-c-rose-400 mt-2">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white min-w-[80px]"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="destructive"
            className="bg-c-orange-600 hover:bg-c-orange-700 min-w-[80px]"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}