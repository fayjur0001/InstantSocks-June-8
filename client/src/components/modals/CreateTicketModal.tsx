"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportApi } from "@/lib/support.service";
import { toast } from "sonner";

const CreateTicketModal = ({
  isCreateTicketOpen,
  setIsCreateTicketOpen,
  onCreated,
}: {
  isCreateTicketOpen: boolean;
  setIsCreateTicketOpen: (open: boolean) => void;
  onCreated?: () => void;
}) => {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in subject and message.");
      return;
    }
    setLoading(true);
    try {
      const res = await supportApi.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        category: category || undefined,
      });
      if (res.success) {
        toast.success("Ticket created successfully!");
        setSubject("");
        setMessage("");
        setCategory("");
        setIsCreateTicketOpen(false);
        onCreated?.();
      }
    } catch {
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden gap-0 bg-black border border-white/20 shadow-xl shadow-white/10">

        <VisuallyHidden>
          <DialogTitle>Create Support Ticket</DialogTitle>
        </VisuallyHidden>

        {}
        <div className="p-8 pb-4">
          <h3 className="text-xl font-bold text-white/70 mb-1">Create Support Ticket</h3>
          <p className="text-sm text-c-slate-400">
            Tell us how we can help you. Fill in the details below.
          </p>
        </div>

        {}
        <div className="px-8 pb-8 space-y-6">
          
          {}
          <div className="space-y-2">
            <Label className="font-semibold text-white/70 text-sm">
              Select Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-11 border-white/10 bg-transparent text-c-slate-300 focus:ring-c-purple-500">
                <SelectValue placeholder="Support Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-c-slate-800 text-c-slate-300">
                <SelectItem value="general" className="focus:bg-c-slate-800 focus:text-white">General</SelectItem>
                <SelectItem value="proxies-issues" className="focus:bg-c-slate-800 focus:text-white">Proxies Issues</SelectItem>
                <SelectItem value="payment-billing" className="focus:bg-c-slate-800 focus:text-white">Payment/Billing</SelectItem>
                <SelectItem value="technical" className="focus:bg-c-slate-800 focus:text-white">Technical</SelectItem>
                <SelectItem value="feedback" className="focus:bg-c-slate-800 focus:text-white">Feedback</SelectItem>
                <SelectItem value="others" className="focus:bg-c-slate-800 focus:text-white">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
          <div className="space-y-2">
            <Label className="font-semibold text-white/70 text-sm">
              Subject
            </Label>
            <Input
              placeholder="Write here the subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 border-white/10 bg-transparent text-c-slate-200 placeholder:text-c-slate-500 focus-visible:ring-c-purple-500"
            />
          </div>

          {}
          <div className="space-y-2">
            <Label className="font-semibold text-white/70 text-sm">
              Message
            </Label>
            <Textarea
              placeholder="explain your problem in details..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] border-white/10 bg-transparent text-c-slate-200 placeholder:text-c-slate-500 focus-visible:ring-c-purple-500 resize-none"
            />
          </div>

        </div>

        {}
        <div className="p-8 pt-0 flex gap-4">
          <Button
            variant="outline"
            className="flex-1 h-11 border-c-slate-700 bg-transparent text-c-slate-300 hover:bg-c-slate-800 hover:text-white font-semibold"
            onClick={() => setIsCreateTicketOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Open Ticket"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketModal;