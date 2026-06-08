import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UserData } from "@/app/admin/users/page";

interface BanUserModalProps {
  user: UserData | null;
  open: boolean;
  banType: "permanent" | "7days";
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function BanUserModal({
  user,
  open,
  banType,
  onOpenChange,
  onConfirm,
}: BanUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 sm:max-w-112.5">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-lg font-semibold">
            {banType === "permanent"
              ? "Confirm permanent ban"
              : "Confirm 7-day ban"}
          </DialogTitle>
          <DialogDescription className="text-sm text-c-slate-400">
            {user
              ? `This will ${
                  banType === "permanent" ? "permanently ban" : "ban for 7 days"
                } ${user.username}.`
              : "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-c-rose-500/30 bg-c-rose-500/10 p-4 text-sm text-c-rose-100 mb-5">
          <p className="font-semibold">Warning</p>
          <p className="mt-1 text-c-slate-200">
            Banned users lose access immediately and may require support to restore their account.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            className="bg-c-orange-600 hover:bg-c-orange-700 min-w-20"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-c-rose-500 hover:bg-c-rose-600 text-white min-w-20"
            onClick={onConfirm}
          >
            {banType === "permanent" ? "Ban Permanently" : "Ban for 7 Days"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
