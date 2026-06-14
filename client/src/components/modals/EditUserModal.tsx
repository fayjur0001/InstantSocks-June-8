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
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (open) {
      setUsername(user?.username || "");
      setEmail(user?.email || "");
      setIsLoading(false);
      setError("");
    }
  }, [open, user]);

  const handleSave = async () => {
    setError("");

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    if (!email.trim()) {
      setError("Email cannot be empty.");
      return;
    }

    setIsLoading(true);
    try {
      await onSave?.({ username: username.trim(), email: email.trim() });
      
      onOpenChange(false);
    } catch (err: unknown) {
      
      let msg = "Failed to update user. Please try again.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.message) msg = parsed.message;
        } catch {
          if (err.message) msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
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
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              className="bg-c-bg-750 border-c-slate-700"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="bg-c-bg-750 border-c-slate-700"
              disabled={isLoading}
            />
          </div>

          {}
          {error && (
            <p className="text-xs text-c-rose-400 -mt-1">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            className="bg-c-emerald-500 hover:bg-c-emerald-600 min-w-[80px]"
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