"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserData } from "@/app/admin/users/page";

interface PasswordModalProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (password: string) => Promise<void> | void;
}

export function EditPasswordModal({ user, open, onOpenChange, onSave }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const handleSave = async () => {
    if (password !== confirmPassword) {
      window.alert("Passwords do not match.");
      return;
    }

    await onSave?.(password);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-base font-normal">
            Change <span className="text-c-emerald-400">{user?.username}&apos;s</span> Password
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <div className="relative">
            <Input 
              type="password" 
              placeholder="New Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-c-bg-750 border-c-slate-700 pr-10" 
            />
            <Eye className="absolute right-3 top-2.5 h-4 w-4 text-c-slate-400 cursor-pointer" />
          </div>
          <div className="relative">
            <Input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-c-bg-750 border-c-slate-700 pr-10" 
            />
            <Eye className="absolute right-3 top-2.5 h-4 w-4 text-c-slate-400 cursor-pointer" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button className="bg-c-emerald-500 hover:bg-c-emerald-600" onClick={handleSave}>
            Save
          </Button>
          <Button variant="destructive" className="bg-c-orange-600" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
