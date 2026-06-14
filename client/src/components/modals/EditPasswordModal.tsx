"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
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

interface ValidationRule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: ValidationRule[] = [
  { label: "At least 8 characters",        test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A–Z)",   test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a–z)",   test: (pw) => /[a-z]/.test(pw) },
  { label: "One number (0–9)",             test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character (!@#…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function EditPasswordModal({ user, open, onOpenChange, onSave }: PasswordModalProps) {
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState("");

  
  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
      setIsLoading(false);
      setError("");
    }
  }, [open]);

  const allRulesPassed = RULES.every((r) => r.test(password));
  const passwordsMatch = password !== "" && password === confirmPassword;

  const handleSave = async () => {
    setError("");

    if (!allRulesPassed) {
      setError("Password does not meet all requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await onSave?.(password);
      onOpenChange(false);
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
          {}
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="bg-c-bg-750 border-c-slate-700 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-2.5 text-c-slate-400 hover:text-c-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" />
                : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {}
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className="bg-c-bg-750 border-c-slate-700 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-2.5 text-c-slate-400 hover:text-c-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showConfirm
                ? <EyeOff className="h-4 w-4" />
                : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {}
          {password.length > 0 && (
            <ul className="flex flex-col gap-1 mt-1">
              {RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <li key={rule.label} className="flex items-center gap-2 text-xs">
                    {passed
                      ? <Check className="h-3 w-3 text-c-emerald-400 shrink-0" />
                      : <X     className="h-3 w-3 text-c-rose-400 shrink-0" />}
                    <span className={passed ? "text-c-emerald-400" : "text-c-slate-400"}>
                      {rule.label}
                    </span>
                  </li>
                );
              })}
              {}
              {confirmPassword.length > 0 && (
                <li className="flex items-center gap-2 text-xs">
                  {passwordsMatch
                    ? <Check className="h-3 w-3 text-c-emerald-400 shrink-0" />
                    : <X     className="h-3 w-3 text-c-rose-400 shrink-0" />}
                  <span className={passwordsMatch ? "text-c-emerald-400" : "text-c-slate-400"}>
                    Passwords match
                  </span>
                </li>
              )}
            </ul>
          )}

          {}
          {error && (
            <p className="text-xs text-c-rose-400">{error}</p>
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