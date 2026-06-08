import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface OrderHistoryData {
  id: string;
  orderId: string;
  deviceName: string;
  anyDeskId: string;
  anyDeskPassword: string;
}

interface ApproveFormData {
  anyDeskId: string;
  anyDeskPassword: string;
  expireDate: string;
}

interface ApproveModalProps {
  order: OrderHistoryData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (orderId: string, data: ApproveFormData) => void;
}

function ApproveModalContent({
  order,
  onOpenChange,
  onSubmit,
}: Omit<ApproveModalProps, "open">) {
  const [form, setForm] = useState<ApproveFormData>({
    anyDeskId: order?.anyDeskId ?? "",
    anyDeskPassword: order?.anyDeskPassword ?? "",
    expireDate: "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = () => {
    if (!order) return;
    onSubmit(order.orderId, form);
    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-normal">
          Approve Order{" "}
          <span className="text-c-emerald-400 font-mono text-sm">
            {order?.orderId}
          </span>
        </DialogTitle>
        {order?.deviceName && (
          <p className="text-xs text-c-slate-500 pt-0.5">{order.deviceName}</p>
        )}
      </DialogHeader>

      <div className="flex flex-col gap-3 py-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-c-slate-400 uppercase tracking-wide">
            AnyDesk ID
          </label>
          <Input
            placeholder="e.g. 123 456 789"
            value={form.anyDeskId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, anyDeskId: e.target.value }))
            }
            className="bg-c-bg-750 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-600 focus-visible:ring-c-emerald-500/50 font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-c-slate-400 uppercase tracking-wide">
            AnyDesk Password
          </label>
          <Input
            placeholder="e.g. aX9#mK2!"
            value={form.anyDeskPassword}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, anyDeskPassword: e.target.value }))
            }
            className="bg-c-bg-750 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-600 focus-visible:ring-c-emerald-500/50 font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
  <label className="text-xs font-medium text-c-slate-400 uppercase tracking-wide">
    Expire Date
  </label>
  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full h-9 px-3 justify-start text-left text-sm font-normal bg-c-bg-750 border-c-slate-700 text-c-slate-200 hover:bg-c-bg-750 hover:text-c-slate-200",
          !form.expireDate && "text-c-slate-500"
        )}
      >
        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-c-slate-400 shrink-0" />
        {form.expireDate ? format(new Date(form.expireDate), "yyyy-MM-dd") : "Pick a date"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0 bg-c-bg-700 border-c-slate-700" align="start">
      <Calendar
        mode="single"
        selected={form.expireDate ? new Date(form.expireDate) : undefined}
        onSelect={(date) => {
          if (date) {
            setForm((prev) => ({ ...prev, expireDate: format(date, "yyyy-MM-dd") }));
            setCalendarOpen(false);
          }
        }}
        initialFocus
        className="text-c-slate-200"
      />
    </PopoverContent>
  </Popover>
</div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white"
          onClick={handleSubmit}
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          className="bg-c-orange-600 hover:bg-c-orange-700"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

export function DeviceOrderApproveModal({
  order,
  open,
  onOpenChange,
  onSubmit,
}: ApproveModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 sm:max-w-[450px]">
        {/* key={order?.id} remounts ApproveModalContent entirely when the order
            changes, so useState initializes fresh — no useEffect or useMemo needed */}
        <ApproveModalContent
          key={order?.id}
          order={order}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
