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
  // FIXED: state now stores the actual API role values ("general" | "support" | "admin")
  // instead of mixing "moderator" display label with "support" API value
  const [role, setRole] = useState<"general" | "support" | "admin">("general");

  useEffect(() => {
    if (open && user?.role) {
      const current = user.role.toLowerCase();
      // Map any known role to a valid API value; fall back to "general"
      if (current === "admin") setRole("admin");
      else if (current === "support") setRole("support");
      else setRole("general");
    }
  }, [open, user]);

  const handleSave = async () => {
    await onSave?.(role);
    onOpenChange(false);
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
            onValueChange={(val) => setRole(val as typeof role)}
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
        </div>
        <DialogFooter className="gap-2">
          <Button
            className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white min-w-[80px]"
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="destructive"
            className="bg-c-orange-600 hover:bg-c-orange-700 min-w-[80px]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}