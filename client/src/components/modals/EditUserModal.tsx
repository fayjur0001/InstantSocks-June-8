"use client";

import { useEffect, useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserData } from "@/app/admin/users/page";

interface EditUserModalProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (payload: { username: string; email: string }) => Promise<void> | void;
}

export function EditUserModal({ user, open, onOpenChange, onSave }: EditUserModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) {
      setUsername(user?.username || "");
      setEmail(user?.email || "");
    }
  }, [open, user]);

  const handleSave = async () => {
    await onSave?.({ username, email });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit <span className="text-c-emerald-400">{user?.username}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-c-bg-750 border-c-slate-700" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-c-bg-750 border-c-slate-700" 
            />
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
